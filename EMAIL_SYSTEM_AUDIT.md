# Email & OAuth System Audit
**Generated:** 2026-04-30

This document is a **READ-ONLY** audit of the Gmail OAuth / Email Provider / Outbox / Replies / Pipeline system in the Red Dog Grant Intelligence codebase.

- Scope includes: **Gmail OAuth2 connect**, **Gmail API sending**, **SMTP fallback**, **Outbox queue + processing**, **Reply ingestion via Gmail push**, **Reply UI**, **Pipeline stages + board**, and the **side-effect chains** between them.
- Scope does **not** attempt to fix or refactor; it documents what exists, exactly.

---

## Executive Summary

Over the last several days, Red Dog Grant Intelligence gained a full outbound/inbound email workflow designed to support a “sales-style” outreach loop for grants: the system can generate an outreach email, queue it in an Outbox, send it (preferably as the agency via Gmail OAuth2), then detect inbound replies and attach them back to the original outreach so the agency (and admins) can track conversations.

The system is built around a central **Outbox collection** which stores every outbound email (subject + HTML) and assigns each record a unique `replyTo` alias of the form `grant-{outboxId}@reddogradios.com`. That alias is injected server-side and is intended to be embedded into outbound email headers so that inbound replies can be routed back to the originating Outbox record.

Inbound replies are handled via Google Gmail “watch” push notifications (Pub/Sub). When Gmail pushes a message-added event, the backend fetches message contents, extracts a `Reply-To` address containing `grant-{id}@...`, saves a `Reply` document, raises an `Alert` for the owning agency user, optionally advances the grant’s pipeline stage to `reply_received`, and sends an SMTP notification to the user.

There is also a lightweight **pipeline** feature attached to `Application` (“grant”) documents, with stages like `outreach_sent` and `reply_received` in addition to user-managed stages like `submitted`. Several automatic events (queuing outreach, receiving replies) attempt to advance this pipeline, making the system feel integrated but also creating non-obvious cascades.

User-facing surface area expanded substantially:
- Agency UI: a new **Outbox** screen, a **Replies** screen, an **email history + pipeline bar** on application detail, and a **Gmail connect** section inside agency settings.
- Admin UI: Outbox monitoring (filters, preview, retry/delete), a Replies inbox, and a Pipeline board view. Admins also have Gmail connect/disconnect tooling per agency.

This implementation provides a functional end-to-end workflow, but it’s also a tightly coupled chain of side-effects (AI → Outbox → pipeline → reply routing → alerts → notifications) whose failures can be difficult to debug without knowing the cascade map.

---

## Section 1: Backend Files Added (Email/OAuth/Pipeline scope)

> Note: “Lines of code” below are the file’s line count as read in this audit (from the repo snapshot), not semantic LOC.

### File: `red-dog-radios-backend/src/config/gmail.config.js`

**Purpose:** Central Gmail OAuth2 + Gmail API send helper. It creates (or refuses to create) a Google OAuth client using `GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI`, generates consent URLs, exchanges auth codes for tokens, refreshes access tokens, and provides a `sendViaGmail()` helper that constructs a raw RFC-822 email and sends it via Gmail API.

**Lines of code:** 155

**Exports:**
- `getAuthUrl(organizationId)`
- `exchangeCodeForTokens(code)`
- `getValidAccessToken(organization)`
- `sendViaGmail({ accessToken, senderEmail, to, subject, htmlBody, replyTo })`

**Dependencies (imports):**
- `googleapis` (`google`)
- `../modules/organizations/organization.schema` (`Organization`)
- `../utils/logger` (`logger`)

**Functions:**

- **`assertConfigured()`**
  - **Parameters:** none
  - **What it does:**
    - Validates that `oauth2Client` exists (meaning required env vars were present at module init).
    - Throws `Error('Google OAuth not configured ...')` if missing.
  - **Side effects:** none
  - **Error handling:** throws an Error, caught by callers.

- **`getAuthUrl(organizationId)`**
  - **Parameters:** `organizationId`
  - **What it does (step-by-step):**
    1. Calls `assertConfigured()`.
    2. Calls `oauth2Client.generateAuthUrl()` with:
       - `access_type: 'offline'`
       - `prompt: 'consent'`
       - `scope`: `gmail.send` + `gmail.readonly`
       - `state`: `String(organizationId)` (later used as the `organizationId` in callback)
    3. Returns the generated URL string.
  - **Side effects:** none
  - **Error handling:** `try/catch` logs `[GmailOAuth] getAuthUrl failed` and rethrows.

- **`exchangeCodeForTokens(code)`**
  - **Parameters:** `code`
  - **What it does:**
    1. Calls `assertConfigured()`.
    2. Calls `oauth2Client.getToken(code)`.
    3. Returns `{ access_token, refresh_token, expiry_date }`.
  - **Side effects:** external API call to Google OAuth token endpoint
  - **Error handling:** logs and rethrows.

- **`getValidAccessToken(organization)`**
  - **Parameters:** `organization` (Organization document)
  - **What it does:**
    1. Calls `assertConfigured()`.
    2. Reads `organization.gmailOAuth.refreshToken` and errors if missing.
    3. Computes expiry using `organization.gmailOAuth.tokenExpiry` and a 60-second early refresh window.
    4. If token is not expired and `accessToken` exists, returns it.
    5. Otherwise sets oauth2 credentials to `{ refresh_token }`.
    6. Refreshes token using:
       - `oauth2Client.refreshAccessToken()` if available, else
       - `oauth2Client.getAccessToken()` plus `oauth2Client.credentials.expiry_date`
    7. Writes refreshed token back to MongoDB:
       - sets `gmailOAuth.accessToken`
       - optionally sets `gmailOAuth.tokenExpiry`
    8. Returns the new access token.
  - **Side effects:**
    - External Google token refresh
    - DB write: `Organization.findByIdAndUpdate(...)`
  - **Error handling:** logs and rethrows.

- **`base64UrlEncode(input)`**
  - **Parameters:** string `input`
  - **What it does:** converts UTF-8 input to base64-url encoding required by Gmail API “raw” messages.
  - **Side effects:** none
  - **Error handling:** none

- **`sendViaGmail({ accessToken, senderEmail, to, subject, htmlBody, replyTo })`**
  - **Parameters:** object with `accessToken`, `senderEmail`, `to`, `subject`, `htmlBody`, `replyTo`
  - **What it does:**
    1. Calls `assertConfigured()`.
    2. Validates required inputs; throws if missing `replyTo/accessToken/senderEmail`.
    3. Creates a new OAuth2 client and sets `{ access_token }`.
    4. Creates Gmail API client: `google.gmail({version:'v1', auth})`.
    5. Builds a raw email string with headers:
       - `From`, `To`, `Subject`, `Reply-To`
       - `MIME-Version`, `Content-Type: text/html`
    6. Base64-url encodes the raw message.
    7. Calls `gmail.users.messages.send({ userId:'me', requestBody: { raw }})`.
    8. Returns `{ success: true, messageId }`.
  - **Side effects:** external API call to Gmail send endpoint
  - **Error handling:** logs and rethrows.

**Routes (if any):** none (library file)

---

### File: `red-dog-radios-backend/src/modules/gmail/gmail.route.js`

**Purpose:** Declares all `/api/gmail/*` endpoints: OAuth connect/callback/status/disconnect and inbound webhooks for replies and Pub/Sub push.

**Lines of code:** 36

**Exports:** Express `router`

**Dependencies:**
- `express`
- `../../middlewares/auth.middleware` (`protect`, `restrictTo`)
- `./gmail.controller` handlers

**Routes:**

| Method | Path | Auth | Middleware | Handler |
|--------|------|------|------------|---------|
| GET | `/api/gmail/oauth/connect` | admin JWT | `protect`, `restrictTo('admin')` | `oauthConnect` |
| GET | `/api/gmail/oauth/callback` | none | none | `oauthCallback` |
| GET | `/api/gmail/oauth/status/:organizationId` | admin JWT | `protect`, `restrictTo('admin')` | `oauthStatus` |
| DELETE | `/api/gmail/oauth/disconnect/:organizationId` | admin JWT | `protect`, `restrictTo('admin')` | `oauthDisconnect` |
| POST | `/api/gmail/webhook/reply` | none | none | `replyWebhook` |
| POST | `/api/gmail/webhook/push` | none | none | `gmailPushWebhook` |

