# Red Dog Grant Intelligence — Current State Audit
**Generated**: 2026-05-02  
**Branch**: main  
**Scope**: Read-only audit of all implemented features across backend, frontend, cron jobs, and email systems.

---

## Project Structure

```
Red Dog/
├── red-dog-radios-backend/     Node.js/Express API (port 4000)
│   └── src/
│       ├── app.js              Express app setup, middleware, route mounting
│       ├── server.js           MongoDB connection, cron initialization
│       ├── config/             Email, Gmail OAuth, OpenAI, Stripe, Cloudinary
│       ├── jobs/               Reply polling job (15-min cron)
│       ├── modules/            Feature modules (auth, onboarding, matches, outbox, gmail, replies, …)
│       └── utils/              cron.jobs.js (main scheduler)
├── red-dog-radios-frontend/    Next.js frontend (port 3000)
│   └── src/
│       ├── app/                Next.js App Router pages
│       └── views/              React view components
└── data/db/                    MongoDB local data store
```

---

## Section 1: Complete Feature Inventory

---

### AUTHENTICATION

| Feature | Status | Notes |
|---------|--------|-------|
| Agency signup with OTP verification | ✅ WORKING | `POST /api/auth/register` creates user; `POST /api/auth/verify-email` validates OTP |
| Agency email verification flow | ✅ WORKING | OTP generated on signup, 6-digit code, `verificationOtp` + `verificationOtpExpiry` stored on User |
| Agency login / logout | ✅ WORKING | `POST /api/auth/login` returns JWT; logout is client-side token discard |
| Admin login (separate path) | ✅ WORKING | Same `/api/auth/login` endpoint; role='admin' users receive admin-scoped JWT; admin pages check role |
| Password reset flow | ✅ WORKING | `POST /api/auth/forgot-password` → OTP emailed → `POST /api/auth/verify-otp` → `POST /api/auth/reset-password` |
| JWT expiry handling | ✅ WORKING | JWT signed with `JWT_SECRET`; expiry enforced by middleware; `GET /api/auth/me` validates token |
| Rate limiting on auth routes | ✅ WORKING | Login: 5 attempts/15 min (prod), 50/15 min (dev). Forgot-password: 3/15 min. Verify-OTP: 10/15 min. Resend-verification: 3/15 min |

**Key files**:  
`modules/auth/auth.route.js`, `auth.controller.js`, `auth.service.js`, `user.schema.js`

**User Schema** (relevant fields):
- `email` (unique, required), `password` (bcrypt, min 8 chars)
- `firstName`, `lastName`, `fullName`, `role` ('agency' | 'admin')
- `organizationId`, `onboardingCompleted`, `isVerified`, `isActive`
- `resetOtp`, `resetOtpExpiry`, `verificationOtp`, `verificationOtpExpiry`

---

### ONBOARDING

| Feature | Status | Notes |
|---------|--------|-------|
| Step 1 — org name, type, location | ✅ WORKING | Frontend: `app/onboarding/step1/page.tsx`; data stored in local state |
| Step 2 — service area, mission | ✅ WORKING | Frontend: `app/onboarding/step2/page.tsx` |
| Step 3 — challenges checkboxes | ✅ WORKING | Frontend: `app/onboarding/step3/page.tsx`; 6 challenge options |
| Step 4 — budget, timeline, eligibility | ✅ WORKING | Frontend: `views/onboarding/Step4.tsx`; budget (4 options), timeline (3 options), eligibilityType radio |
| Coupon input at Step 4 | ⚠️ PARTIAL | Input field exists in Step4.tsx; no backend validation/application logic found in `onboarding.service.js` or `coupon` routes |
| Step 5 / redirect to dashboard | ✅ WORKING | No explicit Step 5 page; `POST /api/onboarding/complete` returns sessionStorage payload; frontend redirects to `/onboarding/results` |
| Gmail connect prompt on results page | ✅ WORKING | `OnboardingResults.tsx` shows "Connect Gmail" CTA; visible immediately after onboarding |
| Match computation on completion | ✅ WORKING | `onboarding.service.js` calls `computeAllForOrganization()` after saving org data; matches available on results page |
| Welcome email on completion | ✅ WORKING | Triggered inside `onboarding.service.js` after org/user update |

**Key files**:  
`modules/onboarding/onboarding.route.js`, `onboarding.service.js`, `views/onboarding/Step4.tsx`, `views/onboarding/OnboardingResults.tsx`

