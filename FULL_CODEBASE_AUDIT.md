# Full Codebase Audit (Backend + Frontend)

Generated: 2026-04-29

This document inventories what currently exists in the repo:

- Backend: `red-dog-radios-backend/src/`
- Frontend: `red-dog-radios-frontend/src/`

---

## 1) Backend Modules (`red-dog-radios-backend/src/modules/*`)

> “Grant” in product UI maps to the backend **`Application`** model. Pipeline is implemented as `Application.pipelineStage` + `Application.pipelineHistory`, and the pipeline API is mounted under `/api/grants`.

### `activityLogs/`
- **Schema**: `src/modules/activityLogs/activityLog.schema.js`
  - **Fields**: `category` (enum), `action`, `summary`, `severity`, `actorId` (User), `meta` (Mixed), timestamps.
  - **Indexes**: (none explicitly beyond defaults).
- **Routes**: none in this folder.
- **Service**: `src/modules/activityLogs/activityLog.service.js`
  - **Exports**: `log`, `listAdmin`, `getByIdAdmin`.

### `admin/`
- **Routes**: `src/modules/admin/admin.route.js`
  - **Endpoints**:
    - `POST /api/admin/auth/login`
    - `GET /api/admin/auth/me`
    - `GET /api/admin/dashboard`
    - `GET /api/admin/activity-logs`, `GET /api/admin/activity-logs/:id`
    - `GET /api/admin/agencies`, `GET /api/admin/agencies/priority`, `GET /api/admin/agencies/:id`
    - `GET /api/admin/opportunities`, `POST /api/admin/opportunities`, `GET/PUT/DELETE /api/admin/opportunities/:id`
    - `GET /api/admin/funders`, `POST /api/admin/funders`, `GET/PUT/DELETE /api/admin/funders/:id`
    - `PUT /api/admin/funders/:id/unlock`, `PUT /api/admin/funders/:id/set-limit`
    - `GET /api/admin/applications`, `GET/PUT/DELETE /api/admin/applications/:id`, `PATCH /api/admin/applications/:id/status`
    - `POST /api/admin/applications/:id/generate-ai`, `POST /api/admin/applications/create-for-agency`
    - `GET /api/admin/matches`, `GET /api/admin/matches/:id`, `POST /api/admin/matches/recompute-all`
    - `PUT /api/admin/matches/:id/approve` (deprecated), `PUT /api/admin/matches/:id/reject`
    - `GET /api/admin/users`, `GET /api/admin/users/:id`, `PUT /api/admin/users/:id/role`
- **Controller**: `src/modules/admin/admin.controller.js`
  - **Exports**: `adminLogin`, `adminMe`, `dashboard`, `listAgencies`, `listPriorityAgencies`, `getAgency`,
    `listOpportunities`, `createOpportunity`, `getOpportunity`, `updateOpportunity`, `deleteOpportunity`,
    `listFunders`, `createFunder`, `updateFunder`, `deleteFunder`, `getFunder`, `unlockFunder`, `setFunderLimit`,
    `listApplications`, `getApplication`, `updateApplication`, `updateApplicationStatus`, `deleteApplication`,
    `generateApplicationAI`, `createApplicationForAgency`,
    `listMatches`, `getMatch`, `recomputeMatches`, `approveMatch`, `rejectMatch`,
    `listUsers`, `getUser`, `updateUserRole`,
    `listActivityLogs`, `getActivityLog`.
- **Service**: `src/modules/admin/admin.service.js`
  - **Exports**: mirrors controller-level admin operations (dashboard, agency/funder/opportunity/application/match/user/activity-log CRUD + recompute/generate AI flows).

### `agencies/`
- **Schema**: `src/modules/agencies/agency.schema.js`
  - **Fields**: `name`, `type` (enum), `location`, `grantContactEmail`, `matchCount`, `status`, timestamps.
- **Routes**: `src/modules/agencies/agency.route.js`
  - `GET/POST /api/agencies`, `GET/PUT /api/agencies/:id` (protected).
- **Controller**: `agency.controller.js` exports `getAll`, `getOne`, `create`, `update`.
- **Service**: `agency.service.js` exports `getAll`, `create`, `getOne`, `update`, `remove`.

