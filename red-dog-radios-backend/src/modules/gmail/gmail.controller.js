'use strict';

const asyncHandler = require('../../utils/asyncHandler');
const { success } = require('../../utils/apiResponse');
const gmailService = require('./gmail.service');
const { AppError } = require('../../middlewares/error.middleware');
const { resolveAndNotify } = require('../../utils/replyRouter');
const Organization = require('../organizations/organization.schema');
const logger = require('../../utils/logger');
const { google } = require('googleapis');
const { getValidAccessToken } = require('../../config/gmail.config');

const oauthConnect = asyncHandler(async (req, res) => {
  const organizationId = req.query.organizationId || req.body?.organizationId;
  if (!organizationId) throw new AppError('organizationId is required', 400);
  const url = await gmailService.getConnectUrl(organizationId);
  return success(res, { url }, 'Google OAuth URL generated');
});

const oauthCallback = asyncHandler(async (req, res) => {
  const code = req.query.code;
  const organizationId = req.query.state; // state = organizationId

  await gmailService.handleOAuthCallback({ organizationId, code });

  const frontend = process.env.FRONTEND_URL || 'http://localhost:3000';
  return res.redirect(`${frontend}/settings/agency?connected=true`);
});

const oauthStatus = asyncHandler(async (req, res) => {
  const result = await gmailService.getStatus(req.params.organizationId);
  return success(res, result, 'Gmail OAuth status retrieved');
});

const oauthDisconnect = asyncHandler(async (req, res) => {
  const result = await gmailService.disconnect(req.params.organizationId);
  return success(res, result, 'Gmail OAuth disconnected');
});

const replyWebhook = asyncHandler(async (req, res) => {
  const { replyTo, from, subject, body } = req.body || {};
  if (!replyTo) throw new AppError('replyTo is required', 400);

  await resolveAndNotify(replyTo, { from, subject, body });
  return success(res, { ok: true }, 'Reply processed');
});

const headerValue = (payload, name) => {
  const headers = payload?.headers || [];
  const h = headers.find((x) => String(x?.name || '').toLowerCase() === name.toLowerCase());
  return h?.value || '';
};

const decodeB64 = (data) => {
  if (!data) return '';
  const cleaned = String(data).replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(cleaned, 'base64').toString('utf8');
};

const extractBodies = (payload) => {
  let text = '';
  let html = '';

  const walk = (part) => {
    if (!part) return;
    const mime = part.mimeType || '';
    const bodyData = part.body?.data;
    if (bodyData && (mime === 'text/plain' || mime === 'text/html')) {
      const decoded = decodeB64(bodyData);
      if (mime === 'text/plain') text = text || decoded;
      if (mime === 'text/html') html = html || decoded;
    }
    const parts = part.parts || [];
    for (const p of parts) walk(p);
  };

  walk(payload);
  return { text, html };
};

const gmailPushWebhook = asyncHandler(async (req, res) => {
  // Always return 200 OK so Pub/Sub does not retry on logic issues.
  try {
    const dataB64 = req.body?.message?.data;
    if (!dataB64) {
      return res.status(200).json({ ok: true });
    }

    const decoded = JSON.parse(Buffer.from(dataB64, 'base64').toString('utf8'));
    const emailAddress = decoded?.emailAddress;
    const pushedHistoryId = decoded?.historyId ? String(decoded.historyId) : null;

    if (!emailAddress) {
      return res.status(200).json({ ok: true });
    }

    const org = await Organization.findOne({ 'gmailOAuth.senderEmail': emailAddress });
    if (!org || !org.gmailOAuth?.isConnected) {
      return res.status(200).json({ ok: true });
    }

    const accessToken = await getValidAccessToken(org);
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    auth.setCredentials({ access_token: accessToken });
    const gmail = google.gmail({ version: 'v1', auth });

    const startHistoryId = org.gmailOAuth?.historyId || pushedHistoryId;
    if (!startHistoryId) {
      logger.warn('[GmailPush] Missing startHistoryId for org:', org._id);
      return res.status(200).json({ ok: true });
    }

    const historyResp = await gmail.users.history.list({
      userId: 'me',
      startHistoryId: String(startHistoryId),
      historyTypes: ['messageAdded'],
      labelId: 'INBOX',
    });

    const histories = historyResp?.data?.history || [];
    const newHistoryId = historyResp?.data?.historyId ? String(historyResp.data.historyId) : null;

    for (const h of histories) {
      const added = h?.messagesAdded || [];
      for (const ma of added) {
        const messageId = ma?.message?.id;
        if (!messageId) continue;

        try {
          const msgResp = await gmail.users.messages.get({
            userId: 'me',
            id: messageId,
            format: 'full',
          });
          const payload = msgResp?.data?.payload;
          const from = headerValue(payload, 'From');
          const subject = headerValue(payload, 'Subject');
          const replyTo = headerValue(payload, 'Reply-To');
          const to = headerValue(payload, 'To');

          const addressBlob = `${replyTo} ${to}`.trim();
          const match = addressBlob.match(/grant-[a-f0-9]{24}@[^>\s]+/i);
          if (!match) continue;

          const { text, html } = extractBodies(payload);

          await resolveAndNotify(match[0], {
            from,
            subject,
            body: text || '',
            htmlBody: html || null,
            messageId: String(messageId),
          });
        } catch (e) {
          logger.error('[GmailPush] message processing failed:', e.message);
        }
      }
    }

    if (newHistoryId) {
      await Organization.findByIdAndUpdate(org._id, {
        $set: { 'gmailOAuth.historyId': newHistoryId },
      });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    logger.error('[GmailPush] webhook failed:', err.message);
    return res.status(200).json({ ok: true });
  }
});

module.exports = {
  oauthConnect,
  oauthCallback,
  oauthStatus,
  oauthDisconnect,
  replyWebhook,
  gmailPushWebhook,
};

