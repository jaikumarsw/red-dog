# Gmail OAuth2 Email Sending (Implemented)

This document describes **what was implemented** in this codebase to support **automated Gmail OAuth2 email sending** with **SMTP (nodemailer) fallback**, and how all pieces are wired together.

---

## Overview (End-to-end)

1. **Admin connects an Organization to Gmail**
   - Call `GET /api/gmail/oauth/connect?organizationId=...`
   - Backend returns a Google consent URL (includes `state=organizationId`)
   - Admin completes Google consent → Google redirects to backend callback

2. **Backend stores tokens on the Organization**
   - Callback `GET /api/gmail/oauth/callback?code=...&state=...`
   - Backend exchanges code → tokens
   - Saves to `Organization.gmailOAuth` and marks `isConnected: true`

3. **AI “generate email” automatically queues an Outbox record**
   - `POST /api/ai/generate-email` generates `{ subject, body }`
   - Backend queues to Outbox with `emailType='outreach'`
   - **Server generates** `replyTo` like `grant-<outboxId>@reddogradios.com`

4. **Outbox processing sends automatically**
   - Hourly cron calls `outboxService.processQueue()`
   - Each pending outbox email calls `outboxService.sendEmail(outboxId)`
   - If `relatedAgency` exists and that Organization has Gmail connected:
     - Access token is refreshed automatically if expired
     - Email is sent via Gmail API
   - Otherwise it falls back to nodemailer SMTP

5. **Inbound replies (stub)**
   - Webhook stub `POST /api/gmail/webhook/reply`
   - Calls `resolveAndNotify(replyTo, {from, subject, body})`
   - Extracts outbox id from `replyTo`, loads Outbox/org/user, creates an Alert of type `reply_received`

---

## Database changes

### Organization schema changes
File: `red-dog-radios-backend/src/modules/organizations/organization.schema.js`

Added:

```js
gmailOAuth: {
  accessToken:    { type: String },
  refreshToken:   { type: String },
  tokenExpiry:    { type: Date },
  senderEmail:    { type: String },
  isConnected:    { type: Boolean, default: false },
  connectedAt:    { type: Date },
}
```

### Outbox schema changes
File: `red-dog-radios-backend/src/modules/outbox/outbox.schema.js`

Added:

```js
replyTo:       { type: String },
senderEmail:   { type: String },
sentViaGmail:  { type: Boolean, default: false },
relatedAgency: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
```

### Alert schema change (reply automation)
File: `red-dog-radios-backend/src/modules/alerts/alert.schema.js`

Added new enum option:
- `reply_received`

This allows `replyRouter.resolveAndNotify()` to create alerts when a reply arrives.

---

## Environment variables

File updated: `red-dog-radios-backend/.env.example`

Added:

```bash
# Gmail OAuth2
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:4000/api/gmail/oauth/callback
ADMIN_REPLY_EMAIL=admin@reddogradios.com
```

Notes:
- SMTP is still supported (fallback) via existing `SMTP_*` vars.
- `ADMIN_REPLY_EMAIL` is used for non-grant emails (non outreach/followup types).

---

## Gmail OAuth2 configuration + Gmail send

File: `red-dog-radios-backend/src/config/gmail.config.js`

Exports:
- `getAuthUrl(organizationId)`
  - generates consent URL
  - uses `state=organizationId`
  - scopes:
    - `https://www.googleapis.com/auth/gmail.send`
    - `https://www.googleapis.com/auth/gmail.readonly`

- `exchangeCodeForTokens(code)`
  - exchanges `code` for `{ access_token, refresh_token, expiry_date }`

- `getValidAccessToken(organization)`
  - checks expiration (`tokenExpiry`)
  - automatically refreshes using refresh token when expired (refreshes early by ~60s)
  - persists new `accessToken` / `tokenExpiry` to MongoDB

- `sendViaGmail({ accessToken, senderEmail, to, subject, htmlBody, replyTo })`
  - constructs RFC 2822 raw email
  - **always injects** `Reply-To`
  - base64url encodes and calls `gmail.users.messages.send`
  - returns `{ success: true, messageId }`

All functions include error handling and log via `logger.error()`.

---

## Gmail module (routes/controllers/services)