### `ai/`
- **Routes**: `src/modules/ai/ai.route.js`
  - `POST /api/ai/generate-summary`
  - `POST /api/ai/generate-email` (queues Outbox; supports `grantId` => `Outbox.relatedGrant`)
  - `POST /api/ai/generate-application`
  - `POST /api/ai/compute-match`
  - All are `protect` + `requireActiveSubscription` + rate-limited.
- **Controller**: `ai.controller.js` exports `generateSummary`, `generateEmail`, `generateApplication`, `computeMatch`.
- **Service**: `ai.service.js` exports `generateGrantSummary`, `generateOutreachEmail`, `generateApplication`, `computeMatchWithAI`.

### `alerts/`
- **Schema**: `src/modules/alerts/alert.schema.js`
  - **Fields**: `organization`, `opportunity`, `user`, `orgName`, `grantName`, `type` (includes `reply_received`),
    `priority`, `message`, `isRead`, `alertKey` (unique sparse), timestamps.
- **Routes**: `src/modules/alerts/alert.route.js`
  - `GET /api/alerts`
  - `PUT /api/alerts/read-all`
  - `PUT /api/alerts/:id/read`
  - `DELETE /api/alerts/:id`
- **Controller**: `alert.controller.js` exports `getAll`, `markRead`, `markAllRead`, `remove`.
- **Service**: `alert.service.js` exports `getAll`, `markRead`, `markAllRead`, `remove`, `createDeadlineAlerts`, `createHighFitAlerts`.

### `applications/`
- **Schema**: `src/modules/applications/application.schema.js`
  - **Fields (high level)**:
    - Links: `organization` (required), `opportunity`, `funder`, `submittedBy`
    - App status + tracker fields (`status`, `statusHistory`, dates, notes)
    - AI writing sections + `alignedVersion`
    - Post-award sequence (`postAwardSequence.*`)
    - Win tagging (`isWinner`, `winTags.*`)
    - Pipeline: `pipelineStage`, `pipelineHistory`
  - **Indexes**: org/status; org/createdAt; funder; partial unique indexes to prevent duplicate “active” applications for org+opportunity or org+funder.
- **Routes**: `src/modules/applications/application.route.js`
  - `GET/POST /api/applications`
  - `POST /api/applications/generate` (AI, subscription-gated)
  - `GET/PUT/DELETE /api/applications/:id`
  - `PUT /api/applications/:id/submit`
  - `PATCH /api/applications/:id/status`
  - `POST /api/applications/:id/award-response`
  - `POST /api/applications/:id/regenerate` (AI)
  - `POST /api/applications/:id/align` (AI)
  - `GET /api/applications/:id/export`
- **Controller exports**: `getAll`, `getOne`, `create`, `generate`, `update`, `updateStatus`, `submit`, `remove`,
  `regenerate`, `alignToFunder`, `exportApplication`, `respondToAward`.
- **Service exports**: `getAll`, `create`, `createWithAI`, `getOne`, `update`, `updateStatus`, `regenerate`,
  `adminRegenerateAI`, `alignToFunder`, `exportApplication`, `submit`, `remove`.

### `ashleen/`
- **Routes**: `POST /api/ashleen/chat` (protected + subscription)
- **Controller**: `ashleen.controller.js` exports `chat`.

### `auth/`
- **Schema**: `src/modules/auth/user.schema.js`
  - **Fields**: user profile fields, `role` (agency/admin), verification & reset OTP fields, `organizationId`, `settings.*`, timestamps.
- **Routes**: `src/modules/auth/auth.route.js`
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `POST /api/auth/forgot-password`
  - `POST /api/auth/verify-otp`
  - `POST /api/auth/reset-password`
  - `POST /api/auth/verify-email`
  - `POST /api/auth/resend-verification`
  - `GET /api/auth/me` (protected)
- **Controller exports**: `register`, `login`, `getMe`, `forgotPassword`, `verifyOtp`, `resetPassword`, `verifySignupOtp`, `resendVerificationOtp`.
- **Service exports**: `register`, `login`, `getMe`, `loginAdmin`, `forgotPassword`, `verifyOtp`, `resetPassword`, `verifySignupOtp`, `resendVerificationOtp`.

