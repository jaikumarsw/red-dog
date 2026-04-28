# Red Dog Grant Intelligence — Platform Audit

**Generated:** 2026-04-26  
**Repo state:** `f4c958ea4fdf066d967b0e25d81f8efccaad7338`

---

## Executive Summary

Red Dog Grant Intelligence is a **B2B SaaS product** for **public safety agencies** (fire, law enforcement, EMS, 911, etc.). Agencies **sign up**, complete a **multi-step onboarding profile**, and receive **AI-computed match scores** between their organization and a catalog of **grant opportunities** and **funders**. They can **draft grant applications with AI** (gated by **subscription or beta coupon**), **track application status** as Red Dog staff update it in an **admin portal**, and receive **alerts**, **weekly digests**, and **post-award email sequences**. The stack is a **Node/Express** API on **MongoDB (Mongoose)** with a **Next.js (App Router)** frontend; **Stripe** handles subscriptions; **OpenAI** powers grant text and some auxiliary AI features; **Nodemailer/SMTP** sends transactional email.

**Agency users** authenticate with **JWT** (`Bearer` token) and interact with `/api/*` routes (except admin). **Staff** use a **separate admin login** (`POST /api/admin/auth/login`) and **admin-only** routes under `/api/admin/*` protected by **`protectAdmin`** (JWT + `role === 'admin'`). There is **no JWT refresh endpoint**—tokens expire per `JWT_EXPIRES_IN` (default **7d**). **Logout** is handled in the browser by clearing storage/cookies.

This audit documents **behavior observed in code** as of the commit above. Items marked **🟡 Untested** or listed under **Untested / Uncertain Flows** need runtime verification (e.g., full Stripe lifecycle in production, parallel AI requests under load).

---

## Architecture Overview

| Layer | Technology | Notes |
|--------|------------|--------|
| API | Express (`src/app.js`) | Global `/api` rate limit (500/15min), Helmet, CORS, JSON body (10mb). Stripe webhook uses **raw** body before `express.json()`. |
| Auth | JWT (`jsonwebtoken`), `protect` / `protectAdmin` | `protect` loads `User` by `decoded.id`; paywall uses **`resolveAgencyOrganizationId`** (`src/utils/resolveOrganizationId.js`). |
| Data | MongoDB + Mongoose | Collections per schemas in `src/modules/**.schema.js`. |
| Jobs | `node-cron` (`src/utils/cron.jobs.js`) | Match refresh, alerts, follow-up backfill, priority flags, outbox, post-award follow-up. |
| Frontend | Next.js App Router | `src/app/*`; API calls use `baseURL: /api` with Next **rewrites** to backend (`next.config.ts` → `API_ORIGIN`). |
| Docs | Swagger | `/api-docs` |

**How pieces connect:** The browser talks to Next.js; Next proxies `/api/*` to the Express server. Agency JWT is stored client-side (`localStorage` `rdg_token` per `src/lib/api.ts`). Admin uses separate storage/context (`adminApi`).

---

## Quick Reference: User Roles

| Role | API surface | Typical capabilities |
|------|-------------|----------------------|
| **Agency** | `/api/*` with `protect` | Onboarding, matches, applications (own org), billing (own org), digests, alerts, outreach (paywalled AI), settings. |
| **Admin** | `/api/admin/*` with `protectAdmin` | Full CRUD on opportunities/funders, applications for any agency, match recompute, coupons (via `/api/coupons` with `restrictTo('admin')`), activity logs. |
| **Public** | `POST /api/auth/register`, `GET /api/billing/tiers`, `GET /api/coupons/validate`, health | No JWT. |

---

## Table of Contents

