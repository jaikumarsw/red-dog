# PROJECT SUMMARY

_Generated from a full source traversal of backend and frontend code (261 source files under src)._

## 1. Project Overview

- **What it does**: Red Dog Radios is a grant intelligence platform for public-safety agencies. It helps agencies discover opportunities, compute fit scores, track applications, manage outreach, and receive alerts/digests.
- **Who it serves**: Two primary roles are supported end-to-end.
- **Agency role**: register/login with OTP, onboarding, profile management, opportunity/match/application workflows, alerts, outreach, followups, tracker, wins.
- **Staff/Admin role**: dedicated admin login and panel for agencies, users, opportunities, funders, matches, applications, and activity logs.

## 2. Tech Stack

### Backend

- Runtime: Node.js (CommonJS), package reddog-backend@1.0.0
- Framework: express@^4.19.2
- Database/ODM: mongoose@^8.3.4, mongoose-paginate-v2@^1.8.3
- Auth/Security: jsonwebtoken@^9.0.2, bcryptjs@^2.4.3, helmet@^7.1.0, cors@^2.8.5, express-rate-limit@^7.2.0
- Email: nodemailer@^6.10.1, resend@^6.11.0
- AI: openai@^4.40.0
- Scheduling: node-cron@^3.0.3
- Middleware/ops: morgan@^1.10.0, dotenv@^16.4.5, multer@^1.4.5-lts.1, cloudinary@^2.3.0
- API Docs: swagger-jsdoc@^6.2.8, swagger-ui-express@^5.0.0

### Frontend

- Framework: next@15.2.6 (App Router), react@^18.3.1, react-dom@^18.3.1
- UI: Radix UI primitives + Shadcn-style component layer
- State management: @tanstack/react-query@^5.60.5
- Forms/validation: react-hook-form@^7.55.0, zod@^3.24.2, @hookform/resolvers@^3.10.0
- HTTP client: axios@^1.7.2
- Styling: tailwindcss@^3.4.17, postcss@^8, tailwindcss-animate@^1.0.7

## 3. Folder Structure

### Backend Tree (annotated)

```text
red-dog-radios-backend/
+-- .env
+-- .env.example
+-- .gitignore
+-- README.md
+-- package-lock.json
+-- package.json
+-- src/
    +-- app.js
    +-- config/
        +-- cloudinary.config.js
        +-- email.config.js
        +-- openai.config.js
        +-- resend.config.js
    +-- middlewares/
        +-- adminAuth.middleware.js
        +-- auth.middleware.js
        +-- error.middleware.js
    +-- modules/
        +-- activityLogs/
            +-- activityLog.schema.js
            +-- activityLog.service.js
        +-- admin/
            +-- admin.controller.js
            +-- admin.route.js
            +-- admin.service.js
        +-- agencies/
            +-- agency.controller.js
            +-- agency.route.js
            +-- agency.schema.js
            +-- agency.service.js
        +-- ai/
            +-- ai.controller.js
            +-- ai.route.js
            +-- ai.service.js
        +-- alerts/
            +-- alert.controller.js
            +-- alert.route.js
            +-- alert.schema.js
            +-- alert.service.js
        +-- applications/
            +-- application.controller.js
            +-- application.route.js
            +-- application.schema.js
            +-- application.service.js
        +-- ashleen/
            +-- ashleen.controller.js
            +-- ashleen.route.js
        +-- auth/
            +-- auth.controller.js
            +-- auth.route.js
            +-- auth.service.js
            +-- user.schema.js
        +-- dashboard/
            +-- dashboard.controller.js
            +-- dashboard.route.js
            +-- dashboard.service.js
        +-- digests/
            +-- digest.controller.js
            +-- digest.route.js
            +-- digest.schema.js
            +-- digest.service.js
        +-- followups/
            +-- followup.controller.js
            +-- followup.route.js
            +-- followup.schema.js
            +-- followup.service.js
        +-- funders/
            +-- funder.controller.js
            +-- funder.route.js
            +-- funder.schema.js
            +-- funder.service.js
        +-- matches/
            +-- match.controller.js
            +-- match.route.js
            +-- match.schema.js
            +-- match.service.js
        +-- onboarding/
            +-- onboarding.controller.js
            +-- onboarding.route.js
            +-- onboarding.service.js
        +-- opportunities/
            +-- opportunity.controller.js
            +-- opportunity.route.js
            +-- opportunity.schema.js
            +-- opportunity.service.js
        +-- organizations/
            +-- organization.controller.js
            +-- organization.route.js
            +-- organization.schema.js
            +-- organization.service.js
        +-- outbox/
            +-- outbox.controller.js
            +-- outbox.route.js
            +-- outbox.schema.js
            +-- outbox.service.js
        +-- outreach/
            +-- outreach.controller.js
            +-- outreach.route.js
            +-- outreach.schema.js
            +-- outreach.service.js
        +-- settings/
            +-- settings.controller.js
            +-- settings.route.js
            +-- settings.service.js
        +-- tracker/
            +-- tracker.controller.js
            +-- tracker.route.js
            +-- tracker.service.js
        +-- wins/
            +-- win.controller.js
            +-- win.route.js
            +-- win.schema.js
            +-- win.service.js
    +-- server.js
    +-- utils/
        +-- apiResponse.js
        +-- asyncHandler.js
        +-- cron.jobs.js
        +-- logger.js
        +-- parsePagination.js
        +-- resolveAgencyOrg.js
        +-- seed.js
```

- `src/app.js`: global middleware, health endpoint, route mounts.
- `src/server.js`: env checks, Mongo connect, server start, cron registration.
- `src/modules/*`: domain modules with schema/service/controller/route layering.
- `src/config/*`: provider adapters (email/openai/cloudinary).
- `src/utils/cron.jobs.js`: scheduled jobs.

### Frontend Tree (annotated)

