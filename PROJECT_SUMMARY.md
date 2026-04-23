# Project Summary — Red Dog Radios (Grant Intelligence Platform)

This document is generated from the current backend and frontend source in this workspace. It is intentionally **evidence-based**: when something cannot be confirmed directly from code/config present here, it is called out as unclear.

---

## 1. Project Overview

### What the application does (and who it serves)

Red Dog Radios is a **grant intelligence + workflow platform** for **public safety agencies** (police, fire, EMS, 911/dispatch, etc.). Agencies create a profile, receive scored “matches” against grant opportunities/funders, generate AI-assisted application drafts and outreach emails, track submission status, and receive alerts/digests.

The platform also includes a **staff/admin console** for Red Dog staff to manage opportunities/funders, review and update agency applications, inspect match scoring, and view an activity/audit log.

### User roles

- **Agency (role: `agency`)**
  - Register + verify email (OTP), login, reset password (OTP + reset token).
  - Complete onboarding (creates/updates the agency profile and triggers match computation).
  - Browse matches/opportunities/funders, generate AI application drafts, export application, submit, track progress.
  - Receive deadline/high-fit alerts and weekly digest emails (via outbox + cron jobs).
  - Generate outreach email drafts and (if funder has email) send outreach.
  - View and update settings (user settings + selected org profile fields) and deactivate their account.

- **Staff/Admin (role: `admin`)**
  - Login via `/admin/login` → backend `/api/admin/auth/login`.
  - View staff dashboard stats and recent activity.
  - Manage opportunities and funders; control application caps/locking.
  - Review applications (including staff “create for agency” with AI generation), regenerate AI content, update status (award/reject/etc.), and add notes.
  - View match lists/details and trigger “recompute all matches”.
  - View and filter activity log entries.
  - View users and change user roles.

---

## 2. Tech Stack

### Backend (Node API)

- **Runtime**: Node.js (CommonJS)
- **Framework**: Express (`express@^4.19.2`)
- **Database**: MongoDB via Mongoose (`mongoose@^8.3.4`)
- **Auth**: JWT (`jsonwebtoken@^9.0.2`) + password hashing (`bcryptjs@^2.4.3`)
- **Scheduling / cron**: `node-cron@^3.0.3`
- **Email**: `nodemailer@^6.10.1` (SMTP). In dev, optional redirect support via env.
  - Note: backend also depends on `resend@^6.11.0`, but the code path used for email sending is Nodemailer (`src/config/resend.config.js` exports `sendEmail` implemented via nodemailer).
- **AI**: OpenAI SDK (`openai@^4.40.0`) via `src/config/openai.config.js`
  - AI is **stubbed** when `OPENAI_API_KEY` is missing (fallback text/JSON used in services).
- **Security / Ops**:
  - `helmet@^7.1.0`
  - `cors@^2.8.5`
  - `express-rate-limit@^7.2.0`
  - `morgan@^1.10.0`
- **Uploads**: `multer@^1.4.5-lts.1` + `cloudinary@^2.3.0` (config exists; upload endpoints are not clearly wired from routes in the code read)
- **Docs**: Swagger (`swagger-jsdoc@^6.2.8`, `swagger-ui-express@^5.0.0`) served at `/api-docs`
- **Pagination**: `mongoose-paginate-v2@^1.8.3`

### Frontend (Next.js)

- **Framework**: Next.js App Router (`next@15.2.6`) + React (`react@^18.3.1`)
- **UI primitives**: Radix UI (multiple `@radix-ui/*` packages)
- **Styling**: Tailwind CSS (`tailwindcss@^3.4.17`) + `tailwindcss-animate@^1.0.7`
- **State / data fetching**: TanStack React Query (`@tanstack/react-query@^5.60.5`)
- **Forms + validation**: React Hook Form (`react-hook-form@^7.55.0`) + Zod (`zod@^3.24.2`) + RHF resolvers
- **HTTP client**: Axios (`axios@^1.7.2`)
- **Animation**: `framer-motion@^11.13.1`
- **Icons**: `lucide-react@^0.453.0`, `react-icons@^5.4.0`
- **Charts**: `recharts@^2.15.2`

---

## 3. Folder Structure

### Backend (`red-dog-radios-backend/`)

```
red-dog-radios-backend/
  package.json                     # Backend dependencies + scripts (dev/start/seed)
  .env.example                     # Example env vars (non-secret placeholders)
  .env                             # Local env (contains secrets; DO NOT COMMIT)
  src/
    server.js                      # Process startup, required env checks, Mongo connect, start cron
    app.js                         # Express app, middleware, Swagger, route mounting
    config/
      openai.config.js             # OpenAI client (null when key missing)
      email.config.js              # Email templates and helpers
      resend.config.js             # Nodemailer transport + sendEmail wrapper (despite name)
      cloudinary.config.js         # Cloudinary config (present; usage not confirmed from routes)
    middlewares/
      auth.middleware.js           # JWT protect + role guards
      adminAuth.middleware.js      # Staff-only guard
      error.middleware.js          # Error classes + handlers
    modules/                       # Each module has route/controller/service and optional schema
      auth/                        # Agency auth + OTP flows; User schema
      admin/                       # Staff portal endpoints (separate from agency endpoints)
      onboarding/                  # Onboarding completion + match compute trigger
      organizations/               # Agency profile model (“Organization”) CRUD for agency
      opportunities/               # Opportunity listing/detail (agency) + admin management via admin module
      matches/                     # Match list/detail + compute endpoints + scoring engine
      applications/                # Application CRUD + AI generation + status workflows
      funders/                     # Funders list/detail + scoring + queue position
      alerts/                      # Alert list + mark read + cron-created alerts
      digests/                     # Weekly digest generation + send (queues outbox)
      outbox/                      # Email outbox queue (cron processes hourly)
      followups/                   # Follow-up tasks + reminders (Day 7/Day 14)
      outreach/                    # Outreach email drafts + send
      tracker/                     # Submission tracker + stats
      wins/                        # Win database + insights/patterns
      ai/                          # Generic AI utilities (summary/email/app/match) separate from application AI
      activityLogs/                # Staff-only audit log (written by admin actions)
      ashleen/                     # “Ashleen” chat assistant endpoint
      agencies/                    # Thin legacy `Agency` schema + endpoints (onboarding sync writes here)
    utils/
      cron.jobs.js                 # Cron schedules (match refresh, alerts, followup backfill, outbox)
      resolveAgencyOrg.js          # Maps agency user → organization id
      seed.js                      # Seeds demo data, including admin account
      parsePagination.js           # Standard page/limit parsing
      apiResponse.js               # success/created/paginate helpers
      asyncHandler.js              # Async wrapper for Express handlers
      logger.js                    # Logger wrapper
```

### Frontend (`red-dog-radios-frontend/`)