---

### File: `red-dog-radios-backend/src/modules/gmail/gmail.controller.js`

**Purpose:** HTTP layer for Gmail module. Orchestrates OAuth flow, exposes status/disconnect, and implements the Pub/Sub push webhook that pulls Gmail message bodies and routes replies into the system via `resolveAndNotify()`.

**Lines of code:** 186

**Exports:**
- `oauthConnect`
- `oauthCallback`
- `oauthStatus`
- `oauthDisconnect`
- `replyWebhook`
- `gmailPushWebhook`

**Dependencies:**
- `../../utils/asyncHandler` (wraps errors)
- `../../utils/apiResponse` (`success`)
- `./gmail.service`
- `../../middlewares/error.middleware` (`AppError`)
- `../../utils/replyRouter` (`resolveAndNotify`)
- `../organizations/organization.schema` (`Organization`)
- `../../utils/logger`
- `googleapis` (`google`)
- `../../config/gmail.config` (`getValidAccessToken`)

**Functions:**

- **`oauthConnect(req, res)`**
  - **Parameters:** Express `(req, res)` via `asyncHandler`
  - **Body/query fields:** expects `organizationId` via `req.query.organizationId` or `req.body.organizationId`
  - **What it does:**
    1. Reads `organizationId`.
    2. If missing, throws `AppError('organizationId is required', 400)`.
    3. Calls `gmailService.getConnectUrl(organizationId)`.
    4. Returns `{ url }`.
  - **Side effects:** none directly (service checks org exists)
  - **Error handling:** `asyncHandler` + explicit `AppError`.

- **`oauthCallback(req, res)`**
  - **Parameters:** `(req, res)` via `asyncHandler`
  - **Query fields:** `code`, `state` (organizationId)
  - **What it does:**
    1. Reads `code` and `state`.
    2. Calls `gmailService.handleOAuthCallback({ organizationId: state, code })`.
    3. Redirects to frontend: `${FRONTEND_URL}/settings/agency?connected=true`.
  - **Side effects:** OAuth token exchange + org DB write + watch setup (via service)
  - **Error handling:** `asyncHandler`; errors become API error responses.

- **`oauthStatus(req, res)`**
  - **Parameters:** `(req, res)`
  - **What it does:** calls `gmailService.getStatus(organizationId)` and returns status object.
  - **Side effects:** DB read

- **`oauthDisconnect(req, res)`**
  - **Parameters:** `(req, res)`
  - **What it does:** calls `gmailService.disconnect(organizationId)`; returns result.
  - **Side effects:** DB write: clears oauth tokens

- **`replyWebhook(req, res)`**
  - **Parameters:** `(req, res)`
  - **Body fields:** `replyTo`, `from`, `subject`, `body`
  - **What it does:**
    1. Validates `replyTo` exists; else `400`.
    2. Calls `resolveAndNotify(replyTo, { from, subject, body })`.
    3. Returns `{ ok: true }`.
  - **Side effects:** triggers the entire reply-routing cascade (Reply save, alert, pipeline)
  - **Auth:** none (public endpoint)

- **`headerValue(payload, name)`** / **`decodeB64(data)`** / **`extractBodies(payload)`**
  - Helpers for parsing Gmail message payloads.
  - Side effects: none.

- **`gmailPushWebhook(req, res)`**
  - **Parameters:** `(req, res)` via `asyncHandler`
  - **What it does (high level):**
    - Always returns `200` to avoid Pub/Sub retries on logic errors.
    - Extracts base64 JSON payload from `req.body.message.data`.
    - Finds organization by `gmailOAuth.senderEmail`.
    - Uses OAuth refresh to get access token.
    - Calls Gmail History API to list `messageAdded` events since last historyId.
    - For each added message:
      - Fetches full message
      - Extracts `From`, `Subject`, `Reply-To`, `To`
      - Searches for `grant-{24hex}@...` in either `Reply-To` or `To`
      - Extracts plain/html bodies
      - Calls `resolveAndNotify(grantAlias, {from, subject, body, htmlBody, messageId})`
    - Updates `Organization.gmailOAuth.historyId` to the new `historyId` if present.
  - **Side effects:**
    - DB read: Organization find
    - Token refresh DB write (via `getValidAccessToken`)
    - Gmail API calls:
      - `gmail.users.history.list`
      - `gmail.users.messages.get` for each new message
    - Reply routing cascade per message (`resolveAndNotify`)
    - DB write: update org `historyId`
  - **Error handling:**
    - Wrapped in `try/catch` inside the handler; errors logged and still returns `200`.
    - Each message processing is wrapped in its own `try/catch` to continue other messages.

---

### File: `red-dog-radios-backend/src/modules/gmail/gmail.service.js`

**Purpose:** Business logic for OAuth connect/callback/status/disconnect, including storing tokens on Organization and setting up Gmail watch for inbound push.

**Lines of code:** 113

**Exports:**
- `getConnectUrl(organizationId)`
- `handleOAuthCallback({ organizationId, code })`
- `getStatus(organizationId)`
- `disconnect(organizationId)`

**Dependencies:**
- `../organizations/organization.schema` (`Organization`)
- `../../utils/logger`
- `../../middlewares/error.middleware` (`AppError`)
- `../../config/gmail.config` (`getAuthUrl`, `exchangeCodeForTokens`)
- `./gmail.watch` (`setupGmailWatch`)

**Functions:**

- **`getConnectUrl(organizationId)`**
  - Validates org exists, returns `getAuthUrl(organizationId)`.
  - Side effects: DB read.
  - Errors: logs + rethrow.

- **`handleOAuthCallback({ organizationId, code })`**
  - **Key logic:**
    1. Validates `organizationId` and `code` or throws.
    2. Loads org.
    3. Exchanges code for tokens.
    4. Handles missing `refresh_token` by reusing stored `org.gmailOAuth.refreshToken` if present; else throws a 502 AppError instructing reconnect/disconnect.
    5. Computes `senderEmail` as `org.gmailOAuth.senderEmail || org.email`.
    6. Writes `org.gmailOAuth = { accessToken, refreshToken, tokenExpiry, senderEmail, isConnected:true, connectedAt: now }`.
    7. Saves org.
    8. Attempts `setupGmailWatch(org)` (push expiration ~7 days). Errors are logged but do not fail the connect.
    9. Returns status object.
  - **Side effects:**
    - DB write: organization oauth fields
    - External Google token exchange
    - External Gmail watch setup (optional)
  - **Errors:** logs and rethrow for core; watch errors are swallowed (logged).

- **`getStatus(organizationId)`**
  - Reads `Organization.gmailOAuth`, returns `{ isConnected, senderEmail, connectedAt }`.
  - Side effects: DB read.

- **`disconnect(organizationId)`**
  - Clears oauth fields and sets `isConnected:false`.
  - Side effects: DB write.

---

### File: `red-dog-radios-backend/src/modules/gmail/gmail.watch.js`

**Purpose:** Encapsulates Gmail “watch” setup and renewal across organizations. The watch ties Gmail account inbox changes to a Pub/Sub topic and expires roughly every 7 days, so it must be renewed.

**Lines of code:** 89

**Exports:**
- `setupGmailWatch(organization)`
- `renewAllWatches()`

**Dependencies:**
- `googleapis`
- `../organizations/organization.schema` (`Organization`)
- `../../utils/logger`
- `../../config/gmail.config` (`getValidAccessToken`)

**Functions:**

- **`getGmailClient(org)`**
  - Gets access token, builds Gmail API client.
  - Side effects: token refresh + DB write may occur inside `getValidAccessToken`.

- **`setupGmailWatch(organization)`**
  - **Parameters:** `organization` doc
  - **What it does:**
    1. Requires `GMAIL_PUBSUB_TOPIC`.
    2. Requires `organization.gmailOAuth.isConnected`.
    3. Creates Gmail client and calls `gmail.users.watch` for label `INBOX` and topicName.
    4. Reads `historyId` and `expiration` from response.
    5. Writes these into the org:
       - `gmailOAuth.historyId`
       - `gmailOAuth.watchExpiry`
  - **Side effects:** Gmail API call; DB write.
  - **Errors:** logs and rethrow.