```text
red-dog-radios-frontend/
+-- .env
+-- .env.example
+-- .env.local
+-- .gitignore
+-- README.md
+-- eslint.config.mjs
+-- next-env.d.ts
+-- next.config.ts
+-- package-lock.json
+-- package.json
+-- postcss.config.mjs
+-- public/
    +-- auth-background.png
    +-- favicon.png
    +-- figmaAssets/
        +-- overlay-1.svg
        +-- overlay-2.svg
        +-- overlay-3.svg
        +-- overlay-4.svg
        +-- overlay-5.svg
        +-- overlay.svg
        +-- svg-1.svg
        +-- svg-10.svg
        +-- svg-11.svg
        +-- svg-12.svg
        +-- svg-13.svg
        +-- svg-14.svg
        +-- svg-15.svg
        +-- svg-2.svg
        +-- svg-3.svg
        +-- svg-4.svg
        +-- svg-5.svg
        +-- svg-6.svg
        +-- svg-7.svg
        +-- svg-8.svg
        +-- svg-9.svg
        +-- svg.svg
    +-- file.svg
    +-- globe.svg
    +-- next.svg
    +-- vercel.svg
    +-- window.svg
+-- src/
    +-- app/
        +-- admin/
            +-- (panel)/
                +-- activity/
                    +-- [id]/
                        +-- page.tsx
                    +-- page.tsx
                +-- agencies/
                    +-- [id]/
                        +-- page.tsx
                    +-- page.tsx
                +-- applications/
                    +-- [id]/
                        +-- page.tsx
                    +-- page.tsx
                +-- dashboard/
                    +-- page.tsx
                +-- funders/
                    +-- [id]/
                        +-- edit/
                            +-- page.tsx
                        +-- page.tsx
                    +-- new/
                        +-- page.tsx
                    +-- page.tsx
                +-- layout.tsx
                +-- matches/
                    +-- [id]/
                        +-- page.tsx
                    +-- page.tsx
                +-- opportunities/
                    +-- [id]/
                        +-- edit/
                            +-- page.tsx
                        +-- page.tsx
                    +-- new/
                        +-- page.tsx
                    +-- page.tsx
                +-- settings/
                    +-- page.tsx
                +-- users/
                    +-- [id]/
                        +-- page.tsx
                    +-- page.tsx
            +-- layout.tsx
            +-- login/
                +-- page.tsx
            +-- page.tsx
        +-- agencies/
        +-- alerts/
            +-- page.tsx
        +-- applications/
            +-- [id]/
                +-- page.tsx
            +-- page.tsx
        +-- create-password/
            +-- page.tsx
        +-- dashboard/
            +-- page.tsx
        +-- favicon.ico
        +-- followups/
            +-- page.tsx
        +-- forgot-password/
            +-- page.tsx
        +-- funders/
            +-- [id]/
                +-- page.tsx
            +-- page.tsx
        +-- globals.css
        +-- layout.tsx
        +-- login/
            +-- page.tsx
        +-- matches/
            +-- page.tsx
        +-- not-found.tsx
        +-- onboarding/
            +-- page.tsx
            +-- step1/
                +-- page.tsx
            +-- step2/
                +-- page.tsx
            +-- step3/
                +-- page.tsx
            +-- step4/
                +-- page.tsx
            +-- step5/
                +-- page.tsx
        +-- opportunities/
            +-- page.tsx
        +-- organizations/
            +-- page.tsx
        +-- otp-verification/
            +-- page.tsx
        +-- outbox/
            +-- page.tsx
        +-- outreach/
            +-- [id]/
                +-- page.tsx
            +-- page.tsx
        +-- page.tsx
        +-- providers.tsx
        +-- settings/
            +-- agency/
                +-- page.tsx
            +-- page.tsx
        +-- signup/
            +-- page.tsx
        +-- tracker/
            +-- page.tsx
        +-- weekly-summary/
            +-- page.tsx
        +-- wins/
            +-- page.tsx
    +-- components/
        +-- AppShell.tsx
        +-- AppShellLayout.tsx
        +-- AshleenChat.tsx
        +-- AuthFooter.tsx
        +-- AuthSplitLayout.tsx
        +-- CheckboxFilterDropdown.tsx
        +-- ConditionalAppShell.tsx
        +-- MobileFilterSelect.tsx
        +-- RedDogLogo.tsx
        +-- StatusBadge.tsx
        +-- admin/
            +-- AdminBackLink.tsx
            +-- AdminShell.tsx
            +-- AdminTableViewLink.tsx
            +-- TagSelect.tsx
        +-- settings/
            +-- DeleteAccountModal.tsx
            +-- SettingsPrimitives.tsx
        +-- ui/
            +-- accordion.tsx
            +-- alert-dialog.tsx
            +-- alert.tsx
            +-- aspect-ratio.tsx
            +-- avatar.tsx
            +-- badge.tsx
            +-- breadcrumb.tsx
            +-- button.tsx
            +-- calendar.tsx
            +-- card.tsx
            +-- carousel.tsx
            +-- chart.tsx
            +-- checkbox.tsx
            +-- collapsible.tsx
            +-- command.tsx
            +-- context-menu.tsx
            +-- dialog.tsx
            +-- drawer.tsx
            +-- dropdown-menu.tsx
            +-- form.tsx
            +-- hover-card.tsx
            +-- input-otp.tsx
            +-- input.tsx
            +-- label.tsx
            +-- menubar.tsx
            +-- navigation-menu.tsx
            +-- pagination.tsx
            +-- popover.tsx
            +-- progress.tsx
            +-- radio-group.tsx
            +-- resizable.tsx
            +-- scroll-area.tsx
            +-- select.tsx
            +-- separator.tsx
            +-- sheet.tsx
            +-- sidebar.tsx
            +-- skeleton.tsx
            +-- slider.tsx
            +-- switch.tsx
            +-- table.tsx
            +-- tabs.tsx
            +-- textarea.tsx
            +-- toast.tsx
            +-- toaster.tsx
            +-- toggle-group.tsx
            +-- toggle.tsx
            +-- tooltip.tsx
    +-- hooks/
        +-- use-mobile.tsx
        +-- use-toast.ts
    +-- lib/
        +-- AdminAuthContext.tsx
        +-- AgencyAuthContext.tsx
        +-- AuthContext.tsx
        +-- adminApi.ts
        +-- adminConstants.ts
        +-- api.ts
        +-- authErrors.ts
        +-- constants.ts
        +-- queryClient.ts
        +-- queryKeys.ts
        +-- useAuthGateRedirects.ts
        +-- utils.ts
        +-- validation-schemas.ts
    +-- middleware.ts
    +-- types/
        +-- jsx-globals.d.ts
    +-- views/
        +-- Agencies.tsx
        +-- AgencyProfile.tsx
        +-- Alerts.tsx
        +-- ApplicationBuilder.tsx
        +-- Applications.tsx
        +-- CreatePassword.tsx
        +-- Dashboard.tsx
        +-- FollowUps.tsx
        +-- ForgotPassword.tsx
        +-- FunderDetail.tsx
        +-- Funders.tsx
        +-- Login.tsx
        +-- Matches.tsx
        +-- Opportunities.tsx
        +-- Organizations.tsx
        +-- OtpVerification.tsx
        +-- Outbox.tsx
        +-- OutreachBuilder.tsx
        +-- OutreachList.tsx
        +-- Settings.tsx
        +-- SignUp.tsx
        +-- Tracker.tsx
        +-- WeeklySummary.tsx
        +-- Wins.tsx
        +-- admin/
            +-- AdminSettings.tsx
        +-- not-found.tsx
        +-- onboarding/
            +-- OnboardingWelcome.tsx
            +-- Step1.tsx
            +-- Step2.tsx
            +-- Step3.tsx
            +-- Step4.tsx
            +-- Step5.tsx
        +-- sections/
            +-- PlatformDashboardSection.tsx
            +-- PrimaryNavigationMenuSection.tsx
+-- tailwind.config.ts
+-- tsconfig.json
+-- tsconfig.tsbuildinfo
```