```
red-dog-radios-frontend/
  package.json                     # Frontend dependencies + scripts (dev/build/start/lint)
  next.config.ts                   # /api rewrites to backend origin
  src/
    middleware.ts                  # Route protection and role gating (cookies)
    app/                           # Next.js App Router routes
      layout.tsx                   # Root layout + Providers + ConditionalAppShell
      page.tsx                     # Redirects / → /login
      not-found.tsx                # Uses view-level not-found
      admin/                       # Staff routes
        login/page.tsx             # Staff sign-in UI
        page.tsx                   # Redirects /admin → /admin/dashboard
        (panel)/                   # Staff shell layout + panel pages
          layout.tsx               # Wraps pages in AdminShell
          dashboard/page.tsx       # Staff dashboard
          activity/...             # Staff activity log list/detail
          agencies/...             # Staff agency list/detail
          opportunities/...        # Staff opportunity list/detail/edit
          funders/...              # Staff funder list/detail/edit
          matches/...              # Staff match list/detail + recompute all
          applications/...         # Staff application list/detail + actions
          users/...                # Staff user list/detail + role changes
          settings/page.tsx        # Staff settings view
      login/page.tsx               # Agency login
      signup/page.tsx              # Agency signup
      forgot-password/page.tsx     # Agency reset-request
      otp-verification/page.tsx    # OTP verification view
      create-password/page.tsx     # Reset password view
      onboarding/...               # Onboarding flow (step1..4 + results; step5 redirects)
      dashboard/page.tsx           # Agency dashboard
      opportunities/page.tsx       # Agency opportunities view
      funders/...                  # Agency funders list + detail
      applications/...             # Agency applications list + builder
      weekly-summary/page.tsx      # Weekly summary view
      settings/...                 # Agency settings pages
      outbox/page.tsx              # Redirects to /dashboard (no agency UI)
      organizations/page.tsx       # Redirects to /settings (no separate org route)
    lib/
      api.ts                       # Axios instance for agency API + auth interceptor
      adminApi.ts                  # Axios instance for staff API + auth interceptor
      AgencyAuthContext.tsx        # Agency auth state; localStorage + cookie sync
      AdminAuthContext.tsx         # Admin auth state; localStorage + cookie sync
      validation-schemas.ts        # Zod schemas (onboarding + forms)
      constants.ts                 # Token keys + onboarding storage keys
      useAuthGateRedirects.ts      # Login-page redirect logic (used by admin login)
      authErrors.ts                # Error message normalization
      adminConstants.ts            # Admin tag/category constants
    views/                         # Route “pages” implemented as view components
      (agency views)               # Dashboard, Applications, Funders, etc.
      admin/AdminSettings.tsx      # Staff settings view
      onboarding/*                 # Onboarding step components
    components/                    # App shell + reusable UI
      AppShell.tsx, AppShellLayout.tsx, ConditionalAppShell.tsx
      admin/AdminShell.tsx, AdminBackLink.tsx, AdminTableViewLink.tsx, TagSelect.tsx
      ui/*                         # Radix-based UI components (shadcn-style)
    hooks/                         # UI hooks (toast, responsive)
    types/                         # TS declarations
```

---

## 4. Architecture & Data Flow

### Frontend → Backend communication

- **Next.js rewrite**: `next.config.ts` rewrites `source: "/api/:path*"` to `${API_ORIGIN}/api/:path*`.
  - `API_ORIGIN` resolves from `process.env.API_ORIGIN` or `process.env.NEXT_PUBLIC_API_ORIGIN` (fallback `http://localhost:4000`).
- **HTTP client**:
  - Agency: `src/lib/api.ts` uses `baseURL: "/api"` and attaches `Authorization: Bearer <rdg_token>` from `localStorage`.
  - Admin: `src/lib/adminApi.ts` uses `baseURL: "/api/"` and attaches `Authorization: Bearer <rdg_admin_token>` from `localStorage`.
- **401 handling**:
  - For non-auth endpoints, 401 triggers clearing localStorage + cookies and redirects to `/login` (agency) or `/admin/login` (admin).

### Auth storage (cookies + localStorage)

Frontend stores tokens in both:

- `localStorage`: `rdg_token` (agency), `rdg_admin_token` (admin)
- `document.cookie`: same token keys, plus `rdg_onboarding` (0/1)

Cookies are used by `src/middleware.ts` for **server-side route gating**; localStorage is used by Axios interceptors to send the Bearer token.

### End-to-end domain flow (typical)

1. **Agency sign up** → `POST /api/auth/register` creates `User(role=agency, isVerified=false)` and emails OTP.
2. **Verify email** → `POST /api/auth/verify-email` marks `isVerified=true` and returns a JWT.
3. **Login** → `POST /api/auth/login` returns JWT; frontend stores token and sets `rdg_onboarding` cookie based on `user.onboardingCompleted`.
4. **Onboarding**:
   - Frontend steps store interim state in `sessionStorage` (`rdg_onboarding_step1..4`).
   - Final submit calls `POST /api/onboarding/complete` with merged payload.
   - Backend creates/updates `Organization` (agency profile), sets `User.onboardingCompleted=true`, links `User.organizationId`, attempts welcome email, and triggers match computation.
5. **Matches computed** → `matches` are generated for the organization across open/closing opportunities; top matches returned to onboarding results.
6. **Agency workflow**:
   - Browse matches (via `/api/matches`) and funders (via `/api/funders` which includes computed “funder fit” scoring).
   - Generate application draft with AI (`POST /api/applications/generate`) and submit (`PUT /api/applications/:id/submit`).
7. **Follow-ups + emails**:
   - When an application becomes submitted/in_review, Day 7 and Day 14 follow-ups are created and reminder emails are queued in outbox.
   - Cron processes outbox hourly.
8. **Staff review**:
   - Staff updates application status in admin portal (`PUT /api/admin/applications/:id/status`), which can create alerts and trigger status emails.

---

## 5. Authentication & Authorization

### Agency registration + verification + login

- **Register**: `POST /api/auth/register`
  - Creates user as `role=agency`, `isVerified=false`
  - Generates a 6-digit OTP, stores hashed OTP + expiry, emails OTP (best-effort)
- **Verify signup OTP**: `POST /api/auth/verify-email`
  - Validates OTP, sets `isVerified=true`, returns JWT + user payload
- **Resend verification OTP**: `POST /api/auth/resend-verification`
- **Login**: `POST /api/auth/login` (rate-limited)
  - Blocks admin users from using agency login and requires `isVerified=true`
  - Returns `{ user, token }`

### Forgot password + reset

- **Request reset**: `POST /api/auth/forgot-password`
  - Generates OTP; stores hashed reset OTP + expiry
- **Verify reset OTP**: `POST /api/auth/verify-otp`
  - Validates OTP and returns a `resetToken` (stored hashed in DB)
- **Reset password**: `POST /api/auth/reset-password`
  - Validates reset token and expiry; writes a newly hashed password

### Staff/admin login

- **Admin login**: `POST /api/admin/auth/login`
  - Same user collection; requires `role=admin`
- **Admin me**: `GET /api/admin/auth/me` (staff-only)

### Frontend route protection (Next.js middleware)

`red-dog-radios-frontend/src/middleware.ts` gates routes based on cookies:

- **Agency**:
  - Public routes: `/login`, `/signup`, `/forgot-password`, `/otp-verification`, `/create-password`
  - Requires `rdg_token` for non-public routes.
  - If `rdg_onboarding=0`, forces agency users onto `/onboarding/*` until complete.
- **Admin**:
  - Admin area is `/admin/*`
  - Requires `rdg_admin_token` for all admin pages except `/admin/login`.

### Backend RBAC

- Agency endpoints generally use `protect` (JWT) and then enforce org scoping via `resolveAgencyOrganizationId`.
- Staff-only endpoints use `protectAdmin`, which:
  - Validates JWT and requires `user.role === 'admin'`.

---

## 6. All Modules & Features (Backend)

For each module below: **purpose**, **endpoints**, and **business logic highlights**. (Middleware names are from backend code.)

### `auth`

- **Purpose**: agency authentication + OTP verification + password reset
- **Endpoints**
  - `POST /api/auth/register` → `auth.controller.register` (no middleware)
  - `POST /api/auth/login` → `auth.controller.login` (`rateLimit`)
  - `POST /api/auth/forgot-password` → `auth.controller.forgotPassword` (`rateLimit`)
  - `POST /api/auth/verify-otp` → `auth.controller.verifyOtp` (`rateLimit`)
  - `POST /api/auth/reset-password` → `auth.controller.resetPassword` (`rateLimit`)
  - `POST /api/auth/verify-email` → `auth.controller.verifySignupOtp` (`rateLimit`)
  - `POST /api/auth/resend-verification` → `auth.controller.resendVerificationOtp` (`rateLimit`)
  - `GET /api/auth/me` → `auth.controller.getMe` (`protect`)
- **Highlights**
  - Prevents an admin email from registering as an agency account.
  - `User` has `isVerified` and separate OTP fields for signup vs reset.

### `admin`

