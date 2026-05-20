/**
 * Ashleen Reply Intelligence
 * 
 * When a funder replies to an agency's outreach email, Ashleen reads 
 * the full thread context and generates a suggested response.
 * 
 * Context chain: Reply → Outbox (original email) → Application (grant content)
 * → Organization (agency profile)
 */

const Reply = require('./reply.schema');
const CommunicationLog = require('../communication-log/communication-log.schema');
const Outbox = require('../outbox/outbox.schema');
const Application = require('../applications/application.schema');
const Organization = require('../organizations/organization.schema');
const Opportunity = require('../opportunities/opportunity.schema');
const logger = require('../../utils/logger');
const openai = require('../../config/openai.config');

/**
 * Generate Ashleen's suggested reply for a detected funder reply.
 * Called automatically by the polling service after a reply is saved.
 * Non-fatal — if AI fails, the reply is still saved normally.
 * 
 * @param {string} replyId - MongoDB ID of the newly saved Reply document
 */
async function generateAshleenSuggestion(replyId) {
  if (!openai) {
    logger.warn(
      '[AshleenReply] OpenAI not configured (OPENAI_API_KEY missing) — skipping suggestion generation'
    );
    return;
  }

  try {
    // 1. Load reply with full chain
    const reply = await Reply.findById(replyId)
      .populate({
        path: 'outboxId',
        select: 'subject htmlBody relatedGrant senderName senderEmail senderCompany',
        populate: {
          path: 'relatedGrant',
          select: 'executiveSummary problemStatement projectDescription organization opportunity',
          populate: [
            { path: 'organization', select: 'name missionStatement location agencyTypes' },
            { path: 'opportunity', select: 'title funder description maxAmount deadline' },
          ],
        },
      })
      .populate('organizationId', 'name missionStatement location agencyTypes contact_name')
      .lean();

    if (!reply) {
      logger.warn(`[AshleenReply] Reply ${replyId} not found`);
      return;
    }

    const outbox = reply.outboxId;
    const application = outbox?.relatedGrant;
    const org = reply.organizationId;

    // Build context string
    const funderReplyBody = reply.body || 'No text content extracted from reply.';
    const originalEmail = outbox
      ? `Subject: ${outbox.subject}\n\n${(outbox.htmlBody || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 1500)}`
      : 'Original email not available.';

    const applicationContext = application
      ? [
          application.executiveSummary
            ? `Executive Summary: ${application.executiveSummary.slice(0, 500)}`
            : '',
          application.problemStatement
            ? `Problem Statement: ${application.problemStatement.slice(0, 400)}`
            : '',
        ]
          .filter(Boolean)
          .join('\n\n')
      : 'No application data linked.';

    const orgContext = org
      ? `Agency: ${org.name}. Mission: ${org.missionStatement || 'Not provided'}. Location: ${org.location || 'Not provided'}.`
      : 'Agency profile not available.';

    const opportunityContext = application?.opportunity
      ? `Grant: ${application.opportunity.title} from ${application.opportunity.funder}. Max award: $${application.opportunity.maxAmount?.toLocaleString() || 'unknown'}.`
      : '';

    const senderName = outbox?.senderName || org?.name || 'the agency representative';

    const systemPrompt = `You are Ashleen, the AI grant writing assistant for Red Dog Grant Intelligence. 
Your job is to help public safety agencies (fire departments, police, EMS) win grant funding.
You are analyzing a funder's reply to an outreach email and generating a suggested response for the agency.

IMPORTANT RULES:
- Be professional, warm, and concise
- Do NOT make up facts about the grant or the agency
- Do NOT promise anything on behalf of the funder
- The suggested reply should be from ${senderName} at ${org?.name || 'the agency'}
- Keep the suggested reply under 200 words
- Match the tone of the funder's reply
- Focus only on this email thread — do not discuss other topics`;

    const userPrompt = `Here is the full context of this grant communication thread:

AGENCY PROFILE:
${orgContext}
${opportunityContext}

ORIGINAL OUTREACH EMAIL (what the agency sent to the funder):
${originalEmail}

APPLICATION CONTEXT:
${applicationContext}

FUNDER'S REPLY (what we just received):
From: ${reply.from}
Subject: ${reply.subject}
---
${funderReplyBody.slice(0, 2000)}

---

Please provide:

1. ANALYSIS (2-3 sentences): What is the funder saying? Is this positive, a request for more info, a rejection, or something else? What does this mean for the agency's chances?

2. SUGGESTED SUBJECT LINE: An appropriate subject line for the agency's reply.

3. SUGGESTED REPLY (under 200 words): A draft reply the agency could send. Write it as if you are ${senderName}. Start with "Dear [Funder Name]," using the sender name from the funder reply.

Format your response EXACTLY like this:
ANALYSIS: [your analysis here]
SUBJECT: [subject line here]
REPLY: [reply draft here]`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 800,
      temperature: 0.7,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });

    const raw = completion.choices[0]?.message?.content || '';

    // Parse the structured response
    const analysisMatch = raw.match(/ANALYSIS:\s*([\s\S]*?)(?=SUBJECT:|$)/i);
    const subjectMatch = raw.match(/SUBJECT:\s*([\s\S]*?)(?=REPLY:|$)/i);
    const replyMatch = raw.match(/REPLY:\s*([\s\S]*?)$/i);

    const analysis = analysisMatch?.[1]?.trim() || null;
    const suggestedSubject = subjectMatch?.[1]?.trim() || null;
    const suggestedReply = replyMatch?.[1]?.trim() || null;

    // Save to Reply document
    await Reply.findByIdAndUpdate(replyId, {
      $set: {
        ashleenAnalysis: analysis,
        ashleenSuggestedSubject: suggestedSubject,
        ashleenSuggestion: suggestedReply,
        ashleenGeneratedAt: new Date(),
        ashleenError: null,
      },
    });

    // Also update the CommunicationLog record with Ashleen's suggestion
    // Uses both field spellings for compatibility with admin UI
    try {
      const replyDoc = await Reply.findById(replyId)
        .select('commLogId')
        .lean();
      
      if (replyDoc?.commLogId) {
        await CommunicationLog.findByIdAndUpdate(replyDoc.commLogId, {
          $set: {
            // Suggested reply — for agency only
            ashleenSuggestion: suggestedReply,
            ashlynSuggestion: suggestedReply, // legacy field used by admin UI
            // Analysis — for both agency and admin to see
            ashleenAnalysis: analysis || null,
            ashleenFlags: analysis ? [analysis] : [],
            ashlynFlags: analysis ? [analysis] : [],
          },
        });
        logger.info(`[AshleenReply] CommunicationLog updated with suggestion for reply ${replyId}`);
      } else {
        logger.warn(`[AshleenReply] No commLogId on reply ${replyId} — CommunicationLog not updated`);
      }
    } catch (err) {
      logger.warn(`[AshleenReply] Failed to update CommunicationLog with suggestion: ${err.message}`);
    }

    logger.info(`[AshleenReply] Generated suggestion for reply ${replyId}`);
  } catch (err) {
    logger.warn(`[AshleenReply] Failed for reply ${replyId}: ${err.message}`);
    // Save error so admin can see it failed
    await Reply.findByIdAndUpdate(replyId, {
      $set: { ashleenError: err.message.slice(0, 500) },
    }).catch(() => {});
  }
}

module.exports = { generateAshleenSuggestion };
