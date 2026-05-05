const { google } = require('googleapis');
const Organization = require('../organizations/organization.schema');
const Outbox = require('../outbox/outbox.schema');
const CommunicationLog = require('../communication-log/communication-log.schema');
const Reply = require('./reply.schema');
const { getValidAccessToken } = require('../../config/gmail.config');
const logger = require('../../utils/logger');

const { generateAshleenSuggestion } = require('./reply.ai.service');

/**
 * For each connected agency, fetch recent inbox messages and 
 * detect any that are replies to emails we sent.
 * 
 * Strategy: For each org, look at our recent sent Outbox records 
 * (last 30 days). Get the providerMessageId or subject from each. 
 * Then query Gmail for messages where In-Reply-To header matches 
 * OR subject is "Re: <our subject>".
 */
async function pollAllAgencies() {
  const orgs = await Organization.find({
    'gmailOAuth.isConnected': true,
    'gmailOAuth.accessToken': { $exists: true, $ne: null }
  }).select('_id name gmailOAuth');

  logger.info(`[ReplyPoll] Polling ${orgs.length} connected agencies`);

  const results = { processed: 0, repliesFound: 0, errors: 0 };

  for (const org of orgs) {
    try {
      const found = await pollAgencyInbox(org);
      results.processed++;
      results.repliesFound += found;
    } catch (err) {
      logger.error(`[ReplyPoll] Failed for org ${org._id}: ${err.message}`);
      results.errors++;
    }
  }

  logger.info(`[ReplyPoll] Done. ${JSON.stringify(results)}`);
  return results;
}