- **Purpose**: staff/admin portal API (separate route namespace)
- **Endpoints**
  - Auth:
    - `POST /api/admin/auth/login` → `admin.controller.adminLogin` (no middleware)
    - `GET /api/admin/auth/me` → `admin.controller.adminMe` (`protectAdmin`)
  - Dashboard & logs:
    - `GET /api/admin/dashboard` → `admin.controller.dashboard` (`protectAdmin`)
    - `GET /api/admin/activity-logs` → `admin.controller.listActivityLogs` (`protectAdmin`)
    - `GET /api/admin/activity-logs/:id` → `admin.controller.getActivityLog` (`protectAdmin`)
  - Agencies (organization profiles):
    - `GET /api/admin/agencies` → `admin.controller.listAgencies` (`protectAdmin`)
    - `GET /api/admin/agencies/:id` → `admin.controller.getAgency` (`protectAdmin`)
  - Opportunities:
    - `GET /api/admin/opportunities` → `admin.controller.listOpportunities` (`protectAdmin`)
    - `POST /api/admin/opportunities` → `admin.controller.createOpportunity` (`protectAdmin`)
    - `GET /api/admin/opportunities/:id` → `admin.controller.getOpportunity` (`protectAdmin`)
    - `PUT /api/admin/opportunities/:id` → `admin.controller.updateOpportunity` (`protectAdmin`)
    - `DELETE /api/admin/opportunities/:id` → `admin.controller.deleteOpportunity` (`protectAdmin`)
  - Funders:
    - `GET /api/admin/funders` → `admin.controller.listFunders` (`protectAdmin`)
    - `POST /api/admin/funders` → `admin.controller.createFunder` (`protectAdmin`)
    - `GET /api/admin/funders/:id` → `admin.controller.getFunder` (`protectAdmin`)
    - `PUT /api/admin/funders/:id` → `admin.controller.updateFunder` (`protectAdmin`)
    - `DELETE /api/admin/funders/:id` → `admin.controller.deleteFunder` (`protectAdmin`)
    - `PUT /api/admin/funders/:id/unlock` → `admin.controller.unlockFunder` (`protectAdmin`)
    - `PUT /api/admin/funders/:id/set-limit` → `admin.controller.setFunderLimit` (`protectAdmin`)
  - Applications:
    - `GET /api/admin/applications` → `admin.controller.listApplications` (`protectAdmin`)
    - `POST /api/admin/applications/create-for-agency` → `admin.controller.createApplicationForAgency` (`protectAdmin`)
    - `GET /api/admin/applications/:id` → `admin.controller.getApplication` (`protectAdmin`)
    - `PUT /api/admin/applications/:id` → `admin.controller.updateApplication` (`protectAdmin`)
    - `PUT /api/admin/applications/:id/status` → `admin.controller.updateApplicationStatus` (`protectAdmin`)
    - `POST /api/admin/applications/:id/generate-ai` → `admin.controller.generateApplicationAI` (`protectAdmin`)
    - `DELETE /api/admin/applications/:id` → `admin.controller.deleteApplication` (`protectAdmin`)
  - Matches:
    - `GET /api/admin/matches` → `admin.controller.listMatches` (`protectAdmin`)
    - `GET /api/admin/matches/:id` → `admin.controller.getMatch` (`protectAdmin`)
    - `POST /api/admin/matches/recompute-all` → `admin.controller.recomputeMatches` (`protectAdmin`)
    - `PUT /api/admin/matches/:id/approve` → `admin.controller.approveMatch` (`protectAdmin`) (**deprecated** in comments)
    - `PUT /api/admin/matches/:id/reject` → `admin.controller.rejectMatch` (`protectAdmin`) (**deprecated** in comments)
  - Users:
    - `GET /api/admin/users` → `admin.controller.listUsers` (`protectAdmin`)
    - `GET /api/admin/users/:id` → `admin.controller.getUser` (`protectAdmin`)
    - `PUT /api/admin/users/:id/role` → `admin.controller.updateUserRole` (`protectAdmin`)
- **Highlights**
  - Writes to `ActivityLog` for many staff actions.
  - Admin application status updates also create an `Alert(type=application_update)` (best-effort).

### `onboarding`

- **Purpose**: save agency profile and mark onboarding complete, then compute matches
- **Endpoint**
  - `POST /api/onboarding/complete` → `onboarding.controller.complete` (`protect`)
- **Highlights**
  - Creates/updates `Organization` (agency profile) tied to the current user.
  - Sets `user.onboardingCompleted=true` and `user.organizationId=org._id`.
  - Triggers `matchService.computeAllForOrganization(orgId)` and returns top matches.

### `organizations`

- **Purpose**: agency profile CRUD (scoped to the current agency user’s org)
- **Endpoints**
  - `GET /api/organizations` → `organization.controller.getAll` (`protect`)
  - `POST /api/organizations` → `organization.controller.create` (`protect`)
  - `GET /api/organizations/:id` → `organization.controller.getOne` (`protect`, plus org ownership check)
  - `PUT /api/organizations/:id` → `organization.controller.update` (`protect`, plus org ownership check)
- **Highlights**
  - Agency users effectively have **one** organization profile (resolved via `resolveAgencyOrganizationId`).

### `opportunities`

- **Purpose**: agency listing/detail for grant opportunities
- **Endpoints**
  - `GET /api/opportunities` → `opportunity.controller.getAll` (`protect`)
  - `GET /api/opportunities/:id` → `opportunity.controller.getOne` (`protect`)
- **Highlights**
  - Service auto-computes and updates `status` from deadline (`open`/`closing`/`closed`).
  - Full create/update/delete for opportunities is handled under the **admin** module.

### `matches`

- **Purpose**: match records between an agency organization and opportunities; score computation
- **Endpoints**
  - `GET /api/matches` → `match.controller.getAll` (`protect`)
  - `POST /api/matches` → `match.controller.create` (`protect`)
  - `POST /api/matches/compute` → `match.controller.computeAndSave` (`protect`)
  - `POST /api/matches/compute-all` → `match.controller.computeAll` (`protect`, `rateLimit`)
  - `GET /api/matches/:id` → `match.controller.getOne` (`protect`)
  - `PUT /api/matches/:id/approve` → `match.controller.approve` (`protect`, `protectAdmin`) (deprecated; controller throws 403)
  - `PUT /api/matches/:id/reject` → `match.controller.reject` (`protect`, `protectAdmin`) (deprecated; controller throws 403)
- **Highlights**
  - Core scoring is in `match.service.computeMatchScore()` (see “Key Business Logic”).
  - Includes local match requirement logic: `opportunity.localMatchRequired` vs `organization.canMeetLocalMatch`.

### `applications`

- **Purpose**: application drafts, AI generation, submission, export, status history, follow-up automation, win creation
- **Endpoints**
  - `GET /api/applications` → `application.controller.getAll` (`protect`)
  - `POST /api/applications` → `application.controller.create` (`protect`)
  - `POST /api/applications/generate` → `application.controller.generate` (`protect`, `rateLimit`)
  - `GET /api/applications/:id` → `application.controller.getOne` (`protect`)
  - `PUT /api/applications/:id` → `application.controller.update` (`protect`)
  - `DELETE /api/applications/:id` → `application.controller.remove` (`protect`)
  - `PUT /api/applications/:id/submit` → `application.controller.submit` (`protect`)
  - `PUT /api/applications/:id/status` → `application.controller.updateStatus` (`protect`)
  - `POST /api/applications/:id/regenerate` → `application.controller.regenerate` (`protect`, `rateLimit`)
  - `POST /api/applications/:id/align` → `application.controller.alignToFunder` (`protect`, `rateLimit`)
  - `GET /api/applications/:id/export` → `application.controller.exportApplication` (`protect`)
- **Highlights**
  - AI draft generation uses OpenAI when configured, else returns structured fallback text.
  - Opportunity/funder locking:
    - If `Opportunity.maxApplicationsAllowed > 0`, counts applications and can lock the opportunity when limit reached.
    - Same for funders (`Funder.maxApplicationsAllowed`, default 5).
  - Status changes:
    - Schedules Day 7/Day 14 follow-ups when status first becomes `submitted` or `in_review`.
    - Creates a `Win` record when status becomes `awarded`.
    - Sends status emails to all users in the organization for `approved`/`awarded`/`rejected` (best-effort).

### `funders`

- **Purpose**: funder database + fit scoring against the agency profile + “queue position”
- **Endpoints**
  - `GET /api/funders` → `funder.controller.getAll` (`protect`)
  - `GET /api/funders/:id` → `funder.controller.getOne` (`protect`)
  - `PUT /api/funders/:id` → `funder.controller.updateAgencyNotes` (`protect`) (agency can update `notes` field only)
  - `GET /api/funders/:id/queue` → `funder.controller.getQueue` (`protect`)
  - `POST /api/funders/:id/save` → `funder.controller.saveFunder` (`protect`)
