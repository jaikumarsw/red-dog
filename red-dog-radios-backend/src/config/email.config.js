'use strict';

const { sendEmail } = require('./emailProvider.config');

const sendOtpEmail = async ({ to, otp, name, type = 'signup' }) => {
  const isReset = type === 'reset';
  const subject = isReset ? 'Reset your Red Dog password' : 'Verify your Red Dog account';
  const heading = isReset ? 'Password Reset Code' : 'Email Verification Code';
  const message = isReset ? 'Use this code to reset your password:' : 'Use this code to verify your account:';

  return await sendEmail({
    to,
    subject,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="margin:0;padding:0;font-family:Arial,sans-serif;
        background:#f9fafb;">
        <div style="max-width:560px;margin:40px auto;background:#fff;
          border-radius:12px;overflow:hidden;
          border:1px solid #e5e7eb;box-shadow:0 2px 8px rgba(0,0,0,0.06);">

          <div style="background:#ef3e34;padding:28px;text-align:center;">
            <h1 style="color:#fff;margin:0;font-size:22px;font-weight:800;
              letter-spacing:1px;">RED DOG RADIOS</h1>
            <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;
              font-size:13px;">Grant Intelligence for Public Safety</p>
          </div>

          <div style="padding:40px 36px;">
            <h2 style="color:#111827;margin-top:0;font-size:20px;">
              ${heading}
            </h2>
            <p style="color:#374151;font-size:15px;line-height:1.6;">
              Hi ${name || 'there'},
            </p>
            <p style="color:#374151;font-size:15px;line-height:1.6;">
              ${message}
            </p>

            <div style="background:#f3f4f6;border-radius:12px;
              padding:32px;text-align:center;margin:28px 0;">
              <span style="font-size:48px;font-weight:900;
                letter-spacing:14px;color:#ef3e34;
                font-family:monospace;">${otp}</span>
            </div>

            <p style="color:#6b7280;font-size:13px;text-align:center;
              line-height:1.6;">
              This code expires in <strong>15 minutes</strong>.<br/>
              If you did not request this, ignore this email.
            </p>
          </div>

          <div style="background:#f9fafb;padding:20px;text-align:center;
            border-top:1px solid #e5e7eb;">
            <p style="color:#9ca3af;font-size:12px;margin:0;">
              Red Dog Grant Intelligence &middot; For Public Safety Agencies
            </p>
          </div>

        </div>
      </body>
      </html>
    `,
  });
};

const sendWelcomeEmail = async ({ to, name, agencyName }) => {
  return await sendEmail({
    to,
    subject: 'Welcome to Red Dog Grant Intelligence',
    html: `
      <!DOCTYPE html>
      <html>
      <body style="margin:0;padding:0;font-family:Arial,sans-serif;
        background:#f9fafb;">
        <div style="max-width:560px;margin:40px auto;background:#fff;
          border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">

          <div style="background:#ef3e34;padding:28px;text-align:center;">
            <h1 style="color:#fff;margin:0;font-size:22px;font-weight:800;">
              RED DOG RADIOS
            </h1>
          </div>

          <div style="padding:40px 36px;">
            <h2 style="color:#111827;margin-top:0;">
              Welcome, ${name || 'there'}! 🎉
            </h2>
            <p style="color:#374151;font-size:15px;">
              ${agencyName
                ? '<strong>' + agencyName + '</strong> is now set up on'
                : 'You are now on'}
              Red Dog Grant Intelligence.
            </p>
            <ul style="color:#374151;line-height:2.2;font-size:15px;">
              <li>Browse matched grant opportunities</li>
              <li>Generate AI-written applications instantly</li>
              <li>Track submissions and deadlines</li>
              <li>Get alerts before grants close</li>
            </ul>
            <div style="text-align:center;margin:36px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard"
                style="background:#ef3e34;color:#fff;padding:14px 40px;
                border-radius:8px;text-decoration:none;font-weight:700;
                font-size:15px;display:inline-block;">
                Go to Dashboard &rarr;
              </a>
            </div>
          </div>

          <div style="background:#f9fafb;padding:20px;text-align:center;
            border-top:1px solid #e5e7eb;">
            <p style="color:#9ca3af;font-size:12px;margin:0;">
              Red Dog Grant Intelligence &middot; For Public Safety Agencies
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
  });
};