- **`renewAllWatches()`**
  - Finds connected orgs with missing/expired watch within 24h (`cutoff`).
  - For each org, attempts `setupGmailWatch`.
  - Returns `{ processed, results[] }` including failures.
  - Side effects: multiple Gmail API calls + org writes.
  - Errors: logs and rethrow.

---

### File: `red-dog-radios-backend/src/jobs/gmailWatchRenew.job.js`

**Purpose:** Cron worker file registering a daily renewal of Gmail watches at `00:00 UTC`.

**Lines of code:** 20

**Exports:** `{}` (no exports; side-effect module)

**Dependencies:**
- `node-cron`
- `../utils/logger`
- `../modules/gmail/gmail.watch` (`renewAllWatches`)

**Behavior:**
- Registers `cron.schedule('0 0 * * *', ...)`.
- Logs start/finish/failure.
- Importing this file has side-effects (schedules the cron).

---

### File: `red-dog-radios-backend/src/modules/replies/reply.schema.js`

**Purpose:** Defines the new `Reply` collection used to store inbound email replies linked to an `Outbox` record and scoped to an agency user and organization.

**Lines of code:** 31

**Exports:** `mongoose.model('Reply', replySchema)`

**Dependencies:**
- `mongoose`
- `mongoose-paginate-v2`

**Schema fields:**
- `outboxId` (ObjectId → Outbox, required)
- `organizationId` (ObjectId → Organization, required)
- `userId` (ObjectId → User, optional)
- `from` (string)
- `subject` (string)
- `body` (string)
- `htmlBody` (string)
- `receivedAt` (Date, default now)
- `gmailMessageId` (string)
- `isRead` (boolean, default false)

**Indexes:**
- Unique sparse: `{ gmailMessageId: 1 }` (dedupe for Gmail-ingested messages)
- `{ userId: 1, isRead: 1, receivedAt: -1 }`
- `{ organizationId: 1, receivedAt: -1 }`
- `{ outboxId: 1, receivedAt: -1 }`

---

### File: `red-dog-radios-backend/src/modules/replies/reply.route.js`

**Purpose:** Declares admin and agency-facing Reply endpoints.

**Lines of code:** 30

**Exports:** Express router

**Dependencies:** `express`, auth middleware, `./reply.controller`

**Routes:**

| Method | Path | Auth | Middleware | Handler |
|--------|------|------|------------|---------|
| GET | `/api/replies` | admin JWT | `protect`, `restrictTo('admin')` | `adminGetAll` |
| GET | `/api/replies/:id` | admin JWT | `protect`, `restrictTo('admin')` | `adminGetOne` |
| PATCH | `/api/replies/:id/read` | admin JWT | `protect`, `restrictTo('admin')` | `adminMarkRead` |
| GET | `/api/replies/count-by-outbox` | agency JWT | `protect` | `myCountByOutbox` |
| GET | `/api/replies/by-outbox/:outboxId` | agency JWT | `protect` | `myThreadByOutbox` |
| GET | `/api/replies/my` | agency JWT | `protect` | `myReplies` |
| GET | `/api/replies/my/unread-count` | agency JWT | `protect` | `myUnreadCount` |
| PATCH | `/api/replies/:id/read` | agency JWT | `protect` | `myMarkRead` |

**Important implementation detail:** This router defines **two** `PATCH /:id/read` routes (admin and agency). Express will match the first one that matches; in this file, the admin variant is declared earlier and includes `restrictTo('admin')`, while the agency version is declared later and has only `protect`. This creates an ordering dependency and can be confusing when troubleshooting.

---

### File: `red-dog-radios-backend/src/modules/replies/reply.controller.js`

**Purpose:** Controller wiring for reply inbox endpoints; mostly thin wrappers over `reply.service`.

**Lines of code:** 61

**Exports:**
- `adminGetAll`
- `adminGetOne`
- `adminMarkRead`
- `myReplies`
- `myUnreadCount`
- `myMarkRead`
- `myCountByOutbox`
- `myThreadByOutbox`

**Dependencies:**
- `../../utils/asyncHandler`
- `../../utils/apiResponse` (`success`, `paginate`)
- `./reply.service`

**Behavior:** All handlers are simple and rely on the service for filtering and DB access.

---

### File: `red-dog-radios-backend/src/modules/replies/reply.service.js`

**Purpose:** Query + mutation logic for replies, supporting admin paging and agency user inbox views, including thread-by-outbox and counts.

**Lines of code:** 109

**Exports:**
- `getAllAdmin`
- `getOneAdmin`
- `markReadAdmin`
- `markReadForUser`
- `getMy`
- `countUnreadForUser`
- `countByOutboxForUser`
- `getThreadByOutboxForUser`

**Dependencies:**
- `./reply.schema` (`Reply`)
- `../../middlewares/error.middleware` (`AppError`)
- `../../utils/logger`

**Functions:**

- **`getAllAdmin({ page, limit, organizationId, outboxId, isRead })`**
  - Builds query and uses `Reply.paginate` with population of `outboxId`, `organizationId`, `userId`.
  - Side effects: DB read.
  - Errors: logs and rethrows.

- **`getOneAdmin(id)`**
  - Loads a reply by id, populating refs.
  - Throws 404 if missing.

- **`markReadAdmin(id)`**
  - Sets `isRead: true` for any reply by id.

- **`getMy({ page, limit, userId, outboxId, isRead })`**
  - Paginates replies scoped to `userId` (not organization-wide).
  - Populates `outboxId` with a subset of fields (includes `replyTo` and `sentViaGmail`).

- **`countUnreadForUser(userId)`**
  - Returns count of replies where `isRead:false`.

- **`countByOutboxForUser({ userId, outboxIds })`**
  - Aggregates counts grouped by `outboxId`.
  - Returns a map for all requested ids (missing → 0).

- **`getThreadByOutboxForUser({ userId, outboxId })`**
  - Returns all replies for a given outbox id sorted oldest-first, selecting thread fields.

---

### File: `red-dog-radios-backend/src/utils/replyRouter.js`

**Purpose:** The central routing + side-effect orchestrator for inbound replies. Takes a `replyTo` address, parses an Outbox id, saves a Reply, advances pipeline, creates an Alert, and emails the user a notification.

**Lines of code:** 138

**Exports:**
- `parseGrantId(emailAddress)` (note: returns *outboxId* from the `grant-{id}@` alias)
- `resolveAndNotify(replyToAddress, incomingEmailBody)`

**Dependencies:**
- `../modules/outbox/outbox.schema` (`Outbox`)
- `../modules/organizations/organization.schema` (`Organization`)
- `../modules/auth/user.schema` (`User`)
- `../modules/alerts/alert.schema` (`Alert`)
- `../modules/replies/reply.schema` (`Reply`)
- `../config/email.config` (`sendEmail`) — notification email
- `./logger`
- `../modules/grants/grant.pipeline.service` (`advanceStage`)

**Functions:**

- **`parseGrantId(emailAddress)`**
  - Parses an address like `grant-<24hex>@...`.
  - Returns the `<24hex>` string or `null`.
  - Error handling: logs and returns null.

- **`resolveAndNotify(replyToAddress, incomingEmailBody)`**
  - **Parameters:**
    - `replyToAddress` (string)
    - `incomingEmailBody` object with possible fields: `from`, `subject`, `body`, `htmlBody`, `messageId`
  - **Step-by-step:**
    1. Parse outbox id from `replyToAddress` using `parseGrantId`.
    2. Load Outbox record by id.
    3. Load org + user referenced by Outbox record (best-effort).
    4. Save Reply:
       - If `messageId` present: check `Reply.findOne({ gmailMessageId: messageId })` and skip if exists.
       - Else always create.
    5. If `record.relatedGrant` exists:
       - Attempt `advanceStage(record.relatedGrant, 'reply_received', { changedBy:'system', note: ... })`.
       - Errors are logged as “pipeline advance skipped” and swallowed.
    6. If `user` exists:
       - Create `Alert` with type `reply_received` and priority `high`.
       - Send an SMTP-path notification email to `user.email` (no org id passed).
         - Contains a link: `${FRONTEND_URL}/outbox/${record._id}`
         - Note: UI routes may not match this exact link (see findings).
       - Notification email send errors are caught and logged.
    7. Logs a “Reply received” info blob.
    8. Returns `{ ok: true, outboxId }` on success; `{ ok:false, reason }` on early failures or exceptions.
  - **Side effects (the big list):**
    - DB reads: Outbox, Organization, User
    - DB writes: Reply create, Alert create
    - External email send: notification via `sendEmail()` (SMTP or Gmail depending on provider logic; but here org id not passed so it will use SMTP)
    - Pipeline mutation: may update an Application doc
  - **Error handling:**
    - Entire function wrapped in try/catch. On exception, returns `{ ok:false, reason:'internal_error' }` and logs.
    - Pipeline advance errors are swallowed.
    - Notification email errors are swallowed.