**Onboarding data fields saved to Organization**:  
`organizationName`, `location`, `website`, `missionStatement`, `agencyTypes[]`, `programAreas[]`, `focusAreas[]`, `specificRequest`, `budgetRange`, `timeline`, `goals[]`, `populationServed`, `coverageArea`, `numberOfStaff`, `currentEquipment`, `challenges[]`, `urgencyStatement`, `whobenefits`, `eligibilityType`, `annualVolume`, `serviceArea`, `staffSizeRange`, `mainProblems[]`, `fundingPriorities[]`

---

### GMAIL OAUTH

| Feature | Status | Notes |
|---------|--------|-------|
| Agency self-connect (`/api/gmail/oauth/connect-self`) | ✅ WORKING | Resolves orgId from JWT; returns Google auth URL with scopes: `gmail.send`, `gmail.readonly`, `userinfo.email` |
| Agency self-status (`/api/gmail/oauth/status-self`) | ✅ WORKING | Returns `{ isConnected, senderEmail }` from `org.gmailOAuth` |
| Agency self-disconnect (`/api/gmail/oauth/disconnect-self`) | ✅ WORKING | Clears `org.gmailOAuth` fields, sets `isConnected = false` |
| Admin connect for agency | ✅ WORKING | `GET /api/gmail/oauth/connect?organizationId=X` — admin-gated; separate route |
| OAuth callback saves `senderEmail` correctly | ✅ WORKING | `handleOAuthCallback()` fetches Google userinfo, saves email address to `org.gmailOAuth.senderEmail` |
| `senderEmail` populated in DB after connect | ✅ WORKING | Stored in `Organization.gmailOAuth.senderEmail`; referenced in email sending |
| Token refresh on expiry | ✅ WORKING | `getValidAccessToken(org)` checks expiry (60 s early); calls `oauth2Client.refreshAccessToken()`; saves new `accessToken` + `tokenExpiry` to org |

**OAuth callback flow** (`state` parameter = `orgId|source`):  
1. Google redirects to `/api/gmail/oauth/callback?code=...&state=orgId|source`
2. Tokens exchanged, userinfo fetched, senderEmail saved
3. If `source = 'onboarding'` → redirect to `/onboarding/results?gmail=connected`
4. Else → redirect to `/settings/agency?gmail=connected`

**Key files**:  
`modules/gmail/gmail.route.js`, `gmail.controller.js`, `gmail.service.js`, `config/gmail.config.js`

**Organization schema fields** (`gmailOAuth` subdoc):  
`accessToken`, `refreshToken`, `tokenExpiry`, `senderEmail`, `isConnected`, `connectedAt`

---

### EMAIL SENDING

| Feature | Status | Notes |
|---------|--------|-------|
| SMTP fallback when Gmail not connected | ✅ WORKING | `emailProvider.config.js`: if no Gmail OAuth on org, falls back to Nodemailer SMTP |
| Gmail OAuth send when connected | ✅ WORKING | `sendViaGmail()` in `gmail.config.js`: builds RFC-2822 raw message, sends via Gmail API |
| `sentViaGmail` flag stored | ✅ WORKING | Boolean on Outbox record; set `true` if sent via Gmail API, `false` for SMTP |
| "via Gmail" vs "via SMTP" label in Outbox UI | ⚠️ PARTIAL | `sentViaGmail` boolean stored on Outbox record; frontend display of the label not confirmed in `views/Outbox.tsx` |
| `From` field shows correct sender name | ✅ WORKING | `senderName` field on Outbox record; SMTP sets `from: "Name <email>"` display format |
| Signature formatted correctly | ❌ NOT BUILT | No signature injection found in `queueEmail()`, `email.config.js`, or `emailProvider.config.js` |
| Markdown links converted to HTML | ✅ WORKING | `queueEmail()` calls `marked.parse(body)` before storing `htmlBody` |
| `[DATA NEEDED]` placeholders removed | ✅ WORKING | `queueEmail()` strips `[DATA NEEDED]` tokens from body before storing |
| Contact email auto-filled from opportunity | 🔲 NOT CONFIRMED | Not found in outbox service; may exist in ApplicationBuilder or outreach builder |
| Contact name auto-filled from opportunity | 🔲 NOT CONFIRMED | Same gap as above |
| Sender name auto-filled from user | ⚠️ PARTIAL | `senderName` field exists on Outbox schema; auto-population logic from user record not confirmed |
| Sender company auto-filled from org | ⚠️ PARTIAL | Same — field exists, population path unclear |
| Dev email redirect | ✅ WORKING | If `NODE_ENV !== 'production'` and `DEV_REDIRECT_EMAIL` is set, all emails redirect to that address with `[DEV → original]` prefix |

