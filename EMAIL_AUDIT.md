# EMAIL AUDIT REPORT

## Check 1 — Nodemailer Installation

- **Installed**: Yes
- **Evidence (node_modules)**: `red-dog-radios-backend/node_modules/nodemailer` exists (contains `lib/`, `package.json`, etc.)
- **Version (package.json dependency)**: `^6.10.1`

## Check 2 — .env Contents

Exact email/SMTP-related lines from `red-dog-radios-backend/.env`:

```env
NODE_ENV=development

# SMTP / Email (Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=sootharjai@gmail.com
SMTP_PASS=ypoxqmxchobgwwei
SMTP_FROM=sootharjai@gmail.com
ADMIN_EMAIL=sootharjai@gmail.com
FRONTEND_URL=http://localhost:3000
```

Checks:
- **Quotes around values**: None found (good).
- **Spaces in password**: None found (good).
- **Missing variables**: SMTP host/port/user/pass/from/admin are present.
- **Notable**: `SMTP_PASS` is `ypoxqmxchobgwwei` (ends in `...gwwei`). Earlier instructions in this workspace history referenced `...gwwee`. This audit does **not** change it; it only records what is present.

## Check 3 — resend.config.js

Full file: `red-dog-radios-backend/src/config/resend.config.js`

```js
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
  const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER;
  const originalTo = Array.isArray(to) ? to[0] : to;
  const actualTo = isDev ? adminEmail : originalTo;

  let finalSubject = subject || 'Red Dog Notification';
  if (isDev && originalTo !== actualTo) {
    finalSubject = `[DEV → ${originalTo}] ${finalSubject}`;
    console.log('[Email] DEV redirect:', originalTo, '→', actualTo);
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
```

Findings:
- **Requires nodemailer**: Yes.
- **Reads `SMTP_USER`/`SMTP_PASS` from env**: Yes, inside `initTransporter()`.
- **`initTransporter()` called before sending**: Yes (`sendEmail()` calls it).
- **Any try/catch hiding errors silently?**: `sendEmail()` catches and returns `{ success:false, error }` (does not throw). `initTransporter()` does not catch errors from `createTransport` (none expected at creation time).
- **Actually calls `transport.sendMail()`**: Yes (line inside `try`).
- **Module caching**: `transporter` is initialized lazily and cached in module state (see Check 9).

## Check 4 — email.config.js

Full file: `red-dog-radios-backend/src/config/email.config.js`

```js
'use strict';

const { sendEmail } = require('./resend.config');

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

module.exports = {
  sendEmail,
  sendOtpEmail,
  sendWelcomeEmail,
  sendApplicationStatusEmail,
  sendDeadlineAlertEmail,
};
```

Findings:
- **Imports from resend.config.js**: Yes (`const { sendEmail } = require('./resend.config');`).
- **`sendOtpEmail` calls `sendEmail` correctly**: Yes; passes `to`, `subject`, and `html`.

## Check 5 — auth.service.js Email Calls

File: `red-dog-radios-backend/src/modules/auth/auth.service.js`

### register()

Relevant code:

```js
const { sendOtpEmail } = require('../../config/email.config');

// ...

try {
  if (process.env.NODE_ENV !== 'production') {
    console.log('[DEBUG] Sending OTP email to:', normalizedEmail, 'OTP:', otp);
  } else {
    console.log('[auth] Sending verification OTP to:', normalizedEmail);
  }

  const result = await sendOtpEmail({
    to: normalizedEmail,
    otp,
    name: resolvedFullName || resolvedFirst || '',
    type: 'signup',
  });

  if (!result?.success) {
    console.error('[auth] Verification email send failed:', result?.error || '(stub/no error provided)');
  }
} catch (e) {
  // Do not leak OTP; allow account creation but require resend from client.
}
```

Answers:
- **Imports from `email.config.js`?** Yes (`sendOtpEmail`).
- **Calls `sendOtpEmail` or `sendEmail`?** Calls `sendOtpEmail`.
- **Swallows errors?** Yes — the entire send block is wrapped in `try/catch` that does not rethrow.
- **Unreachable (after return)?** No — email send happens before the `return` object.

### forgotPassword()

Relevant code:

```js
try {
  if (process.env.NODE_ENV !== 'production') {
    console.log('[DEBUG] Sending RESET OTP email to:', user.email, 'OTP:', otp);
  }

  await sendOtpEmail({
    to: user.email,
    otp,
    name: user.fullName || user.firstName || 'there',
    type: 'reset',
  });
} catch (e) {
  console.error('[auth] Forgot password email failed:', e.message);
}
```

Answers:
- **Imports from `email.config.js`?** Yes.
- **Calls `sendOtpEmail` or `sendEmail`?** Calls `sendOtpEmail`.
- **Swallows errors?** It logs the error and continues (does not rethrow).
- **Unreachable?** No.

### resendVerificationOtp()

Relevant code:

```js
if (process.env.NODE_ENV !== 'production') {
  console.log('[DEBUG] Sending OTP email to:', normalized, 'OTP:', otp);
} else {
  console.log('[auth] Resending verification OTP to:', normalized);
}

const result = await sendOtpEmail({
  to: normalized,
  otp,
  name: user.fullName || user.firstName || '',
  type: 'signup',
});

if (!result?.success) {
  console.error('[auth] Resend verification email failed:', result?.error || '(stub/no error provided)');
}
```

Answers:
- **Imports from `email.config.js`?** Yes.
- **Calls `sendOtpEmail` or `sendEmail`?** Calls `sendOtpEmail`.
- **Swallows errors?** This function does **not** wrap the send in `try/catch` here, so exceptions would bubble (but `sendEmail` itself catches and returns `{ success:false, error }`).
- **Unreachable?** No.