### `billing/`
- **Routes**: `src/modules/billing/billing.routes.js`
  - `GET /api/billing/tiers`
  - `GET /api/billing/status` (protected)
  - `POST /api/billing/checkout` (protected)
  - `POST /api/billing/portal` (protected)
  - Webhook is mounted in `src/app.js` at `POST /api/billing/webhook` using `express.raw()`.
- **Controller exports**: `getTiers`, `getStatus`, `createCheckout`, `createPortal`, `handleWebhook`.
- **Service exports**: `isStripeReady`, `getOrCreateCustomer`, `createCheckoutSession`, `createPortalSession`,
  `getSubscriptionStatus`, `hasActiveAccess`, `hasPremiumAccess`, `grantBetaAccessFromCoupon`, `handleWebhookEvent`, `TIERS`.

### `communication-log/`
- **Schema**: `communication-log.schema.js`
  - Fields: `application`, `organization`, `type`, `direction`, `subject`, `body`, `createdBy`, `createdByName`, `createdByRole`, `withParty`, `visibleToAgency`, timestamps.
- **Routes**: `communication-log.routes.js`
  - `POST /api/communication-log` (protected, admin)
  - `GET /api/communication-log/admin/application/:applicationId` (protected, admin)
  - `GET /api/communication-log/agency/application/:applicationId` (protected)
  - `DELETE /api/communication-log/:id` (protected, admin)
- **Controller exports**: `create`, `listAdmin`, `listAgency`, `remove`.
- **Service exports**: `create`, `logSystemEvent`, `listForApplication`, `remove`.

### `coupons/`
- **Schema**: `coupon.schema.js` (coupon code, usage, expiry, usedBy list)
- **Routes**: `coupon.routes.js`
  - `GET /api/coupons/validate` (public)
  - `POST /api/coupons/redeem` (protected)
  - Admin: `GET/POST /api/coupons`, `PATCH /api/coupons/:id/deactivate`
- **Controller exports**: `validate`, `redeem`, `create`, `list`, `deactivate`.
- **Service exports**: `redeemCoupon`, `validateCoupon`, `createCoupon`, `listCoupons`, `deactivateCoupon`.

### `dashboard/`
- **Routes**: `GET /api/dashboard/stats` (protected)
- **Controller**: `getStats`
- **Service**: `getStats`

### `digests/`
- **Schema**: `digest.schema.js` (digest periods, opportunities snapshot, htmlContent, status)
- **Routes**: `GET /api/digests`, `POST /api/digests/generate`, `POST /api/digests/preview`, `GET /api/digests/:id`, `POST /api/digests/:id/send`
- **Controller exports**: `getAll`, `getOne`, `generate`, `preview`, `send`
- **Service exports**: `getAll`, `getOne`, `generateDigest`, `sendDigest`

### `followups/`
- **Schema**: `followup.schema.js`
- **Routes**: `GET /api/followups`, `PUT /api/followups/:id/send`, `PUT /api/followups/:id/skip`
- **Controller exports**: `getAll`, `markSent`, `skip`
- **Service exports**: `getAll`, `markSent`, `skip`, `scheduleForApplication`, `backfillMissingFollowUps`

### `funders/`
- **Schema**: `funder.schema.js` (funding profile + caps + lock)
- **Routes**: `GET /api/funders`, `GET /api/funders/:id`, `GET /api/funders/:id/queue`, `PUT /api/funders/:id`, `POST /api/funders/:id/save`
- **Controller exports**: `getAll`, `getQueue`, `updateAgencyNotes`, `getOne`, `saveFunder`
- **Service exports**: `getAll`, `getOne`, `create`, `update`, `deactivate`, `reactivate`, `saveFunder`,
  `computeFunderScore`, `updateAgencyNotesOnly`, `getQueueForAgency`

### `gmail/`
- **Routes**: `gmail.route.js`
  - Admin OAuth: `GET /api/gmail/oauth/connect`, `GET /api/gmail/oauth/status/:organizationId`, `DELETE /api/gmail/oauth/disconnect/:organizationId`
  - Callback: `GET /api/gmail/oauth/callback` (redirect)
  - Webhooks: `POST /api/gmail/webhook/reply` (stub), `POST /api/gmail/webhook/push` (Pub/Sub)