const sendApplicationStatusEmail = async ({ to, name, agencyName, opportunityTitle, status, note }) => {
  const configs = {
    approved: {
      subject: 'Your application has been approved',
      color: '#16a34a',
      emoji: '✅',
      message: 'Your grant application has been reviewed and approved by Red Dog staff.',
    },
    awarded: {
      subject: 'Congratulations — Grant Awarded!',
      color: '#d97706',
      emoji: '🏆',
      message: 'Your grant application has been awarded! This is a huge win for your agency.',
    },
    rejected: {
      subject: 'Application status update',
      color: '#dc2626',
      emoji: '📋',
      message: 'Your application was reviewed but was not selected at this time.',
    },
  };

  const cfg = configs[status] || {
    subject: 'Application status update',
    color: '#6b7280',
    emoji: '📋',
    message: 'Your application status has been updated to: ' + status,
  };

  return await sendEmail({
    to,
    subject: cfg.emoji + ' ' + cfg.subject,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="margin:0;padding:0;font-family:Arial,sans-serif;
        background:#f9fafb;">
        <div style="max-width:560px;margin:40px auto;background:#fff;
          border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">

          <div style="background:#ef3e34;padding:28px;text-align:center;">
            <h1 style="color:#fff;margin:0;font-size:22px;font-weight:800;">
              RED DOG RADIOS
            </h1>
          </div>

          <div style="padding:40px 36px;">
            <h2 style="color:${cfg.color};margin-top:0;">
              ${cfg.emoji} ${cfg.subject}
            </h2>
            <p style="color:#374151;font-size:15px;">
              Hi ${name || 'there'},
            </p>
            <p style="color:#374151;font-size:15px;">${cfg.message}</p>

            <div style="background:#f9fafb;border-radius:8px;padding:20px;
              margin:24px 0;border-left:4px solid ${cfg.color};">
              <p style="margin:0;font-weight:700;color:#111827;font-size:15px;">
                ${opportunityTitle || 'Grant Application'}
              </p>
              ${agencyName
                ? '<p style="margin:6px 0 0;color:#6b7280;font-size:13px;">' +
                  agencyName + '</p>'
                : ''}
            </div>

            ${note
              ? '<p style="color:#374151;font-size:15px;">' +
                '<strong>Note from staff:</strong> ' + note + '</p>'
              : ''}

            <div style="text-align:center;margin:32px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/applications"
                style="background:#ef3e34;color:#fff;padding:14px 40px;
                border-radius:8px;text-decoration:none;font-weight:700;
                font-size:15px;display:inline-block;">
                View Application &rarr;
              </a>
            </div>
          </div>

          <div style="background:#f9fafb;padding:20px;text-align:center;
            border-top:1px solid #e5e7eb;">
            <p style="color:#9ca3af;font-size:12px;margin:0;">
              Red Dog Grant Intelligence &middot; For Public Safety Agencies
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
  });
};

const sendDeadlineAlertEmail = async ({ to, name, opportunityTitle, deadline, daysLeft }) => {
  return await sendEmail({
    to,
    subject: 'Deadline in ' + daysLeft + ' days — ' + opportunityTitle,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="margin:0;padding:0;font-family:Arial,sans-serif;
        background:#f9fafb;">
        <div style="max-width:560px;margin:40px auto;background:#fff;
          border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">

          <div style="background:#ef3e34;padding:28px;text-align:center;">
            <h1 style="color:#fff;margin:0;font-size:22px;font-weight:800;">
              RED DOG RADIOS
            </h1>
          </div>

          <div style="padding:40px 36px;">
            <h2 style="color:#d97706;margin-top:0;">
              ⏰ Deadline Approaching
            </h2>
            <p style="color:#374151;font-size:15px;">
              Hi ${name || 'there'},
            </p>
            <p style="color:#374151;font-size:15px;">
              You have a grant deadline in
              <strong>${daysLeft} day${daysLeft !== 1 ? 's' : ''}</strong>.
            </p>

            <div style="background:#fef3c7;border-radius:8px;padding:20px;
              margin:24px 0;border-left:4px solid #d97706;">
              <p style="margin:0;font-weight:700;color:#111827;font-size:15px;">
                ${opportunityTitle}
              </p>
              <p style="margin:6px 0 0;color:#6b7280;font-size:13px;">
                Deadline: ${deadline
                  ? new Date(deadline).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })
                  : 'Check dashboard'}
              </p>
            </div>

            <div style="text-align:center;margin:32px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/applications"
                style="background:#ef3e34;color:#fff;padding:14px 40px;
                border-radius:8px;text-decoration:none;font-weight:700;
                font-size:15px;display:inline-block;">
                View Applications &rarr;
              </a>
            </div>
          </div>

          <div style="background:#f9fafb;padding:20px;text-align:center;
            border-top:1px solid #e5e7eb;">
            <p style="color:#9ca3af;font-size:12px;margin:0;">
              Red Dog Grant Intelligence &middot; For Public Safety Agencies
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
  });
};

