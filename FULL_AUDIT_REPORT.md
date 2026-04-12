# FULL AUDIT REPORT — Red Dog Grant Intelligence
**Generated:** 2026-04-12  
**Audited by:** Claude Code (claude-sonnet-4-6)  
**Scope:** Full stack — backend (Node/Express/Mongoose) + frontend (Next.js 14 / TypeScript)

---

## 1. WHAT IS FULLY DONE ✅

### 1.1 Authentication System
**Feature:** Full auth lifecycle — register, login, logout, password reset with OTP  
**Frontend files:** `src/views/Login.tsx`, `SignUp.tsx`, `ForgotPassword.tsx`, `OtpVerification.tsx`, `CreatePassword.tsx`, `src/lib/AuthContext.tsx`, `src/lib/api.ts`  
**Backend files:** `src/modules/auth/auth.controller.js`, `auth.service.js`, `auth.route.js`, `user.schema.js`  
**API endpoints:**
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/forgot-password`
- `POST /api/auth/verify-otp`
- `POST /api/auth/reset-password`
- `GET /api/auth/me`

**Wiring confirmation:** Passwords marked `select: false`. OTPs bcrypt-hashed before storage. Reset tokens expire (15 min OTP, 1 hr reset token). `api.ts` interceptor clears storage and redirects on 401. Middleware.ts guards all protected routes via cookie check.

---

### 1.2 Admin Authentication (Separate)
**Feature:** Dedicated admin login, JWT, role-gated routes  
**Frontend files:** `src/app/admin/login/page.tsx`, `src/lib/adminApi.ts`, `src/app/admin/layout.tsx`  
**Backend files:** `src/modules/admin/admin.route.js`, `src/middlewares/adminAuth.middleware.js`  
**API endpoints:**
- `POST /api/admin/auth/login`
- `GET /api/admin/auth/me`

**Wiring confirmation:** `protectAdmin` middleware enforces `role === 'admin'` on every admin route. Separate `rdg_admin_token` in localStorage. Admin 401 interceptor redirects to `/admin/login`.

---

### 1.3 Onboarding Flow (5 Steps)
**Feature:** Multi-step agency onboarding stored in sessionStorage, submitted on step 5  
**Frontend files:** `src/views/onboarding/Step1.tsx` through `Step5.tsx`, `src/app/onboarding/step1–5/page.tsx`, `src/lib/validation-schemas.ts`  
**Backend files:** `src/modules/onboarding/onboarding.service.js`, onboarding route  
**API endpoints:** `POST /api/onboarding/complete`  

**Wiring confirmation:**
- Step 1 saves `{ organizationName, location, websiteUrl, missionStatement }` to `rdg_onboarding_step1`
- Step 2 saves `{ agencyTypes: string[] }` to `rdg_onboarding_step2`
- Step 3 saves `{ programAreas: string[] }` to `rdg_onboarding_step3`
- Step 4 saves `{ requestDescription, budgetRange, timeline }` to `rdg_onboarding_step4`
- Step 5 assembles full payload (using `specificRequest` key which matches backend), calls `/api/onboarding/complete`, then clears all session keys and navigates to `/dashboard`

---

### 1.4 Funder Discovery & Detail
**Feature:** Browse funders, view details, apply, see application cap and lock status  
**Frontend files:** `src/views/Funders.tsx`, `src/views/FunderDetail.tsx`, `src/app/funders/page.tsx`, `src/app/funders/[id]/page.tsx`  
**Backend files:** `src/modules/funders/funder.controller.js`, `funder.service.js`, `funder.route.js`, `funder.schema.js`  
**API endpoints:**
- `GET /api/funders` — paginated list with filters
- `GET /api/funders/:id` — detail
- `GET /api/funders/:id/queue` — lock/count data
- `PUT /api/funders/:id` — update notes
- `POST /api/funders/:id/save` — save to watchlist

**Wiring confirmation:** `Funders.tsx` shows lock icon and fill progress. `FunderDetail.tsx` queries queue data, shows progress bar, disables apply button on 423 (locked), shows success/error toasts.

---

### 1.5 Application Control System (Locking)
**Feature:** Funder locks when `currentApplicationCount >= maxApplicationsAllowed`  
**Frontend files:** `FunderDetail.tsx`, `Funders.tsx`, `src/app/admin/(panel)/funders/[id]/page.tsx`  
**Backend files:** `application.service.js` (lines 156–169), `funder.schema.js` (lines 29–31), `admin.route.js` (lines 25–26), `admin.controller.js`  
**API endpoints:**
- `POST /api/applications/generate` — checks `isLocked`, increments count, sets lock
- `GET /api/funders/:id/queue` — returns count, max, lock status
- `PUT /api/admin/funders/:id/unlock` — resets count and lock
- `PUT /api/admin/funders/:id/set-limit` — sets `maxApplicationsAllowed`

**Wiring confirmation:** `application.service.js:160` throws 423 if locked. Lines 165–166 increment and lock. Admin funder detail page has Application Control card with lock badge, progress bar, conditional Unlock button (only visible when `isLocked === true`), and Set Application Limit button.

---

### 1.6 Match Intelligence
**Feature:** AI-scored grant-fit matching between organizations and opportunities  
**Frontend files:** `src/views/Matches.tsx`, `src/app/matches/page.tsx`  
**Backend files:** `src/modules/matches/match.service.js`, `match.controller.js`, `match.route.js`, `match.schema.js`  
**API endpoints:**
- `GET /api/matches` — list matches for org
- `POST /api/matches/compute` — recompute for single org
- `POST /api/matches/compute-all` — recompute all
- `PUT /api/matches/:id/approve` — admin approve
- `PUT /api/matches/:id/reject` — admin reject

**Wiring confirmation:** Match schema has unique compound index `{organization, opportunity}`. Scoring uses 7-factor algorithm. Agency view shows All/High/Medium/Saved tabs. Admin view additionally shows Approved/Rejected tabs (role-gated via `useAuth`). Nightly cron recomputes all at 2:00 AM.

---

### 1.7 Application Builder (AI)
**Feature:** AI-generated grant application with section editing and regeneration  
**Frontend files:** `src/views/ApplicationBuilder.tsx`, `src/app/applications/[id]/page.tsx`  
**Backend files:** `application.service.js`, `application.controller.js`, `application.route.js`  
**API endpoints:**
- `POST /api/applications/generate` — AI generation
- `GET /api/applications/:id`
- `PUT /api/applications/:id`
- `POST /api/applications/:id/regenerate`
- `POST /api/applications/:id/align`
- `PUT /api/applications/:id/submit`
- `GET /api/applications/:id/export`

**Wiring confirmation:** Win patterns fetched before AI generation (`Win.find()` at lines 74–83) and included in prompt. Fallback to `AI_FALLBACK_CONTENT` if OpenAI unavailable.

---

### 1.8 Win Database & AI Learning
**Feature:** Auto-create Win record on awarded status; AI uses past wins in prompts  
**Frontend files:** `src/views/Wins.tsx`, `src/app/wins/page.tsx`  
**Backend files:** `application.service.js` (lines 287–306), `win.service.js`, `win.route.js`, `win.schema.js`  
**API endpoints:**
- `GET /api/wins` — list wins
- `GET /api/wins/insights` — aggregate stats
- `GET /api/wins/patterns` — top funders, agency types, correlated sections

**Wiring confirmation:** `application.service.js:287` — when status set to `awarded`, creates Win record with all relevant fields. `Wins.tsx` shows Total Won card, Total $ Awarded, Win Rate %, and Top Funder cards.

---

### 1.9 Follow-up Automation
**Feature:** Day 7 and Day 14 follow-up emails scheduled on application submission  
**Frontend files:** `src/views/FollowUps.tsx`, `src/app/followups/page.tsx`  
**Backend files:** `followup.service.js`, `followup.controller.js`, `followup.route.js`, `followup.schema.js`  
**API endpoints:**
- `GET /api/followups`
- `PUT /api/followups/:id/send`
- `PUT /api/followups/:id/skip`

**Wiring confirmation:** `followup.service.js:59–96` creates two FollowUp records. Cron at 8:00 AM daily calls `backfillMissingFollowUps()`. `FollowUps.tsx` has send/skip mutations with `isPending` disabled states and toast feedback.

---

### 1.10 Weekly Summary (AI Digest)
**Feature:** AI-generated weekly grant activity digest, send via email  
**Frontend files:** `src/views/WeeklySummary.tsx`, `src/app/weekly-summary/page.tsx`  
**Backend files:** settings/summary service  
**API endpoints:** `POST /api/settings/generate-digest`, `POST /api/settings/send-digest`  
**Wiring confirmation:** Generate and Send buttons both have `isPending` disabled states and success/error toasts. Email sent via Outbox service.

---

### 1.11 Admin Matches Management
**Feature:** List all matches, approve/reject, recompute all  
**Frontend files:** `src/app/admin/(panel)/matches/page.tsx`  
**Backend files:** `match.route.js`, `match.controller.js`  
**API endpoints:** `GET /api/admin/matches`, `PUT /api/matches/:id/approve`, `PUT /api/matches/:id/reject`, `POST /api/matches/compute-all`  
**Wiring confirmation:** Full page with match table, Approve/Reject per-row buttons, and Recompute All button, all wired to mutations with toast feedback.

---

### 1.12 Admin User Management (Role Change)
**Feature:** View user detail, change role  
**Frontend files:** `src/app/admin/(panel)/users/[id]/page.tsx`  
**Backend files:** `admin.route.js`, `admin.controller.js`  
**API endpoints:** `GET /api/admin/users/:id`, `PUT /api/admin/users/:id/role`  
**Wiring confirmation:** Role dropdown and Save button wired to mutation. Toasts on success/error.

---

### 1.13 Outreach Email Builder
**Feature:** AI-written outreach emails, outbox queue management  
**Frontend files:** `src/views/OutreachList.tsx`, `src/views/OutreachBuilder.tsx`, `src/app/outreach/page.tsx`, `src/app/outreach/[id]/page.tsx`  
**Backend files:** `outbox.service.js`, `outbox.schema.js`, outreach route  
**API endpoints:** `GET /api/outbox`, `POST /api/outbox/queue`, `POST /api/outbox/:id/send`, `POST /api/outbox/:id/retry`  
**Wiring confirmation:** Outbox processes queue hourly via cron (max 50 per run). Retry logic increments `retryCount`.

---

### 1.14 Settings (Password Change, Notifications)
**Feature:** Update profile, change password, toggle notifications  
**Frontend files:** `src/views/Settings.tsx`, `src/app/settings/page.tsx`  
**Backend files:** `settings.service.js`, `settings.route.js`  
**API endpoints:** `GET /api/settings`, `PUT /api/settings`, `DELETE /api/settings/account`  
**Wiring confirmation:** Password change validates current password, enforces 8-char min, hashes via pre-save hook. Delete account requires typing "DELETE" confirmation.

---

### 1.15 Security Infrastructure
- `helmet()` enabled in `app.js`
- Rate limiting: 500 req/15min on `/api`
- CORS: respects `CORS_ORIGIN` env var
- JWT verified on every protected request, user re-queried from DB
- Error handler never leaks stack traces in production
- All admin routes behind `protectAdmin` middleware
- `asyncHandler` wrapper prevents unhandled promise rejections

---

## 2. WHAT IS MISSING ❌

### 2.1 No Rate Limiting on Auth Abuse Endpoints
**What is missing:** Dedicated rate limiter on forgot-password, verify-otp, and login  
**Where expected:** `src/modules/auth/auth.route.js` and `app.js`  
**Impact:** **App-breaking risk** — OTP brute-force is possible in 10 minutes (6-digit OTP, no lockout). Login has no lockout for credential stuffing.  
**Suggested fix:**
```js
// red-dog-radios-backend/src/app.js (add before auth routes)
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/verify-otp', authLimiter, verifyOtp);
router.post('/login', authLimiter, login);
```

---

### 2.2 No Input Validation on Match/Application Status Updates (Agency-Side)
**What is missing:** Agency users can call `PUT /api/applications/:id/status` with arbitrary status values  
**Where expected:** `application.route.js` line wrapping `PUT /:id/status`  
**Impact:** Agency could self-approve applications by setting `status: 'approved'`  
**Suggested fix:** Add middleware that restricts allowed status values for non-admin callers:
```js
// application.controller.js — updateStatus function
const AGENCY_ALLOWED_STATUSES = ['draft', 'submitted', 'withdrawn'];
const ADMIN_ALLOWED_STATUSES = ['approved', 'rejected', 'awarded', 'in_review'];
if (req.user.role !== 'admin' && ADMIN_ALLOWED_STATUSES.includes(status)) {
  throw new AppError('Not authorized to set this status', 403);
}
```
**File:** `red-dog-radios-backend/src/modules/applications/application.controller.js`

---

### 2.3 No .env.example in Frontend
**What is missing:** `red-dog-radios-frontend/.env.example`  
**Where expected:** Frontend project root  
**Impact:** Developers onboarding to the project don't know what env vars are needed  
**Suggested fix:** Create `.env.example`:
```
NEXT_PUBLIC_API_URL=http://localhost:4000
```

---

### 2.4 Match Approve/Reject Not Role-Gated on Backend
**What is missing:** `PUT /api/matches/:id/approve` and `PUT /api/matches/:id/reject` use `protect` not `protectAdmin`  
**Where expected:** `red-dog-radios-backend/src/modules/matches/match.route.js`  
**Impact:** **CRITICAL** — any logged-in agency user can approve or reject their own matches  
**Suggested fix:**
```js
// match.route.js
router.put('/:id/approve', protect, protectAdmin, approveMatch);
router.put('/:id/reject', protect, protectAdmin, rejectMatch);
```
**File:** `red-dog-radios-backend/src/modules/matches/match.route.js`

---

### 2.5 No Email Validation Before Outbox Insert
**What is missing:** Email format validation in `outbox.service.js` before storing recipient  
**Where expected:** `red-dog-radios-backend/src/modules/outbox/outbox.service.js`  
**Impact:** Retry loop will attempt to send to malformed emails indefinitely  
**Suggested fix:** Add `validator.isEmail(recipient)` check before creating the Outbox document

---

### 2.6 `POST /api/matches/compute-all` Not Admin-Gated
**What is missing:** Admin-only guard on `compute-all`  
**Where expected:** `match.route.js`  
**Impact:** Any agency user can trigger a full re-computation for all orgs — expensive AI/DB operation  
**Suggested fix:** Change middleware from `protect` to `protect, protectAdmin`  
**File:** `red-dog-radios-backend/src/modules/matches/match.route.js`

---

### 2.7 Shared `StatusBadge` Component Missing
**What is missing:** A reusable `StatusBadge` component  
**Where expected:** `red-dog-radios-frontend/src/components/StatusBadge.tsx`  
**Impact:** Badge color/label logic duplicated in at least 7 files: `Matches.tsx`, `Applications.tsx`, `Wins.tsx`, `FollowUps.tsx`, `Tracker.tsx`, `Alerts.tsx`, admin match/application pages  
**Suggested fix:** Extract to shared component:
```tsx
// src/components/StatusBadge.tsx
export const StatusBadge = ({ status }: { status: string }) => {
  const cls = STATUS_CLASSES[status] ?? 'bg-[#f3f4f6] text-[#6b7280]';
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>{status}</span>;
};
```

---

### 2.8 No Shared `Pagination` Component
**What is missing:** Reusable pagination UI  
**Where expected:** `red-dog-radios-frontend/src/components/Pagination.tsx`  
**Impact:** Pagination duplicated across all admin list pages (users, agencies, applications, opportunities, funders)  
**Suggested fix:** Extract inline page/prev/next logic to shared component

---

### 2.9 AI Endpoints Not Rate-Limited Separately
**What is missing:** Per-user rate limiting on AI generation endpoints  
**Where expected:** `red-dog-radios-backend/src/modules/applications/application.route.js`, `ai.route.js`  
**Impact:** A user could spam AI generation and incur significant OpenAI API costs  
**Suggested fix:** Add strict per-user rate limit (e.g. 10 per hour) on AI endpoints

---

## 3. WHAT IS BROKEN OR WRONG ⚠️

### 3.1 `PUT /api/matches/:id/approve` and `/reject` are Agency-Accessible
**File:** `red-dog-radios-backend/src/modules/matches/match.route.js`  
**Why it's wrong:** Both routes use `protect` middleware only. Any authenticated agency user can call these endpoints.  
**Fix:** Replace `protect` with `protect, protectAdmin` on both routes.

---

### 3.2 `POST /api/matches/compute-all` is Agency-Accessible
**File:** `red-dog-radios-backend/src/modules/matches/match.route.js`  
**Why it's wrong:** Uses `protect` only. Should be admin-only since it triggers expensive computation for all organizations.  
**Fix:** Add `protectAdmin` to this route.

---

### 3.3 CORS Defaults to Wildcard `'*'`
**File:** `red-dog-radios-backend/src/app.js`, line 38  
**Code:** `origin: process.env.CORS_ORIGIN || '*'`  
**Why it's wrong:** In production without `CORS_ORIGIN` set, the API accepts requests from any origin. This enables cross-site request forgery from malicious sites and removes Same-Origin protections.  
**Fix:** Change default to `false` (reject all non-configured origins) or `'http://localhost:3000'`:
```js
origin: process.env.CORS_ORIGIN || false,
```

---

### 3.4 Agency User Can Self-Escalate Application Status
**File:** `red-dog-radios-backend/src/modules/applications/application.controller.js`  
**Why it's wrong:** `PUT /api/applications/:id/status` accepts any status value from the request body with no role check. An agency user can set their own application to `approved` or `awarded`.  
**Fix:** Add status allowlist by role (see section 2.2).

---

### 3.5 `Opportunities.tsx` Does Not Use `isError` State
**File:** `red-dog-radios-frontend/src/views/Opportunities.tsx`  
**Why it's wrong:** The largest view in the app (597 lines) queries `/api/opportunities` but has no error rendering path. If the API fails, the user sees a blank list with no indication of what went wrong.  
**Fix:** Add error state rendering after `isLoading` check:
```tsx
if (isError) return <p className="text-red-600 p-4">Failed to load opportunities. Please refresh.</p>;
```

---

### 3.6 `next.config.ts` Has `eslint: { ignoreDuringBuilds: true }`
**File:** `red-dog-radios-frontend/next.config.ts`  
**Why it's wrong:** ESLint errors are silently ignored during production builds. Real lint errors (unused variables, incorrect hook usage) will never block a deploy.  
**Fix:** Remove this config option or set to `false` once lint issues are resolved.

---

### 3.7 Admin Settings Page Has No Password Change Loading State
**File:** `red-dog-radios-frontend/src/app/admin/(panel)/settings/page.tsx`  
**Why it's wrong:** The admin settings password change form's submit button does not use `isPending` from the mutation to disable itself during submission, creating a double-submit risk.  
**Fix:** Apply `disabled={mutation.isPending}` to the Submit button.

---

### 3.8 `FunderDetail.tsx` — Apply Button Does Not Check Queue Data Load State
**File:** `red-dog-radios-frontend/src/views/FunderDetail.tsx`  
**Why it's wrong:** The Apply button may briefly be enabled before the queue data loads, during which time `isLocked` is `undefined`. If the user clicks before load completes, the lock check `if (funder.isLocked)` may not fire.  
**Fix:** Disable the Apply button while queue data is loading:
```tsx
disabled={applyMutation.isPending || queueLoading}
```

---

### 3.9 `outbox.service.js` — Orphaned Retry Loop Risk
**File:** `red-dog-radios-backend/src/modules/outbox/outbox.service.js`  
**Why it's wrong:** There is no maximum retry cap check before attempting a send. If SMTP is misconfigured, the same emails retry on every cron tick indefinitely.  
**Fix:** Add `retryCount < 5` filter to the `processQueue` query:
```js
Outbox.find({ status: 'pending', scheduledFor: { $lte: now }, retryCount: { $lt: 5 } })
```

---

### 3.10 Onboarding Payload Key Mismatch Risk
**File:** `red-dog-radios-frontend/src/views/onboarding/Step5.tsx`, line 88  
**Detail:** Step5.tsx sends `specificRequest: step4?.requestDescription` — the payload key `specificRequest` is correct and matches `onboarding.service.js:16`. However, this implicit mapping (different name in sessionStorage vs API) is a maintenance hazard.  
**Fix (low priority):** Add a comment above the payload assembly noting the key difference to prevent future regressions.

---

## 4. WHAT SHOULD BE IMPROVED 💡

### 4.1 `Opportunities.tsx` Is 597 Lines — Extract Filter Logic
**File:** `red-dog-radios-frontend/src/views/Opportunities.tsx`  
**Why it matters:** Hardest file to maintain and test. Filter/sort state mixed with rendering.  
**Suggested improvement:** Extract filter state + derived list into `useOpportunitiesFilter()` custom hook (~80 lines → cleaner component).

---

### 4.2 Missing DB Indexes for Production Scale
**Files:** Multiple schema files in `red-dog-radios-backend/src/modules/`  
**Why it matters:** Queries will degrade significantly with >10K documents.

| Schema | Missing Index | Query Impact |
|--------|---------------|-------------|
| `application.schema.js` | `organization`, `funder`, `status` | Application list, status filtering |
| `opportunity.schema.js` | `status`, `deadline`, `funder` | Opportunity browsing and sorting |
| `followup.schema.js` | `application`, `user`, `status`, `scheduledFor` | Cron backfill query |
| `outbox.schema.js` | `status` | processQueue cron |
| `funder.schema.js` | `status`, `isLocked` | Funder lock queries |
| `win.schema.js` | `agencyType`, `funderName` | Pattern aggregation |
| `user.schema.js` | `organizationId` | User-org lookups |

**Suggested improvement:** Add compound indexes:
```js
// application.schema.js
ApplicationSchema.index({ organization: 1, status: 1 });
ApplicationSchema.index({ funder: 1 });