---

### File: `red-dog-radios-backend/src/modules/grants/grant.pipeline.service.js`

**Purpose:** Implements pipeline stages on `Application` documents and enforces stage transition rules, including a concept of “system” vs “user” changes and terminal stages.

**Lines of code:** 73

**Exports:**
- `advanceStage(grantId, newStage, { changedBy, note })`
- `STAGE_ORDER`
- `TERMINAL_STAGES`

**Dependencies:**
- `../applications/application.schema` (`Application`)
- `../../utils/logger`
- `../../middlewares/error.middleware` (`AppError`)

**Core rules:**
- Stages: `discovered → researching → outreach_sent → reply_received → applying → submitted → won/lost/archived`
- **System cannot set terminal stages** (`won/lost/archived`).
- Moves backward are invalid (for non-terminal moves).
- Same stage is allowed but treated as “skip”.

**Side effects:**
- DB read + write on `Application` documents.

---

### File: `red-dog-radios-backend/src/modules/grants/grant.pipeline.controller.js`

**Purpose:** Exposes pipeline endpoints for agencies and admins: read grant pipeline, set manual stages, and admin board.

**Lines of code:** 79

**Exports:**
- `getPipeline`
- `setPipelineStage`
- `adminBoard`

**Dependencies:**
- `asyncHandler`, `success`
- `AppError`
- `resolveAgencyOrganizationId` (from `../../utils/resolveOrganizationId`)
- `advanceStage`, `STAGE_ORDER`
- `Application`

**Key behaviors:**
- Agencies can only set manual stages: `applying/submitted/won/lost/archived`
- Stages `discovered/researching/outreach_sent/reply_received` are **system-only**.
- `assertGrantInOrg` ensures agency can only read/modify their grants.

---

### File: `red-dog-radios-backend/src/modules/grants/grant.pipeline.route.js`

**Purpose:** Routes under `/api/grants/*` for pipeline system.

**Lines of code:** 13

**Routes:**

| Method | Path | Auth | Middleware | Handler |
|--------|------|------|------------|---------|
| GET | `/api/grants/pipeline/board` | admin JWT | `protect`, `restrictTo('admin')` | `adminBoard` |
| GET | `/api/grants/:id/pipeline` | agency/admin JWT | `protect` | `getPipeline` |
| PATCH | `/api/grants/:id/pipeline` | agency/admin JWT | `protect` | `setPipelineStage` |

---

### File: `red-dog-radios-backend/src/config/emailProvider.config.js`

**Purpose:** Unified outbound email provider:
- Uses **Gmail API** (OAuth2) when an `organizationId` is provided and that org has `gmailOAuth.isConnected`.
- Falls back to **SMTP via nodemailer** otherwise.
- Applies DEV redirect behavior (`DEV_REDIRECT_EMAIL`) in non-production.

**Lines of code:** 107

**Exports:** `sendEmail({ to, subject, html, text, replyTo, organizationId })`

**Dependencies:**
- `nodemailer`
- `Organization` schema
- `logger`
- `getValidAccessToken`, `sendViaGmail` from `./gmail.config`

**Functions:**
- `initTransporter()` (singleton nodemailer transport)
- `sendViaSmtp(...)` (may stub if SMTP missing)
- `sendEmail(...)` (routing logic)

**Side effects:**
- External SMTP send OR external Gmail API send
- Reads org from DB if `organizationId` provided
- May refresh OAuth token (via `getValidAccessToken`) which writes back to org

---

### File: `red-dog-radios-backend/src/jobs/gmailWatchRenew.job.js`

**Purpose:** Cron side-effect module (daily watch renewal). (See earlier section.)

**Lines of code:** 20

---

## Section 2: Backend Files MODIFIED

This section documents files that existed previously but were modified to support the email/oauth/replies/pipeline scope. Because we don’t have “before” snapshots in this audit, “Lines added/removed” are approximate and described by feature.

### File: `red-dog-radios-backend/src/app.js`

**Original purpose:** Main Express app setup, middleware, swagger, health, and route mounting.

**Changes made (email scope):**
- Mounted new route modules:
  - `app.use('/api/gmail', gmailRoutes);`
  - `app.use('/api/replies', replyRoutes);`
  - `app.use('/api/grants', grantPipelineRoutes);` (pipeline endpoints)
- Added `/health` check fields:
  - `openai.configured` (presence of `OPENAI_API_KEY`)
  - `smtp.configured` (presence of SMTP vars)

**Key side effects introduced:**
- New public endpoints for Gmail webhooks are reachable once routes are mounted.

---

### File: `red-dog-radios-backend/src/modules/organizations/organization.schema.js`

**Original purpose:** Organization/agency profile fields used in onboarding/matching.

**Changes made (email scope):**
- Added `gmailOAuth` subdocument:
  - `accessToken`, `refreshToken`, `tokenExpiry`
  - `senderEmail`
  - `isConnected`, `connectedAt`
  - `watchExpiry`, `historyId`

**Impact:**
- Stores sensitive OAuth tokens directly in MongoDB.
- Enables dynamic send method selection per org (Gmail vs SMTP).
- Enables stateful history cursor for push processing (`historyId`).

---

### File: `red-dog-radios-backend/src/modules/applications/application.schema.js`

**Original purpose:** Grant application document with statuses, AI content, submission tracking.

**Changes made (pipeline scope):**
- Added `pipelineStage` enum with default `discovered`.
- Added `pipelineHistory[]` array (stage + changedAt + changedBy + note).

**Impact:**
- Allows multiple modules (Outbox and ReplyRouter) to mutate Application state.

---

### File: `red-dog-radios-backend/src/modules/outbox/outbox.schema.js`

**Original purpose:** Store outbound emails for queuing and sending.

**Changes made (email/replies scope):**
- Added headers + metadata fields:
  - `replyTo` (alias address)
  - `senderEmail` (gmail account actually used)
  - `sentViaGmail` boolean
- Added linkage:
  - `relatedGrant` (ObjectId ref)
  - `relatedAgency` and `relatedOrganization` and `relatedUser` refs

**Important note:** `relatedGrant` is declared as `ref: 'Grant'` but the pipeline service uses the `Application` model. This mismatch is documented in “Issues Found”.

---

### File: `red-dog-radios-backend/src/modules/outbox/outbox.service.js`

**Original purpose:** Provide Outbox CRUD, queueing, and sending via configured email provider.

**Changes made (email scope):**
- `queueEmail(...)` now:
  - Injects `replyTo` server-side:
    - For outreach/followup: `grant-${record._id}@reddogradios.com`
    - Else: `ADMIN_REPLY_EMAIL`
  - Saves Outbox record
  - If `relatedGrant` is set:
    - Calls `advanceStage(relatedGrant, 'outreach_sent', ...)` in a try/catch (swallows errors)
- `sendEmail(outboxId)` now calls provider with:
  - `replyTo: record.replyTo`
  - `organizationId: record.relatedAgency` (so send-as-agency via Gmail if connected)
  - On success, records:
    - `sentViaGmail`
    - `senderEmail`

**Side effects introduced:**
- Queueing outreach can mutate pipeline automatically.
- Sending can happen via Gmail API, requiring OAuth.
- Cron calls `processQueue()` hourly (see `cron.jobs.js`).

---

### File: `red-dog-radios-backend/src/modules/outbox/outbox.controller.js`

**Changes made:**
- Added grant-level history endpoint `getGrantHistory`:
  - queries outbox by `{ relatedOrganization, relatedGrant }`
  - aggregates replies per outbox to compute `replyCount` and `hasUnread`
