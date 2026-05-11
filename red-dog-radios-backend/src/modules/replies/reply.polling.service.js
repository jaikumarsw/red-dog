const { google } = require('googleapis');
const Organization = require('../organizations/organization.schema');
const Outbox = require('../outbox/outbox.schema');
const CommunicationLog = require('../communication-log/communication-log.schema');
const Reply = require('./reply.schema');
const { getValidAccessToken } = require('../../config/gmail.config');
const { getNylasClient } = require('../../config/nylas.config');
const logger = require('../../utils/logger');

const { generateAshleenSuggestion } = require('./reply.ai.service');

/**
 * For each connected agency, fetch recent inbox messages and
 * detect any that are replies to emails we sent.
 * Supports Nylas-connected orgs (any provider) and legacy Gmail OAuth orgs.
 */
async function pollAllAgencies() {
  const [nylasOrgs, gmailOrgs] = await Promise.all([
    Organization.find({
      'nylasGrant.isConnected': true,
      'nylasGrant.grantId': { $exists: true, $ne: null },
    }).select('_id name nylasGrant'),
    Organization.find({
      'gmailOAuth.isConnected': true,
      'gmailOAuth.accessToken': { $exists: true, $ne: null },
      'nylasGrant.isConnected': { $ne: true },
    }).select('_id name gmailOAuth'),
  ]);

  logger.info(`[ReplyPoll] Polling ${nylasOrgs.length + gmailOrgs.length} connected agencies (Nylas: ${nylasOrgs.length}, Gmail: ${gmailOrgs.length})`);

  const results = { processed: 0, repliesFound: 0, errors: 0 };

  for (const org of nylasOrgs) {
    try {
      const found = await pollAgencyInboxNylas(org);
      results.processed++;
      results.repliesFound += found;
    } catch (err) {
      logger.error(`[ReplyPoll/Nylas] Failed for org ${org._id}: ${err.message}`);
      results.errors++;
    }
  }

  for (const org of gmailOrgs) {
    try {
      const found = await pollAgencyInboxGmail(org);
      results.processed++;
      results.repliesFound += found;
    } catch (err) {
      logger.error(`[ReplyPoll/Gmail] Failed for org ${org._id}: ${err.message}`);
      results.errors++;
    }
  }

  logger.info(`[ReplyPoll] Done. ${JSON.stringify(results)}`);
  return results;
}

// ---------------------------------------------------------------------------
// Shared helper — write CommunicationLog and trigger Ashleen
// ---------------------------------------------------------------------------
async function saveCommLogAndTriggerAshleen({ savedReply, applicationId, org, subject, textBody, htmlBody, messageId, receivedAt }) {
  if (applicationId) {
    try {
      const commLog = await CommunicationLog.create({
        application: applicationId,
        organization: org._id,
        type: 'email_received',
        direction: 'inbound',
        subject: subject || '(No subject)',
        body: textBody || htmlBody || '(No body)',
        fromAddress: savedReply.from,
        messageId,
        outboxId: savedReply.outboxId,
        ashleenSuggestion: null,
        ashlynSuggestion: null,
        visibleToAgency: true,
        createdByRole: 'system',
        createdByName: 'Ashleen (Auto-detected)',
        receivedAt,
      });

      await Reply.findByIdAndUpdate(savedReply._id, { $set: { commLogId: commLog._id } });
      logger.info(`[ReplyPoll] CommunicationLog ${commLog._id} written and linked to reply ${savedReply._id}`);
    } catch (err) {
      logger.warn(`[ReplyPoll] Failed to write CommunicationLog: ${err.message}`);
    }
  } else {
    logger.warn(`[ReplyPoll] Skipping CommunicationLog — no applicationId for reply ${savedReply._id}`);
  }

  generateAshleenSuggestion(savedReply._id.toString()).catch((err) => {
    logger.warn(`[AshleenReply] Background analysis failed: ${err.message}`);
  });
}