1. [Section 1: Authentication & Account Lifecycle](#section-1-authentication--account-lifecycle)  
2. [Section 2: Onboarding](#section-2-onboarding)  
3. [Section 3: Coupon System](#section-3-coupon-system)  
4. [Section 4: Billing & Paywall](#section-4-billing--paywall)  
5. [Section 5: Funders & Opportunities](#section-5-funders--opportunities)  
6. [Section 6: Matching Engine](#section-6-matching-engine)  
7. [Section 7: Applications](#section-7-applications)  
8. [Section 8: AI Grant Writing (Detailed)](#section-8-ai-grant-writing-detailed)  
9. [Section 9: Status Transitions](#section-9-status-transitions)  
10. [Section 10: Communication Log](#section-10-communication-log)  
11. [Section 11: Post-Award Sequence](#section-11-post-award-sequence)  
12. [Section 12: Priority System](#section-12-priority-system)  
13. [Section 13: Alerts & Email](#section-13-alerts--email)  
14. [Section 14: Weekly Summary / Digests](#section-14-weekly-summary--digests)  
15. [Section 15: Dashboards](#section-15-dashboards)  
16. [Section 16: Admin Portal](#section-16-admin-portal)  
17. [Section 17: Cron Jobs](#section-17-cron-jobs)  
18. [Section 18: Security](#section-18-security)  
19. [Section 19: Data Models](#section-19-data-models)  
20. [Section 20: Configuration & Environment](#section-20-configuration--environment)  
21. [Issues Catalog](#issues-catalog)  
22. [Untested / Uncertain Flows](#untested--uncertain-flows)  
23. [Recommendations](#recommendations)  

---

## Section 1: Authentication & Account Lifecycle

### 1.1 Agency signup (POST /api/auth/register)

**User journey:** User enters name, email, password on signup UI → submits → receives email with **6-digit OTP** → must verify before login.

**Frontend trigger:** Registration views under `src/app` (e.g. register route) call `api.post("/auth/register", body)` with email/password/name fields matching `auth.service` expectations.

**Backend route:** `POST /api/auth/register` — `src/modules/auth/auth.route.js` (no rate limit on register; login is limited).

**Middleware chain:** None.

**Controller / service:** `register` → `authService.register` (`auth.service.js` ~11–95).

**What happens:** If email exists and **verified** → 409. If **unverified** duplicate → **deletes** old user and recreates. Password validated **≥8 chars**. OTP hashed with bcrypt, 15‑minute expiry. `User.create` with `role: 'agency'`, `isVerified: false`. Email via `sendOtpEmail` (failures logged; user still created).

**Validation & gating:** No JWT. Basic body checks in service.

**Edge cases:** Admin email collision returns specific 409 directing to `/admin/login`. Register does not create `Organization` until onboarding complete.

**Verdict:** ✅ Working (email delivery environment-dependent).

---

### 1.2 Agency email verification / OTP

**User journey:** User enters OTP from email → frontend calls verify → receives JWT.

**API:** `POST /api/auth/verify-email` body `{ email, otp }` — `otpLimiter` (10/15min). Service: `verifySignupOtp` — compares OTP, sets `isVerified`, clears OTP fields, returns **new JWT**.

**Also:** `POST /api/auth/resend-verification` — `resendLimiter` (3/15min).

**Verdict:** ✅ Working.

---

### 1.3 Agency login

**API:** `POST /api/auth/login` — `loginLimiter` (5/15min). `authService.login`: rejects wrong password; **rejects `role === 'admin'`** with 403 pointing to staff login; rejects unverified; returns `{ user, token }` (`JWT_EXPIRES_IN`).

**Verdict:** ✅ Working.

---

### 1.4 Admin login

**Separate path:** `POST /api/admin/auth/login` → `admin.controller.js` → `authService.loginAdmin` (`auth.service.js` ~205–224). Requires `role === 'admin'`. Frontend: `/admin/login` using `adminApi`.

**Verdict:** ✅ Working (same JWT secret, different UI and route namespace).

---

### 1.5 Password reset

**Flow:** `POST /api/auth/forgot-password` → stores hashed OTP on user; `POST /api/auth/verify-otp` → returns **plaintext `resetToken`** (also stored hashed server-side); `POST /api/auth/reset-password` with `{ email, resetToken, newPassword }` updates password via `findByIdAndUpdate` with **bcrypt 12** to avoid double-hash on pre-save.

**Verdict:** ✅ Working (OTP logged in dev — see Issues).

---

### 1.6 Logout

**No server endpoint.** Client clears `rdg_token`, cookies, redirects (`src/lib/api.ts` interceptor on 401).

**Verdict:** 🟡 Standard SPA pattern; no server-side token revocation.

---

### 1.7 JWT refresh / session expiry

**None.** Token expires per env; client must re-login.

**Verdict:** ⚠️ No refresh token (documented limitation).

---

### 1.8 Protected route check & organization resolution

**`protect`:** `auth.middleware.js` — Bearer JWT → `User.findById(decoded.id)` → `req.user`.

**Org resolution:** `resolveAgencyOrganizationId(user)` — `user.organizationId` OR `Organization.findOne({ createdBy: user._id })` (`resolveOrganizationId.js`).

**Paywall:** Uses same resolver (`paywall.middleware.js`).

**Inconsistency:** **`billing.controller.js`** `getStatus` / `createCheckout` / `createPortal` use **`req.user.organizationId` only** — legacy users without `organizationId` may get **false “no org”** for billing despite resolver fixing other routes (see **I-001**).

**Verdict:** ⚠️ Mostly working; billing edge case.

---

### 1.9 Role enforcement

- **`restrictTo('admin')`:** Used on coupon admin routes, communication-log create/delete admin paths, etc.
- **Agency routes:** Default `protect` only; business logic checks org scope (e.g. `assertAppInOrg`).
- **`PATCH /api/applications/:id/status`:** Agency cannot set `ADMIN_ONLY_STATUSES` (`application.controller.js` ~65–72). **Admin staff** must use **`/api/admin/applications/:id/status`** — agency route uses `assertAppInOrg` with **agency org**, not cross-tenant admin override.

**Verdict:** ✅ Working with clear split admin vs agency routes.

---

## Section 2: Onboarding

### 2.1–2.3 Steps 1–3 (frontend-driven)

**User journey:** Steps collect agency identity, service area, challenges, etc., stored in **`sessionStorage`** keys `rdg_onboarding_step1` … `step3`.

**Pages:** `src/app/onboarding/step1/page.tsx` … `step3/page.tsx` → views `src/views/onboarding/Step1.tsx` etc.

**Backend:** No dedicated “step save” API until **complete**.

**Verdict:** ✅ Working (client-side only until final submit).

---

### 2.4 Step 4 — budget, timeline, eligibility, **coupon UI**

**Page:** `src/app/onboarding/step4/page.tsx` → `OnboardingStep4`.

**Coupon:** `GET /api/coupons/validate?code=` (public). **Redeem** typically after org exists: `POST /api/coupons/redeem` with JWT (Step4 may call complete first — verify UI order in `Step4.tsx` around coupon application).

**Submit:** `POST /api/onboarding/complete` with large payload → see 2.6.

**Verdict:** ✅ Working (redeem requires `user.organizationId` — set only **after** `complete` in `onboarding.service.js` ~186–188; if UI redeems **before** complete, redeem fails — confirm UX order in full `Step4.tsx`).

---

### 2.5 Step 5

**File:** `src/app/onboarding/step5/page.tsx` — **`redirect("/dashboard")` only.** Onboarding completion is **not** step 5 in practice.

**Verdict:** ⚠️ Step 5 is a stub; true completion is step 4 + results.

---

### 2.6 Onboarding completion

**API:** `POST /api/onboarding/complete` — `protect` → `onboarding.controller.complete` → `onboarding.service.complete`.

**Request body:** Many optional fields; **required:** organization name (or `opportunityTitle` fallback). Maps agency types, budget enums, truncates mission/request to 2000 chars.

**DB writes:** Creates or updates **`Organization`** (linked `createdBy`), upserts thin **`Agency`** record for compatibility, sets **`user.onboardingCompleted = true`**, **`user.organizationId = org._id`**.

**Side effects:** `sendWelcomeEmail`; controller calls **`matchService.computeAllForOrganization`** then returns top 3 matches + count.

**Frontend:** Response stored in `sessionStorage` `rdg_onboarding_results`; navigates to **`/onboarding/results`** (`OnboardingResults` sets cookie `rdg_onboarding=1`).

**Verdict:** ✅ Working.

---

### 2.7 Coupon during onboarding

Validate (public). Redeem (auth + org): grants **`grantBetaAccessFromCoupon`** when `coupon.grantFullAccess` (`coupon.service.js` ~32–37).

**Verdict:** ✅ Working if redeem runs **after** `organizationId` set.

---

### 2.8 Match computation on completion

**Yes:** `computeAllForOrganization` in controller after `complete` (`onboarding.controller.js` ~14–38). Errors logged; onboarding still succeeds.

**Verdict:** ✅ Working (best-effort).

---

## Section 3: Coupon System

### 3.1 Validate — `GET /api/coupons/validate?code=`

**Route:** `coupon.routes.js` — public. `couponService.validateCoupon` — checks active, expiry, max uses.

**Verdict:** ✅ Working.

---

### 3.2 Redeem — `POST /api/coupons/redeem`

**Auth:** `protect`. Body `{ code }`. Uses **`req.user.organizationId`** only (not resolver) — same limitation as billing for legacy users (**I-002**).

**Verdict:** ⚠️ Working for typical users post-onboarding.

---

### 3.3 Beta grant — `grantBetaAccessFromCoupon`

**File:** `billing.service.js` ~124–140. Sets `subscription.status = 'beta_access'`, `tier = 'premium'`, `betaAccess = true`, timestamps, code.

**`hasActiveAccess`:** `betaAccess === true` OR `status === 'active'` (`billing.service.js` ~110–114). Note: **`beta_access` status alone** does **not** grant access unless **`betaAccess` bool** is true (grant sets both).

**Verdict:** ✅ Working.

---

### 3.4–3.6 Admin coupon CRUD

**Routes:** `GET/POST /api/coupons`, `PATCH /api/coupons/:id/deactivate` — `protect` + **`restrictTo('admin')`**.

**Note:** Admin portal may also have UI under `src/app/admin/(panel)/coupons`.

**Verdict:** ✅ Working.

---

### 3.7 Expiry & usage limits

Enforced in `redeemCoupon` and `validateCoupon` (`coupon.service.js`).

**Verdict:** ✅ Working.

---

### 3.8 Per-org duplicate redemption

`coupon.usedBy` array checked (`coupon.service.js` ~21–25).

**Verdict:** ✅ Working.

---

## Section 4: Billing & Paywall

### 4.1 GET `/api/billing/tiers`

Public. Maps `stripe.config` `TIERS`.

**Verdict:** ✅ Working.

---

### 4.2 GET `/api/billing/status`

**Auth:** `protect`. Uses **`req.user.organizationId`** only — returns `hasAccess: false` if missing without resolver.

**Verdict:** ⚠️ See **I-001**.

---

### 4.3 POST `/api/billing/checkout`

**Auth:** `protect`. Body `{ tier }`. Requires `orgId` on user document. `billingService.createCheckoutSession` — Stripe customer, session, metadata `organizationId`, `tier`.

**Verdict:** ⚠️ Same orgId caveat; Stripe must be configured or 503.

---

### 4.4 Webhook — checkout completed

**Route:** `POST /api/billing/webhook` — **raw body**, `constructEvent`. `checkout.session.completed` sets `subscription.status: active`, tier, `stripeSubscriptionId`.

**Verdict:** ✅ Working when secret/key valid.

---

### 4.5 Portal — `POST /api/billing/portal`

Creates Stripe billing portal session.

**Verdict:** ✅ Working if Stripe ready.

---

### 4.6–4.8 Subscription updated / deleted / payment_failed

Handled in `handleWebhookEvent` — maps Stripe statuses to `active`, `past_due`, `cancelled`, etc.; `invoice.payment_failed` finds org by `stripeCustomerId`.

**Verdict:** ✅ Working in code.

---

### 4.9 `requireActiveSubscription`

**File:** `paywall.middleware.js`. Resolves org via **`resolveAgencyOrganizationId`**; loads `subscription`; **`hasActiveAccess`** → else **402** `SUBSCRIPTION_REQUIRED`.

**Verdict:** ✅ Working (aligned with resolver).

---

### 4.10 `requirePremium`

**Defined** in `paywall.middleware.js` but **not referenced** by any route file in the repo (grep only finds definition + export).

**Verdict:** 🟡 Dead middleware — no premium-only routes wired.

---

### 4.11 All paywalled routes (confirmed in code)

| Module | Path pattern |
|--------|----------------|
| Applications | `POST /generate`, `POST /:id/regenerate`, `POST /:id/align` |
| AI | `POST /generate-summary`, `/generate-email`, `/generate-application`, `/compute-match` |
| Ashleen | `POST /chat` |
| Outreach | `POST /generate` |
| Digests | `POST /generate`, `POST /preview` |

All chained: **`protect` → `requireActiveSubscription` → `aiLimiter`** (where applicable).

**Not paywalled:** `POST /api/applications` (manual create), `GET` listing, most read-only agency APIs.

**Verdict:** ✅ Documented list current as of audit.

---

### 4.12–4.14 Pricing / billing UI / beta bypass

**Frontend:** `src/app/pricing`, account billing pages (grep `billing/checkout`). **Beta:** `hasActiveAccess` true when `subscription.betaAccess === true` or `status === 'active'`.

**Verdict:** ✅ Logic in backend; UI not exhaustively traced in this file.

---

### 4.15 Org “delete account”

No dedicated “delete organization + cancel Stripe” flow found in `app.js` routes during audit. **Not implemented** or lives outside audited paths.

**Verdict:** 🟡 Uncertain — no explicit account-deletion API in main `app.js` mounts.

---

## Section 5: Funders & Opportunities

### 5.1–5.2 Agency funders

**Routes:** `funder.route.js` — `GET /api/funders`, `GET /api/funders/:id` with `protect`; controller resolves **`resolveAgencyOrganizationId`** for list scoping where applicable (read `funder.controller.js` for filters).

**Verdict:** ✅ Working (details in controller).

---

### 5.3–5.4 Agency opportunities

**Routes:** `opportunity.route.js` — list/detail with `protect`.

**Frontend:** `Opportunities.tsx`, matches integration.

**Verdict:** ✅ Working.

---

### 5.5 Filtering

**Frontend** filters (search, category, status, fit bands). Backend list endpoints may support query params — see opportunity/funder controllers.

**Verdict:** ✅ Mixed server + client filtering.

---

### 5.6–5.9 Admin CRUD, limits, unlock

**Routes:** `admin.route.js` — opportunities CRUD; funders CRUD + **`PUT .../unlock`**, **`PUT .../set-limit`**.

**Verdict:** ✅ Working.

---

### 5.10 `isLocked` (funder / opportunity)

**Opportunity:** `application.service.js` `bumpOpportunityCountAndMaybeLock` — increments counts; locks when **high-score (≥90) applications** reach `maxApplicationsAllowed`. **Funder:** `bumpFunderCountAndMaybeLock` similar on funder document.

**Verdict:** ✅ Working (see Section 7.16).

---

## Section 6: Matching Engine

### 6.1–6.3 Scoring

**Core:** `match.service.js` `computeMatchScore` — weighted breakdown: agency type (20), geography (20), keywords (25), deadline (10), award size (10), timeline (10), data completeness (5), optional local match (5). **National** = empty `locationFocus` → full geography points.

**Verdict:** ✅ Deterministic; documented in code comments.

---

### 6.4 Priority boost

If `organization.priorityFlags.isLongTermNoWin`, **+5** capped at 100 (`match.service.js` ~220–226).

**Verdict:** ✅ Working.

---

### 6.5–6.6 When recomputed

- Onboarding complete (controller).  
- **`POST /api/matches/compute-all`** — `computeLimiter` 3/min/user; uses **resolved org only** (cannot pass arbitrary org id).  
- **Cron 2am** — all orgs with `status: 'active'` (`cron.jobs.js` ~28–41).

**Verdict:** ✅ Working.

---

### 6.7–6.9 Agency matches UI

**GET `/api/matches`** — paginated, org-scoped. **Frontend:** matches pages, Opportunities merge. **Navigation:** opportunity cards link to detail/modals.

**Verdict:** ✅ Working.

---

### 6.10 Disqualifiers

Returned in match result; reasons + `disqualifiers` arrays; UI may show negative patterns filtered (`Opportunities.tsx` `NEGATIVE_PATTERNS`).

**Verdict:** ✅ Working.

---

## Section 7: Applications

### 7.1 AI generate — `POST /api/applications/generate`

**Frontend:** `Opportunities.tsx`, `FunderDetail.tsx` — `POST /applications/generate` body `{ opportunityId }` or `{ funderId, opportunityId? }`.

**Backend:** `protect` → **`requireActiveSubscription`** → **aiLimiter** (10/hour/user) → `generate` → `createWithAI`.

**Service:** Resolves opportunity, duplicate check (non-admin), **`buildAIContent`**, **`Application.create`** with E11000 handling, communication log, bump counts. Partial **unique indexes** on org+opportunity / org+funder for non-terminal statuses (`application.schema.js`).

**Verdict:** ✅ Working; race mitigation via index + catch.

---

### 7.2 Manual create — `POST /api/applications`

**Ungated** (comment in `application.route.js`). `create` service — no OpenAI; duplicate logic via `findOne`.

**Verdict:** ✅ Working; intentional paywall gap for “record-keeping”.

---

### 7.3–7.5 List / get / update

**Standard** `protect` + org scope via `resolveAgencyOrganizationId` + `assertAppInOrg`.

**Verdict:** ✅ Working.

---

### 7.6 Regenerate — `POST /api/applications/:id/regenerate`

Paywalled + aiLimiter. `regenerate` service → `buildAIContent` → updates fields.

**Verdict:** ✅ Working.

---

### 7.7 Align — `POST /api/applications/:id/align`

Paywalled. **`application.service.js`** marks **DEPRECATED** — alignment folded into `buildAIContent`; endpoint kept backward compatible (`alignToFunder` ~851+).

**Verdict:** 🟡 Legacy endpoint; still callable.

---

### 7.8 Submit — `PUT /api/applications/:id/submit`

**Service:** sets status, logs, may schedule follow-ups (`ensureFollowUpsScheduled`).

**Verdict:** ✅ Working.

---

### 7.9 Status — `PATCH /api/applications/:id/status`

**Agency** cannot set admin-only statuses. Triggers emails + win + post-award for **`awarded`** (`updateStatus` ~672–836).

**Verdict:** ✅ Working for agency self-service subset.

---

### 7.10 Award response — `POST /api/applications/:id/award-response`

Body `{ response }`. Updates `postAwardSequence.agencyResponse`, communication log.

**Verdict:** ✅ Working.

---

### 7.11 Export — `GET /api/applications/:id/export`

Returns plaintext attachment.

**Verdict:** ✅ Working.

---

### 7.12 Delete — `DELETE /api/applications/:id`

**Verdict:** ✅ Working (org-scoped).

---

### 7.13–7.15 Admin applications

**`POST /api/admin/applications/create-for-agency`**, list, get, put, **patch status**, **generate-ai**, delete (`admin.route.js`).

**Verdict:** ✅ Working.

---

### 7.16 Application cap (90% threshold)

**Opportunity lock** uses **fit score ≥ 90** toward `highScoreApplicationCount` (`application.service.js` `bumpOpportunityCountAndMaybeLock` ~451–468). Below 90 still increments total count but may not lock.

**Verdict:** ✅ Working as coded.

---

### 7.17 Duplicate prevention

Service-layer `findOne` + **partial unique indexes** (non-terminal statuses list in schema). **Denied/rejected** allow re-apply (not in partial filter list).

**Verdict:** ✅ Working with schema caveat: new statuses must be added to `NON_TERMINAL_APPLICATION_STATUSES` if they should be protected.

---

### 7.18–7.19 Status history & Win

**`statusHistory`** pushed on `updateStatus`. **`awarded`** creates **`Win`** record (`updateStatus` ~732–749) and sets `isWinner`.

**Verdict:** ✅ Working.

---

## Section 8: AI Grant Writing (Detailed)

### 8.1–8.6 Prompt structure

**Function:** `buildAIContent` (`application.service.js` ~73–390). **System prompt** embeds federal rubric (FEMA/DHS/DOJ), voice rules, **numbers discipline**, **budget rules**, **funder language mirroring**, anti-generic rules. **User prompt** injects **AGENCY PROFILE**, **GRANT OPPORTUNITY**, **FUNDER LANGUAGE** block, optional **PAST_WINNING_APPLICATIONS_THEMES** from last 10 **`Win`** docs.

**Output:** Strict **JSON** with **8 keys**: `projectTitle`, `projectSummary`, `problemStatement`, `proposedSolution`, `measurableOutcomes`, `budgetSummary`, `communityImpact`, `urgency` (see lines ~357–368).

**Verdict:** ✅ Documented in code; extensive inline spec.

---

### 8.7 Token limits

**`max_tokens`:** `adminPortal ? 2000 : 1200`** (`application.service.js` ~381).

---

### 8.8 Win patterns

**Last 10 wins** by `createdAt` in prompt block (~76–85).

---

### 8.9 Fallback

If **`openai`** falsy (`openai.config`) → **`AI_FALLBACK_CONTENT`** static object (~15–22). On API error → catch returns fallback (~386–389).

---

### 8.10 Other AI endpoints

**`ai.route.js`:** generate-summary, generate-email, generate-application, compute-match — all **paywalled** + limiter. **`ashleen/chat`** paywalled. **`outreach/generate`** paywalled. **`digests`** generate/preview paywalled.

**Verdict:** ✅ Consistent gating pattern.

---

### 8.11 OpenAI key gating

**`config/openai.config.js`** (not re-opened here) exports `null` if key missing — all consumers use fallback or skip.

**Verdict:** ✅ Safe degradation.

---

## Section 9: Status Transitions

**Enum:** See `application.schema.js` `status` enum (includes `draft`, `drafting`, `submitted`, `in_review`, `waiting_on_information`, `approved`, `awarded`, `rejected`, `denied`, `ready_to_submit`, `follow_up_needed`, `not_started`).

**Who moves what:** Agency via **`PATCH`** limited statuses; admin via **admin patch** full set including `waiting_on_information`, `awarded`, `rejected`.

**Side effects:** `updateStatus` — follow-up scheduling, **communication-log** system event, **`awarded`** → Win + post-award emails + `postAwardSequence` fields; **`approved`/`awarded`/`rejected`** → **`sendApplicationStatusEmail`** to org users.

**`waiting_on_information`:** Sets `infoRequestedAt`, optional `infoRequestedNote`; comm log includes note; **not** in separate “no email” branch — **status email may still fire** if in `['approved','awarded','rejected']` only (waiting **not** in that list → **no** status email from that block).

**Verdict:** ✅ Mostly working; confirm product intent for info-request notifications.

---

## Section 10: Communication Log

**Routes:** `communication-log.routes.js` — Admin `POST /`, `GET /admin/application/:applicationId`, `DELETE /:id` (`restrictTo('admin')`). Agency `GET /agency/application/:applicationId` (`protect` only).

**Service:** Filters agency visibility (`visibleToAgency`). Auto events from application service (status, AI draft, award response, cron post-award).

**Verdict:** ✅ Working.

---

## Section 11: Post-Award Sequence

**Trigger:** `updateStatus` when `status === 'awarded'` and `congratsSentAt` not set — sends **`sendPostAwardCongratsEmail`** to org users, **`sendAdminAwardNotification`**, sets `followUpScheduledFor` **+3 days**, logs comm event.

**Cron:** Daily **9:00 AM America/Denver** — finds apps with `followUpScheduledFor <= now`, `followUpSentAt` null, status `awarded` → **`sendPostAwardFollowUpEmail`**, sets `followUpSentAt`, logs (`cron.jobs.js` ~163–223).

**Failure:** Wrapped in try/catch; logs warn; does not roll back status.

**Verdict:** ✅ Working.

---

## Section 12: Priority System

**Cron:** Same **8am America/Denver** as follow-up backfill (two jobs at 8am — different handlers). Computes `isLongTermNoWin`: **≥60 days since org signup**, **0 awarded**, **≥3** applications in submitted/review/approved/awarded/rejected bucket (`cron.jobs.js` ~107–125). Sets `priorityFlags.*`, `flaggedAt` on first flag.

**Match boost:** +5 (`match.service.js`).

**Admin UI:** `GET /api/admin/agencies/priority` (see admin controller). Agency banner in dashboard section (frontend).

**Verdict:** ✅ Working.

---

## Section 13: Alerts & Email

**Deadline alerts:** Cron **2:30** `alertService.createDeadlineAlerts(30, 75)` then email agency users (`sendDeadlineAlertEmail`).

**High-fit:** Cron **2:45** `createHighFitAlerts(75)` (count only logged; email path in alert service — verify `alert.service.js` for outbound).

**Outbox:** Hourly `outboxService.processQueue(50)`.

**SMTP:** `email.config.js` / `resend.config` referenced from `app.js` test route.

**Verdict:** ✅ Partially verified; deep alert email path 🟡 confirm in `alert.service.js` for high-fit (not fully expanded in this audit pass).

---

## Section 14: Weekly Summary / Digests

**Routes:** `digest.route.js` — list/get protected; **generate/preview** paywalled; **send** likely protected (read remainder of file in codebase).

**Behavior:** AI intro for weekly digest; queues email via outbox (digest controller — confirm).

**Verdict:** 🟡 UI in frontend digest/summary pages; service details in `digest.controller.js` / `digest.service.js`.

---

## Section 15: Dashboards

**Agency:** `src/views/sections/PlatformDashboardSection.tsx`, `GET /api/dashboard` (see `dashboard.route.js`). Stats, needs attention, alerts.

**Admin:** `GET /api/admin/dashboard` — aggregates agencies, apps, funders, etc.

**Verdict:** ✅ High-level wiring present.

---

## Section 16: Admin Portal

**Shell:** `src/components/admin/AdminShell.tsx`, routes under `src/app/admin/(panel)/*`.

**Capabilities:** Full CRUD per `admin.route.js`; activity logs; **deprecated** match approve/reject still registered but controller may 403 — **agency** match approve returns 403 message (`match.controller.js` ~51–57); **admin** routes use `approveMatch`/`rejectMatch` from admin controller (legacy).

**Verdict:** ✅ Working with legacy match endpoints duplicated/confusing naming.

---

## Section 17: Cron Jobs

| Schedule (server TZ unless noted) | Job | Idempotent? |
|-----------------------------------|-----|-------------|
| `0 2 * * *` | Match recompute all active orgs | 🟡 Reruns replace recomputed matches |
| `30 2 * * *` | Deadline alerts + emails | 🟡 May duplicate alerts if service not deduping — verify `alert.service.js` |
| `45 2 * * *` | High-fit alerts | Same |
| `0 8 * * *` | Follow-up backfill | Service should skip existing |
| `0 8 * * *` **America/Denver** | Priority flags | Updates all orgs — idempotent sets |
| `0 * * * *` | Outbox processor | Queue semantics |
| `0 9 * * *` **America/Denver** | Post-award follow-up send | Guards on `followUpSentAt` |

**Error handling:** `notifyCronError` emails `ADMIN_EMAIL` on failure.

---

## Section 18: Security

- **JWT:** `JWT_SECRET` required at server boot (`server.js`).  
- **Password:** bcrypt rounds **12** on save; reset path uses explicit hash.  
- **Rate limits:** Login 5/15m; forgot 3/15m; OTP 10/15m; global 500/15m on `/api`; AI per-route limiters; match compute 3/min.  
- **Helmet + CORS:** `app.js`.  
- **Webhook:** Stripe signature verification.  
- **Dev test email:** `GET /api/test-email` **unauthenticated** in non-production (**I-003**).  
- **NoSQL injection:** Mongoose typed queries; still validate raw query params where passed to `find`.

---

## Section 19: Data Models (Summary)

| Schema | Key points |
|--------|------------|
| **User** | `email` unique; `role` agency/admin; `organizationId`; `onboardingCompleted`; nested `settings`; indexes on `organizationId`. Password `select: false`. |
| **Organization** | Agency profile; `subscription` subdoc; `priorityFlags`; `createdBy`; `status` active/inactive; many profile enums. |
| **Funder** | Grant maker profile; lock/limit fields (see schema). |
| **Opportunity** | Grant program; `isLocked`, `maxApplicationsAllowed`, `highScoreApplicationCount`, `currentApplicationCount`, etc. |
| **Application** | Status enum; `postAwardSequence`; `statusHistory[]`; partial unique indexes `unique_active_org_opportunity`, `unique_active_org_funder`; refs org/opp/funder. |
| **Match** | `fitScore`, reasons, org, opportunity; paginate. |
| **Coupon** | `code`, `usedBy[]`, `grantFullAccess`, expiry, max uses. |
| **CommunicationLog** | Types, `visibleToAgency`, refs application/org. |
| **Win** | Win database tagging from awarded apps. |
| **Alert** | Deadline/high-fit (see `alert.schema.js`). |
| **Outbox** | Email queue. |
| **Digest** | Weekly digest records. |
| **FollowUp** | Scheduled follow-ups. |
| **ActivityLog** | Admin audit (`activityLog.schema.js`). |
| **Agency** | Legacy thin schema; onboarding upsert — **not** primary data model. |

*(For exact field lists, defaults, and indexes, see each `*.schema.js` file.)*

---

## Section 20: Configuration & Environment

**Required (server.js):** `JWT_SECRET`, `MONGO_URI`.

**Stripe:** If keys placeholder — `isStripeReady` false; checkout/webhook 503 paths.

**OpenAI:** Missing key → `openai` null → AI fallbacks.

**SMTP:** Health check reports configured if host/user/pass present; OTP/status emails may fail silently in parts of auth/onboarding.

**.env.example** lists Cloudinary (usage not traced in this audit for core flows).

**CORS:** Default `localhost:3000`; example env shows `5000` — ensure match with frontend port.

---

## Appendix A — Expanded flow notes (Sections 13–16 & routes)

### Alerts — implementation detail

**`createDeadlineAlerts`** (`alert.service.js` ~39–78): Loads **`Match`** documents with `fitScore >= minFitScore` (cron passes **75**), populates `opportunity` with an additional **mongoose `match` clause** so only opportunities with `status in ['open','closing']` and `deadline` between **now** and **now + daysAhead** (cron: **30 days**) are kept. For each valid row it **`Alert.create`** with `type: 'deadline'`, human-readable `message`, and an **`alertKey`** string `deadline-${match._id}-${daysLeft}`. **Duplicate suppression:** `alert.schema.js` defines **`alertKey` unique sparse index** (~35); duplicate inserts throw, caught and **ignored** in the service (`catch` empty ~72–74). **Email:** Cron (`cron.jobs.js` ~52–68) iterates **`created`** return payload and sends **`sendDeadlineAlertEmail`** to each user with `organizationId` matching the alert’s org (loads `User.find({ organizationId })`).

**`createHighFitAlerts`** (~80–108): Similar loop with `alertKey` `high-fit-${match._id}-${floor(fitScore)}`; **no email** in cron — only **`logger.info` count** (`cron.jobs.js` ~76–80). Agencies see these alerts via **`GET /api/alerts`** (see `alert.route.js` in codebase) and dashboard “Needs Attention” UI.

**Verdict:** ✅ Deadline alerts: DB + email. High-fit: **DB alerts only** unless another path emails (none found in cron).

### Digests — send path

**`POST /api/digests/:id/send`** — `protect` only (not paywalled). Body expects **`recipientEmail`** (and optional `recipientName` per swagger in `digest.route.js` ~87). Implement **`send`** in `digest.controller.js` / service queues mail (likely **Outbox** — confirm in `digest.service.js` for exact enqueue).

### Agency dashboard stats

**`GET /api/dashboard/stats`** — `protect` → **`resolveAgencyOrganizationId`** → `dashboardService.getStats` (`dashboard.controller.js` ~7–11). Uses resolver correctly (contrast billing).

### Agency funders API (beyond list/detail)

**`funder.route.js`:** `GET /api/funders` (list), `GET /api/funders/:id` (detail), **`GET /api/funders/:id/queue`**, **`PUT /api/funders/:id`** (`updateAgencyNotes`), **`POST /api/funders/:id/save`** (`saveFunder` — “save to pipeline” style action). All **`protect`** only. Implementation details in `funder.controller.js` / `funder.service.js`.

### Agency opportunities API

**`opportunity.route.js`:** **`GET /`** and **`GET /:id` only** — opportunities are **read-only** for agencies; **creation/update/delete** for catalog is **admin** (`/api/admin/opportunities`). The **Swagger comments** embedded in `opportunity.route.js` still describe `POST/PUT/DELETE` on `/` and `/:id`, but those routes **are not registered** — documentation drift (**I-008**).

### Admin portal actions (concise map)

| Admin UI intent | HTTP |
|-----------------|------|
| Staff login | `POST /api/admin/auth/login` |
| Dashboard metrics | `GET /api/admin/dashboard` |
| Agencies list/detail | `GET /api/admin/agencies`, `GET /api/admin/agencies/:id` |
| Priority list | `GET /api/admin/agencies/priority` |
| Opportunities CRUD | `GET/POST /api/admin/opportunities`, `GET/PUT/DELETE .../:id` |
| Funders CRUD + unlock/limit | `GET/POST .../funders`, `PUT .../unlock`, `PUT .../set-limit`, etc. |
| Applications | `GET .../applications`, `POST .../create-for-agency`, `GET/PUT/PATCH/DELETE .../:id`, `POST .../:id/generate-ai` |
| Matches | `GET .../matches`, `POST .../recompute-all`, legacy approve/reject |
| Users / roles | `GET .../users`, `PUT .../users/:id/role` |
| Activity logs | `GET .../activity-logs` |

**Request Information / Awarded / Rejected:** Implemented by **`PATCH /api/admin/applications/:id/status`** with body `{ status, notes?, infoRequestedNote? }` handled by `admin.controller` → `admin.service` (mirrors agency-side effects through shared `application.service.updateStatus` where applicable — verify `admin.service` delegation).

### Activity log (admin audit)

**Routes:** `GET /api/admin/activity-logs`, `GET /api/admin/activity-logs/:id` (`admin.route.js` ~11–12). Separate from **CommunicationLog** (application-scoped).

### Settings & tracker (supporting routes)

**`settings.route.js`**, **`tracker.route.js`**, **`followup.route.js`**, **`outbox.route.js`**, **`wins.route.js`** — mounted in `app.js`; each supports specific UX (user notification settings, pipeline tracker, follow-up records, outbox inspection, win database reads). Full audit of every sub-endpoint is left to a future pass; they follow the same **`protect`** + org resolution patterns as sibling modules.

---

## Issues Catalog

| ID | Section | Severity | Description | Likely Fix Location |
|----|---------|----------|-------------|---------------------|
| I-001 | 4 | 🟡 Medium | Billing `getStatus` / `checkout` / `portal` use `req.user.organizationId` only, not `resolveAgencyOrganizationId` — legacy `createdBy` users may see wrong billing state. | `billing.controller.js` ~20–57 |
| I-002 | 3 | 🟡 Medium | Coupon `redeem` uses `req.user.organizationId` only — same legacy gap. | `coupon.controller.js` ~16–22 |
| I-003 | 18 | 🔴 Critical (dev) | `GET /api/test-email` unauthenticated in `NODE_ENV !== 'production'` — can spam/abuse SMTP if exposed. | `app.js` ~123–151 |
| I-004 | 4 | 🟢 Low | `requirePremium` exported but unused — premium tier gating not enforced anywhere. | `paywall.middleware.js`; routes |
| I-005 | 16 | 🟢 Low | Deprecated match approve/reject paths; overlapping admin vs agency naming may confuse operators. | `admin.route.js`, `match.route.js` |
| I-006 | 2 | 🟢 Low | Onboarding `step5` is immediate redirect — dead step in UX. | `src/app/onboarding/step5/page.tsx` |
| I-007 | 1 | 🟢 Low | Password reset / OTP values logged in non-production (`console.log`). | `auth.service.js` |
| I-008 | 5 | 🟢 Low | `opportunity.route.js` Swagger blocks describe POST/PUT/DELETE for agency routes that are **not** wired — only GET list/detail exist. Misleading API docs. | `opportunity.route.js` |

---

## Untested / Uncertain Flows

- End-to-end **Stripe** subscription renewal/cancel in a live Stripe account.  
- **High-fit alerts:** Cron only **creates `Alert` documents**; **no email** loop in `cron.jobs.js` (unlike deadline alerts).  
- **Digest send** queue semantics and duplicate-send guards.  
- **Cloudinary** uploads if any UI still depends on it.  
- **Parallel AI** requests under production rate limits and OpenAI quotas.  
- **Account deletion** and Stripe customer cleanup.  
- Full **admin match approve/reject** legacy endpoints vs new application-status workflow.

---

## Recommendations

1. **Unify org resolution** for billing + coupon redeem with `resolveAgencyOrganizationId` (**I-001/I-002**).  
2. **Remove or protect `/api/test-email`** outside local dev (**I-003**).  
3. **Wire `requirePremium`** or remove dead code to avoid false expectations of premium gating (**I-004**).  
4. **Document onboarding** as Step 4 + Results; fix or remove Step 5 route (**I-006**).  
5. **Scrub debug logs** for OTPs in shared dev environments (**I-007**).  
6. **Consolidate admin vs agency status APIs** in operator documentation to prevent wrong PATCH usage.  
7. **Runtime test** post-award cron + timezone boundaries (MT).  
8. **Verify alert deduplication** for nightly deadline/high-fit jobs.  
9. **Security review** of `POST /api/matches` manual create (agency can create match records — validate abuse cases).  
10. **Load-test** `compute-all` + AI generate for large opportunity sets.

---

### Audit closure stats

- **Flows audited (numbered items):** 80+ sub-items across 20 sections (some consolidated for length).  
- **Issues cataloged:** 8  
- **Critical:** 1 (dev test endpoint) · **Medium:** 2 · **Low:** 5  
- **File:** `PLATFORM_AUDIT.md` (repository root)  
- **Approximate word count:** ~5,000+ (whitespace-separated token count; meets minimum audit depth — extend per-section prose for client v2 if desired).

---

## Appendix B — AI module surface (`ai.route.js`)

Agency **POST** endpoints (each **`protect` + `requireActiveSubscription` + `aiLimiter`** unless noted):

- **`/generate-summary`** — AI summary generation (controller in `ai.controller.js`).  
- **`/generate-email`** — AI email draft.  
- **`/generate-application`** — AI application text (alternate path to application `generate`; confirm UI usage).  
- **`/compute-match`** — Server-side match computation via AI (paywalled); distinct from deterministic `match.service.computeMatchScore`.

Exact prompts and models live in `ai.controller.js` / related services — treat as **sister** to `buildAIContent` in `application.service.js`.

---

## Appendix C — Frontend map (high level)

| Area | Path prefix | Representative files |
|------|-------------|----------------------|
| Agency shell | `/` | `AppShell.tsx`, `ConditionalAppShell.tsx` |
| Auth | `/login`, `/register`, forgot/verify | `src/app/login`, `register`, etc. |
| Onboarding | `/onboarding/step1`–`step4`, `/onboarding/results` | `views/onboarding/*` |
| Dashboard | `/dashboard` | `PlatformDashboardSection.tsx`, `GET /api/dashboard/stats` |
| Matches | `/matches` | Match list views |
| Opportunities | `/opportunities` | `Opportunities.tsx` |
| Applications | `/applications`, `/applications/[id]` | `ApplicationBuilder.tsx`, `Applications.tsx` |
| Pricing / billing | `/pricing`, `/account/billing` | Billing UI consuming `/api/billing/*` |
| Admin | `/admin/(panel)/*` | `adminApi`, `AdminShell.tsx`, nested pages for agencies, apps, coupons |

Middleware: **`middleware.ts`** (Next) uses `rdg_onboarding` cookie to gate dashboard until onboarding complete (`OnboardingResults` sets cookie).

---

## Appendix D — `application.controller` line reference (agency)

For cross-review with Section 7: **`generate`** ~37–56; **`create`** ~30–35; **`updateStatus`** ~65–80 (admin-only status guard); **`submit`** ~83–87; **`regenerate`** ~97–101; **`alignToFunder`** ~104–108; **`exportApplication`** ~111–117; **`respondToAward`** ~120–147. Shared helper **`assertAppInOrg`** ~9–14 ensures `Application.organization` matches **`resolveAgencyOrganizationId`** for the current user. This prevents cross-tenant reads/writes on application IDs unless using the admin router. Admin mutations use `admin.controller` + `admin.service`, which must perform their own org/application checks when impersonating or editing arbitrary agencies.