const sendPostAwardCongratsEmail = async ({ to, name, agencyName, funderName, awardAmount, applicationId }) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const responseUrl = `${frontendUrl}/applications/${applicationId}?action=respond`;

  const html = `
    <h2 style="color:#ef3e34;">Congratulations, ${name || agencyName}!</h2>
    <p>Outstanding news — your grant application to <strong>${funderName}</strong> has been <strong>awarded</strong>.</p>
    ${awardAmount ? `<p>Award amount: <strong>$${Number(awardAmount).toLocaleString()}</strong></p>` : ''}
    <p>This is a major win for ${agencyName} and the community you protect.</p>
    <h3>Quick Question — What Equipment Will You Be Purchasing?</h3>
    <p>Now that you have funding secured, we'd like to help you make the most of it. Could you reply and let us know what equipment you're planning to buy with these funds?</p>
    <p>For example:</p>
    <ul>
      <li>Portable radios (P25 Phase II compliant)</li>
      <li>Mobile radios for apparatus</li>
      <li>Repeaters or DAS for coverage</li>
      <li>Dispatch console upgrades</li>
      <li>Other communications equipment</li>
    </ul>
    <p><a href="${responseUrl}" style="display:inline-block;background:#ef3e34;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">Tell Us What You Need</a></p>
    <p>Red Dog Grant Intelligence specializes in P25 public safety radio systems. We'd love to make sure your award funding gets you the best equipment for your agency.</p>
    <p>Congratulations again — well deserved.</p>
    <p>— The Red Dog Team</p>
  `;

  return sendEmail({ to, subject: `🎉 Congratulations — ${funderName} grant awarded!`, html });
};

const sendPostAwardFollowUpEmail = async ({ to, name, agencyName, funderName, agencyResponse, applicationId }) => {
  const responseSection = agencyResponse
    ? `<p>You mentioned you're looking at: <em>"${agencyResponse}"</em></p>
       <p>Based on what you shared, here are our recommendations:</p>`
    : `<p>We haven't heard back yet on what equipment you're planning to purchase. Here are our top recommendations for fire and EMS agencies:</p>`;

  const html = `
    <h2 style="color:#ef3e34;">Equipment Recommendations for ${agencyName}</h2>
    <p>Hi ${name || 'Chief'},</p>
    <p>Following up on your <strong>${funderName}</strong> grant award. Now that you have funding in hand, let's make sure you spend it on equipment that actually solves your operational problems.</p>
    ${responseSection}
    <h3>Recommended P25 Radio Systems</h3>
    <ul>
      <li><strong>P25 Phase II Portable Radios</strong> — full encryption, multi-band, NFPA 1802 compliant</li>
      <li><strong>P25 Mobile Radios</strong> — apparatus-mounted, 110W output for rural/mountain coverage</li>
      <li><strong>Strategic Repeaters</strong> — extend coverage into dead zones, configured for your DTRS</li>
      <li><strong>Dispatch Console Integration</strong> — interoperability with neighboring agencies</li>
    </ul>
    <p>We can put together a quote tailored to your award amount and operational needs — including installation, programming, and training.</p>
    <p><a href="mailto:admin@reddogradios.com?subject=Equipment%20Quote%20-%20${encodeURIComponent(agencyName)}" style="display:inline-block;background:#ef3e34;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">Request a Quote</a></p>
    <p>Talk soon,</p>
    <p>— The Red Dog Team</p>
  `;

  return sendEmail({ to, subject: `Equipment recommendations for your ${funderName} award`, html });
};

const sendAdminAwardNotification = async ({ agencyName, funderName, awardAmount, agencyEmail }) => {
  const html = `
    <h2 style="color:#ef3e34;">🎉 New Grant Award</h2>
    <p><strong>${agencyName}</strong> just won the <strong>${funderName}</strong> grant.</p>
    ${awardAmount ? `<p>Amount: <strong>$${Number(awardAmount).toLocaleString()}</strong></p>` : ''}
    <p>Agency contact: ${agencyEmail}</p>
    <p>Congratulations email sent automatically. Follow-up with equipment recommendations scheduled for 3 days from now.</p>
    <p>Time to reach out personally and offer Red Dog radio solutions.</p>
  `;
  return sendEmail({
    to: 'admin@reddogradios.com',
    subject: `🎉 New Award: ${agencyName} won ${funderName}`,
    html,
  });
};

module.exports = {
  sendEmail,
  sendOtpEmail,
  sendWelcomeEmail,
  sendApplicationStatusEmail,
  sendDeadlineAlertEmail,
  sendPostAwardCongratsEmail,
  sendPostAwardFollowUpEmail,
  sendAdminAwardNotification,
};
