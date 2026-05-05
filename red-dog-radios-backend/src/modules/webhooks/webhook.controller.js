const asyncHandler = require('../../utils/asyncHandler');
const { success } = require('../../utils/apiResponse');
const CommunicationLog = require('../communication-log/communication-log.schema');
const Application = require('../applications/application.schema');
const Outbox = require('../outbox/outbox.schema');
const activityLogService = require('../activityLogs/activityLog.service');
const { generateSuggestedReply } = require('../ashleen/ashleen.service');

const handleInboundReply = asyncHandler(async (req, res) => {
  console.log('[Inbound Webhook] Received payload:', req.body);

  // 1. Extract fields. Handle both SendGrid and Postmark payload structures
  let fromAddress, toAddress, subject, body, replyToHeader, inReplyTo;

  if (req.body.FromFull || req.body.FromName) {
    // Postmark format
    fromAddress = req.body.FromFull ? req.body.FromFull.Email : req.body.From;
    toAddress = req.body.ToFull ? req.body.ToFull[0]?.Email : req.body.To;
    subject = req.body.Subject;
    body = req.body.TextBody || req.body.HtmlBody || '';
    replyToHeader = req.body.ReplyTo;
    
    // In-Reply-To header extraction for Postmark
    if (req.body.Headers && Array.isArray(req.body.Headers)) {
      const inReplyToHeader = req.body.Headers.find(h => h.Name.toLowerCase() === 'in-reply-to');
      if (inReplyToHeader) inReplyTo = inReplyToHeader.Value;
    }
  } else {
    // SendGrid format (assuming req.body is populated by some middleware or it's JSON)
    fromAddress = req.body.from;
    toAddress = req.body.to;
    subject = req.body.subject;
    body = req.body.text || req.body.html || '';
    
    // SendGrid passes headers as a string
    if (req.body.headers) {
      const headerLines = req.body.headers.split('\n');
      const inReplyToLine = headerLines.find(line => line.toLowerCase().startsWith('in-reply-to:'));
      if (inReplyToLine) inReplyTo = inReplyToLine.split(':')[1]?.trim();
    }
  }

  if (!fromAddress || !toAddress) {
    console.error('[Inbound Webhook] Missing from or to address');
    return res.status(400).send('Missing required fields');
  }

  // 2. Identify the application
  let applicationId;
  
  // Try alias tag: replies+APP-{id}@domain.com
  const aliasMatch = toAddress.match(/\+APP-([a-zA-Z0-9]+)@/i);
  if (aliasMatch && aliasMatch[1]) {
    applicationId = aliasMatch[1];
    console.log(`[Inbound Webhook] Matched Application ID from alias: ${applicationId}`);
  }

  // Try In-Reply-To fallback
  if (!applicationId && inReplyTo) {
    console.log(`[Inbound Webhook] No alias match, checking In-Reply-To: ${inReplyTo}`);
    // Find communication log or outbox with this messageId
    const cleanMessageId = inReplyTo.replace(/[<>]/g, '');
    const outboxRecord = await Outbox.findOne({ providerMessageId: { $regex: cleanMessageId, $options: 'i' } });
    if (outboxRecord && outboxRecord.relatedGrant) {
      applicationId = outboxRecord.relatedGrant;
      console.log(`[Inbound Webhook] Matched Application ID from In-Reply-To outbox record: ${applicationId}`);
    } else {
      const logRecord = await CommunicationLog.findOne({ messageId: { $regex: cleanMessageId, $options: 'i' } });
      if (logRecord && logRecord.application) {
        applicationId = logRecord.application;
        console.log(`[Inbound Webhook] Matched Application ID from In-Reply-To communication log: ${applicationId}`);
      }
    }
  }

  if (!applicationId) {
    console.error('[Inbound Webhook] Could not match to an application');
    return res.status(200).send('Ignored - no application matched');
  }

  // Get Application to find Funder & Agency
  const app = await Application.findById(applicationId).populate('opportunity').populate('organization');
  if (!app) {
    console.error('[Inbound Webhook] Application not found:', applicationId);
    return res.status(200).send('Ignored - application not found');
  }

  const funderId = app.opportunity ? app.opportunity.funder : null;
  const agencyId = app.organization ? app.organization._id : null;

  // 3. Write record to communication_log
  const logEntry = await CommunicationLog.create({
    application: applicationId,
    organization: agencyId,
    funder: funderId,
    type: 'email_received',
    direction: 'inbound',
    subject: subject || 'No Subject',
    body: body,
    fromAddress: fromAddress,
    toAddress: toAddress,
    messageId: inReplyTo ? inReplyTo.replace(/[<>]/g, '') : undefined,
    visibleToAgency: true,
    createdByName: fromAddress,
    createdByRole: 'system',
    withParty: fromAddress
  });

  console.log(`[Inbound Webhook] Logged inbound communication ${logEntry._id}`);

  // 4. Call Ashlyn's AI prompt
  try {
    // Get communication history for context
    const history = await CommunicationLog.find({ application: applicationId }).sort({ createdAt: 1 }).lean();
    const historyText = history.map(h => `[${h.direction === 'inbound' ? 'Funder' : 'Agency'}] ${h.subject}\n${h.body}`).join('\n\n');

    let suggestion = '';
    let flags = [];
    
    if (typeof generateSuggestedReply === 'function') {
      const aiResult = await generateSuggestedReply({
        funderEmailBody: body,
        historyText,
        agencyProfile: app.organization,
        applicationDetails: app
      });
      suggestion = aiResult.suggestion;
      flags = aiResult.flags || [];
    } else {
      suggestion = "This is a placeholder suggestion. Please implement generateSuggestedReply in ashleen.service.js.";
      flags = ['requires_review'];
    }

    logEntry.ashlynSuggestion = suggestion;
    logEntry.ashlynFlags = flags;
    // For backwards compatibility with existing UI if needed
    logEntry.ashleenSuggestion = suggestion;
    logEntry.ashleenFlags = flags;
    
    await logEntry.save();
    console.log(`[Inbound Webhook] Generated Ashlyn suggestion for log ${logEntry._id}`);
  } catch (err) {
    console.error('[Inbound Webhook] Failed to generate Ashlyn suggestion:', err);
  }

  // 5. Send notification to admin dashboard
  await activityLogService.log({
    category: 'communication',
    action: 'inbound_reply',
    summary: `New inbound reply received for Application ${app.projectTitle || applicationId}`,
    meta: { applicationId, agencyId, funderId, communicationLogId: logEntry._id }
  });

  return success(res, { logId: logEntry._id, message: 'Inbound reply processed successfully' });
});

module.exports = {
  handleInboundReply
};
