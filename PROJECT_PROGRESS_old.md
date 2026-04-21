# Project Progress & Documentation

## 🔹 Overview

- Red Dog Radios is a full-stack grant intelligence platform for agency users and staff admins.
- Purpose: centralize grant discovery, fit scoring, application tracking, outreach, alerts, and operational dashboards.
- Architecture is split into a Node.js/Express/MongoDB backend API and a Next.js frontend.

## 🔹 Tech Stack

- Backend
  - Node.js (CommonJS)
  - Express 4
  - MongoDB + Mongoose 8
  - JWT auth (`jsonwebtoken`) + password hashing (`bcryptjs`)
  - API protection/middleware: `helmet`, `cors`, `express-rate-limit`, `morgan`
  - Scheduling: `node-cron`
  - API docs: `swagger-jsdoc` + `swagger-ui-express`
  - Email: `nodemailer` + `resend`
  - AI: `openai` (with stub fallback when key is missing)
- Frontend
  - Next.js 15 (App Router) + React 18 + TypeScript
  - Tailwind CSS + Radix UI components
  - React Query (`@tanstack/react-query`) for async data state
  - Axios for API communication
  - React Hook Form + Zod for validation
- Tooling
  - `nodemon` for backend dev
  - ESLint configured in frontend
  - Replit startup script (`start.sh`) for Mongo + backend + frontend boot sequence

## 🔹 Architecture

- High-level structure
  - `red-dog-radios-backend/`: modular REST API with domain-driven folders under `src/modules`.
  - `red-dog-radios-frontend/`: Next.js App Router routes in `src/app`, reusable view components in `src/views` and `src/components`.
  - `data/db/`: local MongoDB data files.
- Folder organization
  - Backend modules follow `*.schema.js`, `*.service.js`, `*.controller.js`, `*.route.js` pattern.
  - Shared backend concerns in `src/middlewares`, `src/config`, and `src/utils`.
  - Frontend separates page routes from view-level UI and context providers.
- Key design decisions
  - JWT + cookie/localStorage hybrid session handling for agency and admin roles.
  - API proxying via Next.js rewrites (`/api/*` -> backend origin).
  - Defensive fallbacks for AI/email features when external services are not configured.
  - Background automation through cron jobs for scoring refresh, alerts, follow-ups, and outbox processing.

## 🔹 Features Implemented

- Authentication & identity
  - Agency signup/login with OTP email verification.
  - Admin login path separated from agency login.
  - Forgot password flow with OTP verification and reset token.
- Onboarding
  - Multi-step onboarding captured in frontend routes.
  - Backend onboarding completion creates/updates organization profile and links it to user.
- Core grant intelligence
  - Opportunity, organization, match, application, and agency modules implemented with CRUD/list APIs.
  - Match scoring engine returns fit score, reasons, disqualifiers, and per-dimension breakdown.
- Alerts, digests, outreach, and outbox
  - Alert generation endpoints and scheduled jobs.
  - Digest generation/preview/send flow.
  - Outreach entities and outbox queue processing.
- Admin and operations
  - Admin panel routes/pages for users, agencies, applications, opportunities, funders, matches, settings, and activity.
  - Dashboard stats service aggregates opportunities, matches, outbox, alerts, and funding metrics.
- Developer experience
  - Health endpoint and Swagger docs.
  - Seed script for initial admin/demo data.

## 🔹 Current Progress

- Backend API is structurally complete and modular, with broad route coverage wired in `app.js`.
- Frontend route surface is extensive (agency app + admin panel + onboarding + settings + auth flows).
- Auth/session gating is implemented in both frontend middleware and context providers.
- Match scoring, scheduled jobs, and dashboard aggregation logic are implemented in service layer.
- API rewrite setup exists in Next.js config, enabling frontend-to-backend proxying in local/dev.
- Seed script and startup script are present for local/demo environment bootstrapping.

## 🔹 Pending Work

- Production readiness
  - Configure real external providers (OpenAI, SMTP/Resend, Cloudinary) in environment.
  - Harden secret/config management and deployment environment defaults.
- Quality and reliability
  - Add automated tests (unit/integration/e2e) across backend services and frontend flows.
  - Expand CI checks for linting/build/test gates.