- **Highlights**
  - `computeFunderScore()` generates a numeric `matchScore`, `matchTier`, and `matchReasons` when org context is present.
  - `getQueueForAgency()` estimates queue position based on existing applications in “active” statuses and opportunity locks.

### `alerts`

- **Purpose**: alert records for agencies (deadline/high-fit/application updates)
- **Endpoints**
  - `GET /api/alerts` → `alert.controller.getAll` (`protect`)
  - `PUT /api/alerts/read-all` → (route exists) but controller implements `markAllRead` and updates by organization id
  - `PUT /api/alerts/:id/read` → `alert.controller.markRead` (`protect`)
  - `DELETE /api/alerts/:id` → `alert.controller.remove` (`protect`)
- **Highlights**
  - Alerts are created by cron via `alert.service.createDeadlineAlerts()` and `createHighFitAlerts()`.
  - Admin status updates can also create `type=application_update` alerts (in `admin.service.updateApplicationStatusAdmin`).

### `digests`

- **Purpose**: weekly digest generation and sending (queues email via outbox)
- **Endpoints**
  - `GET /api/digests` → `digest.controller.getAll` (`protect`)
  - `POST /api/digests/generate` → `digest.controller.generate` (`protect`)
  - `POST /api/digests/preview` → `digest.controller.preview` (`protect`)
  - `GET /api/digests/:id` → `digest.controller.getOne` (`protect`)
  - `POST /api/digests/:id/send` → `digest.controller.send` (`protect`)
- **Highlights**
  - Includes AI-generated intro (OpenAI) with fallback when not configured.
  - Sends by adding an outbox record (`emailType='weekly_digest'`) and marking digest as sent.

### `outbox`

- **Purpose**: queue + send email records; cron processes pending records
- **Endpoints**
  - `GET /api/outbox` → `outbox.controller.getAll` (`protect`)
  - `POST /api/outbox/queue` → `outbox.controller.queueEmail` (`protect`)
  - `GET /api/outbox/:id` → `outbox.controller.getOne` (`protect`)
  - `POST /api/outbox/:id/send` → `outbox.controller.sendEmail` (`protect`)
  - `POST /api/outbox/:id/retry` → `outbox.controller.retryFailed` (`protect`)
- **Highlights**
  - `processQueue(limit)` runs hourly by cron and sends pending emails (respects `scheduledFor`).
  - If SMTP isn’t configured, email sends return `{ stub: true }` and are treated as non-fatal.

### `followups`

- **Purpose**: follow-up tasks and reminder emails after submission
- **Endpoints**
  - `GET /api/followups` → `followup.controller.getAll` (`protect`)
  - `PUT /api/followups/:id/send` → `followup.controller.markSent` (`protect`)
  - `PUT /api/followups/:id/skip` → `followup.controller.skip` (`protect`)
- **Highlights**
  - Scheduling creates two follow-up rows (Day 7 and Day 14) and also queues **reminder** emails to the agency user/org email.
  - Daily cron backfills missing follow-ups for submitted apps.

### `outreach`

- **Purpose**: create outreach email drafts via AI and optionally send to a funder contact email
- **Endpoints**
  - `GET /api/outreach` → `outreach.controller.getAll` (`protect`)
  - `POST /api/outreach/generate` → `outreach.controller.generate` (`protect`)
  - `GET /api/outreach/:id` → `outreach.controller.getOne` (`protect`)
  - `PUT /api/outreach/:id` → `outreach.controller.update` (`protect`)
  - `PUT /api/outreach/:id/sent` → `outreach.controller.markSent` (`protect`)
  - `POST /api/outreach/:id/send` → `outreach.controller.sendOutreach` (`protect`)
- **Highlights**
  - Uses OpenAI when configured; otherwise uses a canned fallback.
  - Sending requires `funder.contactEmail` to be present; otherwise returns 400.

### `tracker`

- **Purpose**: application “tracker” list + stats
- **Endpoints**
  - `GET /api/tracker` → `tracker.controller.getTracker` (`protect`)
  - `GET /api/tracker/stats` → `tracker.controller.getTrackerStats` (`protect`)
- **Highlights**
  - Tracker stats compute dollars requested/awarded using `funder.avgGrantMax` or `opportunity.maxAmount`.

### `wins`

- **Purpose**: “win database” for awarded applications + insights/pattern analytics
- **Endpoints**
  - `GET /api/wins` → `win.controller.getAll` (`protect`)
  - `GET /api/wins/insights` → `win.controller.getInsights` (`protect`)
  - `GET /api/wins/patterns` → `win.controller.getPatterns` (`protect`)
- **Highlights**
  - `Win` records are automatically created when an application transitions to `awarded`.
  - Win factors are derived from application section completeness.

### `ai`

- **Purpose**: general AI endpoints (summary/email/application content/AI match scoring)
- **Endpoints**
  - `POST /api/ai/generate-summary` → `ai.controller.generateSummary` (`protect`, `rateLimit`)
  - `POST /api/ai/generate-email` → `ai.controller.generateEmail` (`protect`, `rateLimit`)
  - `POST /api/ai/generate-application` → `ai.controller.generateApplication` (`protect`, `rateLimit`)
  - `POST /api/ai/compute-match` → `ai.controller.computeMatch` (`protect`, `rateLimit`)
- **Highlights**
  - All return stubs when OpenAI is not configured.

### `dashboard`

- **Purpose**: agency dashboard stats
- **Endpoint**
  - `GET /api/dashboard/stats` → `dashboard.controller.getStats` (`protect`)
- **Highlights**
  - Returns top funders, attention items from alerts, and “systemJobs” placeholders (not actual last-run tracking).

### `settings`

- **Purpose**: user settings + password update + org profile updates + account deletion
- **Endpoints**
  - `GET /api/settings` → `settings.controller.getSettings` (`protect`)
  - `PUT /api/settings` → `settings.controller.updateSettings` (`protect`)
  - `DELETE /api/settings/account` → `settings.controller.deleteAccount` (`protect`)
- **Highlights**
  - Password change requires `currentPassword` and `newPassword`.
  - Writes a set of org fields (agencyTypes, programAreas, etc.) into `Organization`.

### `activityLogs`

- **Purpose**: staff audit trail
- **Endpoints**: none directly mounted; accessed through admin module (`/api/admin/activity-logs*`)
- **Highlights**
  - Best-effort writes; failures are logged but don’t break requests.

### `ashleen`

- **Purpose**: chat assistant endpoint (“Ashleen”)
- **Endpoint**
  - `POST /api/ashleen/chat` → `ashleen.controller.chat` (`protect`)
- **Highlights**
  - Uses OpenAI when configured; falls back to deterministic canned responses.
  - Accepts up to last 20 chat messages from client.

### `agencies` (legacy/thin)

- **Purpose**: Thin `Agency` schema and endpoints; onboarding service attempts to sync a record here “for compatibility”.
- **Endpoints**
  - `GET /api/agencies` → `agency.controller.getAll` (`protect`)
  - `POST /api/agencies` → `agency.controller.create` (`protect`)
  - `GET /api/agencies/:id` → `agency.controller.getOne` (`protect`)
  - `PUT /api/agencies/:id` → `agency.controller.update` (`protect`)
- **Important note**
  - The `Organization` schema is treated as the true agency profile in multiple places, and `Organization.schema.js` explicitly says the thin `Agency` schema is “NOT used in production — ignore it.”

---

## 7. Database Schema (Mongoose)

All schemas are in `red-dog-radios-backend/src/modules/**/**/*.schema.js`.

### `User`

- **File**: `src/modules/auth/user.schema.js`
- **Fields**
  - `fullName?: string`
  - `firstName?: string`
  - `lastName?: string`
  - `email: string` (**required**, **unique**, lowercase)
  - `password: string` (**required**, `minlength: 8`, `select:false`)
  - `role: 'agency' | 'admin'` (default `agency`)
  - `isActive: boolean` (default `true`)
  - `isVerified: boolean` (default `false`)
  - `organizationId?: ObjectId -> Organization`
  - `onboardingCompleted: boolean` (default `false`)
  - Reset fields (all `select:false`):
    - `resetOtp?: string`, `resetOtpExpiry?: Date`
    - `resetToken?: string`, `resetTokenExpiry?: Date`
    - `verificationOtp?: string`, `verificationOtpExpiry?: Date`
  - `settings` object:
    - `notifications.*` booleans
    - `preferences.*` strings
    - `reportEmail?: string`, `apiKey?: string`