### verifySignupOtp()

Relevant code (email-related):
- **No email send occurs** (it only verifies the OTP, sets `isVerified=true`, clears otp fields, and returns a JWT).

Answers:
- **Imports from `email.config.js`?** The module imports `sendOtpEmail` at top, but `verifySignupOtp` itself does not send email.
- **Swallows errors?** N/A for sending.
- **Unreachable?** N/A.

## Check 6 — Test Endpoint Code

File: `red-dog-radios-backend/src/app.js`

Exact route:

```js
if (process.env.NODE_ENV !== 'production') {
  app.get('/api/test-email', async (req, res) => {
    try {
      const { sendEmail } = require('./config/resend.config');
      const result = await sendEmail({
        to: process.env.ADMIN_EMAIL || 'sootharjai@gmail.com',
        subject: 'Red Dog Email Test ' + new Date().toISOString(),
        html: `
          <div style="font-family:Arial;padding:40px;max-width:500px;
            margin:0 auto;border:1px solid #e5e7eb;border-radius:12px;">
            <h1 style="color:#ef3e34;margin-top:0;">
              Email is working!
            </h1>
            <p style="color:#374151;">
              Gmail + Nodemailer integration successful.
            </p>
            <p style="color:#6b7280;font-size:13px;">
              Sent at: ${new Date().toLocaleString()}
            </p>
          </div>
        `,
      });
      res.json({
        result,
        config: {
          smtp_user: process.env.SMTP_USER || 'MISSING',
          smtp_pass: process.env.SMTP_PASS ? 'SET (' + process.env.SMTP_PASS.length + ' chars)' : 'MISSING',
          smtp_host: process.env.SMTP_HOST || 'MISSING',
          smtp_port: process.env.SMTP_PORT || 'MISSING',
          admin_email: process.env.ADMIN_EMAIL || 'MISSING',
          node_env: process.env.NODE_ENV || 'MISSING',
        },
      });
    } catch (err) {
      res.status(500).json({ error: err.message, stack: err.stack });
    }
  });
}
```

Findings:
- **Imports from resend.config.js or email.config.js?** Uses `require('./config/resend.config')` directly.
- **Calls sendEmail?** Yes.
- **Require caching issue?** Unlikely to affect `.env` since dotenv is loaded at top of `app.js` (see Check 8). Also `resend.config.js` reads env lazily in `initTransporter()`.

## Check 7 — Console Output

Observed console output from the running dev server after calling `/api/test-email` (and also during OTP resend):

```text
[DEBUG] Sending OTP email to: iamjaisuthar@gmail.com OTP: 480391
[Email] Sending to: iamjaisuthar@gmail.com | Subject: Verify your Red Dog account
[Email] Nodemailer ready → sootharjai@gmail.com
[Email] DEV redirect: iamjaisuthar@gmail.com → sootharjai@gmail.com
[Email] Sent! MessageId: <8d6748ac-61d2-fc39-e66a-4ff922a8bff0@gmail.com>

[Email] Sending to: sootharjai@gmail.com | Subject: Red Dog Email Test 2026-04-15T09:53:37.169Z
[Email] Sent! MessageId: <fe7b2bed-5ee4-44d9-b015-24d64359b718@gmail.com>
GET /api/test-email 200 ...
```

Also present (unrelated to email send mechanics but present in logs):
- `express-rate-limit` warning about `X-Forwarded-For` with `trust proxy` false.

## Check 8 — Dotenv Loading

- `red-dog-radios-backend/src/server.js`: `require('dotenv').config();` is on line 1 (top).
- `red-dog-radios-backend/src/app.js`: `require('dotenv').config();` is on line 1 (top).

Conclusion: dotenv is loaded before other requires in both entrypoints.

## Check 9 — Module Caching

In `src/config/resend.config.js`:
- `transporter` is **not** initialized at module load time.
- It is initialized **lazily** when `sendEmail()` calls `initTransporter()`.
- `initTransporter()` reads `process.env` at call time, which avoids the “dotenv loads later” pitfall.

So: **no env-at-module-load caching bug** is evident in the current implementation.

## Check 10 — Actual Env Values

Outputs:

```text
SMTP_USER: sootharjai@gmail.com
SMTP_PASS length: 16
SMTP_HOST: smtp.gmail.com
```

## ROOT CAUSE (most likely)

Based on the audit evidence, the backend **is successfully attempting and completing sends** via Nodemailer (it logs `Sent! MessageId: ...` and `/api/test-email` returns `{ success: true, id: <...@gmail.com> }`).

If emails are still “not arriving” in the mailbox, the most likely causes are **outside** the application code path:
1. **Mailbox filtering** (spam/promotions/quarantine) despite successful SMTP acceptance.
2. **Credential mismatch vs intended value**: `.env` shows `SMTP_PASS=ypoxqmxchobgwwei` (may differ from the intended Gmail App Password previously referenced elsewhere). The transport *does* send successfully in current logs, so auth is working for these test sends, but it’s still a discrepancy worth noting.

## ALL ISSUES FOUND

1. `.env` `SMTP_PASS` value is **not** the same string that was referenced in earlier instructions in this workspace history (`...gwwei` vs `...gwwee`). (Recorded discrepancy; not changed here.)
2. Email sending from `register()` is wrapped in a `try/catch` that **swallows exceptions** (by design in current code). If sending fails, account creation still returns success; the only signal would be logs. (This is an observability/flow decision.)
3. Unrelated but present: repeated `express-rate-limit` `X-Forwarded-For` / `trust proxy` warnings in console output.