**Email selection logic** (`config/emailProvider.config.js`):
```
if (organizationId && org.gmailOAuth.isConnected && org.gmailOAuth.senderEmail)
  → sendViaGmail()   [sets sentViaGmail = true]
else
  → sendViaSmtp()    [sets sentViaGmail = false]
```

**Key files**:  
`config/emailProvider.config.js`, `config/gmail.config.js`, `config/email.config.js`, `modules/outbox/outbox.service.js`

---

### OUTBOX

| Feature | Status | Notes |
|---------|--------|-------|
| Email queuing | ✅ WORKING | `queueEmail(data)` creates Outbox record with `status = 'pending'`; Markdown→HTML, placeholder removal done here |
| Hourly cron processing | ✅ WORKING | `processQueue()` runs every hour; processes up to 50 pending emails per run |
| Manual send endpoint | ✅ WORKING | `POST /api/outbox/:id/send` — send a specific pending email immediately |
| Status tracking (`pending`/`sent`/`failed`) | ✅ WORKING | Status updated on each send attempt; `sentAt` recorded on success |
| Retry on failure | ✅ WORKING | `retryCount` incremented on failure; emails with `retryCount >= 5` are abandoned |
| Admin Outbox dashboard (`/admin/outbox`) | ✅ WORKING | `GET /api/outbox/admin/all` with filters (status, emailType, sentViaGmail, organizationId, search); admin page at `app/admin/(panel)/outbox/page.tsx` |
| Agency Outbox page (`/outbox`) | ✅ WORKING | `GET /api/outbox` scoped to user's org; page at `app/(agency)/outbox/page.tsx` |

**Outbox Schema** (key fields):  
`recipient`, `recipientName`, `subject`, `htmlBody` (required), `replyTo`, `senderEmail`, `senderName`, `sentViaGmail`, `emailType` (weekly_digest / alert_digest / outreach / manual / followup_reminder), `scheduledFor`, `status`, `retryCount`, `providerMessageId`, `errorMessage`, `sentAt`, `relatedOrganization`, `relatedAgency`, `relatedUser`, `relatedGrant`

**Key files**:  
`modules/outbox/outbox.route.js`, `outbox.controller.js`, `outbox.service.js`, `outbox.schema.js`

---

### REPLY TRACKING (POLLING)

| Feature | Status | Notes |
|---------|--------|-------|
| Reply schema exists | ✅ WORKING | `modules/replies/reply.schema.js` with all expected fields |
| Polling service (`pollAllAgencies`) | ✅ WORKING | Iterates orgs with `gmailOAuth.isConnected = true`; calls `pollAgencyInbox(org)` per org |
| 15-minute cron job registered | ✅ WORKING | `jobs/replyPolling.job.js` runs `pollAllAgencies` on schedule; started in `server.js` |
| Manual poll endpoint (`POST /api/admin/replies/poll-now`) | ✅ WORKING | Admin-only; triggers `pollAllAgencies()` immediately |
| Subject matching logic | ✅ WORKING | Normalizes subject (lowercase, trim, strip `re:`); matches against sent email subjects |
| In-Reply-To header matching | ✅ WORKING | Primary match strategy; `In-Reply-To` value checked against `providerMessageId` in Outbox |
| References header matching | ✅ WORKING | Tertiary fallback; `References` header searched for our message IDs |
| `gmailMessageId` dedup | ✅ WORKING | Unique sparse index on Reply schema; duplicate messages silently skipped |

**Polling algorithm** (`reply.polling.service.js`):  
1. Query Outbox for `status = 'sent'` records from last 30 days → build `subjectMap` + `messageIdMap`
2. Get fresh access token via `getValidAccessToken(org)`
3. Query Gmail inbox, last 30 days, up to 100 messages
4. For each message: check `gmailMessageId` uniqueness → extract headers → match (In-Reply-To → Subject → References) → save Reply