- Added admin endpoints:
  - list/detail
  - retry now
  - delete

---

### File: `red-dog-radios-backend/src/modules/outbox/outbox.route.js`

**Changes made:**
- Added route: `GET /api/outbox/grant/:grantId`
- Added admin routes:
  - `GET /api/outbox/admin/all`
  - `GET /api/outbox/admin/:id`
  - `POST /api/outbox/admin/:id/retry`
  - `DELETE /api/outbox/admin/:id`

---

### File: `red-dog-radios-backend/src/modules/ai/ai.controller.js`

**Changes made (pipeline integration):**
- `generateEmail` now accepts `grantId` in request body and passes it into `outboxService.queueEmail({ relatedGrant: grantId || undefined })`.

**Side effects introduced:**
- AI generate-email now triggers the entire Outbox and downstream pipeline chain.

---

### File: `red-dog-radios-backend/src/utils/cron.jobs.js`

**Changes made (email scope):**
- Hourly outbox processing job:
  - `outboxService.processQueue(50)`
- Loads Gmail watch renewal job module:
  - `require('../jobs/gmailWatchRenew.job')` in try/catch

**Side effects:**
- Starting the backend schedules the renew job and outbox queue processing.

---

### File: `red-dog-radios-backend/.env.example`

**Changes made (gmail/email scope):**
- Added Gmail OAuth2 vars:
  - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
- Added inbound watch var:
  - `GMAIL_PUBSUB_TOPIC`
- Added `ADMIN_REPLY_EMAIL`

---

### File: `red-dog-radios-backend/package.json`

**New dependencies relevant to scope:**
- `googleapis` (Gmail OAuth + API)
- `nodemailer` (SMTP)
- `node-cron` (watch renewals, outbox processing)
- `mongoose-paginate-v2` (Replies/Outbox pagination)

---

## Section 3: Frontend Files Added

> These are files that clearly exist now and are dedicated to Gmail/Outbox/Replies/Pipeline. (Whether they were “added” vs previously present cannot be proven without git history, but they function as scope-specific additions.)

### File: `red-dog-radios-frontend/src/components/settings/GmailConnectButton.jsx`

**Purpose:** Admin-only Gmail connect/disconnect UI widget embedded into “Agency Profile” settings. It reads Gmail OAuth status for an organization and opens the Google consent URL (admin endpoint) to connect.

**Lines:** 206

**Used by:** `src/views/AgencyProfile.tsx` (settings agency page)

**API calls made:**
- `GET /api/admin/gmail/oauth/status/:organizationId` (via `adminApi.get('gmail/oauth/status/...')`)
- `GET /api/admin/gmail/oauth/connect?organizationId=...`
- `DELETE /api/admin/gmail/oauth/disconnect/:organizationId`

**State managed (hooks):**
- `useState(confirmOpen)`
- `useQuery(statusKey, ...)`
- `useMutation(connectMutation)`
- `useMutation(disconnectMutation)`
- `useEffect` (placeholder/no-op effect)

**UI elements added:**
- Status card (connected/not connected)
- “Connect Gmail” button
- “Disconnect” button with confirmation dialog
- Displays `senderEmail` and `connectedAt`

---

### File: `red-dog-radios-frontend/src/components/admin/GmailStatusBadge.tsx`

**Purpose:** Small pill badge showing whether an agency has Gmail connected (admin view), with optional sender email.

**Lines:** 42

**Used by:** `src/app/admin/(panel)/agencies/page.tsx`

**API calls:**
- `GET /api/admin/gmail/oauth/status/:organizationId`

**State managed:**
- `useQuery` for status

---

### File: `red-dog-radios-frontend/src/app/admin/(panel)/outbox/page.tsx`

**Purpose:** Admin Outbox dashboard. Allows filtering by status + send method (Gmail vs SMTP), basic search, view full HTML, retry failed emails immediately, and delete records.

**Lines:** 553

**API calls:**
- `GET /api/outbox/admin/all` (with query params)
- `GET /api/outbox/admin/:id`
- `POST /api/outbox/admin/:id/retry`
- `DELETE /api/outbox/admin/:id`

**State managed:**
- status/method/search/page
- viewId (detail modal)
- retryId/deleteId confirmations

**UI elements added:**
- Filters bar
- Paginated table
- Detail dialog with iframe preview
- Retry + Delete confirmation dialogs

---

### File: `red-dog-radios-frontend/src/app/admin/(panel)/replies/page.tsx`

**Purpose:** Admin Replies inbox. Shows inbound replies and allows viewing details. Marks reply as read when opened.

**Lines:** 262

**API calls:**
- `GET /api/replies` (admin list)
- `GET /api/replies/:id` (admin detail)
- `PATCH /api/replies/:id/read` (admin mark read)

**State managed:**
- page, isRead filter, viewId

---

### File: `red-dog-radios-frontend/src/app/admin/(panel)/pipeline/page.tsx`

**Purpose:** Read-only pipeline board grouped by stage, with optional org filter and archived toggle.

**Lines:** 239

**API calls:**
- `GET /api/grants/pipeline/board`

**State managed:**
- orgFilter, showArchived

---

### File: `red-dog-radios-frontend/src/views/Outbox.tsx`

**Purpose:** Agency Outbox screen (communications outbox). Lists outbound emails, shows status counts, allows retrying failed messages, and provides a modal to preview the email and thread replies.

**Lines:** 488

**API calls:**
- `GET /api/outbox` (list)
- `GET /api/replies/count-by-outbox?outboxIds=...`
- `GET /api/replies/my?outboxId=...` (modal)
- `PATCH /api/replies/:id/read` (mark read in modal)
- `POST /api/outbox/:id/retry` (retry)

**State managed:**
- previewEmail, previewTab
- modal tab + selected reply in thread view

---

### File: `red-dog-radios-frontend/src/views/Replies.tsx`

**Purpose:** Agency Replies inbox page. Lists replies, filters by read status, provides “view” dialog with original outreach (iframe) and reply (iframe), and marks as read on open.

**Lines:** 254

**API calls:**
- `GET /api/replies/my` (list)
- `PATCH /api/replies/:id/read` (mark read)

**State managed:**
- page, isRead, view dialog state

---

## Section 4: Frontend Files MODIFIED

### File: `red-dog-radios-frontend/src/views/ApplicationBuilder.tsx`

**What was added (email/pipeline scope):**
- A pipeline progress bar (stages list + visual dots/lines).
- Pipeline API integration:
  - `GET /api/grants/:id/pipeline`
  - `PATCH /api/grants/:id/pipeline`
- “Email History” section:
  - `GET /api/outbox/grant/:id` to display outreach emails and reply counts.
  - “Generate Outreach Email” modal:
    - Calls `POST /api/ai/generate-email` with `grantId: id`.
  - Thread modal to view original outreach and replies:
    - `GET /api/replies/by-outbox/:outboxId`
    - `PATCH /api/replies/:id/read`
- Cache invalidations:
  - invalidates outbox and replies query keys after actions.

**Impacts existing functionality:**
- Adds polling / invalidations related to replies/outbox.
- Adds new actions and modals on an already complex application builder page.

---

### File: `red-dog-radios-frontend/src/views/AgencyProfile.tsx`

**What was added:**
- “Email Sending” settings card that embeds `GmailConnectButton`.
- Handles `?connected=true` query param to toast and clean URL after OAuth redirect.

**Impact:**
- Exposes Gmail connect UX inside the agency settings area, but it calls **admin endpoints** via `adminApi` (meaning this UI is only functional for admin-authenticated contexts).

---

### File: `red-dog-radios-frontend/src/components/AppShell.tsx`

**What was added/changed:**
- Adds a “Replies” sidebar item with a badge showing unread reply count.
- Polls `GET /api/replies/my/unread-count` every 60 seconds for authenticated users.

**Impact:**
- Always-on polling introduces background load and depends on Replies module being stable.

---

### File: `red-dog-radios-frontend/src/components/admin/AdminShell.tsx`

**What was added:**
- Admin menu entries:
  - `/admin/pipeline`
  - `/admin/outbox`
  - `/admin/replies`

---