- `src/app/*`: route entry points (agency + admin).
- `src/views/*`: feature screens consumed by route pages.
- `src/lib/*`: API clients, auth contexts, query keys/client.
- `src/components/*`: app shell, admin shell, shared widgets, UI primitives.
- `src/middleware.ts`: role/onboarding route enforcement.

## 4. Architecture & Data Flow

- Frontend talks to backend through `/api/*` rewrite in `next.config.ts`.
- Agency client (`src/lib/api.ts`) and admin client (`src/lib/adminApi.ts`) add Bearer tokens from localStorage.
- 401 handling clears sessions and redirects to login per role (admin vs agency).
- Session persistence uses localStorage + cookies for both roles.
- Domain flow: Organization -> Opportunity -> Match -> Alert -> Application -> Outreach -> Outbox.

## 5. Authentication & Authorization

- Agency auth: register, verify-email OTP, login, forgot-password OTP, reset-password.
- Admin auth: dedicated login via `/api/admin/auth/login`.
- Frontend route protection is cookie-driven in `src/middleware.ts` with onboarding gating.
- Backend auth middleware: `protect` (JWT validation) and `protectAdmin`/`adminAuth` (role enforcement).

## 6. All Modules & Features

### Backend Modules

#### activityLogs
- Purpose: activityLogs domain module.
- Endpoints: none (support/internal module).
- Service exports: log, listAdmin, getByIdAdmin

#### admin
- Purpose: admin domain module.
- Endpoints:
  - GET /api/admin/activity-logs | middleware: protectAdmin | action: ctrl.listActivityLogs
  - GET /api/admin/activity-logs/:id | middleware: protectAdmin | action: ctrl.getActivityLog
  - GET /api/admin/agencies | middleware: protectAdmin | action: ctrl.listAgencies
  - GET /api/admin/agencies/:id | middleware: protectAdmin | action: ctrl.getAgency
  - GET /api/admin/applications | middleware: protectAdmin | action: ctrl.listApplications
  - DELETE /api/admin/applications/:id | middleware: protectAdmin | action: ctrl.deleteApplication
  - GET /api/admin/applications/:id | middleware: protectAdmin | action: ctrl.getApplication
  - PUT /api/admin/applications/:id | middleware: protectAdmin | action: ctrl.updateApplication
  - POST /api/admin/applications/:id/generate-ai | middleware: protectAdmin | action: ctrl.generateApplicationAI
  - PUT /api/admin/applications/:id/status | middleware: protectAdmin | action: ctrl.updateApplicationStatus
  - POST /api/admin/applications/create-for-agency | middleware: protectAdmin | action: ctrl.createApplicationForAgency
  - POST /api/admin/auth/login | middleware: none | action: ctrl.adminLogin
  - GET /api/admin/auth/me | middleware: protectAdmin | action: ctrl.adminMe
  - GET /api/admin/dashboard | middleware: protectAdmin | action: ctrl.dashboard
  - GET /api/admin/funders | middleware: protectAdmin | action: ctrl.listFunders
  - POST /api/admin/funders | middleware: protectAdmin | action: ctrl.createFunder
  - DELETE /api/admin/funders/:id | middleware: protectAdmin | action: ctrl.deleteFunder
  - GET /api/admin/funders/:id | middleware: protectAdmin | action: ctrl.getFunder
  - PUT /api/admin/funders/:id | middleware: protectAdmin | action: ctrl.updateFunder
  - PUT /api/admin/funders/:id/set-limit | middleware: protectAdmin | action: ctrl.setFunderLimit
  - PUT /api/admin/funders/:id/unlock | middleware: protectAdmin | action: ctrl.unlockFunder
  - GET /api/admin/matches | middleware: protectAdmin | action: ctrl.listMatches
  - GET /api/admin/matches/:id | middleware: protectAdmin | action: ctrl.getMatch
  - PUT /api/admin/matches/:id/approve | middleware: protectAdmin | action: ctrl.approveMatch
  - PUT /api/admin/matches/:id/reject | middleware: protectAdmin | action: ctrl.rejectMatch
  - POST /api/admin/matches/recompute-all | middleware: protectAdmin | action: ctrl.recomputeMatches
  - GET /api/admin/opportunities | middleware: protectAdmin | action: ctrl.listOpportunities
  - POST /api/admin/opportunities | middleware: protectAdmin | action: ctrl.createOpportunity
  - DELETE /api/admin/opportunities/:id | middleware: protectAdmin | action: ctrl.deleteOpportunity
  - GET /api/admin/opportunities/:id | middleware: protectAdmin | action: ctrl.getOpportunity
  - PUT /api/admin/opportunities/:id | middleware: protectAdmin | action: ctrl.updateOpportunity
  - GET /api/admin/users | middleware: protectAdmin | action: ctrl.listUsers
  - GET /api/admin/users/:id | middleware: protectAdmin | action: ctrl.getUser
  - PUT /api/admin/users/:id/role | middleware: protectAdmin | action: ctrl.updateUserRole
