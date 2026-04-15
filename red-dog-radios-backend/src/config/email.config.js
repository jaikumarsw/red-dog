const { sendEmail } = require('./resend.config');

// Main send function — same interface as before
const send = async ({ to, subject, html, text }) => {
  return await sendEmail({ to, subject, html, text });
};

// Named email functions for specific events
const sendPasswordResetEmail = async ({ to, otp, name }) => {
  return await send({
    to,
    subject: 'Reset your Red Dog password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #ef3e34; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Red Dog Radios</h1>
          <p style="color: rgba(255,255,255,0.8); margin: 4px 0 0;">Grant Intelligence for Public Safety</p>
        </div>
        <div style="padding: 32px; background: #fff; border: 1px solid #e5e7eb;">
          <h2 style="color: #111827; margin-top: 0;">Password Reset</h2>
          <p style="color: #374151;">Hi ${name || 'there'},</p>
          <p style="color: #374151;">Your one-time password reset code is:</p>
          <div style="background: #f3f4f6; border-radius: 8px; padding: 24px;
            text-align: center; margin: 24px 0;">
            <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px;
              color: #ef3e34;">${otp}</span>
          </div>
          <p style="color: #6b7280; font-size: 14px;">
            This code expires in 15 minutes. If you did not request this,
            ignore this email.
          </p>
        </div>
        <div style="padding: 16px; text-align: center; background: #f9fafb;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            Red Dog Grant Intelligence — For Public Safety Agencies
          </p>
        </div>
      </div>
    `,
  });
};

const sendWelcomeEmail = async ({ to, name, agencyName }) => {
  return await send({
    to,
    subject: 'Welcome to Red Dog Grant Intelligence',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #ef3e34; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Red Dog Radios</h1>
          <p style="color: rgba(255,255,255,0.8); margin: 4px 0 0;">Grant Intelligence for Public Safety</p>
        </div>
        <div style="padding: 32px; background: #fff; border: 1px solid #e5e7eb;">
          <h2 style="color: #111827; margin-top: 0;">
            Welcome, ${name || 'there'}! 🎉
          </h2>
          <p style="color: #374151;">
            ${agencyName ? `<strong>${agencyName}</strong> is now set up on` : 'You are now on'}
            Red Dog Grant Intelligence.
          </p>
          <p style="color: #374151;">Here is what you can do now:</p>
          <ul style="color: #374151; line-height: 1.8;">
            <li>Browse matched grant opportunities</li>
            <li>Generate AI-written applications in seconds</li>
            <li>Track submissions and follow-ups</li>
            <li>Get alerts before deadlines</li>
          </ul>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard"
              style="background: #ef3e34; color: white; padding: 12px 32px;
              border-radius: 8px; text-decoration: none; font-weight: bold;">
              Go to Dashboard
            </a>
          </div>
        </div>
      </div>
    `,
  });
};

const sendApplicationStatusEmail = async ({ to, name, agencyName, opportunityTitle, status, note }) => {
  const statusMessages = {
    approved: {
      subject: 'Your application has been approved',
      color: '#16a34a',
      emoji: '✅',
      message: 'Great news! Your grant application has been reviewed and approved by Red Dog staff.',
    },
    awarded: {
      subject: `Congratulations — Grant Awarded!`,
      color: '#d97706',
      emoji: '🏆',
      message: 'Congratulations! Your grant application has been awarded. This is a huge win for your agency!',
    },
    rejected: {
      subject: 'Application status update',
      color: '#dc2626',
      emoji: '📋',
      message: 'Your grant application has been reviewed. Unfortunately it was not selected at this time.',
    },
  };

  const info = statusMessages[status] || {
    subject: 'Application status update',
    color: '#6b7280',
    emoji: '📋',
    message: `Your application status has been updated to: ${status}`,
  };

  return await send({
    to,
    subject: info.subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #ef3e34; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Red Dog Radios</h1>
        </div>
        <div style="padding: 32px; background: #fff; border: 1px solid #e5e7eb;">
          <h2 style="color: ${info.color}; margin-top: 0;">
            ${info.emoji} ${info.subject}
          </h2>
          <p style="color: #374151;">Hi ${name || 'there'},</p>
          <p style="color: #374151;">${info.message}</p>
          <div style="background: #f9fafb; border-radius: 8px; padding: 16px;
            margin: 24px 0; border-left: 4px solid ${info.color};">
            <p style="margin: 0; font-weight: bold; color: #111827;">
              ${opportunityTitle || 'Grant Application'}
            </p>
            ${agencyName
              ? `<p style="margin: 4px 0 0; color: #6b7280; font-size: 14px;">
                  ${agencyName}
                </p>`
              : ''}
          </div>
          ${note ? `<p style="color: #374151;"><strong>Note from staff:</strong> ${note}</p>` : ''}
          <div style="text-align: center; margin: 32px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/applications"
              style="background: #ef3e34; color: white; padding: 12px 32px;
              border-radius: 8px; text-decoration: none; font-weight: bold;">
              View Application
            </a>
          </div>
        </div>
      </div>
    `,
  });
};

const sendDeadlineAlertEmail = async ({ to, name, opportunityTitle, deadline, daysLeft }) => {
  return await send({
    to,
    subject: `⏰ Deadline in ${daysLeft} days — ${opportunityTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #ef3e34; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Red Dog Radios</h1>
        </div>
        <div style="padding: 32px; background: #fff; border: 1px solid #e5e7eb;">
          <h2 style="color: #d97706; margin-top: 0;">
            ⏰ Deadline Approaching
          </h2>
          <p style="color: #374151;">Hi ${name || 'there'},</p>
          <p style="color: #374151;">
            You have a grant deadline coming up in
            <strong>${daysLeft} day${daysLeft !== 1 ? 's' : ''}</strong>.
          </p>
          <div style="background: #fef3c7; border-radius: 8px; padding: 16px;
            margin: 24px 0; border-left: 4px solid #d97706;">
            <p style="margin: 0; font-weight: bold; color: #111827;">
              ${opportunityTitle}
            </p>
            <p style="margin: 4px 0 0; color: #6b7280; font-size: 14px;">
              Deadline: ${new Date(deadline).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/applications"
              style="background: #ef3e34; color: white; padding: 12px 32px;
              border-radius: 8px; text-decoration: none; font-weight: bold;">
              View Applications
            </a>
          </div>
        </div>
      </div>
    `,
  });
};

const sendWeeklyDigestEmail = async ({ to, name, orgName, html }) => {
  return await send({
    to,
    subject: `Your Weekly Grant Digest — ${orgName || 'Red Dog Intelligence'}`,
    html:
      html ||
      `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #ef3e34; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0;">Red Dog Radios</h1>
          <p style="color: rgba(255,255,255,0.8); margin: 4px 0 0;">
            Weekly Grant Digest
          </p>
        </div>
        <div style="padding: 32px; background: #fff; border: 1px solid #e5e7eb;">
          <p style="color: #374151;">Hi ${name || 'there'},</p>
          <p style="color: #374151;">
            Here is your weekly grant intelligence summary for
            ${orgName || 'your agency'}.
          </p>
        </div>
      </div>
    `,
  });
};

module.exports = {
  send,
  sendEmail: send,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendApplicationStatusEmail,
  sendDeadlineAlertEmail,
  sendWeeklyDigestEmail,
};