**Reply Schema** (key fields):  
`outboxId` (ref, required), `organizationId` (ref, required), `from` (required), `subject`, `body`, `htmlBody`, `receivedAt`, `gmailMessageId` (unique sparse), `adminViewed`

**Key files**:  
`modules/replies/reply.route.js`, `reply.controller.js`, `reply.schema.js`, `reply.polling.service.js`, `jobs/replyPolling.job.js`

---

## Section 2: Cron Jobs Summary

| Schedule | Job | Status |
|----------|-----|--------|
| Every 15 min | Reply polling (`pollAllAgencies`) | ✅ |
| Hourly | Outbox queue processor (`processQueue`) | ✅ |
| 2:00 AM nightly | Match refresh for all active orgs | ✅ |
| 2:30 AM nightly | Deadline alerts (30–75 day window) | ✅ |
| 2:45 AM nightly | High-fit alerts (fitScore ≥ 75) | ✅ |
| 8:00 AM daily | Follow-up backfill (submitted applications) | ✅ |
| 8:00 AM daily | Priority flags updater (long-term no-win agencies) | ✅ |
| 9:00 AM MT daily | Post-award follow-up sender (equipment recommendations) | ✅ |

---

## Section 3: Match Scoring Algorithm

**File**: `modules/matches/match.service.js`

| Component | Max Points | Logic |
|-----------|-----------|-------|
| Agency type match | 20 | Overlap between org `agencyTypes` and opportunity `eligibleAgencies` |
| Local match requirement | 5 | `canMeetLocalMatch` flag on org |
| Geography | 20 | Org location vs. opportunity `locationFocus`; national (empty) = full score |
| Program/keyword | 25 | Overlap count: 3+ = 25, 2 = 20, 1 = 12, 0 = 0 |
| Deadline viability | 10 | Days until deadline; expired = disqualifier |
| Award size fit | 10 | Org `budgetRange` vs. opportunity `maxAmount` |
| Timeline alignment | 10 | Deadline urgency vs. org `timeline` (urgent/planned) |
| Data completeness | 5 | 6 fields checked for completeness |
| Priority boost | +5 | Applied if org has `isLongTermNoWin` flag |

**Derived scores**:
- `rubricTier`: > 90 = priority, > 80 = strong, > 70 = borderline, else = block
- `winProbability`: `fitScore × 0.5 + (1 – competitionLevel) × 100 × 0.3 + pastSuccessFactor × 100 × 0.2`

**Rubric scores** (stored on Match): `needScore`, `projectDesignScore`, `budgetScore`, `capacityScore`, `impactScore`, `evaluationScore`, `sustainabilityScore`, `alignmentScore`, `totalScore`, `normalizedScore`

---

## Section 4: Database Schemas — Field Reference

### Organization
`name`, `email`, `location`, `websiteUrl`, `missionStatement`, `agencyTypes[]`, `programAreas[]`, `focusAreas[]`, `specificRequest`, `challenges[]`, `urgencyStatement`, `whobenefits`, `budgetRange`, `timeline`, `goals[]`, `populationServed`, `coverageArea`, `numberOfStaff`, `currentEquipment`, `mainProblems[]`, `fundingPriorities[]`, `canMeetLocalMatch`, `matchCount`, `status`, `createdBy`, `lastMatchRecomputedAt`  
**Priority flags**: `isLongTermNoWin`, `daysSinceSignup`, `applicationsSubmittedCount`, `awardsWonCount`, `lastWinAt`  
**Subscription**: `status`, `tier`, `stripeCustomerId`, `stripeSubscriptionId`, `betaAccess`, `betaAccessCouponCode`  
**Gmail OAuth**: `accessToken`, `refreshToken`, `tokenExpiry`, `senderEmail`, `isConnected`, `connectedAt`

### User
`email`, `password`, `fullName`, `firstName`, `lastName`, `role` (agency/admin), `isActive`, `isVerified`, `organizationId`, `onboardingCompleted`, `resetOtp`, `resetOtpExpiry`, `resetToken`, `resetTokenExpiry`, `verificationOtp`, `verificationOtpExpiry`  
**Settings**: `notifications` (highFitAlerts, deadlineReminders, weeklySummary, alertUpdates, systemAlerts), `preferences` (language, timezone, country)