- **Indexes**
  - `organizationId` index

### `Organization` (agency profile)

- **File**: `src/modules/organizations/organization.schema.js`
- **Fields (selected; see file for full list)**
  - Core: `name (required)`, `email?`, `location?`, `websiteUrl?`, `missionStatement?`
  - Arrays: `focusAreas[]`, `agencyTypes[]`, `programAreas[]`, `goals[]`
  - `budgetRange?` enum (includes `under_25k`, `25k_50k`, `50k_100k`, `100k_plus`, `25k_150k`, `150k_500k`, `500k_plus`)
  - `timeline?` enum (includes `urgent`, `planned`, `asap`, `3_6_months`, `6_12_months`)
  - Extended profile fields:
    - `populationServed?: number`
    - `coverageArea?: string`
    - `numberOfStaff?: number`
    - `currentEquipment?: string`
    - `mainProblems?: string[]`
    - `fundingPriorities?: string[]`
  - Intake/onboarding additions:
    - `specificRequest?: string`
    - `challenges?: ('outdated_equipment' | 'safety_concerns' | 'slow_response_times' | 'coverage_gaps' | 'communication_issues' | 'staffing_shortages')[]`
    - `urgencyStatement?: string`
    - `whobenefits?: string`
    - `eligibilityType?: 'nonprofit_501c3' | 'government_agency'`
    - `annualVolume?: string`
    - `serviceArea?: 'local' | 'county' | 'regional' | 'statewide'`
    - `staffSizeRange?: '1-10' | '11-25' | '26-50' | '50+'`
  - `canMeetLocalMatch?: boolean`
  - `matchCount: number` (default 0)
  - `status: 'active' | 'inactive'` (default `active`)
  - `createdBy?: ObjectId -> User`
  - `lastMatchRecomputedAt?: Date`
- **Indexes**
  - No explicit indexes in schema file (pagination plugin enabled).

### `Opportunity`

- **File**: `src/modules/opportunities/opportunity.schema.js`
- **Fields**
  - `title: string` (**required**)
  - `funder: string` (**required**) (string name; not a ref)
  - `deadline?: Date`
  - `minAmount?: number`, `maxAmount?: number`
  - `sourceUrl?: string`
  - `keywords?: string[]`
  - `agencyTypes?: string[]`
  - `description?: string`
  - `category?: string`
  - `equipmentTags?: string[]`
  - `localMatchRequired: boolean` (default false)
  - `status: 'open' | 'closing' | 'closed'` (default open)
  - `maxApplicationsAllowed: number` (default 0 = unlimited)
  - `currentApplicationCount: number` (default 0)
  - `isLocked: boolean` (default false)
  - `createdBy?: ObjectId -> User`
- **Indexes**
  - `{ status: 1, deadline: 1 }`

### `Match`

- **File**: `src/modules/matches/match.schema.js`
- **Fields**
  - `organization: ObjectId -> Organization` (**required**)
  - `opportunity: ObjectId -> Opportunity` (**required**)
  - `fitScore: number` (0..100)
  - `reasons?: string[]`, `fitReasons?: string[]`, `disqualifiers?: string[]`
  - `recommendedAction?: string`
  - `state?: string`
  - `breakdown`:
    - `agencyType`, `geography`, `programKeyword`, `deadlineViability`, `awardSizeFit`, `timelineAlignment`, `dataCompleteness`
  - `status: 'pending' | 'approved' | 'rejected'` (default pending)
  - `scoreVersion: string` (default `v2`)
  - `lastUpdated: Date` (default now)
- **Indexes**
  - Unique compound: `{ organization: 1, opportunity: 1 }`

### `Application`

- **File**: `src/modules/applications/application.schema.js`
- **Fields**
  - `organization: ObjectId -> Organization` (**required**)
  - `opportunity?: ObjectId -> Opportunity`
  - `funder?: ObjectId -> Funder`
  - `status` enum (includes `draft`, `drafting`, `ready_to_submit`, `submitted`, `in_review`, `awarded`, `rejected`, `denied`, etc.)
  - Basic fields: `projectTitle?`, `projectSummary?`, `communityImpact?`, `amountRequested?`, `timeline?`, `contactName?`, `contactEmail?`
  - Submission: `submittedAt?`, `dateSubmitted?`, `followUpDate?`, `notes?`
  - AI sections: `problemStatement?`, `proposedSolution?`, `measurableOutcomes?`, `urgency?`, `budgetSummary?`
  - `alignedVersion` (AI rewritten sections + `generatedAt`)
  - `statusHistory[]` entries with `status`, `previousStatus`, `changedAt`, `changedBy -> User`
  - Win tagging: `isWinner: boolean`, `winTags.*`
  - `submittedBy?: ObjectId -> User`
- **Indexes**
  - `{ organization: 1, status: 1 }`
  - `{ organization: 1, createdAt: -1 }`
  - `{ funder: 1 }`

### `Funder`

- **File**: `src/modules/funders/funder.schema.js`
- **Fields**
  - Identity/contact: `name (required)`, `website?`, `contactName?`, `contactEmail?`, `contactPhone?`
  - Profile: `missionStatement?`, `locationFocus[]`, `fundingCategories[]`, `agencyTypesFunded[]`, `equipmentTags[]`
  - Requirements: `localMatchRequired: boolean`
  - Grant stats: `avgGrantMin?`, `avgGrantMax?`, `deadline?`, `cyclesPerYear?`
  - Notes: `pastGrantsAwarded[]`, `notes?`
  - Application cap control:
    - `maxApplicationsAllowed: number` (default 5)
    - `currentApplicationCount: number` (default 0)
    - `isLocked: boolean` (default false)
  - `status: 'active' | 'inactive'` (default active)
  - `addedBy?: ObjectId -> User`
- **Indexes**
  - `{ status: 1, isLocked: 1 }`

### `Alert`

- **File**: `src/modules/alerts/alert.schema.js`
- **Fields**
  - `organization?: ObjectId -> Organization`
  - `opportunity?: ObjectId -> Opportunity`
  - `user?: ObjectId -> User`
  - `orgName?: string`, `grantName?: string`
  - `type`: `deadline | high_fit | deadline_updated | no_match | application_update` (**required**)
  - `priority`: `high | medium | low` (default medium)
  - `message: string` (**required**)
  - `isRead: boolean` (default false)
  - `alertKey?: string`
- **Indexes**
  - Unique sparse: `{ alertKey: 1 }`

### `Outbox`

- **File**: `src/modules/outbox/outbox.schema.js`
- **Fields**
  - `recipient: string` (**required**), `recipientName?`
  - `subject: string` (**required**)
  - `htmlBody: string` (**required**)
  - `emailType`: `weekly_digest | alert_digest | outreach | manual | followup_reminder`
  - `scheduledFor?: Date`
  - `status: pending | sent | failed`
  - `retryCount: number`, `providerMessageId?`, `errorMessage?`, `sentAt?`
  - `isTest: boolean`
  - `emailKey?: string` (unique sparse)
  - `relatedOrganization?: ObjectId -> Organization`
  - `relatedUser?: ObjectId -> User`
- **Indexes**
  - Unique sparse `{ emailKey: 1 }`
  - `{ status: 1, scheduledFor: 1 }`

### `Digest`

- **File**: `src/modules/digests/digest.schema.js`
- **Fields**
  - `organization: ObjectId -> Organization` (**required**)
  - `user: ObjectId -> User` (**required**)
  - `periodStart: Date` (**required**), `periodEnd: Date` (**required**)
  - `matches?: ObjectId[] -> Match`
  - `opportunities[]` summary objects
  - `aiIntro?`, `htmlContent?`
  - `status: draft | sent`, `sentAt?`
  - `itemCount: number`

### `FollowUp`