// ---------------------------------------------------------------------------
// Nylas polling (Gmail, Outlook, Yahoo, IMAP, etc.)
// ---------------------------------------------------------------------------
async function pollAgencyInboxNylas(org) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const sentMessages = await Outbox.find({
    relatedOrganization: org._id,
    status: 'sent',
    sentAt: { $gte: thirtyDaysAgo },
  }).select('_id subject providerMessageId recipient sentAt');

  if (sentMessages.length === 0) return 0;

  const subjectMap = new Map();
  const messageIdMap = new Map();
  for (const msg of sentMessages) {
    if (msg.subject) subjectMap.set(normalizeSubject(msg.subject), msg._id);
    if (msg.providerMessageId) messageIdMap.set(msg.providerMessageId, msg._id);
  }

  const nylas = getNylasClient();
  const grantId = org.nylasGrant.grantId;
  const receivedAfter = Math.floor(thirtyDaysAgo.getTime() / 1000);

  const { data: messages } = await nylas.messages.list({
    identifier: grantId,
    queryParams: { in: 'inbox', limit: 100, receivedAfter, fields: 'include_headers' },
  });

  if (!messages || messages.length === 0) return 0;

  let foundCount = 0;

  for (const msg of messages) {
    try {
      const nylasMessageId = msg.id;
      if (await Reply.findOne({ nylasMessageId })) continue;

      const getHeader = (name) =>
        (msg.headers || []).find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || '';

      const inReplyTo = getHeader('in-reply-to');
      const references = getHeader('references');
      const subject = msg.subject || '';
      const from = msg.from?.[0]?.email
        ? `${msg.from[0].name || ''} <${msg.from[0].email}>`.trim()
        : '';

      let matchedOutboxId = null;
      if (inReplyTo) {
        const cleaned = inReplyTo.replace(/[<>]/g, '').trim();
        if (messageIdMap.has(cleaned)) matchedOutboxId = messageIdMap.get(cleaned);
      }
      if (!matchedOutboxId) {
        const normalized = normalizeSubject(subject);
        if (subjectMap.has(normalized)) matchedOutboxId = subjectMap.get(normalized);
      }
      if (!matchedOutboxId && references) {
        for (const [ourMsgId, outboxId] of messageIdMap.entries()) {
          if (references.includes(ourMsgId)) { matchedOutboxId = outboxId; break; }
        }
      }
      if (!matchedOutboxId) continue;

      let applicationId = null;
      try {
        const outboxDoc = await Outbox.findById(matchedOutboxId).select('relatedGrant').lean();
        applicationId = outboxDoc?.relatedGrant || null;
      } catch (err) {
        logger.warn(`[ReplyPoll/Nylas] Could not resolve applicationId: ${err.message}`);
      }

      const textBody = msg.body || '';
      const receivedAt = msg.date ? new Date(msg.date * 1000) : new Date();

      const savedReply = await Reply.create({
        outboxId: matchedOutboxId,
        organizationId: org._id,
        from,
        subject,
        body: textBody,
        htmlBody: textBody,
        receivedAt,
        nylasMessageId,
      });

      foundCount++;
      logger.info(`[ReplyPoll/Nylas] Reply saved: ${savedReply._id} from ${from}`);

      await saveCommLogAndTriggerAshleen({
        savedReply, applicationId, org, subject,
        textBody, htmlBody: textBody,
        messageId: nylasMessageId, receivedAt,
      });
    } catch (err) {
      logger.error(`[ReplyPoll/Nylas] Failed message ${msg.id}: ${err.message}`);
    }
  }

  return foundCount;
}

// ---------------------------------------------------------------------------
// Legacy Gmail OAuth polling
// ---------------------------------------------------------------------------
async function pollAgencyInboxGmail(org) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const sentMessages = await Outbox.find({
    relatedOrganization: org._id,
    status: 'sent',
    sentAt: { $gte: thirtyDaysAgo },
  }).select('_id subject providerMessageId recipient sentAt');

  if (sentMessages.length === 0) return 0;

  const subjectMap = new Map();
  const messageIdMap = new Map();
  for (const msg of sentMessages) {
    if (msg.subject) subjectMap.set(normalizeSubject(msg.subject), msg._id);
    if (msg.providerMessageId) messageIdMap.set(msg.providerMessageId, msg._id);
  }

  const accessToken = await getValidAccessToken(org);
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  const queryDate = Math.floor(thirtyDaysAgo.getTime() / 1000);
  const listResp = await gmail.users.messages.list({
    userId: 'me',
    q: `in:inbox after:${queryDate}`,
    maxResults: 100,
  });

  const messageIds = (listResp.data.messages || []).map((m) => m.id);
  if (messageIds.length === 0) return 0;

  let foundCount = 0;

  for (const messageId of messageIds) {
    try {
      if (await Reply.findOne({ gmailMessageId: messageId })) continue;

      const msgResp = await gmail.users.messages.get({ userId: 'me', id: messageId, format: 'full' });

      const headers = msgResp.data.payload.headers || [];
      const getHeader = (name) =>
        headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value;

      const inReplyTo = getHeader('In-Reply-To');
      const references = getHeader('References') || '';
      const subject = getHeader('Subject') || '';
      const from = getHeader('From') || '';

      let matchedOutboxId = null;
      if (inReplyTo) {
        const cleaned = inReplyTo.replace(/[<>]/g, '').trim();
        if (messageIdMap.has(cleaned)) matchedOutboxId = messageIdMap.get(cleaned);
      }
      if (!matchedOutboxId) {
        const normalized = normalizeSubject(subject);
        if (subjectMap.has(normalized)) matchedOutboxId = subjectMap.get(normalized);
      }
      if (!matchedOutboxId && references) {
        for (const [ourMsgId, outboxId] of messageIdMap.entries()) {
          if (references.includes(ourMsgId)) { matchedOutboxId = outboxId; break; }
        }
      }
      if (!matchedOutboxId) continue;

      let applicationId = null;
      try {
        const outboxDoc = await Outbox.findById(matchedOutboxId).select('relatedGrant').lean();
        applicationId = outboxDoc?.relatedGrant || null;
        logger.info(`[ReplyPoll/Gmail] Resolved applicationId: ${applicationId}`);
      } catch (err) {
        logger.warn(`[ReplyPoll/Gmail] Could not resolve applicationId: ${err.message}`);
      }

      const { textBody, htmlBody } = extractBodies(msgResp.data.payload);
      const receivedAt = new Date(parseInt(msgResp.data.internalDate));

      const savedReply = await Reply.create({
        outboxId: matchedOutboxId,
        organizationId: org._id,
        from,
        subject,
        body: textBody,
        htmlBody,
        receivedAt,
        gmailMessageId: messageId,
      });

      foundCount++;
      logger.info(`[ReplyPoll/Gmail] Reply saved: ${savedReply._id} from ${from} re: "${subject}"`);

      await saveCommLogAndTriggerAshleen({
        savedReply, applicationId, org, subject,
        textBody, htmlBody, messageId, receivedAt,
      });
    } catch (err) {
      logger.error(`[ReplyPoll/Gmail] Failed message ${messageId}: ${err.message}`);
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

module.exports = { pollAllAgencies, pollAgencyInboxNylas, pollAgencyInboxGmail };