### Match
`organization`, `opportunity`, `fitScore`, `reasons[]`, `fitReasons[]`, `disqualifiers[]`, `breakdown` (8 sub-scores), `rubricScores` (9 sub-scores), `rubricTier`, `competitionLevel`, `competitionLabel`, `pastSuccessFactor`, `winProbability`, `status` (pending/approved/rejected), `lastUpdated`, `scoreVersion`

### Outbox
*(see Section 1 — Outbox)*

### Reply
*(see Section 1 — Reply Tracking)*

---

## Section 5: API Routes — Complete List

### Auth (`/api/auth`)
| Method | Path | Notes |
|--------|------|-------|
| POST | `/register` | Agency signup |
| POST | `/login` | Login (rate limited) |
| GET | `/me` | Auth'd user info |
| POST | `/forgot-password` | Request OTP (rate limited) |
| POST | `/verify-otp` | Validate OTP (rate limited) |
| POST | `/reset-password` | Set new password |
| POST | `/verify-email` | Email OTP verification |
| POST | `/resend-verification` | Resend verification OTP |

### Gmail (`/api/gmail`)
| Method | Path | Notes |
|--------|------|-------|
| GET | `/oauth/connect-self` | Agency self OAuth init |
| GET | `/oauth/status-self` | Agency connection status |
| DELETE | `/oauth/disconnect-self` | Agency disconnect |
| GET | `/oauth/connect` | Admin connect (requires `organizationId`) |
| GET | `/oauth/callback` | Google redirect callback |
| GET | `/oauth/status/:organizationId` | Admin status check |
| DELETE | `/oauth/disconnect/:organizationId` | Admin disconnect |

### Outbox (`/api/outbox`)
| Method | Path | Notes |
|--------|------|-------|
| GET | `/` | Agency email list |
| GET | `/grant/:grantId` | Email history for grant |
| POST | `/queue` | Queue new email |
| GET | `/:id` | Email details |
| POST | `/:id/send` | Send pending email |
| POST | `/:id/retry` | Retry failed email |
| GET | `/admin/all` | Admin: all emails with filters |
| GET | `/admin/:id` | Admin: email detail |
| POST | `/admin/:id/retry` | Admin: retry |
| DELETE | `/admin/:id` | Admin: delete |

### Replies (`/api/admin/replies`)
| Method | Path | Notes |
|--------|------|-------|
| GET | `/` | Paginated reply list |
| GET | `/communications` | Outbox + reply combined view |
| POST | `/poll-now` | Manual poll trigger |
| GET | `/:id` | Single reply detail |
| GET | `/by-outbox/:outboxId` | Replies to specific email |

### Matches (`/api/matches`)
| Method | Path | Notes |
|--------|------|-------|
| GET | `/` | Filtered, paginated match list |
| POST | `/` | Manual match creation |
| POST | `/compute` | Compute fit for one org+opp (3/min rate limit) |
| POST | `/compute-all` | Compute all for one org |
| GET | `/:id` | Single match |
| PUT | `/:id/approve` | **DEPRECATED** — returns 403 |
| PUT | `/:id/reject` | **DEPRECATED** — returns 403 |

### Onboarding (`/api/onboarding`)
| Method | Path | Notes |
|--------|------|-------|
| POST | `/complete` | Submit 4-step data; triggers match compute + welcome email |

---

## Section 6: Environment Variables