// followup.schema.js
FollowUpSchema.index({ application: 1, status: 1 });
FollowUpSchema.index({ scheduledFor: 1, status: 1 });

// outbox.schema.js
OutboxSchema.index({ status: 1, scheduledFor: 1 });
```

---

### 4.3 `ApplicationBuilder.tsx` Is 479 Lines — Split Into Sections
**File:** `red-dog-radios-frontend/src/views/ApplicationBuilder.tsx`  
**Why it matters:** Mixes AI generation, form editing, section regeneration, and export logic.  
**Suggested improvement:** Split into `ApplicationSectionEditor.tsx`, `ApplicationActions.tsx`, and a `useApplicationBuilder()` hook.

---

### 4.4 Status Badge Logic Duplicated Across 7+ Files
**Files:** `Matches.tsx`, `Applications.tsx`, `Wins.tsx`, `FollowUps.tsx`, `Tracker.tsx`, `Alerts.tsx`, admin pages  
**Why it matters:** When a new status is added, it must be updated in 7+ places. Already slightly inconsistent between views.  
**Suggested improvement:** Create `src/components/StatusBadge.tsx` (see section 2.7).

---

### 4.5 Token Stored in localStorage (XSS Risk)
**Files:** `src/lib/api.ts`, `src/lib/adminApi.ts`, `middleware.ts`  
**Why it matters:** Tokens in localStorage are accessible to any JavaScript on the page, making them vulnerable to XSS attacks.  
**Suggested improvement:** Switch to `httpOnly` cookies managed by the backend (requires backend change to set `Set-Cookie` on login and read from cookie on API calls). The middleware already reads from cookies — half the plumbing is in place.

---

### 4.6 No Request Deduplication on AI Endpoints
**File:** `red-dog-radios-backend/src/modules/applications/application.service.js`  
**Why it matters:** If a user double-clicks Generate, two parallel AI calls fire. Both will create applications and both will count against the funder's cap.  
**Suggested improvement:** Add idempotency key (e.g. `funderId + organizationId`) and check for in-progress generation before starting.

---

### 4.7 Pagination Not Implemented on Agency-Side Funder List
**File:** `red-dog-radios-frontend/src/views/Funders.tsx`  
**Why it matters:** `GET /api/funders` is called with `limit: 50` hardcoded. Once a customer has >50 funders in the system, the list silently truncates.  
**Suggested improvement:** Implement paginated loading or infinite scroll, respecting the `pagination` field returned by the API.

---

### 4.8 `Tracker.tsx` Has No Refresh Button
**File:** `red-dog-radios-frontend/src/views/Tracker.tsx`  
**Why it matters:** React Query has 30-second stale time. After submitting an application, the tracker won't reflect the new status until the cache expires or the user navigates away.  
**Suggested improvement:** Add a manual refetch button (same pattern as `Matches.tsx`).

---

### 4.9 Email Update in Settings Has No Verification
**File:** `red-dog-radios-backend/src/modules/settings/settings.service.js`, line 33  
**Why it matters:** A user can change their login email without confirming ownership of the new address. This enables account lockout if they typo their new email.  
**Suggested improvement:** Require email verification flow before updating the email field.

---

### 4.10 `cron.jobs.js` Has No Global Error Alert
**File:** `red-dog-radios-backend/src/utils/cron.jobs.js`  
**Why it matters:** Cron errors are logged but silently swallowed. If the nightly match refresh fails, no one is notified.  
**Suggested improvement:** Send a failure notification to the admin email when a cron job throws an error.

---

## 5. SECURITY ISSUES 🔒

### 5a. Authentication & Authorization

#### 🔴 CRITICAL: Match Approve/Reject Routes Not Admin-Gated
**File:** `red-dog-radios-backend/src/modules/matches/match.route.js`  
**Detail:** `PUT /api/matches/:id/approve` and `PUT /api/matches/:id/reject` use only `protect` middleware. Any authenticated agency user can approve/reject matches for any organization.  
**Fix:** Add `protectAdmin` to both routes.

#### 🔴 CRITICAL: Application Status Self-Escalation
**File:** `red-dog-radios-backend/src/modules/applications/application.controller.js`  
**Detail:** `PUT /api/applications/:id/status` accepts any status (including `approved`, `awarded`) from the request body without checking `req.user.role`. An agency user can set their own application to `awarded`, which also auto-creates a Win record.  
**Fix:** Allowlist status values by role.

#### 🟡 MEDIUM: `compute-all` Route Not Admin-Gated
**File:** `match.route.js`  
**Detail:** Any agency user can trigger full AI recomputation for all organizations.

#### 🟡 MEDIUM: Cross-Organization Data Access Risk in Applications
**File:** `application.controller.js`  
**Detail:** `assertAppInOrg` validates ownership at lines 9–14, but the function must be called on every route that accesses a specific application by ID. Verify all `GET /api/applications/:id`, `PUT /api/applications/:id`, and delete routes call this guard.

#### 🟢 LOW: Admin Endpoint Correctly Gated
All `/api/admin/*` routes use `protectAdmin`. Admin login bootstrap (`POST /api/admin/auth/login`) correctly has no auth requirement.

---

### 5b. Input Validation

#### 🟡 MEDIUM: No Backend Validation on Onboarding Payload
**File:** `red-dog-radios-backend/src/modules/onboarding/onboarding.service.js`  
**Detail:** The `complete` function accepts `organizationName`, `agencyTypes[]`, `programAreas[]` etc. from `req.body` without schema validation. A malicious payload with XSS strings in `missionStatement` could be stored and later rendered.  
**Fix:** Add Joi/Zod validation schema for the onboarding payload.

#### 🟡 MEDIUM: Application AI Generation Accepts Unvalidated Free-Text
**File:** `application.service.js`, `buildAIContent()` function  
**Detail:** `specificRequest` and `missionStatement` go directly into the AI prompt without sanitization. While not a direct injection risk (OpenAI handles it), extremely long inputs could cause token limit errors that crash the generation.  
**Fix:** Truncate `specificRequest` and `missionStatement` to reasonable limits (e.g. 2000 chars) before prompt assembly.

#### 🟡 MEDIUM: Settings Update Accepts Arbitrary Keys
**File:** `settings.service.js`  
**Detail:** `updateSettings` spreads `req.body` into the update. While Mongoose schema validation provides a layer of protection, a carefully crafted body could update unexpected fields.  
**Fix:** Use an explicit allowlist of fields in the settings update.

#### 🟢 LOW: Pagination `limit` and `page` Not Validated
**Files:** Multiple controllers  
**Detail:** `parseInt(req.query.limit, 10)` is used without capping. A request with `limit=999999` could return the entire collection.  
**Fix:** Add a cap: `Math.min(parseInt(req.query.limit || '20'), 100)`.

---

### 5c. Data Exposure

#### 🟡 MEDIUM: `GET /api/admin/agencies/:id` May Return Full User Objects
**File:** Admin agency controller  
**Detail:** When populating agency users for display, if the User model is populated without explicitly excluding `password`, sensitive fields could leak. Confirmed that `password` is `select: false` in user schema, but verify all `.populate('users')` calls explicitly project out sensitive fields.

#### 🟡 MEDIUM: Win Records Expose Full Application Content
**File:** `win.service.js`  
**Detail:** `GET /api/wins/patterns` returns aggregated win data including `problemStatement`, `communityImpact`, `proposedSolution`. These are the full AI-written sections. If win data is ever shared across organizations (future feature), this would leak proprietary application content.  
**Impact:** Low now (single-tenant), but worth noting for multi-tenant future.

#### 🟢 LOW: Settings API Returns `apiKey` Field
**File:** `user.schema.js`, settings controller  
**Detail:** The user settings include `settings.apiKey`. Confirm this field is not returned in `GET /api/settings` responses.

---

### 5d. Rate Limiting & Abuse

#### 🔴 CRITICAL: No Rate Limit on OTP Verification
**File:** `auth.route.js`, `auth.service.js`  
**Detail:** `POST /api/auth/verify-otp` has no per-IP or per-email rate limit. A 6-digit OTP has 1,000,000 combinations. At 500 req/15min (current global limit), an attacker can try ~33K OTPs per hour. With a 15-minute OTP window, an attacker gets ~8K attempts — enough to crack a 4-digit OTP and plausible for targeted attacks on a 6-digit OTP.  
**Fix:** Apply a strict rate limiter (5 attempts per 15 minutes) specifically to `/api/auth/verify-otp`.

#### 🔴 HIGH: No Rate Limit on AI Generation Endpoints
**File:** `application.route.js`, `ai.route.js`  
**Detail:** The global rate limit (500 req/15min) is far too permissive for AI endpoints that each cost ~$0.01–$0.05 in OpenAI tokens. A single user could generate 500 applications in 15 minutes, costing ~$25 per burst.  
**Fix:** Add a strict per-user rate limiter on all AI endpoints: `5 per hour`.

#### 🟡 MEDIUM: No Rate Limit on `forgot-password`
**File:** `auth.route.js`  
**Detail:** An attacker can enumerate valid email addresses by calling `forgot-password` repeatedly and observing response differences. (The current implementation returns a generic message, which is good — but volume still risks SMTP abuse.)  
**Fix:** Limit to 3 requests per 15 minutes per IP.

---

### 5e. Environment & Secrets

#### 🟢 PASS: No Hardcoded Secrets
All API keys, JWT secrets, SMTP credentials, and DB URIs are loaded from `process.env`. OpenAI client only instantiates if `OPENAI_API_KEY` is present.

#### 🟢 PASS: .env.example Exists in Backend
`red-dog-radios-backend/.env.example` documents all required variables: `JWT_SECRET`, `MONGO_URI`, `CORS_ORIGIN`, `SMTP_*`, `OPENAI_API_KEY`.

#### 🟡 MEDIUM: Frontend Has No .env.example
**File:** `red-dog-radios-frontend/` (root)  
**Detail:** No `.env.example` exists for the frontend. New developers won't know what `NEXT_PUBLIC_*` vars are required.

---

### 5f. Other Security Concerns

#### 🟡 MEDIUM: CORS Defaults to Wildcard
**File:** `red-dog-radios-backend/src/app.js`, line 38  
**Code:** `origin: process.env.CORS_ORIGIN || '*'`  
**Detail:** In any deployment where `CORS_ORIGIN` is not set, all origins are allowed. This includes development environments that may be inadvertently exposed.  
**Fix:** Default to `false`.

#### 🟢 PASS: `helmet()` Enabled
Security headers (X-Frame-Options, Content-Security-Policy, etc.) are set via `helmet()` at `app.js:36`.

#### 🟢 PASS: No `eval()` or `Function()` Usage
Searched entire backend — no dynamic code execution patterns found.

#### 🟢 PASS: No NoSQL Injection Patterns
All Mongoose queries use parameterized field names. No `req.body` spread directly into `.find()` query objects.

#### 🟢 PASS: No Sensitive Data in Logs
`logger.info` calls log IDs and counts, not passwords or tokens.

#### 🟡 LOW: JWT Secret Strength Not Enforced at Startup
**File:** `src/app.js` or `server.js`  
**Detail:** No startup check validates that `JWT_SECRET` is at least 32 characters. A weak secret (e.g. `"secret"`) would be silently accepted.  
**Fix:** Add startup validation:
```js
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters');
}
```

---

## 6. DATABASE HEALTH 🗄️

### 6.1 Missing Indexes (Performance Risk at Scale)

| Schema File | Field(s) | Query That Needs It | Priority |
|-------------|---------|---------------------|----------|
| `application.schema.js` | `organization`, `status` | `Application.find({ organization })` in every org-scoped query | 🔴 HIGH |
| `application.schema.js` | `funder` | Win auto-creation, funder queue queries | 🔴 HIGH |
| `followup.schema.js` | `scheduledFor`, `status` | Cron backfill daily query | 🔴 HIGH |
| `outbox.schema.js` | `status`, `scheduledFor` | `processQueue` every hour | 🔴 HIGH |
| `opportunity.schema.js` | `status` | All opportunity browse queries | 🟡 MEDIUM |
| `opportunity.schema.js` | `deadline` | Deadline alert cron | 🟡 MEDIUM |
| `funder.schema.js` | `status`, `isLocked` | Funder list with open-only filter | 🟡 MEDIUM |
| `win.schema.js` | `agencyType`, `funderName` | `getPatterns()` aggregation | 🟡 MEDIUM |
| `user.schema.js` | `organizationId` | Auth middleware user lookups | 🟡 MEDIUM |
| `match.schema.js` | ✅ Has compound `{organization, opportunity}` unique index | — | DONE |

**Recommended additions:**
```js
// application.schema.js
ApplicationSchema.index({ organization: 1, status: 1 });
ApplicationSchema.index({ funder: 1 });
ApplicationSchema.index({ organization: 1, createdAt: -1 });

// followup.schema.js
FollowUpSchema.index({ application: 1 });
FollowUpSchema.index({ scheduledFor: 1, status: 1 });

// outbox.schema.js
OutboxSchema.index({ status: 1, scheduledFor: 1 });

// opportunity.schema.js
OpportunitySchema.index({ status: 1, deadline: 1 });

// funder.schema.js
FunderSchema.index({ status: 1, isLocked: 1 });
```

---

### 6.2 Unused or Redundant Schema Fields

| Schema | Field | Evidence of Non-Use |
|--------|-------|---------------------|
| `organization.schema.js` | `website` and `websiteUrl` | Two fields for the same data; Step1 onboarding saves `websiteUrl`; check which is actually read |
| `organization.schema.js` | `populationServed`, `coverageArea`, `numberOfStaff`, `currentEquipment` | No frontend form captures these; not used in match scoring |
| `application.schema.js` | `alignedVersion` | Populated by `/align` endpoint but no UI reads this field |
| `user.schema.js` | `settings.apiKey` | No frontend exposes this; not used in any service |

---

### 6.3 Missing Cascading Deletes

| Scenario | Orphaned Document | Risk |
|----------|------------------|------|
| Organization deleted | Applications, Matches, FollowUps, Wins remain | Medium — orphaned AI data, false analytics |
| Funder deleted | Applications referencing that funder remain | Medium — broken detail views |
| Application deleted | FollowUps referencing that application remain | Low — cron picks them up but they can't be sent |
| User deleted | Organization may become ownerless | Low — `createdBy` ref broken |

**Suggested fix:** Add `pre('deleteOne')` hooks or use Mongoose middleware to cascade deletes.

---

### 6.4 Ref Populations That May Not Be Populated

| File | Query | Risk |
|------|-------|------|
| `match.service.js` | `organization` populated to get `agencyTypes`, `programAreas` — if populate fails, scoring returns 0 | 🟡 MEDIUM |
| `win.service.js` | `applicationId` ref — not populated in `getPatterns()`, only ID stored | 🟢 LOW (by design) |
| `followup.controller.js` | `application` populated to get `funder` and `opportunity` for email — if application deleted, populate returns null | 🟡 MEDIUM |

---

## 7. API CONSISTENCY 🔌

### 7.1 Response Shape Inconsistencies

The standard pattern is `{ success, message, data, pagination }`.

| Endpoint | Actual Shape | Issue |
|----------|-------------|-------|
| `GET /api/wins/patterns` | Returns `{ success, data: { topFunders, topAgencyTypes, correlatedSections } }` | ✅ Consistent |
| `POST /api/onboarding/complete` | Returns `{ success, message, data: { user } }` | ✅ Consistent |
| `GET /api/admin/dashboard` | Returns flat object without `data` wrapper in some fields | 🟡 Verify wrapper |
| `PUT /api/matches/:id/approve` | Returns match object — confirm it uses `apiResponse` wrapper | 🟡 Verify wrapper |
| Admin endpoints via `adminApi.ts` | All accessed as `res.data.data` | ✅ Consistent |

### 7.2 URL Inconsistencies

| Frontend Call | Backend Route | Status |
|--------------|---------------|--------|
| `api.get('/funders')` | `GET /api/funders` | ✅ |
| `api.get('/matches')` | `GET /api/matches` | ✅ |
| `adminApi.get('admin/matches')` | `GET /api/admin/matches` | ✅ (trailing slash on baseURL handles it) |
| `adminApi.put('admin/funders/:id/unlock')` | `PUT /api/admin/funders/:id/unlock` | ✅ |
| `api.get('/tracker/stats')` | Verify `/api/tracker/stats` exists | 🟡 Verify |
| `api.post('/settings/generate-digest')` | Verify this route exists | 🟡 Verify |

### 7.3 Admin API Base URL Has Trailing Slash
**File:** `red-dog-radios-frontend/src/lib/adminApi.ts`  
**Detail:** `baseURL: '/api/'` — all admin calls omit leading slash (e.g. `adminApi.get('admin/users')`). This works due to Axios URL joining, but is inconsistent with the agency API client's `baseURL: '/api'` with leading-slash paths. Not a bug, but a maintenance hazard.

---

## 8. FRONTEND CODE HEALTH 🖥️

### 8.1 Component Size Violations (>300 lines)

| File | Lines | Recommended Action |
|------|-------|-------------------|
| `src/views/Opportunities.tsx` | 597 | Extract `useOpportunitiesFilter` hook; split `OpportunityCard` component |
| `src/views/ApplicationBuilder.tsx` | 479 | Split into `ApplicationSectionList`, `ApplicationActions`, `ApplicationHeader` |
| `src/views/Matches.tsx` | 424 | Extract `MatchPreviewModal` to separate file |
| `src/views/Applications.tsx` | 388 | Extract `ApplicationsTable` component |
| `src/views/FunderDetail.tsx` | 383 | Extract `FunderQueueCard`, `FunderApplySection` |
| `src/views/Wins.tsx` | 382 | Extract `WinsInsightCards` component |

---

### 8.2 Hardcoded Strings That Should Be Constants

| File | Hardcoded Value | Should Be |
|------|----------------|-----------|
| Multiple files | `'rdg_onboarding_step1'` through `step4` | `STORAGE_KEYS.ONBOARDING_STEP_1` in constants file |
| `api.ts` | `'rdg_token'` | `STORAGE_KEYS.AUTH_TOKEN` |
| `adminApi.ts` | `'rdg_admin_token'` | `STORAGE_KEYS.ADMIN_TOKEN` |
| `Step5.tsx` | `'/dashboard'` | `ROUTES.DASHBOARD` |
| Multiple cron files | `'0 2 * * *'` cron expressions | Named constants with comments |

---

### 8.3 Missing Error States

| Component | Issue |
|-----------|-------|
| `src/views/Opportunities.tsx` | No error state rendered when `isError` is true |
| `src/views/Tracker.tsx` | Error state handling unclear — verify `isError` is handled |
| `src/views/Alerts.tsx` | Verify `isError` renders user-facing message |

---

### 8.4 `useEffect` Dependency Warnings

| Component | Issue |
|-----------|-------|
| `src/views/ApplicationBuilder.tsx` | Verify `useEffect` for auto-save or section initialization has complete dependency array |
| `src/views/AshleenChat.tsx` | Verify chat scroll `useEffect` has `messages` in dep array |

---

### 8.5 Inconsistent Loading States

| Component | Issue |
|-----------|-------|
| Admin pages using `Skeleton` | Some admin pages use `<Skeleton>` for loading, others use plain `"Loading…"` text — should be consistent |
| Agency pages | All use `"Loading…"` text — consider using `Skeleton` for better perceived performance |

---

### 8.6 Pagination Hardcoded at `limit: 100` on Matches
**File:** `src/views/Matches.tsx`, line 196  
**Code:** `api.get('/matches', { params: { limit: 100 } })`  
**Issue:** If the system has more than 100 matches for an organization (large customer), results silently truncate. No "load more" or pagination exists.  
**Fix:** Implement proper pagination or infinite scroll.

---

### 8.7 console.log Usage
No `console.log()` statements found in production frontend code. ✅

---

### 8.8 Missing `type="button"` on Some Buttons
**Issue:** Any `<button>` inside a `<form>` without `type="button"` defaults to `type="submit"`, which submits the form. Audit shows most buttons correctly use `type="button"`, but verify all action buttons within forms (e.g. in `ApplicationBuilder.tsx` regenerate section buttons).

---

## 9. OVERALL RISK SUMMARY 🚨

### Risk Table

| Area | Risk Level | Top Issue |
|------|-----------|-----------|
| Authentication | 🟡 MEDIUM | No rate limit on OTP brute-force |
| Authorization | 🔴 HIGH | Agency users can approve/reject matches; can self-escalate application status to 'awarded' |
| Input Validation | 🟡 MEDIUM | No backend validation on onboarding payload; AI prompt accepts unvalidated free-text |
| Data Exposure | 🟢 LOW | Passwords correctly hidden; tokens in localStorage (XSS risk accepted) |
| AI Cost Control | 🔴 HIGH | No per-user rate limit on AI generation — spam risk |
| Frontend Quality | 🟡 MEDIUM | 597-line component; duplicated status badge logic |
| Backend Quality | 🟡 MEDIUM | Missing DB indexes; orphan cleanup absent; CORS defaults to wildcard |
| Database | 🟡 MEDIUM | Critical indexes missing on Application, FollowUp, Outbox collections |
| Overall | 🟡 MEDIUM-HIGH | Two critical authorization bugs + AI cost exposure need immediate attention |

---

### Prioritized Fix List

#### 🔴 CRITICAL — Fix Immediately

| # | What to Fix | File | Effort |
|---|------------|------|--------|
| C1 | Add `protectAdmin` to `PUT /api/matches/:id/approve` and `/reject` | `match.route.js` | SMALL |
| C2 | Add role-based status allowlist to `PUT /api/applications/:id/status` | `application.controller.js` | SMALL |
| C3 | Add rate limiter (5 req/15min) to `/auth/verify-otp` and `/auth/forgot-password` | `auth.route.js`, `app.js` | SMALL |
| C4 | Add `protectAdmin` to `POST /api/matches/compute-all` | `match.route.js` | SMALL |
| C5 | Add per-user rate limit (5/hr) to all AI generation endpoints | `application.route.js`, `ai.route.js` | SMALL |

---

#### 🟠 HIGH — Fix This Sprint

| # | What to Fix | File | Effort |
|---|------------|------|--------|
| H1 | Add indexes to Application schema: `{organization, status}`, `{funder}` | `application.schema.js` | SMALL |
| H2 | Add indexes to FollowUp schema: `{scheduledFor, status}`, `{application}` | `followup.schema.js` | SMALL |
| H3 | Add indexes to Outbox schema: `{status, scheduledFor}` | `outbox.schema.js` | SMALL |
| H4 | Change CORS default from `'*'` to `false` | `app.js` | SMALL |
| H5 | Add max retry cap to `outbox.processQueue` (`retryCount < 5`) | `outbox.service.js` | SMALL |
| H6 | Add error state to `Opportunities.tsx` | `Opportunities.tsx` | SMALL |
| H7 | Add backend validation (Joi/Zod) to onboarding payload | `onboarding.service.js` | MEDIUM |
| H8 | Validate and cap pagination `limit` param in all controllers | Multiple controllers | SMALL |

---

#### 🟡 MEDIUM — Next Sprint

| # | What to Fix | File | Effort |
|---|------------|------|--------|
| M1 | Add indexes to Opportunity, Funder, Win, User schemas | Multiple schema files | SMALL |
| M2 | Extract `StatusBadge.tsx` shared component | New: `src/components/StatusBadge.tsx` | MEDIUM |
| M3 | Refactor `Opportunities.tsx` (597 lines) | `Opportunities.tsx` | LARGE |
| M4 | Split `ApplicationBuilder.tsx` into sub-components | `ApplicationBuilder.tsx` | LARGE |
| M5 | Add JWT_SECRET length validation at startup | `app.js` or `server.js` | SMALL |
| M6 | Add cascading delete hooks for Organization/Funder | Schema files | MEDIUM |
| M7 | Truncate AI prompt inputs to prevent token overflow | `application.service.js` | SMALL |
| M8 | Fix `FunderDetail.tsx` apply button disabled during queue load | `FunderDetail.tsx` | SMALL |
| M9 | Add explicit settings field allowlist in settings service | `settings.service.js` | SMALL |
| M10 | Disable apply button during queueLoading in FunderDetail | `FunderDetail.tsx` | SMALL |
| M11 | Add cron error notification to admin email | `cron.jobs.js` | MEDIUM |

---

#### 🟢 LOW — Backlog

| # | What to Fix | File | Effort |
|---|------------|------|--------|
| L1 | Create `red-dog-radios-frontend/.env.example` | New file | SMALL |
| L2 | Move session/localStorage key strings to constants file | New: `src/lib/constants.ts` | SMALL |
| L3 | Migrate tokens from localStorage to httpOnly cookies | `api.ts`, `adminApi.ts`, backend auth | LARGE |
| L4 | Extract shared `Pagination.tsx` component | New: `src/components/Pagination.tsx` | MEDIUM |
| L5 | Extract shared `EmptyState.tsx` component | New: `src/components/EmptyState.tsx` | SMALL |
| L6 | Add email verification flow for email change in settings | `settings.service.js`, new frontend flow | LARGE |
| L7 | Add `organization.website` / `websiteUrl` field deduplication | `organization.schema.js` | SMALL |
| L8 | Remove `eslint: { ignoreDuringBuilds: true }` from next.config | `next.config.ts` | SMALL |
| L9 | Add idempotency key to AI generation to prevent double-submit | `application.service.js` + frontend | MEDIUM |
| L10 | Comment onboarding payload key mismatch (`specificRequest`) | `Step5.tsx` line 88 | SMALL |
| L11 | Implement pagination on agency funder list (currently `limit: 50` hardcoded) | `Funders.tsx` | MEDIUM |
| L12 | Add Tracker refresh button | `Tracker.tsx` | SMALL |

---

*End of FULL_AUDIT_REPORT.md*
