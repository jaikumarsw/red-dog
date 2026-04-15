'use strict';

const nodemailer = require('nodemailer');

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

const sendEmail = async ({ to, subject, html, text }) => {
  console.log('[Email] Sending to:', to, '| Subject:', subject);

  const transport = initTransporter();

  if (!transport) {
    console.warn('[Email] No transporter — email NOT sent');
    return { success: false, stub: true };
  }

  // DEV MODE: redirect all emails to admin inbox
  // so we can test without sending to real user emails
  const isDev = process.env.NODE_ENV !== 'production';
  const originalTo = Array.isArray(to) ? to[0] : to;
  // In dev, redirect to DEV_REDIRECT_EMAIL if set,
  // otherwise send to actual recipient (don't self-email)
  const devRedirect = process.env.DEV_REDIRECT_EMAIL;
  const actualTo = isDev && devRedirect ? devRedirect : originalTo;

  let finalSubject = subject || 'Red Dog Notification';
  if (isDev && devRedirect && originalTo !== devRedirect) {
    finalSubject = `[DEV → ${originalTo}] ${finalSubject}`;
    console.log('[Email] DEV redirect:', originalTo, '→', devRedirect);
  }

  try {
    const info = await transport.sendMail({
      from: '"Red Dog Radios" <' + (process.env.SMTP_FROM || process.env.SMTP_USER) + '>',
      to: actualTo,
      subject: finalSubject,
      html: html || '<p>' + (text || '') + '</p>',
    });

    console.log('[Email] Sent! MessageId:', info.messageId);
    return { success: true, id: info.messageId };
  } catch (err) {
    console.error('[Email] Failed:', err.message);
    return { success: false, error: err.message };
  }
};

module.exports = { sendEmail };