- Service exports: dashboard, listAgencies, getAgencyDetail, listOpportunitiesAdmin, createOpportunityAdmin, getOpportunityAdmin, updateOpportunityAdmin, deleteOpportunityAdmin, listFundersAdmin, createFunderAdmin, updateFunderAdmin, deleteFunderAdmin, listApplicationsAdmin, getApplicationAdmin, deleteApplicationAdmin, updateApplicationAdmin, updateApplicationStatusAdmin, generateApplicationAIAdmin, createApplicationForAgency, listMatchesAdmin, getMatchAdmin, recomputeAllMatches, getUserAdmin, getFunderAdmin, unlockFunderAdmin, setFunderLimitAdmin, getActivityLogAdmin, listUsersAdmin, updateUserRole, listActivityLogsAdmin, approveMatchAdmin, rejectMatchAdmin

#### agencies
- Purpose: agencies domain module.
- Endpoints:
  - GET /api/agencies | middleware: protect | action: getAll
  - POST /api/agencies | middleware: protect | action: create
  - GET /api/agencies/:id | middleware: protect | action: getOne
  - PUT /api/agencies/:id | middleware: protect | action: update
- Service exports: getAll, create, getOne, update, remove

#### ai
- Purpose: ai domain module.
- Endpoints:
  - POST /api/ai/compute-match | middleware: protect, aiLimiter | action: computeMatch
  - POST /api/ai/generate-application | middleware: protect, aiLimiter | action: generateApplication
  - POST /api/ai/generate-email | middleware: protect, aiLimiter | action: generateEmail
  - POST /api/ai/generate-summary | middleware: protect, aiLimiter | action: generateSummary
- Service exports: generateGrantSummary, generateOutreachEmail, generateApplication, computeMatchWithAI

#### alerts
- Purpose: alerts domain module.
- Endpoints:
  - GET /api/alerts | middleware: protect | action: getAll
  - DELETE /api/alerts/:id | middleware: protect | action: remove
  - PUT /api/alerts/:id/read | middleware: protect | action: markRead
  - PUT /api/alerts/read-all | middleware: protect | action: markAllRead
- Service exports: getAll, markRead, markAllRead, remove, createDeadlineAlerts, createHighFitAlerts
- Background process tie-in: invoked by cron schedules.

#### applications
- Purpose: applications domain module.
- Endpoints:
  - GET /api/applications | middleware: protect | action: getAll
  - POST /api/applications | middleware: protect | action: create
  - DELETE /api/applications/:id | middleware: protect | action: remove
  - GET /api/applications/:id | middleware: protect | action: getOne
  - PUT /api/applications/:id | middleware: protect | action: update
  - POST /api/applications/:id/align | middleware: protect, aiLimiter | action: alignToFunder
  - GET /api/applications/:id/export | middleware: protect | action: exportApplication
  - POST /api/applications/:id/regenerate | middleware: protect, aiLimiter | action: regenerate
  - PUT /api/applications/:id/status | middleware: protect | action: updateStatus
  - PUT /api/applications/:id/submit | middleware: protect | action: submit
  - POST /api/applications/generate | middleware: protect, aiLimiter | action: generate
- Service exports: getAll, create, createWithAI, getOne, update, updateStatus, regenerate, adminRegenerateAI, alignToFunder, exportApplication, submit, remove

#### ashleen
- Purpose: ashleen domain module.
- Endpoints:
  - POST /api/ashleen/chat | middleware: protect | action: chat

#### auth
- Purpose: auth domain module.
- Endpoints:
  - POST /api/auth/forgot-password | middleware: forgotPasswordLimiter | action: forgotPassword
  - POST /api/auth/login | middleware: loginLimiter | action: login
  - GET /api/auth/me | middleware: protect | action: getMe
  - POST /api/auth/register | middleware: none | action: register
  - POST /api/auth/resend-verification | middleware: resendLimiter | action: resendVerificationOtp
  - POST /api/auth/reset-password | middleware: resetPasswordLimiter | action: resetPassword
  - POST /api/auth/verify-email | middleware: otpLimiter | action: verifySignupOtp
  - POST /api/auth/verify-otp | middleware: otpLimiter | action: verifyOtp
- Service exports: register, login, getMe, loginAdmin, forgotPassword, verifyOtp, resetPassword, verifySignupOtp, resendVerificationOtp

#### dashboard
- Purpose: dashboard domain module.
- Endpoints:
  - GET /api/dashboard/stats | middleware: protect | action: getStats
- Service exports: getStats

#### digests
- Purpose: digests domain module.
- Endpoints:
  - GET /api/digests | middleware: protect | action: getAll
  - GET /api/digests/:id | middleware: protect | action: getOne
  - POST /api/digests/:id/send | middleware: protect | action: send
  - POST /api/digests/generate | middleware: protect | action: generate
  - POST /api/digests/preview | middleware: protect | action: preview
- Service exports: getAll, getOne, generateDigest, sendDigest

#### followups
- Purpose: followups domain module.
- Endpoints:
  - GET /api/followups | middleware: protect | action: getAll
  - PUT /api/followups/:id/send | middleware: protect | action: markSent
  - PUT /api/followups/:id/skip | middleware: protect | action: skip
- Service exports: getAll, markSent, skip, scheduleForApplication, backfillMissingFollowUps
- Background process tie-in: invoked by cron schedules.

#### funders
- Purpose: funders domain module.
- Endpoints:
  - GET /api/funders | middleware: protect | action: getAll
  - GET /api/funders/:id | middleware: protect | action: getOne
  - PUT /api/funders/:id | middleware: protect | action: updateAgencyNotes
  - GET /api/funders/:id/queue | middleware: protect | action: getQueue
  - POST /api/funders/:id/save | middleware: protect | action: saveFunder
- Service exports: getAll, getOne, create, update, deactivate, reactivate, saveFunder, computeFunderScore, updateAgencyNotesOnly, getQueueForAgency