Folder: `red-dog-radios-backend/src/modules/gmail/`

### Routes
File: `gmail.route.js`

- `GET /api/gmail/oauth/connect` (admin only)
  - expects `organizationId` via query (or body)
  - returns `{ url }`

- `GET /api/gmail/oauth/callback` (public)
  - reads `code` + `state` (state is `organizationId`)
  - exchanges tokens and saves to `Organization.gmailOAuth`
  - redirects to `${FRONTEND_URL}/settings/agency?connected=true`

- `GET /api/gmail/oauth/status/:organizationId` (admin only)
  - returns `{ isConnected, senderEmail, connectedAt }`

- `DELETE /api/gmail/oauth/disconnect/:organizationId` (admin only)
  - clears gmailOAuth fields and sets `isConnected: false`

- `POST /api/gmail/webhook/reply` (public stub)
  - body: `{ replyTo, from, subject, body }`
  - calls reply router

---

## Email provider refactor (SMTP + Gmail routing)

### What changed
- Deleted: `red-dog-radios-backend/src/config/resend.config.js`
- Added: `red-dog-radios-backend/src/config/emailProvider.config.js`
- Updated importer: `red-dog-radios-backend/src/config/email.config.js`

### New `sendEmail()` behavior
File: `src/config/emailProvider.config.js`

`sendEmail({ to, subject, html, text, replyTo, organizationId })`

- If `organizationId` is present:
  - loads Organization
  - if `gmailOAuth.isConnected === true`:
    - gets refreshed/valid token via `getValidAccessToken(org)`
    - sends via `sendViaGmail()`
    - returns `{ success: true, id, sentViaGmail: true, senderEmail }`
  - if Gmail send fails: logs error and falls back to SMTP

- If no `organizationId`:
  - uses SMTP nodemailer (original behavior preserved)

Return shape:
- Always returns `{ success, id?, error?, sentViaGmail: boolean }`

---

## Outbox automation changes

File: `red-dog-radios-backend/src/modules/outbox/outbox.service.js`

### queueEmail()
Now:
- accepts `relatedAgency`
- creates an Outbox record first
- generates `replyTo` server-side:
  - if `emailType` is `outreach` or `followup_reminder`:
    - `grant-${outboxRecord._id}@reddogradios.com`
  - else:
    - `process.env.ADMIN_REPLY_EMAIL`

### sendEmail(outboxId)
Now:
- passes `replyTo` to provider
- passes `organizationId: record.relatedAgency` to provider
- on success:
  - sets `record.sentViaGmail = true/false`
  - sets `record.senderEmail` if provided by provider

---

## AI generate-email now queues automatically

File: `red-dog-radios-backend/src/modules/ai/ai.controller.js`

Change:
- `POST /api/ai/generate-email` now requires `contactEmail`
- After generating `{ subject, body }`, it queues Outbox:
  - `recipient = contactEmail`
  - `emailType = 'outreach'`
  - `relatedOrganization = organizationId`
  - `relatedAgency = organizationId`
  - `relatedUser = req.user._id`
- Response now returns:
  - `{ generated, outbox }`

---

## Reply-To router utility

File: `red-dog-radios-backend/src/utils/replyRouter.js`

Exports:
- `parseGrantId(emailAddress)`
  - parses `grant-<24hex>@...` → `<24hex>`

- `resolveAndNotify(replyToAddress, incomingEmailBody)`
  - loads Outbox record, Organization, User
  - creates an Alert: `type: 'reply_received'`
  - logs reply details to console

---

## Route registration

File: `red-dog-radios-backend/src/app.js`

Added:
- `const gmailRoutes = require('./modules/gmail/gmail.route');`
- `app.use('/api/gmail', gmailRoutes);`

---

## Dependency added

Backend package install:
- `googleapis`

---

## Operational notes / expected behavior

- **No manual token refresh**: access tokens refresh automatically before expiry.
- **No manual sending**: Outbox is processed automatically by cron; AI generate-email queues automatically.
- **Reply-To is never trusted from client**: it is generated on the server in `queueEmail()`.
- **Fallback behavior preserved**: if no Gmail connection exists (or Gmail send fails), SMTP nodemailer is used.