- **Controller exports**: `oauthConnect`, `oauthCallback`, `oauthStatus`, `oauthDisconnect`, `replyWebhook`, `gmailPushWebhook`
- **Service exports**: `getConnectUrl`, `handleOAuthCallback`, `getStatus`, `disconnect`
- **Watch helper**: `gmail.watch.js` exports `setupGmailWatch`, `renewAllWatches`

### `grants/` (pipeline)
- **Routes**: `grant.pipeline.route.js`
  - `GET /api/grants/pipeline/board` (admin)
  - `GET /api/grants/:id/pipeline` (agency-scoped)
  - `PATCH /api/grants/:id/pipeline` (agency-scoped)
- **Controller exports**: `getPipeline`, `setPipelineStage`, `adminBoard`
- **Service exports**: `advanceStage`, `STAGE_ORDER`, `TERMINAL_STAGES`

### `matches/`
- **Schema**: `match.schema.js`
- **Routes**: `GET/POST /api/matches`, `POST /api/matches/compute`, `POST /api/matches/compute-all`, `GET /api/matches/:id`,
  admin legacy: `PUT /api/matches/:id/approve`, `PUT /api/matches/:id/reject`
- **Controller exports**: `getAll`, `getOne`, `create`, `computeAndSave`, `computeAll`, `approve`, `reject`
- **Service exports**: `computeMatchScore`, `getAll`, `getOne`, `create`, `computeAndSave`, `approveMatch`, `rejectMatch`, `computeAllForOrganization`

### `onboarding/`
- **Routes**: `POST /api/onboarding/complete` (protected)
- **Controller exports**: `complete`
- **Service exports**: `complete`

### `opportunities/`
- **Schema**: `opportunity.schema.js`
- **Routes**: `GET /api/opportunities`, `GET /api/opportunities/:id`
- **Controller exports**: `getAll`, `getOne`, `create`, `update`, `remove` (create/update/remove are mainly used by admin module)
- **Service exports**: `getAll`, `create`, `getOne`, `update`, `remove`

### `organizations/`
- **Schema**: `organization.schema.js` (agency profile + subscription + gmailOAuth)
- **Routes**: `GET/POST /api/organizations`, `GET/PUT /api/organizations/:id`
- **Controller exports**: `getAll`, `getOne`, `create`, `update`
- **Service exports**: `getAll`, `create`, `getOne`, `update`, `remove`

### `outbox/`
- **Schema**: `outbox.schema.js` (email queue + gmail tracking + `relatedGrant`)
- **Routes**:
  - Agency: `GET /api/outbox`, `GET /api/outbox/grant/:grantId`, `POST /api/outbox/queue`, `GET /api/outbox/:id`,
    `POST /api/outbox/:id/send`, `POST /api/outbox/:id/retry`
  - Admin: `GET /api/outbox/admin/all`, `GET /api/outbox/admin/:id`, `POST /api/outbox/admin/:id/retry`, `DELETE /api/outbox/admin/:id`
- **Controller exports**: `getAll`, `getOne`, `getGrantHistory`, `adminGetAll`, `adminGetOne`, `adminRetryNow`, `adminDeleteOne`,
  `queueEmail`, `sendEmail`, `retryFailed`
- **Service exports**: `getAll`, `getAllAdmin`, `getOne`, `getOneAdmin`, `create`, `queueEmail`, `sendEmail`, `processQueue`,
  `retryFailed`, `retryNowAdmin`, `deleteOneAdmin`

### `outreach/`
- **Schema**: `outreach.schema.js`
- **Routes**: `GET /api/outreach`, `POST /api/outreach/generate`, `POST /api/outreach/:id/send`, `GET/PUT /api/outreach/:id`, `PUT /api/outreach/:id/sent`
- **Controller exports**: `getAll`, `getOne`, `generate`, `update`, `markSent`, `sendOutreach`
- **Service exports**: `generateFromFunder`, `generateFromOpportunity`, `getAll`, `getOne`, `update`, `markSent`, `send`