#### matches
- Purpose: matches domain module.
- Endpoints:
  - GET /api/matches | middleware: protect | action: getAll
  - POST /api/matches | middleware: protect | action: create
  - GET /api/matches/:id | middleware: protect | action: getOne
  - PUT /api/matches/:id/approve | middleware: protect, protectAdmin | action: approve
  - PUT /api/matches/:id/reject | middleware: protect, protectAdmin | action: reject
  - POST /api/matches/compute | middleware: protect | action: computeAndSave
  - POST /api/matches/compute-all | middleware: protect, computeLimiter | action: computeAll
- Service exports: computeMatchScore, getAll, getOne, create, computeAndSave, approveMatch, rejectMatch, computeAllForOrganization
- Business logic highlight: weighted fit scoring with reasons/disqualifiers/breakdown.

#### onboarding
- Purpose: onboarding domain module.
- Endpoints:
  - POST /api/onboarding/complete | middleware: protect | action: complete
- Service exports: complete
- Business logic highlight: onboarding payload mapping, Organization upsert, user linkage.

#### opportunities
- Purpose: opportunities domain module.
- Endpoints:
  - GET /api/opportunities | middleware: protect | action: getAll
  - GET /api/opportunities/:id | middleware: protect | action: getOne
- Service exports: getAll, create, getOne, update, remove

#### organizations
- Purpose: organizations domain module.
- Endpoints:
  - GET /api/organizations | middleware: protect | action: getAll
  - POST /api/organizations | middleware: protect | action: create
  - GET /api/organizations/:id | middleware: protect | action: getOne
  - PUT /api/organizations/:id | middleware: protect | action: update
- Service exports: getAll, create, getOne, update, remove

#### outbox
- Purpose: outbox domain module.
- Endpoints:
  - GET /api/outbox | middleware: protect | action: getAll
  - GET /api/outbox/:id | middleware: protect | action: getOne
  - POST /api/outbox/:id/retry | middleware: protect | action: retryFailed
  - POST /api/outbox/:id/send | middleware: protect | action: sendEmail
  - POST /api/outbox/queue | middleware: protect | action: queueEmail
- Service exports: getAll, getOne, create, queueEmail, sendEmail, processQueue, retryFailed
- Background process tie-in: invoked by cron schedules.

#### outreach
- Purpose: outreach domain module.
- Endpoints:
  - GET /api/outreach | middleware: protect | action: getAll
  - GET /api/outreach/:id | middleware: protect | action: getOne
  - PUT /api/outreach/:id | middleware: protect | action: update
  - POST /api/outreach/:id/send | middleware: protect | action: sendOutreach
  - PUT /api/outreach/:id/sent | middleware: protect | action: markSent
  - POST /api/outreach/generate | middleware: protect | action: generate
- Service exports: generateFromFunder, generateFromOpportunity, getAll, getOne, update, markSent, send

#### settings
- Purpose: settings domain module.
- Endpoints:
  - GET /api/settings | middleware: protect | action: getSettings
  - PUT /api/settings | middleware: protect | action: updateSettings
  - DELETE /api/settings/account | middleware: protect | action: deleteAccount
- Service exports: getSettings, updateSettings, deleteAccount

#### tracker
- Purpose: tracker domain module.
- Endpoints:
  - GET /api/tracker | middleware: protect | action: getTracker
  - GET /api/tracker/stats | middleware: protect | action: getTrackerStats
- Service exports: getTracker, getTrackerStats

#### wins
- Purpose: wins domain module.
- Endpoints:
  - GET /api/wins | middleware: protect | action: getAll
  - GET /api/wins/insights | middleware: protect | action: getInsights
  - GET /api/wins/patterns | middleware: protect | action: getPatterns
- Service exports: getAll, getInsights, create, getPatterns

### Frontend Pages (App Router)

