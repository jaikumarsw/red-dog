'use strict';

const Outbox = require('../modules/outbox/outbox.schema');
const Organization = require('../modules/organizations/organization.schema');
const User = require('../modules/auth/user.schema');
const Alert = require('../modules/alerts/alert.schema');
const Reply = require('../modules/replies/reply.schema');
const { sendEmail } = require('../config/email.config');
const logger = require('./logger');
const { advanceStage } = require('../modules/grants/grant.pipeline.service');

const parseGrantId = (emailAddress) => {
  try {
    if (!emailAddress || typeof emailAddress !== 'string') return null;
    const match = emailAddress.trim().match(/^grant-([a-f0-9]{24})@/i);
    return match ? match[1] : null;
  } catch (err) {
    logger.error('[ReplyRouter] parseGrantId failed:', err.message);
    return null;
  }
};

const resolveAndNotify = async (replyToAddress, incomingEmailBody) => {
  try {
    const outboxId = parseGrantId(replyToAddress);
    if (!outboxId) {
      logger.warn('[ReplyRouter] Could not parse outbox id from replyTo:', replyToAddress);
      return { ok: false, reason: 'invalid_reply_to' };
    }

    const record = await Outbox.findById(outboxId);
    if (!record) {
      logger.warn('[ReplyRouter] Outbox record not found for id:', outboxId);
      return { ok: false, reason: 'outbox_not_found' };
    }

    const [org, user] = await Promise.all([
      record.relatedOrganization ? Organization.findById(record.relatedOrganization).select('_id name') : null,
      record.relatedUser ? User.findById(record.relatedUser).select('_id email fullName firstName lastName') : null,
    ]);

    // 1) Save Reply record (dedupe by gmailMessageId)
    const messageId = incomingEmailBody?.messageId || null;
    let savedReply = null;
    if (messageId) {
      const exists = await Reply.findOne({ gmailMessageId: messageId }).select('_id');
      if (exists) {
        logger.info('[ReplyRouter] duplicate reply skipped:', messageId);
      } else {
        savedReply = await Reply.create({
          outboxId: record._id,
          organizationId: record.relatedOrganization,
          userId: record.relatedUser,
          from: incomingEmailBody?.from,
          subject: incomingEmailBody?.subject,
          body: incomingEmailBody?.body,
          htmlBody: incomingEmailBody?.htmlBody || null,
          gmailMessageId: messageId,
          receivedAt: new Date(),
        });
      }
    } else {
      savedReply = await Reply.create({
        outboxId: record._id,
        organizationId: record.relatedOrganization,
        userId: record.relatedUser,
        from: incomingEmailBody?.from,
        subject: incomingEmailBody?.subject,
        body: incomingEmailBody?.body,
        htmlBody: incomingEmailBody?.htmlBody || null,
        gmailMessageId: null,
        receivedAt: new Date(),
      });
    }

    if (record.relatedGrant) {
      try {
        await advanceStage(record.relatedGrant, 'reply_received', {
          changedBy: 'system',
          note: `Funder ${incomingEmailBody?.from || 'unknown'} replied`,
        });
      } catch (e) {
        logger.warn('[ReplyRouter] pipeline advance skipped:', e.message);
      }
    }

    if (user) {
      await Alert.create({
        organization: org?._id || record.relatedOrganization,
        user: user._id,
        orgName: org?.name,
        type: 'reply_received',
        priority: 'high',
        message: `Funder ${incomingEmailBody?.from || 'unknown'} replied to your outreach`,
      });

      // 4) Email notification to agency user (SMTP path — no org id)
      const snippet = String(incomingEmailBody?.body || '').slice(0, 300);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const link = `${frontendUrl}/outbox/${record._id}`;
      try {
        await sendEmail({
          to: user.email,
          subject: `New reply from funder: ${incomingEmailBody?.from || 'unknown'}`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px;">
              <h2 style="margin:0 0 12px;color:#111827;">New funder reply received</h2>
              <p style="margin:0 0 8px;color:#374151;"><strong>From:</strong> ${incomingEmailBody?.from || '—'}</p>
              <p style="margin:0 0 8px;color:#374151;"><strong>Original subject:</strong> ${record.subject || '—'}</p>
              <p style="margin:16px 0 8px;color:#374151;"><strong>Reply snippet:</strong></p>
              <div style="border:1px solid #e5e7eb;border-radius:10px;padding:12px;background:#f9fafb;color:#111827;white-space:pre-wrap;">${snippet || '(empty)'}</div>
              <p style="margin:16px 0 0;"><a href="${link}" style="color:#ef3e34;font-weight:700;text-decoration:none;">View in Outbox →</a></p>
            </div>
          `,
        });
      } catch (mailErr) {
        logger.error('[ReplyRouter] notification email failed:', mailErr.message);
      }
    }

    logger.info('[ReplyRouter] Reply received:', {
      replyTo: replyToAddress,
      outboxId,
      from: incomingEmailBody?.from,
      subject: incomingEmailBody?.subject,
      body: incomingEmailBody?.body,
    });

    return { ok: true, outboxId };
  } catch (err) {
    logger.error('[ReplyRouter] resolveAndNotify failed:', err.message);
    return { ok: false, reason: 'internal_error' };
  }
};

module.exports = { parseGrantId, resolveAndNotify };