### File: `red-dog-radios-frontend/src/lib/queryKeys.ts`

**What was added:**
- `repliesMy()` and `repliesMyUnread()`

---

## Section 5: New Database Collections

### Collection: `replies`

**Backed by:** `red-dog-radios-backend/src/modules/replies/reply.schema.js`

**Schema fields:**
| Field | Type | Required | Default | Index |
|------|------|----------|---------|-------|
| `outboxId` | ObjectId ref `Outbox` | yes | — | index (compound via separate index) |
| `organizationId` | ObjectId ref `Organization` | yes | — | index |
| `userId` | ObjectId ref `User` | no | — | index (with isRead/receivedAt) |
| `from` | String | no | — | — |
| `subject` | String | no | — | — |
| `body` | String | no | — | — |
| `htmlBody` | String | no | — | — |
| `receivedAt` | Date | no | `Date.now` | index via receivedAt sorts |
| `gmailMessageId` | String | no | — | **unique sparse** |
| `isRead` | Boolean | no | false | index with userId |

**Indexes:**
- `gmailMessageId` unique sparse (dedupe)
- `userId + isRead + receivedAt`
- `organizationId + receivedAt`
- `outboxId + receivedAt`

**Hooks:** none (no mongoose middleware)

**Approximate document count expected at scale:**
- Roughly equals total inbound replies received across all agencies (potentially large). Each outbound email can have 0..N replies; in practice likely low per outbox item.

---

### Collection: `outboxes`

This collection existed as an Outbox concept, but the schema now supports reply routing and Gmail send metadata (see Section 6).

---

### Collection: `communicationlogs`

This collection exists and is adjacent to the email/pipeline system (used to show activity on application detail). It is also referenced by post-award cron jobs.

**Backed by:** `src/modules/communication-log/communication-log.schema.js`

**Fields include:**
- application/org references
- type/direction
- subject/body
- createdBy metadata
- visibleToAgency

---

## Section 6: New Schema Fields On Existing Collections

### Collection: `organizations`

**Added fields:** `gmailOAuth` subdocument (see below)

| Field | Type | Required | Default | Notes |
|------|------|----------|---------|------|
| `gmailOAuth.isConnected` | Boolean | no | false | gate for Gmail send path |
| `gmailOAuth.accessToken` | String | no | — | stored in DB |
| `gmailOAuth.refreshToken` | String | no | — | stored in DB; required for refresh |
| `gmailOAuth.tokenExpiry` | Date | no | — | used for refresh window |
| `gmailOAuth.senderEmail` | String | no | — | From header |
| `gmailOAuth.connectedAt` | Date | no | — | audit/display |
| `gmailOAuth.watchExpiry` | Date | no | — | watch renewal |
| `gmailOAuth.historyId` | String | no | — | cursor for push processing |

---

### Collection: `applications` (grants)

**Added fields:**

| Field | Type | Required | Default | Notes |
|------|------|----------|---------|------|
| `pipelineStage` | String enum | no | `discovered` | stage machine |
| `pipelineHistory[]` | Array | no | `[]` | append-only history entries |
| `pipelineHistory[].stage` | String | no | — | not enum enforced at schema level |
| `pipelineHistory[].changedAt` | Date | no | `Date.now` | |
| `pipelineHistory[].changedBy` | String enum | no | `system` | `system` or `user` |
| `pipelineHistory[].note` | String | no | — | free text |

---

### Collection: `outboxes`

**Added fields (reply routing + Gmail metadata):**

| Field | Type | Required | Default | Notes |
|------|------|----------|---------|------|
| `replyTo` | String | no | — | injected server-side; alias |
| `senderEmail` | String | no | — | when sent via Gmail |
| `sentViaGmail` | Boolean | no | false | true if Gmail API path used |
| `relatedGrant` | ObjectId | no | — | used for pipeline advance + history |

---

## Section 7: New Routes (Complete API Surface)

> This is a flat inventory of endpoints relevant to email/oauth/outbox/replies/pipeline in this repo snapshot.

### Module: Gmail OAuth + Webhooks (`/api/gmail/*`)

| Method | Path | Auth | Paywall | Purpose |
|--------|------|------|---------|---------|
| GET | `/api/gmail/oauth/connect` | admin | no | Get Google consent URL for org |
| GET | `/api/gmail/oauth/callback` | public | no | OAuth redirect target; stores tokens |
| GET | `/api/gmail/oauth/status/:organizationId` | admin | no | Check Gmail connection status |
| DELETE | `/api/gmail/oauth/disconnect/:organizationId` | admin | no | Clear Gmail tokens, disable send |
| POST | `/api/gmail/webhook/reply` | public | no | Dev stub reply ingest: route by replyTo |
| POST | `/api/gmail/webhook/push` | public | no | Pub/Sub push endpoint; fetch + route replies |

### Module: Outbox (`/api/outbox/*`)

| Method | Path | Auth | Paywall | Purpose |
|--------|------|------|---------|---------|
| GET | `/api/outbox` | agency/admin | no | List outbox records (scoped to org in controller) |
| GET | `/api/outbox/grant/:grantId` | agency/admin | no | List outbox history for a grant + reply stats |
| GET | `/api/outbox/:id` | agency/admin | no | Get outbox record (org-scoped check) |
| POST | `/api/outbox/queue` | agency/admin | no | Queue a new email record |
| POST | `/api/outbox/:id/send` | agency/admin | no | Send a specific outbox record |
| POST | `/api/outbox/:id/retry` | agency/admin | no | Retry failed email |
| GET | `/api/outbox/admin/all` | admin | no | Admin list w/ filters + search |
| GET | `/api/outbox/admin/:id` | admin | no | Admin detail |
| POST | `/api/outbox/admin/:id/retry` | admin | no | Admin retry-now |
| DELETE | `/api/outbox/admin/:id` | admin | no | Admin delete record |

### Module: Replies (`/api/replies/*`)

| Method | Path | Auth | Paywall | Purpose |
|--------|------|------|---------|---------|
| GET | `/api/replies` | admin | no | Admin list replies |
| GET | `/api/replies/:id` | admin | no | Admin detail |
| PATCH | `/api/replies/:id/read` | admin | no | Admin mark read |
| GET | `/api/replies/my` | agency | no | Agency list replies (user-scoped) |
| GET | `/api/replies/my/unread-count` | agency | no | Unread count (polled in sidebar) |
| PATCH | `/api/replies/:id/read` | agency | no | Agency mark read |
| GET | `/api/replies/count-by-outbox` | agency | no | Count replies per outbox (for outbox list) |
| GET | `/api/replies/by-outbox/:outboxId` | agency | no | Thread replies for an outbox record |

### Module: Grant pipeline (`/api/grants/*`)

| Method | Path | Auth | Paywall | Purpose |
|--------|------|------|---------|---------|
| GET | `/api/grants/pipeline/board` | admin | no | Board view grouped by pipeline stage |
| GET | `/api/grants/:id/pipeline` | agency/admin | no | Read pipeline stage + history for grant |
| PATCH | `/api/grants/:id/pipeline` | agency/admin | no | Set manual pipeline stages (user) |

### Related module: AI email generation (`/api/ai/generate-email`)

| Method | Path | Auth | Paywall | Purpose |
|--------|------|------|---------|---------|
| POST | `/api/ai/generate-email` | agency | **yes** (`requireActiveSubscription`) | Generate outreach email and queue outbox record |

---

## Section 8: Automatic Side Effects (Event Chain)

This is the most important section: the system’s brittleness primarily comes from chains where “one write triggers many other writes”.

### Trigger A: `POST /api/ai/generate-email` (AI outreach generation)

**Entry point:** `red-dog-radios-backend/src/modules/ai/ai.controller.js` `generateEmail()`

**Causes:**
1. **Resolve agency organization id**
   - `resolveAgencyOrganizationId(req.user)` (400 if missing)
2. **Generate email content**
   - `aiService.generateOutreachEmail(...)`
   - Side effects: DB reads (`Opportunity`, `Organization`) and **OpenAI API call**
3. **Queue Outbox record**
   - `outboxService.queueEmail({ ... relatedGrant: grantId })`
   - Side effects: writes Outbox record and sets server-side `replyTo`