| Variable | Purpose |
|----------|---------|
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | JWT signing key |
| `NODE_ENV` | `production` / `development` |
| `PORT` | API server port (default 4000) |
| `CORS_ORIGIN` | Allowed CORS origin(s) |
| `FRONTEND_URL` | Frontend base URL (OAuth redirect targets) |
| `GOOGLE_CLIENT_ID` | Gmail OAuth app client ID |
| `GOOGLE_CLIENT_SECRET` | Gmail OAuth app secret |
| `GOOGLE_REDIRECT_URI` | OAuth callback URL |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE`, `SMTP_FROM` | SMTP config |
| `ADMIN_EMAIL` | Fallback reply-to / admin inbox |
| `ADMIN_REPLY_EMAIL` | Override reply-to for queued emails |
| `DEV_REDIRECT_EMAIL` | Redirects all outbound email to this address in dev mode |
| `OPENAI_API_KEY` | OpenAI |
| `STRIPE_SECRET_KEY` | Stripe billing |

---

## Section 7: Known Gaps and Pending Work

### ⚠️ PARTIAL

| Gap | Detail |
|-----|--------|
| **Coupon validation at Step 4** | `Step4.tsx` has a coupon input field. `onboarding.service.js` has no validation or application logic. A `couponRoutes` module exists (`/api/coupons`) but its integration with onboarding is missing. |
| **Sender name/company auto-fill** | `senderName` field on Outbox schema exists. Code to automatically populate it from the user's name + organization at queue time is not confirmed. |
| **"via Gmail" / "via SMTP" label in Outbox UI** | `sentViaGmail` boolean is stored on every Outbox record. Whether the agency Outbox page or admin Outbox dashboard visually renders a "via Gmail" badge has not been confirmed in the frontend code. |
| **Admin Gmail connect UI** | `GET /api/gmail/oauth/connect?organizationId=X` route exists and is admin-gated. Whether the admin panel has a UI element to trigger this flow is not confirmed. |

### ❌ NOT BUILT

| Gap | Detail |
|-----|--------|
| **Email signature injection** | No signature appending found in `queueEmail()`, `email.config.js`, or `emailProvider.config.js`. Emails go out without a formatted org signature block. |
| **Contact email/name auto-fill from opportunity** | Expected behavior: when composing outreach, `recipient` and `recipientName` are pre-populated from the opportunity's contact fields. Code path not found in outbox or outreach services. May be implemented in a client-side ApplicationBuilder component not audited. |

### ❌ DEPRECATED / BROKEN

| Feature | Detail |
|---------|--------|
| **Match approve/reject endpoints** | `PUT /api/matches/:id/approve` and `PUT /api/matches/:id/reject` return HTTP 403: "Match approval is handled by Red Dog staff in the admin portal." These are dead endpoints. |

---

## Section 8: Critical Files Reference

| File | Purpose |
|------|---------|
| `modules/matches/match.service.js` | Core 8-component scoring algorithm + win probability |
| `config/emailProvider.config.js` | Gmail vs. SMTP selection logic |
| `config/gmail.config.js` | Gmail OAuth client + `sendViaGmail()` |
| `modules/replies/reply.polling.service.js` | Reply detection + In-Reply-To matching |
| `utils/cron.jobs.js` | All scheduled jobs (8 total) |
| `jobs/replyPolling.job.js` | 15-min reply polling cron |
| `modules/onboarding/onboarding.service.js` | 4-step data mapping + match trigger + welcome email |
| `modules/outbox/outbox.service.js` | Queue, Markdown→HTML, placeholder removal, send, retry |
| `modules/gmail/gmail.service.js` | Token refresh + OAuth flow |
| `views/onboarding/Step4.tsx` | Step 4 form (coupon input field) |
| `views/onboarding/OnboardingResults.tsx` | Results display + Gmail connect CTA |
| `views/Opportunities.tsx` | Opportunity list with fit scores + rubric breakdown |

---

## Section 9: Overall Status Summary

| Area | Status |
|------|--------|
| Authentication (signup, OTP, login, reset) | ✅ Complete |
| Onboarding (Steps 1–4, results, match trigger) | ✅ Complete |
| Coupon validation at Step 4 | ⚠️ UI only — backend missing |
| Gmail OAuth (connect, status, disconnect, token refresh) | ✅ Complete |
| Match scoring algorithm | ✅ Complete |
| Nightly match refresh cron | ✅ Complete |
| Email queuing (Markdown→HTML, placeholder removal) | ✅ Complete |
| SMTP email sending | ✅ Complete |
| Gmail API email sending | ✅ Complete |
| Gmail vs. SMTP selection logic | ✅ Complete |
| `sentViaGmail` flag storage | ✅ Complete |
| "via Gmail" label in UI | ⚠️ Stored, display unconfirmed |
| Email signature injection | ❌ Not built |
| Contact auto-fill from opportunity | ❌ Not confirmed |
| Sender name/company auto-fill | ⚠️ Field exists, logic unconfirmed |
| Outbox queuing + hourly cron | ✅ Complete |
| Outbox retry logic (max 5) | ✅ Complete |
| Agency Outbox page | ✅ Complete |
| Admin Outbox dashboard | ✅ Complete |
| Reply polling (15-min cron) | ✅ Complete |
| In-Reply-To / Subject / References matching | ✅ Complete |
| `gmailMessageId` dedup | ✅ Complete |
| Manual poll endpoint | ✅ Complete |
| Admin replies dashboard | ✅ Complete |