- **File**: `src/modules/followups/followup.schema.js`
- **Fields**
  - `application: ObjectId -> Application` (**required**)
  - `user: ObjectId -> User` (**required**)
  - `organization: ObjectId -> Organization` (**required**)
  - `funder?: ObjectId -> Funder`, `opportunity?: ObjectId -> Opportunity`
  - `followUpNumber?: number`
  - `scheduledFor: Date` (**required**)
  - `emailSubject?`, `emailBody?`
  - `status: pending | sent | skipped`
  - `sentAt?`
- **Indexes**
  - `{ application: 1 }`
  - `{ scheduledFor: 1, status: 1 }`

### `Outreach`

- **File**: `src/modules/outreach/outreach.schema.js`
- **Fields**
  - `organization: ObjectId -> Organization` (**required**)
  - `user: ObjectId -> User` (**required**)
  - `funder?: ObjectId -> Funder`, `opportunity?: ObjectId -> Opportunity`
  - `subject: string` (**required**)
  - `contactName?: string`
  - `body: string` (**required**)
  - `status: draft | sent`, `sentAt?`

### `Win`

- **File**: `src/modules/wins/win.schema.js`
- **Fields**
  - `applicationId?: ObjectId -> Application`
  - `agencyType: string` (**required**)
  - `fundingType?`, `projectType?`, `funderName?`
  - `awardAmount?: number`
  - Copied narrative fields: `problemStatement`, `communityImpact`, etc.
  - `winFactors?: string[]`, `lessonsLearned?`
- **Indexes**
  - `{ agencyType: 1, funderName: 1 }`

### `ActivityLog`

- **File**: `src/modules/activityLogs/activityLog.schema.js`
- **Fields**
  - `category`: `opportunity | funder | application | match | ai | user | system` (**required**)
  - `action: string` (**required**)
  - `summary: string` (**required**)
  - `severity`: `info | warning | error`
  - `actorId?: ObjectId -> User`
  - `meta?: Mixed`
- **Indexes**
  - `{ createdAt: -1 }`

### `Agency` (legacy/thin)

- **File**: `src/modules/agencies/agency.schema.js`
- **Fields**: `name`, `type` enum, `location?`, `grantContactEmail?`, `matchCount`, `status`

---

## 8. Environment Variables

### Backend (`red-dog-radios-backend/.env.example`)

The backend reads variables from `.env` and fails fast if `JWT_SECRET` or `MONGO_URI` are missing.

Variables present in `.env.example`:

- **Required**
  - `MONGO_URI`: MongoDB connection string
  - `JWT_SECRET`: JWT signing secret
- **Optional**
  - `NODE_ENV`: defaults to development behavior when not `production`
  - `PORT`: default `4000`
  - `JWT_EXPIRES_IN`: default `7d`
  - Cloudinary:
    - `CLOUDINARY_CLOUD_NAME`
    - `CLOUDINARY_API_KEY`
    - `CLOUDINARY_API_SECRET`
  - SMTP email:
    - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
  - AI:
    - `OPENAI_API_KEY`
  - CORS:
    - `CORS_ORIGIN`

Additional backend variables used in code (present in `.env` but not in `.env.example`, or referenced in code):

- `SMTP_SECURE`: `"true"` to use secure SMTP
- `ADMIN_EMAIL`: used for cron error notifications and test-email endpoint
- `FRONTEND_URL`: used in email templates (links back to dashboard)
- `DEV_REDIRECT_EMAIL`: in dev, redirects all outgoing emails to this address
- `OPENAI_MODEL`: used by Ashleen chat endpoint (fallback default `gpt-4o-mini`)

**Sensitive values**: the backend `.env` in this workspace contains secret material (SMTP password and an OpenAI key). This summary intentionally **does not** reproduce secret values; treat them as **must-rotate** if committed/shared.

### Frontend

No frontend `.env` files were found in this repository. Frontend runtime configuration is read from environment (Next):

- `API_ORIGIN` / `NEXT_PUBLIC_API_ORIGIN`: backend origin for `next.config.ts` rewrite fallback
- `REPLIT_DEV_DOMAIN`: used in `allowedDevOrigins`

---

## 9. Key Business Logic

### Match scoring engine (`match.service.computeMatchScore`)

Computed score is capped to 0–100 and returns:
`fitScore`, `reasons`/`fitReasons`, `disqualifiers`, `recommendedAction`, `breakdown`, and derived `state`.

Breakdown components:

- **Agency type** (up to 20)
  - If no restriction: partial credit
  - If mismatch: adds disqualifier
- **Local match** (+5 possible) when `opportunity.localMatchRequired=true`
  - If org cannot meet local match: adds disqualifier
- **Geography** (up to 20) based on keyword/state matching vs org location
- **Program/keyword overlap** (up to 25) using org `programAreas` vs opp `keywords`
- **Deadline viability** (up to 10) based on days until deadline
- **Award size fit** (up to 10) based on org `budgetRange` midpoint vs `opportunity.maxAmount`
- **Timeline alignment** (up to 10) compares org timeline vs urgency implied by deadline
- **Data completeness** (up to 5) checks presence of key opportunity fields

Recommended action text changes based on fit score and presence of disqualifiers.

### Onboarding completion flow (current step structure)

Frontend stores steps in `sessionStorage`:
- `rdg_onboarding_step1`: org name, org type, city/state/county, website
- `rdg_onboarding_step2`: mission statement, population, serviceArea, staffSizeRange, annualVolume
- `rdg_onboarding_step3`: challenges[] (multi-select), biggestChallenge, urgencyStatement
- `rdg_onboarding_step4`: projectTitle, specificRequest, budgetRange, timeline, whobenefits, eligibilityType

Backend `onboarding.service.complete()` maps and persists these into `Organization` fields, updates the `User`, and triggers match computation. On success, frontend flips `rdg_onboarding` cookie to `1` so the Next middleware unlocks `/dashboard`.

### Alert and digest logic

- **Alerts** (cron):
  - Deadline alerts: upcoming deadline within N days and match fit >= threshold
  - High-fit alerts: match fit >= threshold
  - De-duplication via `alertKey` (unique sparse)
- **Weekly digest**:
  - Selects matches with `fitScore >= 55` and open/closing opportunities
  - Generates intro via OpenAI (optional)
  - Builds HTML and stores digest; “send” queues outbox email

### Outbox queue processing

- Outbox records store the email payload and status.
- Hourly cron calls `outboxService.processQueue(50)`, which:
  - Selects pending records, respecting `scheduledFor` and max retries
  - Sends via `email.config.sendEmail` (Nodemailer)
  - Marks record sent/failed and stores provider id/error message

### AI generation flows

There are multiple AI entry points:

- **Applications module** (primary, structured 6-section output)
  - `createWithAI` and `adminRegenerateAI` use OpenAI to return JSON sections (or fallback JSON).
  - Includes a “win patterns” prompt block from recent `Win` records.
  - `alignToFunder` rewrites those sections to match funder tone.
- **AI module** (generic)
  - Summary, outreach email, short application content, AI match scoring; all stub when OpenAI is absent.
- **Outreach module**
  - AI generates a subject/contactName/body JSON payload; can send via SMTP.
- **Ashleen chat**
  - Large system prompt; uses OpenAI when present, else deterministic fallback responses.

---

## 10. Full API Reference (Grouped by Module)

**Base URL**: backend mounts under `/api/*` (and `/api/admin/*` for staff).

Auth middleware legend:
- `protect`: agency JWT required (Bearer token)
- `protectAdmin`: staff JWT required (Bearer token) and role must be `admin`
- `rateLimit`: per-route limiter (used on auth + AI endpoints)

### Health & Docs

- `GET /health` (no auth) — health check + configured flags
- `GET /api-docs` (no auth) — Swagger UI

### Auth (`/api/auth`)

- `POST /api/auth/register` — `auth.controller.register`
- `POST /api/auth/login` — `rateLimit` → `auth.controller.login`
- `POST /api/auth/forgot-password` — `rateLimit` → `auth.controller.forgotPassword`
- `POST /api/auth/verify-otp` — `rateLimit` → `auth.controller.verifyOtp`
- `POST /api/auth/reset-password` — `rateLimit` → `auth.controller.resetPassword`
- `POST /api/auth/verify-email` — `rateLimit` → `auth.controller.verifySignupOtp`
- `POST /api/auth/resend-verification` — `rateLimit` → `auth.controller.resendVerificationOtp`
- `GET /api/auth/me` — `protect` → `auth.controller.getMe`