### `replies/`
- **Schema**: `reply.schema.js`
- **Routes**: `reply.route.js`
  - Admin: `GET /api/replies`, `GET /api/replies/:id`, `PATCH /api/replies/:id/read`
  - Agency: `GET /api/replies/count-by-outbox`, `GET /api/replies/by-outbox/:outboxId`, `GET /api/replies/my`,
    `GET /api/replies/my/unread-count`, `PATCH /api/replies/:id/read`
- **Controller exports**: `adminGetAll`, `adminGetOne`, `adminMarkRead`, `myReplies`, `myUnreadCount`, `myMarkRead`,
  `myCountByOutbox`, `myThreadByOutbox`
- **Service exports**: `getAllAdmin`, `getOneAdmin`, `markReadAdmin`, `markReadForUser`, `getMy`,
  `countUnreadForUser`, `countByOutboxForUser`, `getThreadByOutboxForUser`

### `settings/`
- **Routes**: `GET /api/settings`, `PUT /api/settings`, `DELETE /api/settings/account`
- **Controller exports**: `getSettings`, `updateSettings`, `deleteAccount`
- **Service exports**: `getSettings`, `updateSettings`, `deleteAccount`

### `tracker/`
- **Routes**: `GET /api/tracker/stats`, `GET /api/tracker`
- **Controller exports**: `getTracker`, `getTrackerStats`
- **Service exports**: `getTracker`, `getTrackerStats`

### `wins/`
- **Schema**: `win.schema.js`
- **Routes**: `GET /api/wins`, `GET /api/wins/insights`, `GET /api/wins/patterns`
- **Controller exports**: `getAll`, `getInsights`, `getPatterns`
- **Service exports**: `getAll`, `getInsights`, `create`, `getPatterns`

---

## 2) Jobs / Cron (`red-dog-radios-backend/src/jobs/*`)

### `src/jobs/gmailWatchRenew.job.js`
- **Schedule**: `0 0 * * *` (daily 00:00 UTC)
- **Does**: Calls `renewAllWatches()` from `src/modules/gmail/gmail.watch.js` to renew Gmail watch subscriptions.

---

## 3) Config files (`red-dog-radios-backend/src/config/*`)

- `cloudinary.config.js`
  - **Exports**: configured Cloudinary `v2` instance.
- `openai.config.js`
  - **Exports**: `OpenAI` client instance (or `null` if `OPENAI_API_KEY` missing).
- `stripe.config.js`
  - **Exports**: `{ stripe, TIERS }` (stripe may be `null` if key placeholder/missing).
- `gmail.config.js`
  - **Exports**: `getAuthUrl`, `exchangeCodeForTokens`, `getValidAccessToken`, `sendViaGmail` (Gmail API send + token refresh).
- `emailProvider.config.js`
  - **Exports**: `sendEmail` (routes to Gmail OAuth if connected; else SMTP nodemailer).
- `email.config.js`
  - **Exports**: `sendEmail` (re-export from provider) + templates/helpers:
    - `sendOtpEmail`, `sendWelcomeEmail`, `sendApplicationStatusEmail`, `sendDeadlineAlertEmail`,
      `sendPostAwardCongratsEmail`, `sendPostAwardFollowUpEmail`, `sendAdminAwardNotification`.

---

## 4) Utils (`red-dog-radios-backend/src/utils/*`)

- `asyncHandler.js` → exports `asyncHandler(fn)` wrapper
- `apiResponse.js` → exports `{ success, created, paginate, noContent }`
- `logger.js` → exports `{ info, warn, error, debug }`
- `parsePagination.js` → exports `{ parsePagination }`
- `resolveOrganizationId.js` → exports `{ resolveAgencyOrganizationId }` (resolves org for a user)
- `resolveAgencyOrg.js` → `module.exports = require('./resolveOrganizationId')` (alias)
- `replyRouter.js` → exports `{ parseGrantId, resolveAndNotify }` (inbound reply processing + alerts + notify email + pipeline advance)
- `cron.jobs.js` → registers multiple cron schedules (see section 2) and requires `gmailWatchRenew.job`
- `seed.js` → DB seed script (admin + test agency + funders/opps + coupon; can test alert/email)
- `seed-coupons.js` → upserts `BETA2026` coupon