- Documentation
  - Update frontend README (currently default Next.js template) to project-specific docs.
  - Consolidate runbook for local, staging, and production setups.
- UX/data consistency
  - Validate all admin and agency pages against real backend payloads and edge cases.
  - Perform full end-to-end verification for onboarding -> scoring -> application -> outreach lifecycle.

## 🔹 Known Issues / Bugs

- External service stubs are active when keys/config are missing:
  - AI generation/scoring returns fallback content.
  - Email sending can run in stub/non-fatal mode.
- Tool-reported style/lint diagnostics exist in backend files (non-blocking from this review, but should be cleaned).
- Root workspace `package.json` appears minimal and not representative of full app orchestration.
- No test suite is configured at workspace root (`npm test` is placeholder).

## 🔹 Important Code Explanation

- Match scoring engine
  - `matches/match.service.js` computes a weighted score (agency type, geography, keyword overlap, deadline viability, award fit, timeline alignment, completeness, local-match capability).
  - Output includes `fitScore`, `breakdown`, `reasons`, `disqualifiers`, and `recommendedAction`, then upserts per organization/opportunity pair.
- Auth + OTP lifecycle
  - `auth/auth.service.js` handles registration, OTP generation/verification, login, admin login, and password reset.
  - Password reset avoids double hashing by directly updating hashed password in DB after validation.
- Onboarding completion
  - `onboarding/onboarding.service.js` validates and maps frontend values (agency types, budget ranges), creates/updates organization, syncs agency compatibility record, marks onboarding complete, and links user->organization.
- Request access control
  - Frontend `middleware.ts` enforces route access by token cookies (`rdg_token`, `rdg_admin_token`) and onboarding state (`rdg_onboarding`).
  - Frontend auth contexts keep agency/admin sessions isolated and clear cross-role sessions on login.
- Background jobs
  - `utils/cron.jobs.js` schedules nightly match refresh, alert generation, follow-up backfill, and hourly outbox processing, with admin notification on cron errors.

## 🔹 API / Data Flow (if applicable)

- Agency auth flow
  - Frontend submits auth requests to `/api/auth/*` through Axios client.
  - Backend validates credentials/OTP and returns JWT + user object.
  - Frontend stores token/user in localStorage and sets cookies (`rdg_token`, `rdg_onboarding`) used by middleware gating.
- Admin auth flow
  - Frontend uses `/api/admin/auth/login`.
  - Admin JWT is stored separately (`rdg_admin_token`) and used for admin route protection.
- Data access flow
  - Next.js rewrites proxy frontend `/api/*` calls to backend origin.
  - Axios request interceptor adds bearer token from storage.
  - Axios response interceptor handles `401` by clearing session and redirecting to login for non-auth endpoints.
- Domain flow example
  - Organization and opportunity data feed match computation.
  - Match results drive alerts/dashboard metrics.
  - Applications/outreach feed follow-up and outbox processes.

## 🔹 Setup & Run Instructions

- Prerequisites
  - Node.js (LTS)
  - MongoDB (local service or hosted URI)
- Backend setup
  - `cd red-dog-radios-backend`
  - `npm install`
  - Configure `.env` with at least `MONGO_URI` and `JWT_SECRET`
  - Optional: configure OpenAI/SMTP/Resend/Cloudinary keys
  - `npm run dev` (or `npm start`)
- Frontend setup
  - `cd red-dog-radios-frontend`
  - `npm install`
  - Ensure backend is reachable (default `http://localhost:4000` unless overridden)
  - `npm run dev`
- Optional full startup script
  - From workspace root: run `start.sh` (starts MongoDB, backend, and frontend in sequence; configured for Replit-style environment).
- Seed demo data (optional)
  - `cd red-dog-radios-backend`
  - `npm run seed`

## 🔹 Next Steps

- Configure and verify real integrations:
  - OpenAI, email provider, and Cloudinary with production-safe environment setup.
- Add automated testing baseline:
  - Backend service tests for auth/onboarding/match scoring.
  - Frontend e2e tests for login/onboarding/dashboard/admin workflows.
- Perform full integration QA:
  - Validate all high-traffic paths and admin actions against real data.
- Tighten docs and operations:
  - Replace default frontend README with project runbook.
  - Add deployment and monitoring checklist (health checks, cron visibility, alerting).