### Admin (`/api/admin`)

- `POST /api/admin/auth/login` — `admin.controller.adminLogin`
- `GET /api/admin/auth/me` — `protectAdmin` → `admin.controller.adminMe`
- `GET /api/admin/dashboard` — `protectAdmin` → `admin.controller.dashboard`
- `GET /api/admin/activity-logs` — `protectAdmin` → `admin.controller.listActivityLogs`
- `GET /api/admin/activity-logs/:id` — `protectAdmin` → `admin.controller.getActivityLog`
- `GET /api/admin/agencies` — `protectAdmin` → `admin.controller.listAgencies`
- `GET /api/admin/agencies/:id` — `protectAdmin` → `admin.controller.getAgency`
- `GET /api/admin/opportunities` — `protectAdmin` → `admin.controller.listOpportunities`
- `POST /api/admin/opportunities` — `protectAdmin` → `admin.controller.createOpportunity`
- `GET /api/admin/opportunities/:id` — `protectAdmin` → `admin.controller.getOpportunity`
- `PUT /api/admin/opportunities/:id` — `protectAdmin` → `admin.controller.updateOpportunity`
- `DELETE /api/admin/opportunities/:id` — `protectAdmin` → `admin.controller.deleteOpportunity`
- `GET /api/admin/funders` — `protectAdmin` → `admin.controller.listFunders`
- `POST /api/admin/funders` — `protectAdmin` → `admin.controller.createFunder`
- `GET /api/admin/funders/:id` — `protectAdmin` → `admin.controller.getFunder`
- `PUT /api/admin/funders/:id` — `protectAdmin` → `admin.controller.updateFunder`
- `DELETE /api/admin/funders/:id` — `protectAdmin` → `admin.controller.deleteFunder`
- `PUT /api/admin/funders/:id/unlock` — `protectAdmin` → `admin.controller.unlockFunder`
- `PUT /api/admin/funders/:id/set-limit` — `protectAdmin` → `admin.controller.setFunderLimit`
- `GET /api/admin/applications` — `protectAdmin` → `admin.controller.listApplications`
- `POST /api/admin/applications/create-for-agency` — `protectAdmin` → `admin.controller.createApplicationForAgency`
- `GET /api/admin/applications/:id` — `protectAdmin` → `admin.controller.getApplication`
- `PUT /api/admin/applications/:id` — `protectAdmin` → `admin.controller.updateApplication`
- `PUT /api/admin/applications/:id/status` — `protectAdmin` → `admin.controller.updateApplicationStatus`
- `POST /api/admin/applications/:id/generate-ai` — `protectAdmin` → `admin.controller.generateApplicationAI`
- `DELETE /api/admin/applications/:id` — `protectAdmin` → `admin.controller.deleteApplication`
- `GET /api/admin/matches` — `protectAdmin` → `admin.controller.listMatches`
- `GET /api/admin/matches/:id` — `protectAdmin` → `admin.controller.getMatch`
- `POST /api/admin/matches/recompute-all` — `protectAdmin` → `admin.controller.recomputeMatches`
- `PUT /api/admin/matches/:id/approve` — `protectAdmin` → `admin.controller.approveMatch` (deprecated)
- `PUT /api/admin/matches/:id/reject` — `protectAdmin` → `admin.controller.rejectMatch` (deprecated)
- `GET /api/admin/users` — `protectAdmin` → `admin.controller.listUsers`
- `GET /api/admin/users/:id` — `protectAdmin` → `admin.controller.getUser`
- `PUT /api/admin/users/:id/role` — `protectAdmin` → `admin.controller.updateUserRole`

### Onboarding (`/api/onboarding`)

- `POST /api/onboarding/complete` — `protect` → `onboarding.controller.complete`

### Organizations (`/api/organizations`)

- `GET /api/organizations` — `protect` → `organization.controller.getAll`
- `POST /api/organizations` — `protect` → `organization.controller.create`
- `GET /api/organizations/:id` — `protect` → `organization.controller.getOne` (org-scoped)
- `PUT /api/organizations/:id` — `protect` → `organization.controller.update` (org-scoped)

### Opportunities (`/api/opportunities`)

- `GET /api/opportunities` — `protect` → `opportunity.controller.getAll`
- `GET /api/opportunities/:id` — `protect` → `opportunity.controller.getOne`

### Matches (`/api/matches`)

- `GET /api/matches` — `protect` → `match.controller.getAll` (org-scoped)
- `POST /api/matches` — `protect` → `match.controller.create` (org-scoped)
- `POST /api/matches/compute` — `protect` → `match.controller.computeAndSave`
- `POST /api/matches/compute-all` — `protect`, `rateLimit` → `match.controller.computeAll`
- `GET /api/matches/:id` — `protect` → `match.controller.getOne` (org-scoped)
- `PUT /api/matches/:id/approve` — `protect`, `protectAdmin` → `match.controller.approve` (throws 403)
- `PUT /api/matches/:id/reject` — `protect`, `protectAdmin` → `match.controller.reject` (throws 403)

### Applications (`/api/applications`)

- `GET /api/applications` — `protect` → `application.controller.getAll` (org-scoped)
- `POST /api/applications` — `protect` → `application.controller.create`
- `POST /api/applications/generate` — `protect`, `rateLimit` → `application.controller.generate`
- `GET /api/applications/:id` — `protect` → `application.controller.getOne` (org-scoped)
- `PUT /api/applications/:id` — `protect` → `application.controller.update` (org-scoped)
- `DELETE /api/applications/:id` — `protect` → `application.controller.remove` (org-scoped)
- `PUT /api/applications/:id/submit` — `protect` → `application.controller.submit` (org-scoped)
- `PUT /api/applications/:id/status` — `protect` → `application.controller.updateStatus` (org-scoped, admin-only statuses blocked for agency)
- `POST /api/applications/:id/regenerate` — `protect`, `rateLimit` → `application.controller.regenerate`
- `POST /api/applications/:id/align` — `protect`, `rateLimit` → `application.controller.alignToFunder`
- `GET /api/applications/:id/export` — `protect` → `application.controller.exportApplication`

### Funders (`/api/funders`)

- `GET /api/funders` — `protect` → `funder.controller.getAll`
- `GET /api/funders/:id` — `protect` → `funder.controller.getOne`
- `GET /api/funders/:id/queue` — `protect` → `funder.controller.getQueue`
- `PUT /api/funders/:id` — `protect` → `funder.controller.updateAgencyNotes`
- `POST /api/funders/:id/save` — `protect` → `funder.controller.saveFunder`

### Alerts (`/api/alerts`)

- `GET /api/alerts` — `protect` → `alert.controller.getAll`
- `PUT /api/alerts/read-all` — `protect` → `alert.controller.markAllRead`
- `PUT /api/alerts/:id/read` — `protect` → `alert.controller.markRead`
- `DELETE /api/alerts/:id` — `protect` → `alert.controller.remove`

### Digests (`/api/digests`)

- `GET /api/digests` — `protect` → `digest.controller.getAll`
- `POST /api/digests/generate` — `protect` → `digest.controller.generate`
- `POST /api/digests/preview` — `protect` → `digest.controller.preview`
- `GET /api/digests/:id` — `protect` → `digest.controller.getOne` (org-scoped)
- `POST /api/digests/:id/send` — `protect` → `digest.controller.send` (org-scoped)

### Outbox (`/api/outbox`)

- `GET /api/outbox` — `protect` → `outbox.controller.getAll` (org-scoped)
- `POST /api/outbox/queue` — `protect` → `outbox.controller.queueEmail`
- `GET /api/outbox/:id` — `protect` → `outbox.controller.getOne` (org-scoped)
- `POST /api/outbox/:id/send` — `protect` → `outbox.controller.sendEmail`
- `POST /api/outbox/:id/retry` — `protect` → `outbox.controller.retryFailed`

### Outreach (`/api/outreach`)