4. **Pipeline auto-advance (outreach)**
   - Inside `queueEmail`, if `relatedGrant` present:
     - `advanceStage(grantId, 'outreach_sent', { changedBy:'system', note })`
     - Errors swallowed (warn only)

**Failure modes:**
- OpenAI quota/429 → request returns 500 (as observed in diagnostics earlier).
- Missing `replyTo` injection can break reply routing downstream.
- Invalid `grantId` means no pipeline advance and no grant-level linking.

---

### Trigger B: `outboxService.queueEmail(...)`

**Entry point:** `red-dog-radios-backend/src/modules/outbox/outbox.service.js` `queueEmail()`

**Causes:**
1. Creates new `Outbox` document with:
   - recipient, subject, htmlBody, emailType
   - related refs (organization/agency/user/grant)
2. Injects `replyTo`:
   - If emailType is `outreach` or `followup_reminder`:
     - `replyTo = grant-${record._id}@reddogradios.com`
   - Else:
     - `replyTo = ADMIN_REPLY_EMAIL`
3. Saves Outbox record.
4. If `record.relatedGrant` exists:
   - Attempts pipeline advance to `outreach_sent` (system)

**Side effects:**
- DB write: Outbox insert
- DB write: Application update (pipeline) potentially

---

### Trigger C: Outbox hourly processor (`cron.jobs.js` → `outboxService.processQueue()`)

**Entry point:** `red-dog-radios-backend/src/utils/cron.jobs.js` hourly cron

**Causes:**
1. Finds pending Outbox records (retryCount < 5 and scheduledFor <= now).
2. For each:
   - Calls `outboxService.sendEmail(outboxId)`
3. `sendEmail(outboxId)`:
   - Calls provider `sendEmailProvider({ to, subject, html, replyTo, organizationId })`
   - If success:
     - Updates Outbox: `status='sent'`, `sentAt`, `providerMessageId`, `sentViaGmail`, `senderEmail`
   - If failure:
     - Updates Outbox: `status='failed'`, increments retryCount, sets `errorMessage`

**Side effects:**
- External SMTP or Gmail API calls
- DB writes on each outbox record

---

### Trigger D: Gmail OAuth connect flow (admin triggers connect, Google calls callback)

**Entry points:**
- `GET /api/gmail/oauth/connect` (admin)
- `GET /api/gmail/oauth/callback` (public, from Google)

**Causes:**
1. `oauth/connect` returns a Google consent URL, state carries `organizationId`.
2. Google redirects to `oauth/callback` with `code` and `state`.
3. Callback:
   - Exchanges code for tokens
   - Writes tokens into `Organization.gmailOAuth`
   - Tries to set up Gmail watch immediately (`setupGmailWatch`)

**Side effects:**
- External OAuth exchange
- DB write: org oauth tokens + metadata
- External Gmail watch creation
- DB write: org `historyId`, `watchExpiry`

---

### Trigger E: Gmail watch renewal cron

**Entry point:** `src/jobs/gmailWatchRenew.job.js` scheduled at 00:00 UTC

**Causes:**
1. Calls `renewAllWatches()`.
2. For each org due for renewal:
   - Refreshes token if needed (DB write)
   - Calls Gmail watch API (external)
   - Writes new watch expiry and historyId (DB write)

---

### Trigger F: Pub/Sub push inbound reply processing (`POST /api/gmail/webhook/push`)

**Entry point:** `src/modules/gmail/gmail.controller.js` `gmailPushWebhook`

**Causes:**
1. Parse message payload (`emailAddress`, `historyId`)
2. Lookup org by sender email address
3. Refresh access token if needed (DB write)
4. Call Gmail history API to list messageAdded
5. For each message:
   - Fetch full message
   - Extract a `grant-{outboxId}@...` alias from headers (`Reply-To` or `To`)
   - Extract body (text/html)
   - Call `resolveAndNotify(alias, { from, subject, body, htmlBody, messageId })`
6. Update org’s stored `historyId`

**Side effects:**
- Multiple external Gmail API calls per push
- DB writes in replyRouter, plus org historyId update

**Critical design assumption:** Inbound replies contain an address in `Reply-To` or `To` that matches `grant-{24hex}@...`.

---

### Trigger G: `resolveAndNotify()` (ReplyRouter)

**Entry point:** `src/utils/replyRouter.js`

**Causes:**
1. Parse Outbox id from alias (string parsing)
2. Load Outbox record
3. Save Reply (dedupe by `gmailMessageId` if present)
4. If Outbox has `relatedGrant`:
   - Advance pipeline to `reply_received` (system)
5. If Outbox has a `relatedUser`:
   - Create Alert `type='reply_received'`
   - Send notification email to user

**Side effects:**
- DB write: Reply
- DB write: Alert
- DB write: Application pipeline
- External email send

---

## Section 9: New Cron Jobs

| Schedule | Job | What It Does | Idempotent? |
|----------|-----|--------------|-------------|
| Every hour (`0 * * * *`) | Outbox processor | Sends pending outbox emails via provider | Mostly (retries can resend) |
| Daily 00:00 UTC (`0 0 * * *`) | Gmail watch renew | Renews Gmail watches for connected orgs | Mostly (watch call is safe; updates expiry/historyId) |

Notes:
- Outbox processor runs from `src/utils/cron.jobs.js`.
- Gmail watch renew is scheduled in `src/jobs/gmailWatchRenew.job.js` and loaded from `cron.jobs.js`.

---

## Section 10: New Environment Variables

| Variable | Required | Purpose | What happens if missing |
|----------|----------|---------|-------------------------|
| `GOOGLE_CLIENT_ID` | yes (for Gmail OAuth) | OAuth client id | Gmail connect fails (`Google OAuth not configured...`) |
| `GOOGLE_CLIENT_SECRET` | yes | OAuth secret | same |
| `GOOGLE_REDIRECT_URI` | yes | OAuth redirect url | same |
| `GMAIL_PUBSUB_TOPIC` | yes (for push replies) | Pub/Sub topic for Gmail watch | Watch setup fails; no push reply detection |
| `ADMIN_REPLY_EMAIL` | no | default reply-to for non-grant emails | replyTo may be undefined |
| `SMTP_HOST/PORT/USER/PASS` | required for SMTP send | nodemailer transport | provider stubs, emails not delivered |
| `DEV_REDIRECT_EMAIL` | optional | dev safety redirect | without it, dev sends to real addresses |
| `FRONTEND_URL` | recommended | used for OAuth redirect and email links | redirects to localhost fallback |

---

## Section 11: New Dependencies (package.json)

### Backend (`red-dog-radios-backend/package.json`)

| Package | Version | Purpose | Bundle size impact |
|---------|---------|---------|--------------------|
| `googleapis` | `^171.4.0` | Gmail OAuth + Gmail API calls | Server-only, moderate |
| `nodemailer` | `^6.10.1` | SMTP sending fallback | Server-only, moderate |
| `node-cron` | `^3.0.3` | Cron scheduling for outbox + watch renew | Server-only, small |
| `mongoose-paginate-v2` | `^1.8.3` | Pagination for replies/outbox | Server-only, small |

### Frontend (`red-dog-radios-frontend/package.json`)

No new deps are uniquely required by this scope beyond existing `@tanstack/react-query`, `axios`, `@radix-ui/*`, etc. The scope is mostly UI + API integration using existing dependencies.

---

## Section 12: External Service Dependencies

| Service | Required For | Setup Effort | Failure Mode |
|---------|--------------|--------------|--------------|
| Google Cloud Console (OAuth) | Connecting agency Gmail accounts | Medium | Cannot connect Gmail; provider falls back to SMTP |
| Gmail API enablement | Sending and watch | Medium | OAuth may succeed but Gmail calls fail |
| Google Pub/Sub topic | Gmail watch push notifications | High | No inbound reply detection |
| DNS/MX/Email routing for `reddogradios.com` | Reply-to alias actually receiving mail | Medium/High | Replies never arrive / bounce; push sees nothing |
| SMTP provider (Gmail SMTP or other) | Fallback sends and notification emails | Medium | Emails stubbed/not delivered |
| MongoDB | Storing Outbox/Replies/pipeline | Existing | System non-functional without DB |
| OpenAI account w/ quota | AI generation endpoints | Medium | AI endpoints 500 with quota errors |