async function pollAgencyInbox(org) {
  // Get recent outbox records — these are what funders might reply to
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const sentMessages = await Outbox.find({
    relatedOrganization: org._id,
    status: 'sent',
    sentAt: { $gte: thirtyDaysAgo }
  }).select('_id subject providerMessageId recipient sentAt');

  if (sentMessages.length === 0) return 0;

  // Build a map: subject (normalized) -> outboxId
  // Funders typically reply with "Re: <original subject>"
  const subjectMap = new Map();
  const messageIdMap = new Map();
  for (const msg of sentMessages) {
    if (msg.subject) {
      subjectMap.set(normalizeSubject(msg.subject), msg._id);
    }
    if (msg.providerMessageId) {
      messageIdMap.set(msg.providerMessageId, msg._id);
    }
  }

  // Get fresh access token
  const accessToken = await getValidAccessToken(org);
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  // Query Gmail inbox for recent messages (last 30 days)
  // Use Gmail search query to limit
  const queryDate = Math.floor(thirtyDaysAgo.getTime() / 1000);
  const listResp = await gmail.users.messages.list({
    userId: 'me',
    q: `in:inbox after:${queryDate}`,
    maxResults: 100
  });

  const messageIds = (listResp.data.messages || []).map(m => m.id);
  if (messageIds.length === 0) return 0;

  let foundCount = 0;

  for (const messageId of messageIds) {
    try {
      // Skip if we already logged this one
      const existing = await Reply.findOne({ gmailMessageId: messageId });
      if (existing) continue;

      const msgResp = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full'
      });

      const headers = msgResp.data.payload.headers || [];
      const getHeader = (name) => 
        headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value;

      const inReplyTo = getHeader('In-Reply-To');
      const references = getHeader('References') || '';
      const subject = getHeader('Subject') || '';
      const from = getHeader('From') || '';

      // Try to match this message to one of our sent outbox records
      let matchedOutboxId = null;

      // Best match: In-Reply-To header matches a providerMessageId
      if (inReplyTo) {
        const cleaned = inReplyTo.replace(/[<>]/g, '').trim();
        if (messageIdMap.has(cleaned)) {
          matchedOutboxId = messageIdMap.get(cleaned);
        }
      }

      // Fallback: subject is "Re: <our subject>"
      if (!matchedOutboxId) {
        const normalized = normalizeSubject(subject);
        if (subjectMap.has(normalized)) {
          matchedOutboxId = subjectMap.get(normalized);
        }
      }

      // Fallback: References header contains one of our message IDs
      if (!matchedOutboxId && references) {
        for (const [ourMsgId, outboxId] of messageIdMap.entries()) {
          if (references.includes(ourMsgId)) {
            matchedOutboxId = outboxId;
            break;
          }
        }
      }

      // No match = not a reply to one of our emails
      if (!matchedOutboxId) continue;

      // Resolve application linkage from outbox record
      let applicationId = null;
      try {
        const outboxDoc = await Outbox.findById(matchedOutboxId)
          .select('relatedGrant')
          .lean();
        applicationId = outboxDoc?.relatedGrant || null;
        logger.info(`[ReplyPoll] Resolved applicationId: ${applicationId} from outbox ${matchedOutboxId}`);
      } catch (err) {
        logger.warn(`[ReplyPoll] Could not resolve applicationId: ${err.message}`);
      }

      // Extract body
      const { textBody, htmlBody } = extractBodies(msgResp.data.payload);

      // Save reply
      const savedReply = await Reply.create({
        outboxId: matchedOutboxId,
        organizationId: org._id,
        from,
        subject,
        body: textBody,
        htmlBody,
        receivedAt: new Date(parseInt(msgResp.data.internalDate)),
        gmailMessageId: messageId
      });

      foundCount++;
      logger.info(`[ReplyPoll] Reply saved: ${savedReply._id} from ${from} re: "${subject}"`);

      // Write inbound record to CommunicationLog — non-blocking
      if (applicationId) {
        CommunicationLog.create({
          application: applicationId,
          organization: org._id,
          type: 'email_received',
          direction: 'inbound',
          subject: subject || '(No subject)',
          body: textBody || htmlBody || '(No body)',
          fromAddress: from,
          messageId: messageId,
          outboxId: matchedOutboxId,
          ashleenSuggestion: null, // populated later by Ashleen
          ashlynSuggestion: null,  // populated later (legacy field)
          visibleToAgency: true,
          createdByRole: 'system',
          createdByName: 'Ashleen (Auto-detected)',
          receivedAt: new Date(parseInt(msgResp.data.internalDate)),
        }).then(commLog => {
          logger.info(`[ReplyPoll] CommunicationLog written: ${commLog._id} for reply ${savedReply._id}`);
          // Store the commLog ID on the reply for later Ashleen update
          Reply.findByIdAndUpdate(savedReply._id, { 
            $set: { commLogId: commLog._id } 
          }).catch(() => {});
        }).catch(err => {
          logger.warn(`[ReplyPoll] Failed to write CommunicationLog: ${err.message}`);
        });
      } else {
        logger.warn(`[ReplyPoll] Skipping CommunicationLog write — no applicationId resolved for reply ${savedReply._id}`);
      }

      logger.info(`[ReplyPoll] Ashleen analysis triggered for reply ${savedReply._id}`);
      // Fire Ashleen analysis — non-blocking, non-fatal
      generateAshleenSuggestion(savedReply._id.toString()).catch((err) => {
        logger.warn(`[AshleenReply] Background analysis failed: ${err.message}`);
      });
    } catch (err) {
      // Per-message errors don't kill the whole poll
      logger.error(`[ReplyPoll] Failed message ${messageId}: ${err.message}`);
    }
  }

  return foundCount;
}

function normalizeSubject(subject) {
  return subject
    .replace(/^(Re:\s*)+/i, '')
    .replace(/^(Fwd:\s*)+/i, '')
    .trim()
    .toLowerCase();
}

function extractBodies(payload) {
  let textBody = '';
  let htmlBody = '';

  function walk(part) {
    if (!part) return;
    if (part.mimeType === 'text/plain' && part.body?.data) {
      textBody += Buffer.from(part.body.data, 'base64').toString('utf8');
    } else if (part.mimeType === 'text/html' && part.body?.data) {
      htmlBody += Buffer.from(part.body.data, 'base64').toString('utf8');
    }
    if (part.parts) {
      for (const p of part.parts) walk(p);
    }
  }

  walk(payload);
  return { textBody, htmlBody };
}

module.exports = { pollAllAgencies, pollAgencyInbox };