- `GET /api/outreach` — `protect` → `outreach.controller.getAll`
- `POST /api/outreach/generate` — `protect` → `outreach.controller.generate`
- `POST /api/outreach/:id/send` — `protect` → `outreach.controller.sendOutreach`
- `GET /api/outreach/:id` — `protect` → `outreach.controller.getOne` (org-scoped)
- `PUT /api/outreach/:id` — `protect` → `outreach.controller.update` (org-scoped)
- `PUT /api/outreach/:id/sent` — `protect` → `outreach.controller.markSent` (org-scoped)

### Follow-ups (`/api/followups`)

- `GET /api/followups` — `protect` → `followup.controller.getAll`
- `PUT /api/followups/:id/send` — `protect` → `followup.controller.markSent`
- `PUT /api/followups/:id/skip` — `protect` → `followup.controller.skip`

### Tracker (`/api/tracker`)

- `GET /api/tracker` — `protect` → `tracker.controller.getTracker`
- `GET /api/tracker/stats` — `protect` → `tracker.controller.getTrackerStats`

### Wins (`/api/wins`)

- `GET /api/wins` — `protect` → `win.controller.getAll`
- `GET /api/wins/insights` — `protect` → `win.controller.getInsights`
- `GET /api/wins/patterns` — `protect` → `win.controller.getPatterns`

### AI (`/api/ai`)

- `POST /api/ai/generate-summary` — `protect`, `rateLimit` → `ai.controller.generateSummary`
- `POST /api/ai/generate-email` — `protect`, `rateLimit` → `ai.controller.generateEmail`
- `POST /api/ai/generate-application` — `protect`, `rateLimit` → `ai.controller.generateApplication`
- `POST /api/ai/compute-match` — `protect`, `rateLimit` → `ai.controller.computeMatch`

### Agencies (legacy) (`/api/agencies`)

- `GET /api/agencies` — `protect` → `agency.controller.getAll`
- `POST /api/agencies` — `protect` → `agency.controller.create`
- `GET /api/agencies/:id` — `protect` → `agency.controller.getOne`
- `PUT /api/agencies/:id` — `protect` → `agency.controller.update`

### Ashleen (`/api/ashleen`)

- `POST /api/ashleen/chat` — `protect` → `ashleen.controller.chat`

---

## 11. Frontend Pages & Components

### App Router routes (purpose + role)

**Agency (public/auth)**
- `/` → redirects to `/login`
- `/login` — agency sign-in
- `/signup` — agency sign-up
- `/forgot-password` — request reset OTP
- `/otp-verification` — OTP verification view (used in auth flows)
- `/create-password` — set a new password (reset flow)

**Agency (onboarding, protected by `rdg_token` + `rdg_onboarding`)**
- `/onboarding` — welcome/start
- `/onboarding/step1` — org basics (name/type/location/website)
- `/onboarding/step2` — mission + population + service area + staff size
- `/onboarding/step3` — challenges + urgency narrative
- `/onboarding/step4` — project title/request + budget + timeline + eligibility
- `/onboarding/step5` — redirects to step4 (no implementation)
- `/onboarding/results` — shows match count + top matches; flips `rdg_onboarding=1`

**Agency (app, protected)**
- `/dashboard` — main agency dashboard
- `/opportunities` — browse opportunities (agency)
- `/funders` — browse/scored funders (agency)
- `/funders/[id]` — funder detail + queue/chance info (agency)
- `/applications` — list applications (agency)
- `/applications/[id]` — application builder/editor (agency)
- `/weekly-summary` — weekly digest view (agency)
- `/settings` — settings
- `/settings/agency` — agency profile settings page
- `/organizations` — redirects to `/settings`
- `/outbox` — redirects to `/dashboard` (no agency outbox UI)

**Staff/Admin (protected by `rdg_admin_token`)**
- `/admin/login` — staff sign-in
- `/admin` — redirects to `/admin/dashboard`
- `/admin/dashboard` — staff dashboard stats + recent activity
- `/admin/activity` — activity log list
- `/admin/activity/[id]` — activity log detail
- `/admin/agencies` — agency list
- `/admin/agencies/[id]` — agency detail (matches/applications/history + “create application for agency”)
- `/admin/opportunities` — opportunity list + create modal
- `/admin/opportunities/[id]` — opportunity detail (includes application cap controls)
- `/admin/opportunities/[id]/edit` — edit opportunity
- `/admin/opportunities/new` — redirects to list
- `/admin/funders` — funder list + create modal
- `/admin/funders/[id]` — funder detail + applicant orgs
- `/admin/funders/[id]/edit` — edit funder
- `/admin/funders/new` — redirects to list
- `/admin/matches` — match list + recompute-all action
- `/admin/matches/[id]` — match detail
- `/admin/applications` — application list + filters
- `/admin/applications/[id]` — application detail + status actions + AI regenerate
- `/admin/users` — user list
- `/admin/users/[id]` — user detail + role change
- `/admin/settings` — staff settings view

### Key reusable components

- **`ConditionalAppShell` / `AppShell` / `AppShellLayout`**: wraps agency pages in a consistent shell/navigation (exact behavior depends on these component implementations).
- **`AdminShell`**: staff panel layout wrapper for all `/admin/(panel)` routes.
- **`api.ts` and `adminApi.ts`**: central Axios instances with auth interceptors and redirect-on-401 behavior.
- **UI library (`components/ui/*`)**: Radix-based reusable primitives (dialogs, dropdowns, forms, etc.).
- **Onboarding views**: step components + results logic; store intermediate state in sessionStorage.

---

## 12. Current State Notes (TODOs / stubs / incomplete)

- **AI is optional / stubbed**:
  - Many AI features return fallback content when `OPENAI_API_KEY` is not set.
- **Email sending is environment-dependent**:
  - If SMTP credentials are not set, email sending returns a stub response and does not actually send.
- **Admin “match approve/reject” is deprecated**:
  - Admin routes exist and admin service supports approve/reject, but agency-facing match approve/reject endpoints throw 403 and comments indicate application-status workflow is preferred.
- **Dashboard “systemJobs” are placeholders**:
  - Agency dashboard stats returns job schedules but does not track last-run/actual run state.
- **Frontend routes that redirect**
  - `/organizations` redirects to `/settings`
  - `/outbox` redirects to `/dashboard`
  - `/onboarding/step5` redirects to step4
  - `/admin/opportunities/new` and `/admin/funders/new` redirect to list pages

Unclear / not confirmed from code read here:

- **Uploads**: Cloudinary + multer are installed and config exists, but no explicit upload endpoints were confirmed in the module routes reviewed.

---

## 13. Setup & Run Instructions

### Prerequisites

- Node.js + npm
- MongoDB (local or Atlas)

### Backend (local)

From `red-dog-radios-backend/`:

1. Install:
   - `npm install`
2. Configure env:
   - Copy `red-dog-radios-backend/.env.example` → `red-dog-radios-backend/.env`
   - Ensure at minimum:
     - `MONGO_URI`
     - `JWT_SECRET`
3. Run:
   - `npm run dev` (starts on `PORT` default 4000)
4. Verify:
   - `GET http://localhost:4000/health`
   - `GET http://localhost:4000/api-docs`

### Seed data

From `red-dog-radios-backend/`:

- `npm run seed`

The backend README states seeding creates an admin user (email `admin@reddogradios.com`) and demo org/opportunity/match data.

### Frontend (local)

From `red-dog-radios-frontend/`:

1. Install:
   - `npm install`
2. Run:
   - `npm run dev` (Next.js default http://localhost:3000)
3. Ensure the API rewrite target is correct:
   - By default, frontend rewrites `/api/*` to `http://localhost:4000/api/*`.
   - Override via env:
     - `API_ORIGIN` or `NEXT_PUBLIC_API_ORIGIN`

### Environment checklist (common)

- Backend:
  - `MONGO_URI` points to running MongoDB
  - `JWT_SECRET` set
  - `CORS_ORIGIN` includes your frontend origin (default `http://localhost:3000`)
  - Optional:
    - `SMTP_*` set to enable real email sending
    - `OPENAI_API_KEY` to enable AI generation
- Frontend:
  - Optional `NEXT_PUBLIC_API_ORIGIN` if backend isn’t on `http://localhost:4000`