---

## Section 13: Complexity Analysis

| Feature | Complexity | Justified? | Could be simpler? |
|---------|-----------|------------|-------------------|
| Gmail OAuth connect + token storage | High | If “send as agency” is required | Could be simplified by sending from a single system mailbox |
| Gmail watch + Pub/Sub reply detection | Very High | Only if replies must be automatically threaded | Yes: polling or manual reply forwarding could be simpler |
| Outbox queue + retry + admin dashboard | Medium | Operationally helpful | Could be trimmed if volume is low |
| Reply threading UI | Medium | Nice-to-have | Could be phase 2 |
| Unread badge polling | Low/Medium | Improves UX | Optional; remove to reduce background load |
| Pipeline stages and board | Medium | CRM-style tracking | Could be a single status field or removed |
| Automatic pipeline advances | Medium | Makes system “smart” | Also makes behavior non-obvious; could be removed |

---

## Section 14: User-Facing Surface (Agency)

What a fire chief sees (agency user):

- **`/dashboard`**
  - Not audited in full here; emails affect it indirectly through alerts/unread.

- **`/opportunities`**
  - Not directly part of email scope; opportunities are used as context for AI emails.

- **`/applications/[id]`**
  - Shows **Pipeline Stage** bar with stages (Discovered → Outreach Sent → Reply Received → Applying → Submitted → Won/Lost).
  - Shows **Email History** section:
    - “Generate Outreach Email” button opens modal asking for contact email/name and sender info.
    - Generated outreach is queued in Outbox and appears with status pill.
    - Replies linked to those outreach emails appear as a thread modal.
  - Confusing elements risk:
    - “Pipeline Stage” may feel like internal sales tooling.
    - “Outreach Sent / Reply Received” terminology may not match how chiefs think.

- **`/outbox`**
  - “Communications Outbox” list with statuses.
  - Each email shows:
    - subject, to, created time
    - optional “Reply-To: grant-<id>@...” string
    - badge for Gmail method if sent via Gmail
    - reply count button if replies exist
  - Confusing elements:
    - `Reply-To: grant-...@reddogradios.com` is internal infrastructure leaking to user.
    - “Monitor and process outbound system emails” reads like internal ops rather than agency workflow.

- **`/replies`**
  - Replies list with read/unread status.
  - Viewing a reply shows original outreach and reply HTML.

- **`/settings/agency`**
  - “Email Sending” section exists and includes `GmailConnectButton`.
  - Note: the component uses `adminApi` and admin endpoints; for a normal agency user this likely does not work as intended unless they also have admin session/cookies.

- **Sidebar changes**
  - New “Replies” menu item with unread badge (polling every 60s).

---

## Section 15: Admin-Facing Surface

Admin portal additions:

- **`/admin/agencies`**
  - Shows Gmail connection badge per agency (`GmailStatusBadge`).

- **`/admin/agencies/[id]`**
  - Includes “Gmail Sending (OAuth2)” section:
    - Connect Gmail (opens consent URL)
    - Disconnect Gmail
    - Shows status/sender/connectedAt

- **`/admin/outbox`**
  - Full Outbox monitor:
    - filter by status and send method
    - view full record and HTML preview
    - retry failed messages now
    - delete record

- **`/admin/replies`**
  - Replies inbox view:
    - filter by read/unread
    - view detail
    - marks replies as read when opened

- **`/admin/pipeline`**
  - Read-only board grouped by pipeline stage.
  - Org filter dropdown and “show archived”.

---

## Section 16: What Was The Original Goal

Based on the code structure and naming conventions, the likely original goal was:

1. **Send outreach emails reliably** (Outbox queue + retry + hourly cron).
2. **Send as the agency** rather than from a central Red Dog mailbox (Gmail OAuth per org).
3. **Automatically detect replies** and attach them to the outreach message (reply alias + Gmail watch/push).
4. **Advance internal grant pipeline** based on communications events (outreach_sent, reply_received).

The current implementation largely matches that goal, but it also adds additional surface area (admin dashboards, pipeline board, unread polling, thread UI) that may overshoot the minimum needed for a beta.

---

## Section 17: Minimum Viable Version (Options Map)

This section does not decide; it enumerates what could survive in a “minimum viable” configuration.

| Feature | Keep? | Why / Notes |
|---------|-------|-------------|
| Outbox queue + hourly sender | Likely yes | Core reliability and retry |
| SMTP fallback | Yes | Needed for baseline deliverability |
| Gmail OAuth connect | Maybe | Only if “send as agency” is a must-have |
| Admin Outbox dashboard | Maybe | Helpful ops tool; can be hidden initially |
| Reply alias injection (`replyTo`) | Maybe | Only needed for reply threading |
| Pub/Sub push reply detection | Probably not | Highest complexity + infra dependencies |
| Reply collection + agency Replies UI | Maybe | Only valuable if reply detection is kept |
| Unread badge polling | No/Maybe | Nice UX but adds background work |
| Pipeline stages auto-advance | No/Maybe | Optional CRM feature; adds coupling |
| Admin pipeline board | No | Pure admin surface; can be phase 2 |

---

## Section 18: Refactor Paths

### Path A: Keep Everything As Is
- **Pros:** Full end-to-end experience; auto-threading; admin visibility.
- **Cons:** Highest operational complexity; external dependencies (Pub/Sub, DNS routing) are non-trivial; cascading side-effects increase fragility.
- **Effort to ship:** Medium (mainly devops + stabilization).

### Path B: Strip To Essentials
- **What survives:**
  - Outbox queue + hourly sender
  - SMTP fallback
  - AI generates outreach and queues
  - Remove reply ingestion + pipeline auto-advance + unread polling
- **Effort:** Medium (removal + UI simplification).
- **New behavior:** Replies are not auto-detected; agencies manually track conversations outside the app or via a system inbox.

### Path C: Remove Entirely, Restore Pre-Email-Scope State
- **Effort:** Medium/High depending on how deeply UI depends on it now.
- **What’s lost:** All outbound reliability, reply threading, pipeline integration.
- **What’s gained:** Massive reduction in complexity + devops footprint.

---

## Section 19: Issues Found

| ID | Severity | Description | File |
|----|----------|-------------|------|
| ES-001 | High | OpenAI quota errors propagate as 500; generate-email fails hard when OpenAI returns 429 | `src/modules/ai/ai.service.js` + error middleware |
| ES-002 | High | Reply-to alias uses `grant-{outboxId}@...` but link text implies “grant” (Application) id; naming mismatch increases confusion | `src/modules/outbox/outbox.service.js`, `src/utils/replyRouter.js` |
| ES-003 | Medium | `Outbox.relatedGrant` uses `ref: 'Grant'` but pipeline operates on `Application`; ref mismatch can break population and semantics | `src/modules/outbox/outbox.schema.js` |
| ES-004 | Medium | `AgencyProfile` exposes Gmail connect UI but uses admin endpoints; may not work for normal agency user sessions | `src/views/AgencyProfile.tsx`, `src/components/settings/GmailConnectButton.jsx` |
| ES-005 | Medium | Replies router defines two `PATCH /:id/read` routes; ordering + role restrictions could be confusing to debug | `src/modules/replies/reply.route.js` |
| ES-006 | Medium | Public webhook endpoints have no auth and always return 200; if hit by abuse, they can trigger DB writes and email sends | `src/modules/gmail/gmail.controller.js`, `src/utils/replyRouter.js` |
| ES-007 | Low/Medium | Agency sidebar polls unread count every 60s; can create background load | `src/components/AppShell.tsx` |

---

## Section 20: Recommendations

If the product goal is “send outreach as the agency and track replies”, the current system is directionally correct, but it should be treated as a **workflow engine** with strong operational requirements. The highest-risk component is the **Gmail watch + Pub/Sub + reply alias routing** chain; decide early whether automatic reply detection is truly required for beta. If not, strip reply ingestion and pipeline auto-advances first to reduce coupling, keep Outbox + retry for reliability, and reintroduce inbound threading later once infra and observability are solid.

---

## Appendix A: Files referenced but not found

These were mentioned as “if exists” in the request; they are **not present** in `red-dog-radios-backend/src/`:
- `src/jobs/grantMatch.job.js`