---

## 5) Frontend pages (`red-dog-radios-frontend/src/app/*` + `src/views/*`)

Full route map + what each renders + API endpoints used is already implemented and summarized in this doc’s “Frontend route map” section below.

---

## 6) Frontend components (`red-dog-radios-frontend/src/components/*`)

The codebase contains:
- custom app/admin/settings components
- a large set of `components/ui/*` primitives (Radix/shadcn style wrappers)

Full inventory is in the “Frontend route map” section below.

---

## 7) Environment variables (`red-dog-radios-backend/.env.example`)

```
NODE_ENV
PORT
MONGO_URI
JWT_SECRET
JWT_EXPIRES_IN
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASS
SMTP_FROM
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI
ADMIN_REPLY_EMAIL
GMAIL_PUBSUB_TOPIC
OPENAI_API_KEY
CORS_ORIGIN
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_BASIC
STRIPE_PRICE_PREMIUM
STRIPE_SUCCESS_URL
STRIPE_CANCEL_URL
FRONTEND_URL
```

---

## 8) Installed packages

### Backend (`red-dog-radios-backend/package.json`)
- bcryptjs, cloudinary, cors, dotenv, express, express-rate-limit, googleapis, helmet, jsonwebtoken, mongoose,
  mongoose-paginate-v2, morgan, multer, node-cron, nodemailer, openai, resend, stripe, swagger-jsdoc, swagger-ui-express
- dev: nodemon

### Frontend (`red-dog-radios-frontend/package.json`)
- Next 15, React 18, axios, @tanstack/react-query, date-fns, lucide-react, framer-motion, recharts,
  Radix UI packages, tailwind utilities, react-hook-form + zod, etc.

---

## Frontend route map (App Router + views + components)

This is the consolidated scan of **every** page under `src/app/**`, every view under `src/views/**`, and every component under `src/components/**`, including the key `/api/*` endpoints referenced.

> `src/lib/api.ts` uses `baseURL: "/api"`; `src/lib/adminApi.ts` uses `baseURL: "/api/"`.

### App Router pages (`src/app/**`)

- `/` → redirects to `/login`
- `/login` → `views/Login` → `/api/auth/login`, `/api/auth/resend-verification`
- `/signup` → `views/SignUp` → `/api/auth/register`
- `/forgot-password` → `views/ForgotPassword` → `/api/auth/forgot-password`
- `/otp-verification` → `views/OtpVerification` → `/api/auth/verify-email`, `/api/auth/verify-otp`, `/api/auth/resend-verification`, `/api/auth/forgot-password`
- `/create-password` → `views/CreatePassword` → `/api/auth/reset-password`

- `/dashboard` → `views/Dashboard` → `/api/tracker/stats`, `/api/dashboard/stats`, `/api/settings`
- `/opportunities` → `views/Opportunities` → `/api/matches`, `/api/opportunities`, `/api/matches/compute-all`, `/api/applications/generate`
- `/applications` → `views/Applications` → `/api/applications`, `/api/applications/:id/status`
- `/applications/[id]` → `views/ApplicationBuilder` → `/api/applications/*`, `/api/grants/:id/pipeline`, `/api/outbox/grant/:id`, `/api/replies/by-outbox/:outboxId`, `/api/replies/:id/read`, `/api/ai/generate-email`, `/api/communication-log/agency/application/:id`

- `/funders` → `views/Funders` → `/api/funders`
- `/funders/[id]` → `views/FunderDetail` → `/api/funders/:id`, `/api/opportunities`, `/api/applications/generate`, `/api/outreach/generate`
- `/replies` → `views/Replies` → `/api/replies/my`, `/api/replies/:id/read`
- `/outbox` → redirects to `/dashboard` (agency Outbox UI is `views/Outbox`, but route currently redirects)
- `/weekly-summary` → `views/WeeklySummary` → `/api/digests/*`, `/api/tracker/stats`
- `/settings` → `views/Settings` → `/api/settings` (GET/PUT), `/api/settings/account` (DELETE), `/api/organizations/:id` (PUT)
- `/settings/agency` → `views/AgencyProfile` → `/api/settings`, `/api/organizations/:id` (GET/PUT), plus Gmail admin endpoints via component:
  `/api/gmail/oauth/status/:orgId`, `/api/gmail/oauth/connect`, `/api/gmail/oauth/disconnect/:orgId`