| Route | Role | Purpose | Data/API hints |
|---|---|---|---|
| / | Public | Root redirect to login | redirect "/login" |
| /admin | Admin | Page route | redirect "/admin/dashboard" |
| /admin/(panel)/activity | Admin | Admin panel view | adminApi.get("admin/activity-logs", {
        params: {
          limit) |
| /admin/(panel)/activity/[id] | Admin | Admin panel view | adminApi.get(`admin/activity-logs/${id}`) |
| /admin/(panel)/agencies | Admin | Admin panel view | adminApi.get("admin/agencies", { params: { search, page, limit: 20 } }) |
| /admin/(panel)/agencies/[id] | Admin | Admin panel view | adminApi.get(`admin/agencies/${id}`); adminApi.get("admin/funders", { params: { limit: 200 } }); adminApi.get("admin/opportunities", { params: { limit: 200 } }) |
| /admin/(panel)/applications | Admin | Admin panel view | adminApi.get("admin/applications", {
        params: {
          limit: 5) |
| /admin/(panel)/applications/[id] | Admin | Admin panel view | adminApi.get(`admin/applications/${appId}`); adminApi.put(`admin/applications/${appId}`, { notes }); adminApi.put(`admin/applications/${appId}/status`, body) |
| /admin/(panel)/dashboard | Admin | Admin panel view | adminApi.get("admin/dashboard") |
| /admin/(panel)/funders | Admin | Admin panel view | adminApi.get("admin/funders", { params: { search, limit: 100 } }); adminApi.post("admin/funders", {
        name: form.name,
        website:) |
| /admin/(panel)/funders/[id] | Admin | Admin panel view | adminApi.get(`admin/funders/${id}`); adminApi.delete(`admin/funders/${id}`) |
| /admin/(panel)/funders/[id]/edit | Admin | Admin panel view | adminApi.get(`admin/funders/${id}`); adminApi.put(`admin/funders/${id}`, {
        name: form.name,
        we) |
| /admin/(panel)/funders/new | Admin | Admin panel view | redirect "/admin/funders" |
| /admin/(panel)/matches | Admin | Admin panel view | adminApi.get("admin/matches", {
        params: {
          page,
       ); adminApi.post("admin/matches/recompute-all") |
| /admin/(panel)/matches/[id] | Admin | Admin panel view | adminApi.get(`admin/matches/${id}`) |
| /admin/(panel)/opportunities | Admin | Admin panel view | adminApi.get("admin/opportunities", {
        params: { limit: 50, status); adminApi.get("admin/funders", { params: { limit: 500 } }); adminApi.post("admin/opportunities", {
        title: form.title,
        ) |
| /admin/(panel)/opportunities/[id] | Admin | Admin panel view | adminApi.get(`admin/opportunities/${id}`); adminApi.delete(`admin/opportunities/${id}`); adminApi.put(`admin/opportunities/${id}`, body) |
| /admin/(panel)/opportunities/[id]/edit | Admin | Admin panel view | adminApi.get(`admin/opportunities/${id}`); adminApi.put(`admin/opportunities/${id}`, {
        title: form.title,
  ) |
| /admin/(panel)/opportunities/new | Admin | Admin panel view | redirect "/admin/opportunities" |
| /admin/(panel)/settings | Admin | Admin panel view | view-driven |
| /admin/(panel)/users | Admin | Admin panel view | adminApi.get("admin/users", { params: { limit: 200 } }) |
| /admin/(panel)/users/[id] | Admin | Admin panel view | adminApi.get(`admin/users/${id}`); adminApi.put(`admin/users/${id}/role`, { role }) |
| /admin/login | Admin | Admin panel view | adminApi.post("admin/auth/login", {
        email: String(data.email) |
| /alerts | Agency | Alerts center | view-driven |
| /applications | Agency | Application list | view-driven |
| /applications/[id] | Agency | Application detail/builder | view-driven |
| /create-password | Public | Create/reset password | view-driven |
| /dashboard | Agency | Agency dashboard | view-driven |
| /followups | Agency | Follow-up queue | view-driven |
| /forgot-password | Public | Password reset start | view-driven |
| /funders | Agency | Funders list | view-driven |
| /funders/[id] | Agency | Funder detail | view-driven |
| /login | Public | Agency login | view-driven |
| /matches | Agency | Match list | view-driven |
| /onboarding | Agency | Onboarding welcome | view-driven |
| /onboarding/step1 | Agency | Onboarding step form | view-driven |
| /onboarding/step2 | Agency | Onboarding step form | view-driven |
| /onboarding/step3 | Agency | Onboarding step form | view-driven |
| /onboarding/step4 | Agency | Onboarding step form | view-driven |
| /onboarding/step5 | Agency | Onboarding step form | view-driven |
| /opportunities | Agency | Browse opportunities | view-driven |
| /organizations | Agency | Page route | redirect "/settings" |
| /otp-verification | Public | OTP verification | view-driven |
| /outbox | Agency | Page route | redirect "/dashboard" |
| /outreach | Agency | Outreach list | view-driven |
| /outreach/[id] | Agency | Outreach editor | view-driven |
| /settings | Agency | User and org settings | view-driven |
| /settings/agency | Agency | Agency profile settings | view-driven |
| /signup | Public | Agency signup | view-driven |
| /tracker | Agency | Application tracker | view-driven |
| /weekly-summary | Agency | Weekly digest view | view-driven |
| /wins | Agency | Wins and insights | view-driven |

## 7. Database Schema

Models detected in backend schemas:

- **ActivityLog** (red-dog-radios-backend/src/modules/activityLogs/activityLog.schema.js)
  - Key fields (top-level parse): category, enum, required
  - Indexes: { createdAt: -1 }
- **Agency** (red-dog-radios-backend/src/modules/agencies/agency.schema.js)
  - Key fields (top-level parse): name
- **Alert** (red-dog-radios-backend/src/modules/alerts/alert.schema.js)
  - Key fields (top-level parse): organization
  - Indexes: { alertKey: 1 }, { unique: true, sparse: true }
- **Application** (red-dog-radios-backend/src/modules/applications/application.schema.js)
  - Key fields (top-level parse): organization
  - Indexes: { organization: 1, status: 1 } ; { organization: 1, createdAt: -1 } ; { funder: 1 }
- **User** (red-dog-radios-backend/src/modules/auth/user.schema.js)
  - Key fields (top-level parse): fullName
  - Indexes: { organizationId: 1 }
- **Digest** (red-dog-radios-backend/src/modules/digests/digest.schema.js)
  - Key fields (top-level parse): organization
- **FollowUp** (red-dog-radios-backend/src/modules/followups/followup.schema.js)
  - Key fields (top-level parse): application
  - Indexes: { application: 1 } ; { scheduledFor: 1, status: 1 }
- **Funder** (red-dog-radios-backend/src/modules/funders/funder.schema.js)
  - Key fields (top-level parse): name
  - Indexes: { status: 1, isLocked: 1 }
- **Match** (red-dog-radios-backend/src/modules/matches/match.schema.js)
  - Key fields (top-level parse): organization
  - Indexes: { organization: 1, opportunity: 1 }, { unique: true }
- **Opportunity** (red-dog-radios-backend/src/modules/opportunities/opportunity.schema.js)
  - Key fields (top-level parse): title
  - Indexes: { status: 1, deadline: 1 }
- **Organization** (red-dog-radios-backend/src/modules/organizations/organization.schema.js)
  - Key fields (top-level parse): name
- **Outbox** (red-dog-radios-backend/src/modules/outbox/outbox.schema.js)
  - Key fields (top-level parse): recipient
  - Indexes: { emailKey: 1 }, { unique: true, sparse: true } ; { status: 1, scheduledFor: 1 }
- **Outreach** (red-dog-radios-backend/src/modules/outreach/outreach.schema.js)
  - Key fields (top-level parse): organization
- **Win** (red-dog-radios-backend/src/modules/wins/win.schema.js)
  - Key fields (top-level parse): applicationId
  - Indexes: { agencyType: 1, funderName: 1 }

Relationships and intent by model:
- User -> Organization (organizationId), role-based access, OTP/reset fields, settings.
- Organization -> createdBy(User), used by Matches/Applications/Alerts/Tracker.
- Opportunity -> core grant metadata and eligibility data.
- Match -> Organization x Opportunity unique pair with fit and breakdown.
- Application -> organization/opportunity/funder lifecycle and narrative content.
- Alert/Digest/Outbox/FollowUp -> notification and communication pipeline.
- Funder/Win/Outreach/ActivityLog/Agency -> supporting operational features.

## 8. Environment Variables

### Backend

| Variable | Required | Configures |
|---|---|---|
| MONGO_URI | Yes | MongoDB connection |
| JWT_SECRET | Yes | JWT signing |
| PORT | No | HTTP port |
| NODE_ENV | No | Runtime mode |
| JWT_EXPIRES_IN | No | Token expiry |
| CORS_ORIGIN | No | CORS origin |
| OPENAI_API_KEY | No | OpenAI integration |
| OPENAI_MODEL | No | Ashleen model override |
| SMTP_HOST | No | SMTP transport |
| SMTP_PORT | No | SMTP transport |
| SMTP_USER | No | SMTP auth/from |
| SMTP_PASS | No | SMTP auth |
| SMTP_FROM | No | Mail from |
| SMTP_SECURE | No | SMTP TLS |
| DEV_REDIRECT_EMAIL | No | Dev email redirect |
| ADMIN_EMAIL | No | Cron error alert email |
| FRONTEND_URL | No | Email links |
| CLOUDINARY_CLOUD_NAME | No | Cloudinary |
| CLOUDINARY_API_KEY | No | Cloudinary |
| CLOUDINARY_API_SECRET | No | Cloudinary |

### Frontend

| Variable | Required | Configures |
|---|---|---|
| API_ORIGIN | No | Server rewrite backend origin |
| NEXT_PUBLIC_API_ORIGIN | No | Public rewrite fallback |
| REPLIT_DEV_DOMAIN | No | Allowed dev origin |
| NODE_ENV | No | Client-mode checks |

## 9. Key Business Logic

- **Match scoring engine**: `src/modules/matches/match.service.js` scores agency type, location, keywords, deadline, award fit, timeline, completeness, local-match; outputs `fitScore`, `breakdown`, `reasons`, `disqualifiers`, `recommendedAction`.
- **Onboarding completion**: `src/modules/onboarding/onboarding.service.js` validates input, maps enums, creates/updates Organization, syncs Agency compatibility record, marks onboarding complete.
- **Alert + digest generation**: `src/modules/alerts/*` and `src/modules/digests/*` support threshold-based alerts and weekly summary generation/preview/send.
- **Outbox queue processing**: `src/modules/outbox/outbox.service.js` and cron run scheduled queue send + retry logic.

## 10. API Reference

| Module | Method | Path | Middleware | Controller Action |
|---|---|---|---|---|
| admin | GET | /api/admin/activity-logs | protectAdmin | ctrl.listActivityLogs |
| admin | GET | /api/admin/activity-logs/:id | protectAdmin | ctrl.getActivityLog |
| admin | GET | /api/admin/agencies | protectAdmin | ctrl.listAgencies |
| admin | GET | /api/admin/agencies/:id | protectAdmin | ctrl.getAgency |
| admin | GET | /api/admin/applications | protectAdmin | ctrl.listApplications |
| admin | DELETE | /api/admin/applications/:id | protectAdmin | ctrl.deleteApplication |
| admin | GET | /api/admin/applications/:id | protectAdmin | ctrl.getApplication |
| admin | PUT | /api/admin/applications/:id | protectAdmin | ctrl.updateApplication |
| admin | POST | /api/admin/applications/:id/generate-ai | protectAdmin | ctrl.generateApplicationAI |
| admin | PUT | /api/admin/applications/:id/status | protectAdmin | ctrl.updateApplicationStatus |
| admin | POST | /api/admin/applications/create-for-agency | protectAdmin | ctrl.createApplicationForAgency |
| admin | POST | /api/admin/auth/login | none | ctrl.adminLogin |
| admin | GET | /api/admin/auth/me | protectAdmin | ctrl.adminMe |
| admin | GET | /api/admin/dashboard | protectAdmin | ctrl.dashboard |
| admin | GET | /api/admin/funders | protectAdmin | ctrl.listFunders |
| admin | POST | /api/admin/funders | protectAdmin | ctrl.createFunder |
| admin | DELETE | /api/admin/funders/:id | protectAdmin | ctrl.deleteFunder |
| admin | GET | /api/admin/funders/:id | protectAdmin | ctrl.getFunder |
| admin | PUT | /api/admin/funders/:id | protectAdmin | ctrl.updateFunder |
| admin | PUT | /api/admin/funders/:id/set-limit | protectAdmin | ctrl.setFunderLimit |
| admin | PUT | /api/admin/funders/:id/unlock | protectAdmin | ctrl.unlockFunder |
| admin | GET | /api/admin/matches | protectAdmin | ctrl.listMatches |
| admin | GET | /api/admin/matches/:id | protectAdmin | ctrl.getMatch |
| admin | PUT | /api/admin/matches/:id/approve | protectAdmin | ctrl.approveMatch |
| admin | PUT | /api/admin/matches/:id/reject | protectAdmin | ctrl.rejectMatch |
| admin | POST | /api/admin/matches/recompute-all | protectAdmin | ctrl.recomputeMatches |
| admin | GET | /api/admin/opportunities | protectAdmin | ctrl.listOpportunities |
| admin | POST | /api/admin/opportunities | protectAdmin | ctrl.createOpportunity |
| admin | DELETE | /api/admin/opportunities/:id | protectAdmin | ctrl.deleteOpportunity |
| admin | GET | /api/admin/opportunities/:id | protectAdmin | ctrl.getOpportunity |
| admin | PUT | /api/admin/opportunities/:id | protectAdmin | ctrl.updateOpportunity |
| admin | GET | /api/admin/users | protectAdmin | ctrl.listUsers |
| admin | GET | /api/admin/users/:id | protectAdmin | ctrl.getUser |
| admin | PUT | /api/admin/users/:id/role | protectAdmin | ctrl.updateUserRole |
| agencies | GET | /api/agencies | protect | getAll |
| agencies | POST | /api/agencies | protect | create |
| agencies | GET | /api/agencies/:id | protect | getOne |
| agencies | PUT | /api/agencies/:id | protect | update |
| ai | POST | /api/ai/compute-match | protect, aiLimiter | computeMatch |
| ai | POST | /api/ai/generate-application | protect, aiLimiter | generateApplication |
| ai | POST | /api/ai/generate-email | protect, aiLimiter | generateEmail |
| ai | POST | /api/ai/generate-summary | protect, aiLimiter | generateSummary |
| alerts | GET | /api/alerts | protect | getAll |
| alerts | DELETE | /api/alerts/:id | protect | remove |
| alerts | PUT | /api/alerts/:id/read | protect | markRead |
| alerts | PUT | /api/alerts/read-all | protect | markAllRead |
| applications | GET | /api/applications | protect | getAll |
| applications | POST | /api/applications | protect | create |
| applications | DELETE | /api/applications/:id | protect | remove |
| applications | GET | /api/applications/:id | protect | getOne |
| applications | PUT | /api/applications/:id | protect | update |
| applications | POST | /api/applications/:id/align | protect, aiLimiter | alignToFunder |
| applications | GET | /api/applications/:id/export | protect | exportApplication |
| applications | POST | /api/applications/:id/regenerate | protect, aiLimiter | regenerate |
| applications | PUT | /api/applications/:id/status | protect | updateStatus |
| applications | PUT | /api/applications/:id/submit | protect | submit |
| applications | POST | /api/applications/generate | protect, aiLimiter | generate |
| ashleen | POST | /api/ashleen/chat | protect | chat |
| auth | POST | /api/auth/forgot-password | forgotPasswordLimiter | forgotPassword |
| auth | POST | /api/auth/login | loginLimiter | login |
| auth | GET | /api/auth/me | protect | getMe |
| auth | POST | /api/auth/register | none | register |
| auth | POST | /api/auth/resend-verification | resendLimiter | resendVerificationOtp |
| auth | POST | /api/auth/reset-password | resetPasswordLimiter | resetPassword |
| auth | POST | /api/auth/verify-email | otpLimiter | verifySignupOtp |
| auth | POST | /api/auth/verify-otp | otpLimiter | verifyOtp |
| dashboard | GET | /api/dashboard/stats | protect | getStats |
| digests | GET | /api/digests | protect | getAll |
| digests | GET | /api/digests/:id | protect | getOne |
| digests | POST | /api/digests/:id/send | protect | send |
| digests | POST | /api/digests/generate | protect | generate |
| digests | POST | /api/digests/preview | protect | preview |
| followups | GET | /api/followups | protect | getAll |
| followups | PUT | /api/followups/:id/send | protect | markSent |
| followups | PUT | /api/followups/:id/skip | protect | skip |
| funders | GET | /api/funders | protect | getAll |
| funders | GET | /api/funders/:id | protect | getOne |
| funders | PUT | /api/funders/:id | protect | updateAgencyNotes |
| funders | GET | /api/funders/:id/queue | protect | getQueue |
| funders | POST | /api/funders/:id/save | protect | saveFunder |
| matches | GET | /api/matches | protect | getAll |
| matches | POST | /api/matches | protect | create |
| matches | GET | /api/matches/:id | protect | getOne |
| matches | PUT | /api/matches/:id/approve | protect, protectAdmin | approve |
| matches | PUT | /api/matches/:id/reject | protect, protectAdmin | reject |
| matches | POST | /api/matches/compute | protect | computeAndSave |
| matches | POST | /api/matches/compute-all | protect, computeLimiter | computeAll |
| onboarding | POST | /api/onboarding/complete | protect | complete |
| opportunities | GET | /api/opportunities | protect | getAll |
| opportunities | GET | /api/opportunities/:id | protect | getOne |
| organizations | GET | /api/organizations | protect | getAll |
| organizations | POST | /api/organizations | protect | create |
| organizations | GET | /api/organizations/:id | protect | getOne |
| organizations | PUT | /api/organizations/:id | protect | update |
| outbox | GET | /api/outbox | protect | getAll |
| outbox | GET | /api/outbox/:id | protect | getOne |
| outbox | POST | /api/outbox/:id/retry | protect | retryFailed |
| outbox | POST | /api/outbox/:id/send | protect | sendEmail |
| outbox | POST | /api/outbox/queue | protect | queueEmail |
| outreach | GET | /api/outreach | protect | getAll |
| outreach | GET | /api/outreach/:id | protect | getOne |
| outreach | PUT | /api/outreach/:id | protect | update |
| outreach | POST | /api/outreach/:id/send | protect | sendOutreach |
| outreach | PUT | /api/outreach/:id/sent | protect | markSent |
| outreach | POST | /api/outreach/generate | protect | generate |
| settings | GET | /api/settings | protect | getSettings |
| settings | PUT | /api/settings | protect | updateSettings |
| settings | DELETE | /api/settings/account | protect | deleteAccount |
| tracker | GET | /api/tracker | protect | getTracker |
| tracker | GET | /api/tracker/stats | protect | getTrackerStats |
| wins | GET | /api/wins | protect | getAll |
| wins | GET | /api/wins/insights | protect | getInsights |
| wins | GET | /api/wins/patterns | protect | getPatterns |

## 11. Frontend Pages & Components

- Total App Router page files: 52
- Shared component files under src/components: 63
- Key reusable components:
  - App shell/layout: AppShell, AppShellLayout, ConditionalAppShell
  - Admin shell: AdminShell, AdminTableViewLink, AdminBackLink, TagSelect
  - Auth/layout: AuthSplitLayout, AuthFooter, RedDogLogo
  - Domain helpers: AshleenChat, StatusBadge, filter/select components
  - Settings primitives: SettingsPrimitives, DeleteAccountModal
  - UI primitives: src/components/ui/* (buttons, forms, table, dialogs, toasts, etc.)

## 12. Known Issues & Pending Work

- OpenAI/email features run in fallback/stub mode when keys are missing.
- Cloudinary is configured but not yet fully wired through active feature flows.
- Root and frontend testing is missing (no robust automated test suite found).
- Frontend README remains default Next.js template; project-specific docs are incomplete.
- Some routes are redirect-only or placeholders, requiring continued feature hardening.

## 13. Setup & Run Instructions

### Local Setup

1. Backend
   - cd red-dog-radios-backend
   - npm install
   - Copy/edit .env from .env.example (required: MONGO_URI, JWT_SECRET)
   - npm run dev
2. Frontend
   - cd red-dog-radios-frontend
   - npm install
   - Ensure API_ORIGIN/NEXT_PUBLIC_API_ORIGIN points to backend (default localhost:4000)
   - npm run dev
3. Verify
   - Backend health: http://localhost:4000/health
   - API docs: http://localhost:4000/api-docs
   - Frontend: http://localhost:3000

### Seed Data

- cd red-dog-radios-backend
- npm run seed

### Optional script

- Root `start.sh` can start MongoDB + backend + frontend in sequence (Replit-oriented).
