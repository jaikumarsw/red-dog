const { Resend } = require('resend');

if (!process.env.RESEND_API_KEY) {
  console.warn('[Resend] RESEND_API_KEY not set — emails will not send');
}

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM = process.env.RESEND_FROM || 'onboarding@resend.dev';

const sendEmail = async ({ to, subject, html, text }) => {
  if (!resend) {
    console.warn('[Resend] Skipping email send — no API key configured');
    return { success: false, stub: true };
  }

  try {
    const result = await resend.emails.send({
      from: FROM,
      to: Array.isArray(to) ? to : [to],
      subject,
      html: html || `<p>${text || ''}</p>`,
    });

    console.log('[Resend] Email sent:', result.data?.id, '→', to);
    return { success: true, id: result.data?.id };
  } catch (err) {
    console.error('[Resend] Failed to send email:', err.message);
    return { success: false, error: err.message };
  }
};

module.exports = { sendEmail, resend, FROM };