- `/pricing` → page component → `/api/billing/tiers`, `/api/billing/status`, `/api/billing/checkout`
- `/account/billing` → page component → `/api/billing/status`, `/api/billing/tiers`, `/api/billing/portal`

- `/organizations` → redirects to `/settings`

- `/onboarding` → `views/onboarding/OnboardingWelcome`
- `/onboarding/step1` → `views/onboarding/Step1`
- `/onboarding/step2` → `views/onboarding/Step2`
- `/onboarding/step3` → `views/onboarding/Step3`
- `/onboarding/step4` → `views/onboarding/Step4` → `/api/coupons/validate`, `/api/coupons/redeem`, `/api/onboarding/complete`
- `/onboarding/step5` → redirects to `/dashboard`
- `/onboarding/results` → `views/onboarding/OnboardingResults`

Admin:
- `/admin` → redirects to `/admin/dashboard`
- `/admin/login` → `/api/admin/auth/login`
- `/admin/dashboard` → `/api/admin/dashboard`, `/api/admin/agencies/priority`
- `/admin/settings` → admin settings view → `/api/settings` (adminApi)
- `/admin/*` pages exist for: activity logs, agencies, applications, matches, funders, opportunities, users, coupons, outbox, replies, pipeline.
  - `/admin/pipeline` → `/api/grants/pipeline/board`
  - `/admin/outbox` → `/api/outbox/admin/*`
  - `/admin/replies` → `/api/replies/*` (admin)

### Views (`src/views/**`)

See the per-view bullet list in the sub-scan above (Dashboard/Opportunities/Applications/ApplicationBuilder/Outbox/Replies/etc).

### Components (`src/components/**`)

Custom:
- `AppShell`, `AppShellLayout`, `ConditionalAppShell`, auth layouts, filters, status badges, settings primitives, Gmail connect components, admin shell/badges, etc.

UI primitives:
- `src/components/ui/*` (Radix/shadcn style wrappers for dialog, dropdowns, inputs, etc.)

---

## DONE ✅ (confirmed implemented and wired)

- Gmail OAuth2 connect/status/disconnect + token refresh + Gmail send routing.
- Email provider routing Gmail → SMTP fallback.
- Outbox automation (queueing, hourly cron processing, reply-to alias).
- Inbound reply handling with persistence (`Reply`) + alert creation + notification email + Pub/Sub push handler + watch renewal job.
- Admin Outbox dashboard endpoints + frontend page.
- Agency Outbox and Replies pages (reply counts per outbox, thread views, mark-read + unread badge polling).
- Grant/Application-level email history (`GET /api/outbox/grant/:id` + thread modal in `ApplicationBuilder`).
- Grant/Application pipeline:
  - `Application.pipelineStage` + `pipelineHistory`
  - Auto-advance on outbox queue + inbound reply
  - Manual pipeline API + ApplicationBuilder pipeline UI
  - Admin pipeline board page + API

---

## MISSING OR INCOMPLETE ❌ (planned/stubbed/not fully wired)

- **`POST /api/gmail/webhook/reply`** is still present as a **stub** route (the “real” inbound flow is `POST /api/gmail/webhook/push`).
  - File: `red-dog-radios-backend/src/modules/gmail/gmail.route.js` + controller `replyWebhook`.
- **Agency route `/outbox` currently redirects to `/dashboard`** (the Outbox UI exists in `views/Outbox`, and there is a full agency Outbox experience, but the App Router page is a redirect).
  - File: `red-dog-radios-frontend/src/app/outbox/page.tsx`
- **Repo contains duplicate module copies under Windows backslash paths** (e.g. `red-dog-radios-backend\\src\\modules\\outbox\\...` in addition to `red-dog-radios-backend/src/modules/outbox/...`).
  - This can cause confusion when editing/searching.
- **Frontend lint has pre-existing errors in unrelated files** (not introduced by the Gmail/pipeline work), so `npm run lint` fails repo-wide even though the new pipeline changes lint clean when targeted.

