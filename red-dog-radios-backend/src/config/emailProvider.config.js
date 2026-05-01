'use strict';

const nodemailer = require('nodemailer');
const Organization = require('../modules/organizations/organization.schema');
const logger = require('../utils/logger');
const { getValidAccessToken, sendViaGmail } = require('./gmail.config');

let transporter = null;

const initTransporter = () => {
  if (transporter) return transporter;

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('[Email] SMTP_USER or SMTP_PASS not set — emails will not send');
    return null;
  }

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  console.log('[Email] Nodemailer ready →', process.env.SMTP_USER);
  return transporter;
};

const sendViaSmtp = async ({ to, subject, html, text, replyTo, senderName }) => {
  try {
    console.log('[Email] Sending to:', to, '| Subject:', subject);

    const transport = initTransporter();
    if (!transport) {
      console.warn('[Email] No transporter — email NOT sent');
      return { success: false, stub: true, sentViaGmail: false };
    }

    // DEV MODE: redirect all emails to DEV_REDIRECT_EMAIL if set
    const isDev = process.env.NODE_ENV !== 'production';
    const originalTo = Array.isArray(to) ? to[0] : to;
    const devRedirect = process.env.DEV_REDIRECT_EMAIL;
    const actualTo = isDev && devRedirect ? devRedirect : originalTo;

    let finalSubject = subject || 'Red Dog Notification';
    if (isDev && devRedirect && originalTo !== devRedirect) {
      finalSubject = `[DEV → ${originalTo}] ${finalSubject}`;
      console.log('[Email] DEV redirect:', originalTo, '→', devRedirect);
    }

    // Use the sender's name if provided, otherwise fall back to a neutral brand name.
    const displayName = (senderName || '').trim() || 'Red Dog Grant Intelligence';
    const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER;

    const info = await transport.sendMail({
      from: `"${displayName}" <${fromAddress}>`,
      to: actualTo,
      subject: finalSubject,
      replyTo: replyTo || undefined,
      html: html || '<p>' + (text || '') + '</p>',
    });

    console.log('[Email] Sent! MessageId:', info.messageId);
    return { success: true, id: info.messageId, sentViaGmail: false };
  } catch (err) {
    console.error('[Email] Failed:', err.message);
    return { success: false, error: err.message, sentViaGmail: false };
  }
};

/**
 * sendEmail
 * - If organizationId is provided and org has Gmail OAuth connected → send via Gmail API (OAuth2)
 * - Otherwise → fallback to SMTP (nodemailer)
 */
const sendEmail = async ({ to, subject, html, text, replyTo, senderName, organizationId }) => {
  try {
    if (organizationId) {
      try {
        const org = await Organization.findById(organizationId).select('gmailOAuth email name');
        if (org?.gmailOAuth?.isConnected && org?.gmailOAuth?.senderEmail) {
          const senderEmail = org.gmailOAuth.senderEmail;
          const accessToken = await getValidAccessToken(org);
          const result = await sendViaGmail({
            accessToken,
            senderEmail,
            to,
            subject,
            htmlBody: html || '<p>' + (text || '') + '</p>',
            replyTo,
          });
          return { success: true, id: result.messageId, sentViaGmail: true, senderEmail };
        }
      } catch (gmailErr) {
        logger.error('[EmailProvider] Gmail send failed, falling back to SMTP:', gmailErr.message);
      }
    }

    return await sendViaSmtp({ to, subject, html, text, replyTo, senderName });
  } catch (err) {
    logger.error('[EmailProvider] sendEmail failed:', err.message);
    return { success: false, error: err.message, sentViaGmail: false };
  }
};

module.exports = { sendEmail };

