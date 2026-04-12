# Red Dog — Codebase audit

This document reflects the repository state as of the audit (April 2026). Paths are relative to the repo root: `Red Dog/`.

---

## 1. PROJECT STRUCTURE

### 1.1 Frontend (`red-dog-radios-frontend/`)

**Framework and libraries (from `red-dog-radios-frontend/package.json`):**

| Category | Package | Version |
|----------|---------|---------|
| Framework | `next` | 15.2.6 |
| UI | `react`, `react-dom` | ^18.3.1 |
| Language | `typescript` | ^5 |
| Styling | `tailwindcss` | ^3.4.17 |
| Forms / validation | `react-hook-form`, `@hookform/resolvers`, `zod`, `zod-validation-error` | ^7.55.0, ^3.10.0, ^3.24.2, ^3.4.0 |
| Data fetching | `@tanstack/react-query` | ^5.60.5 |
| HTTP client | **`axios` is imported in `src/lib/api.ts` and `src/lib/adminApi.ts` but is not listed in `package.json` or present in `package-lock.json`** | — |
| UI primitives | `@radix-ui/*` (many), `lucide-react`, `class-variance-authority`, `clsx`, `tailwind-merge`, `tailwindcss-animate` | per `package.json` |
| Other | `date-fns`, `framer-motion`, `recharts`, `embla-carousel-react`, `react-day-picker`, `input-otp`, `vaul`, `cmdk`, `next-themes`, `react-icons`, `react-resizable-panels` | per `package.json` |

**`next.config.ts`:** rewrites `/api/:path*` → `http://localhost:4000/api/:path*` (backend must run on port 4000 for local API calls).

**Folder / file tree (excluding `node_modules/`, `.next/`, build caches):**

```
red-dog-radios-frontend/
├── eslint.config.mjs
├── next.config.ts
├── next-env.d.ts
├── package.json
├── package-lock.json
├── postcss.config.mjs
├── public/
│   ├── auth-background.png, favicon.png, file.svg, globe.svg, next.svg, vercel.svg, window.svg
│   └── figmaAssets/   (overlay*.svg, svg*.svg)
├── README.md
├── tailwind.config.ts
├── tsconfig.json
├── tsconfig.tsbuildinfo
└── src/
    ├── app/
    │   ├── layout.tsx
    │   ├── page.tsx                    → redirect `/` → `/login`
    │   ├── globals.css
    │   ├── favicon.ico
    │   ├── providers.tsx               → QueryClient, Toaster, TooltipProvider, AuthProvider
    │   ├── not-found.tsx
    │   ├── login/page.tsx
    │   ├── signup/page.tsx
    │   ├── forgot-password/page.tsx
    │   ├── otp-verification/page.tsx
    │   ├── create-password/page.tsx
    │   ├── onboarding/page.tsx, step1–step5/page.tsx
    │   ├── dashboard/page.tsx
    │   ├── opportunities/page.tsx
    │   ├── matches/page.tsx
    │   ├── applications/page.tsx, [id]/page.tsx
    │   ├── tracker/page.tsx
    │   ├── wins/page.tsx
    │   ├── settings/page.tsx
    │   ├── funders/page.tsx, [id]/page.tsx
    │   ├── alerts/page.tsx
    │   ├── weekly-summary/page.tsx
    │   ├── outbox/page.tsx
    │   ├── outreach/[id]/page.tsx
    │   ├── organizations/page.tsx      → server redirect to `/settings`
    │   ├── agencies/page.tsx           → imports missing `@/views/Agencies`
    │   └── admin/
    │       ├── layout.tsx              → AdminAuthProvider
    │       ├── page.tsx                → redirect → `/admin/dashboard`
    │       ├── login/page.tsx
    │       └── (panel)/
    │           ├── layout.tsx          → AdminShell
    │           ├── dashboard/page.tsx
    │           ├── activity/page.tsx, [id]/page.tsx
    │           ├── agencies/page.tsx, [id]/page.tsx
    │           ├── opportunities/page.tsx, new/page.tsx, [id]/page.tsx, [id]/edit/page.tsx
    │           ├── funders/page.tsx, new/page.tsx, [id]/page.tsx, [id]/edit/page.tsx
    │           ├── applications/page.tsx, [id]/page.tsx
    │           ├── matches/page.tsx      → redirect → `/admin/dashboard`
    │           ├── users/page.tsx, [id]/page.tsx
    │           └── settings/page.tsx
    ├── components/
    │   ├── AppShell.tsx, AppShellLayout.tsx, AuthSplitLayout.tsx, AuthFooter.tsx, ConditionalAppShell.tsx
    │   ├── RedDogLogo.tsx, AshleenChat.tsx, CheckboxFilterDropdown.tsx, MobileFilterSelect.tsx
    │   ├── admin/ AdminBackLink.tsx, AdminShell.tsx, AdminTableViewLink.tsx
    │   ├── settings/ DeleteAccountModal.tsx, SettingsPrimitives.tsx
    │   └── ui/   (shadcn-style: accordion, alert, button, card, dialog, form, input, table, …)
    ├── hooks/ use-mobile.tsx, use-toast.ts
    ├── lib/
    │   ├── api.ts, adminApi.ts, queryClient.ts, queryKeys.ts, utils.ts, validation-schemas.ts
    │   ├── AuthContext.tsx             → re-exports AgencyAuthProvider / useAgencyAuth
    │   ├── AgencyAuthContext.tsx
    │   └── AdminAuthContext.tsx
    ├── middleware.ts                   → agency + admin cookie gates
    ├── types/jsx-globals.d.ts
    └── views/
        ├── Login.tsx, SignUp.tsx, ForgotPassword.tsx, OtpVerification.tsx, CreatePassword.tsx
        ├── Dashboard.tsx               → PlatformDashboardSection
        ├── Opportunities.tsx, Matches.tsx, Applications.tsx, ApplicationBuilder.tsx
        ├── Tracker.tsx, Wins.tsx, Alerts.tsx, WeeklySummary.tsx, Outbox.tsx, OutreachBuilder.tsx
        ├── Funders.tsx, FunderDetail.tsx, Settings.tsx
        ├── Organizations.tsx         (not mounted by `/organizations`; page redirects)
        ├── not-found.tsx
        ├── admin/AdminSettings.tsx
        ├── onboarding/ OnboardingWelcome.tsx, Step1–Step5.tsx
        └── sections/ PlatformDashboardSection.tsx, PrimaryNavigationMenuSection.tsx
```

### 1.2 Backend (`red-dog-radios-backend/`)

**Runtime and libraries (from `red-dog-radios-backend/package.json`):**

| Category | Package | Version |
|----------|---------|---------|
| Runtime | Node (implied) | — |
| HTTP | `express` | ^4.19.2 |
| Database | `mongoose`, `mongoose-paginate-v2` | ^8.3.4, ^1.8.3 |
| Auth | `jsonwebtoken`, `bcryptjs` | ^9.0.2, ^2.4.3 |
| Security / ops | `helmet`, `cors`, `morgan`, `express-rate-limit` | per `package.json` |
| Other | `dotenv`, `multer`, `cloudinary`, `nodemailer`, `node-cron`, `openai`, `swagger-jsdoc`, `swagger-ui-express` | per `package.json` |
| Dev | `nodemon` | ^3.1.0 |

**Entry:** `src/server.js` (default `PORT` 4000, `MONGO_URI` `mongodb://localhost:27017/reddog_db`).

**Folder / file tree (excluding `node_modules/`):**

```
red-dog-radios-backend/
├── .env, .env.example
├── package.json
├── package-lock.json
├── README.md
└── src/
    ├── app.js                          → mounts all `/api/*` routes, `/health`, `/api-docs`
    ├── server.js
    ├── config/ cloudinary.config.js, email.config.js, openai.config.js
    ├── middlewares/ auth.middleware.js, adminAuth.middleware.js, error.middleware.js
    ├── utils/ apiResponse.js, asyncHandler.js, cron.jobs.js, logger.js, resolveAgencyOrg.js, seed.js
    └── modules/
        ├── auth/ user.schema.js, auth.route.js, auth.controller.js, auth.service.js
        ├── organizations/
        ├── opportunities/
        ├── matches/
        ├── applications/
        ├── agencies/
        ├── alerts/
        ├── outbox/
        ├── digests/
        ├── ai/
        ├── dashboard/
        ├── onboarding/
        ├── settings/
        ├── funders/
        ├── wins/
        ├── outreach/
        ├── followups/
        ├── tracker/
        ├── ashleen/
        ├── admin/
        └── activityLogs/ activityLog.schema.js, activityLog.service.js  (no dedicated route file; used by services/admin)
```

---

## 2. AGENCY (USER) SIDE

### 2.1 Routes / pages (Next.js App Router)

Public (no agency cookie required; see `src/middleware.ts`):

| URL | File | View / behavior |
|-----|------|-----------------|
| `/` | `src/app/page.tsx` | `redirect("/login")` |
| `/login` | `src/app/login/page.tsx` | `Login` |
| `/signup` | `src/app/signup/page.tsx` | `SignUp` |
| `/forgot-password` | `src/app/forgot-password/page.tsx` | `ForgotPassword` |
| `/otp-verification` | `src/app/otp-verification/page.tsx` | `OtpVerification` |
| `/create-password` | `src/app/create-password/page.tsx` | `CreatePassword` |

Onboarding (allowed when `rdg_onboarding=0` cookie):

| URL | File | Component |
|-----|------|-----------|
| `/onboarding` | `src/app/onboarding/page.tsx` | welcome flow |
| `/onboarding/step1` … `step5` | matching `page.tsx` files | `OnboardingStep1` … `OnboardingStep5` |

Authenticated agency shell (`AppShell` via `ConditionalAppShell` when path not in auth layout list):

| URL | File | Primary view component |
|-----|------|------------------------|
| `/dashboard` | `src/app/dashboard/page.tsx` | `Dashboard` → `PlatformDashboardSection` |
| `/opportunities` | `src/app/opportunities/page.tsx` | `Opportunities` |
| `/matches` | `src/app/matches/page.tsx` | `Matches` |
| `/applications` | `src/app/applications/page.tsx` | `Applications` |
| `/applications/[id]` | `src/app/applications/[id]/page.tsx` | `ApplicationBuilder` |
| `/tracker` | `src/app/tracker/page.tsx` | `Tracker` |
| `/wins` | `src/app/wins/page.tsx` | `Wins` |
| `/settings` | `src/app/settings/page.tsx` | `Settings` |
| `/funders` | `src/app/funders/page.tsx` | `Funders` |
| `/funders/[id]` | `src/app/funders/[id]/page.tsx` | `FunderDetail` |
| `/alerts` | `src/app/alerts/page.tsx` | `Alerts` |
| `/weekly-summary` | `src/app/weekly-summary/page.tsx` | `WeeklySummary` |
| `/outbox` | `src/app/outbox/page.tsx` | `Outbox` |
| `/outreach/[id]` | `src/app/outreach/[id]/page.tsx` | `OutreachBuilder` |
| `/organizations` | `src/app/organizations/page.tsx` | **Server `redirect("/settings")`** — does not render `Organizations` |

**Broken route:**

| URL | File | Issue |
|-----|------|--------|
| `/agencies` | `src/app/agencies/page.tsx` | `import { Agencies } from "@/views/Agencies"` — **`red-dog-radios-frontend/src/views/Agencies.tsx` does not exist** → build/import failure. |

**`AppShell` menu (`src/components/AppShell.tsx`):** `Dashboard`, `Opportunities`, `Matches`, `Applications`, `Tracker`, `Wins`, `Settings` — **no nav entries** for `/funders`, `/alerts`, `/weekly-summary`, `/outbox`, `/applications` sub-routes, etc. (some are linked from `PlatformDashboardSection`).

### 2.2 What each main screen shows and does (summary)

- **`Login`:** Email + password → `POST /api/auth/login`; stores `rdg_token`, `rdg_user` in `localStorage`, sets cookies `rdg_token`, `rdg_onboarding` via `AgencyAuthContext.login`.
- **`SignUp`:** `fullName`, `email`, `password` → `POST /api/auth/register`; then client navigates to OTP flow.
- **`ForgotPassword` / `OtpVerification` / `CreatePassword`:** **No API calls** — OTP is client-only; navigation-only flows.
- **`OnboardingStep1`:** Form fields `organizationName`, `location`, `websiteUrl`, `missionStatement` → `sessionStorage` key `rdg_onboarding_step1`.
- **`OnboardingStep2`:** Multi-select agency type IDs → `rdg_onboarding_step2` as `{ agencyTypes: string[] }`.
- **`OnboardingStep3`:** Multi-select program area IDs → `rdg_onboarding_step3` as `{ programAreas: string[] }`.
- **`OnboardingStep4`:** `requestDescription` (textarea), `budgetRange`, `timeline` → `rdg_onboarding_step4`.
- **`OnboardingStep5`:** Goal checkboxes → **`POST /api/onboarding/complete`** (payload assembly has **bugs** — see section 5).
- **`PlatformDashboardSection`:** Tracker stats + dashboard attention items; links to weekly summary, refresh; stat cards link to `/funders`, `/applications`, `/tracker`, `/wins`.
- **`Opportunities`:** Lists opportunities + matches; **compute all matches**, **generate application** per row.
- **`Matches`:** Filterable list from **`GET /api/matches`**; modal preview; filter tabs include `approved` / `rejected` (staff-driven statuses).
- **`Applications`:** List + inline status changes via **`PUT /api/applications/:id/status`**.
- **`ApplicationBuilder`:** Load/save application sections (`problemStatement`, `communityImpact`, `proposedSolution`, `measurableOutcomes`, `urgency`, `budgetSummary`, `notes`), regenerate, align, status, export PDF.
- **`Tracker`:** Pipeline from **`GET /api/tracker`**, stats from **`GET /api/tracker/stats`**; update status/notes.
- **`Wins`:** **`GET /api/wins/insights`**, **`GET /api/wins`**.
- **`Alerts`:** **`GET /api/alerts`**; mark read **`PUT /api/alerts/:id/read`**; delete **`DELETE /api/alerts/:id`**.
- **`WeeklySummary`:** **`GET /api/digests`** only; preview UI; **no** generate/send API wired.
- **`Outbox`:** **`GET /api/outbox`**; retry **`POST /api/outbox/:id/retry`**.
- **`OutreachBuilder`:** Load outreach, save body, mark sent.
- **`Funders`:** Expects **`GET /api/funders`** — **no such list route on backend** (see section 4–5).
- **`FunderDetail`:** **`GET /api/funders/:id`**; generate application/outreach; **`PUT /api/funders/:id`** — **no PUT on backend**.
- **`Settings`:** Profile + notification toggles + preferences + `canMeetLocalMatch` + delete account.
- **`Organizations` (view file):** CRUD-style UI calling organizations API — **not reachable** from `/organizations` (redirect).

### 2.3 Forms and fields (agency)

| Location | Mechanism | Fields / controls |
|----------|-----------|-------------------|
| `Login.tsx` | `react-hook-form` + `loginSchema` | `email`, `password` |
| `SignUp.tsx` | `signUpSchema` | `fullName`, `email`, `password` |
| `ForgotPassword.tsx` | `forgotPasswordSchema` | `email` |
| `CreatePassword.tsx` | `createPasswordSchema` | `newPassword`, `confirmPassword` |
| `OtpVerification.tsx` | 6 digit inputs + `otpSchema` | OTP digits |
| `OnboardingStep1.tsx` | `onboardingStep1Schema` | `organizationName`, `location`, `websiteUrl`, `missionStatement` |
| `OnboardingStep2.tsx` | local state | Multiple choice: agency type card IDs (`law-enforcement`, `fire-services`, …) |
| `OnboardingStep3.tsx` | local state | Program area IDs (`comms`, `vehicles`, …, `other`) |
| `OnboardingStep4.tsx` | `onboardingStep4Schema` + state | `requestDescription`, `budgetRange` (`under-25k`, …), `timeline` (`urgent` / `planned`) |
| `OnboardingStep5.tsx` | local state | `goals` set: `discover`, `track`, `ai-write`, `ai-score` |
| `Settings.tsx` | `settingsSaveSchema` + extra state | `firstName`, `lastName`, `email`, `currentPassword`, `newPassword` (schema); toggles `highFitAlerts`, `deadlineReminders`, `weeklySummary`, `alertUpdates`, `systemAlerts`; `language`, `timezone`; `canMeetLocalMatch` (`unset` / `yes` / `no`); delete modal uses `deleteAccountConfirmSchema` (`confirmation` = `DELETE`) |
| `Organizations.tsx` | `organizationFormSchema` | `name`, `location`, `website`, `mission`, `focusAreas` (comma-separated string) |
| `ApplicationBuilder.tsx` | local `form` state | All `SECTIONS` keys + `notes` |
| `OutreachBuilder.tsx` | local state | `subject`, `contactName`, `body` |
| `Tracker.tsx` | inline edits | `status`, `notes` on applications |
| `Applications.tsx` | dropdowns | Per-row application `status` |
| `AshleenChat.tsx` | textarea | User message text; optional structured draft uses `ashleenApplicationDraftSchema` fields when used from chat flows |
| `Opportunities.tsx` | mostly display + actions | Filters/search UI; actions are mutations not classic forms |
| `Funders.tsx` | search + filters | `search`, `categoryFilter`, `tierFilter` (client-side) |

### 2.4 API calls by page / component (agency `api` client, base `/api`)

| Consumer | Methods / paths |
|----------|-----------------|
| `Login.tsx` | `POST /auth/login` |
| `SignUp.tsx` | `POST /auth/register` |
| `OnboardingStep5.tsx` | `POST /onboarding/complete` |
| `PlatformDashboardSection.tsx` | `GET /tracker/stats`, `GET /dashboard/stats` |
| `Opportunities.tsx` | `GET /matches`, `GET /opportunities`, `POST /matches/compute-all`, `POST /applications/generate` |
| `Matches.tsx` | `GET /matches` |
| `Applications.tsx` | `GET /applications`, `PUT /applications/:id/status` |
| `ApplicationBuilder.tsx` | `GET /applications/:id`, `PUT /applications/:id`, `POST /applications/:id/regenerate`, `POST /applications/:id/align`, `PUT /applications/:id/status`, `GET /applications/:id/export` |
| `Tracker.tsx` | `GET /tracker/stats`, `GET /tracker`, `PUT /applications/:id/status`, `PUT /applications/:id` |
| `Wins.tsx` | `GET /wins/insights`, `GET /wins` |
| `Alerts.tsx` | `GET /alerts`, `PUT /alerts/:id/read`, `DELETE /alerts/:id` |
| `WeeklySummary.tsx` | `GET /digests` |
| `Outbox.tsx` | `GET /outbox`, `POST /outbox/:id/retry` |
| `OutreachBuilder.tsx` | `GET /outreach/:id`, `PUT /outreach/:id`, `PUT /outreach/:id/sent` |
| `Funders.tsx` | `GET /funders` (**no backend route**) |
| `FunderDetail.tsx` | `GET /funders/:id`, `POST /applications/generate`, `POST /outreach/generate`, `PUT /funders/:id` (**no backend PUT**) |
| `Settings.tsx` | `GET /settings`, `PUT /settings`, `DELETE /settings/account` |
| `Organizations.tsx` | `POST /organizations`, `GET /organizations` |
| `AshleenChat.tsx` | `GET /organizations`, `POST /ashleen/chat` |

**Not called from frontend:** `GET /auth/me`, `PUT /alerts/read-all`, digest `POST /digests/generate|preview`, `POST /digests/:id/send`, AI routes under `/ai/*`, `POST /matches/compute`, match `PUT .../approve|reject` (agency routes return 403), `POST /outbox/queue`, `POST /outbox/:id/send`, followups `/followups/*`, `POST /funders/:id/save`, etc.

### 2.5 Authentication flow (agencies)

1. **`src/middleware.ts`:** For non-admin paths, requires cookie `rdg_token` except for `AGENCY_PUBLIC` paths (`/login`, `/signup`, `/forgot-password`, `/otp-verification`, `/create-password`). If `rdg_onboarding=0`, forces `/onboarding/*`. If completed onboarding (`rdg_onboarding=1`), blocks `/onboarding/*`.
2. **`AgencyAuthContext` (`src/lib/AgencyAuthContext.tsx`):** On login, sets `localStorage` keys `rdg_token`, `rdg_user` and cookies `rdg_token`, `rdg_onboarding`. Clears admin session if an admin user slips in. **`isAuthenticated`** requires `role !== "admin"`.
3. **`src/lib/api.ts`:** Sends `Authorization: Bearer ${localStorage rdg_token}`; on **401** clears agency storage/cookies and redirects to `/login`.
4. **Backend `auth.service.js`:** `login` **rejects** users with `role === "admin"` (must use staff portal).

---

## 3. ADMIN (STAFF) SIDE

### 3.1 Routes / pages

| URL | File | Notes |
|-----|------|--------|
| `/admin` | `src/app/admin/page.tsx` | redirect → `/admin/dashboard` |
| `/admin/login` | `src/app/admin/login/page.tsx` | Staff login |
| `/admin/dashboard` | `src/app/admin/(panel)/dashboard/page.tsx` | Metrics + recompute matches |
| `/admin/activity` | `src/app/admin/(panel)/activity/page.tsx` | Activity log list |
| `/admin/activity/[id]` | `src/app/admin/(panel)/activity/[id]/page.tsx` | Single log entry |
| `/admin/agencies` | `src/app/admin/(panel)/agencies/page.tsx` | Paginated agencies |
| `/admin/agencies/[id]` | `src/app/admin/(panel)/agencies/[id]/page.tsx` | Agency detail, apps, matches |
| `/admin/opportunities` | `src/app/admin/(panel)/opportunities/page.tsx` | List + create |
| `/admin/opportunities/new` | `src/app/admin/(panel)/opportunities/new/page.tsx` | (if present in tree) |
| `/admin/opportunities/[id]` | detail | |
| `/admin/opportunities/[id]/edit` | edit | |
| `/admin/funders` | list + create | |
| `/admin/funders/new` | new | |
| `/admin/funders/[id]` | detail | |
| `/admin/funders/[id]/edit` | edit | |
| `/admin/applications` | list | |
| `/admin/applications/[id]` | detail + AI generate + notes/status | |
| `/admin/matches` | `src/app/admin/(panel)/matches/page.tsx` | **`redirect("/admin/dashboard")`** — no dedicated matches UI |
| `/admin/users` | list | |
| `/admin/users/[id]` | read-only user detail | |
| `/admin/settings` | `AdminSettings` | |

**`AdminShell` menu (`src/components/admin/AdminShell.tsx`):** Dashboard, Activity, Agencies, Opportunities, Funders, Applications, Users, Settings — **no “Matches” item** (matches page redirects).

### 3.2 Forms and fields (admin)

| Page / component | Fields / actions |
|------------------|------------------|
| `src/app/admin/login/page.tsx` | `email`, `password` → `POST /api/admin/auth/login` |
| `src/app/admin/(panel)/opportunities/page.tsx` | Create opportunity: `title`, `funder`, `deadline`, `maxAmount`, `sourceUrl`, `keywords`, `description`, `agencyTypes` (plus funder linkage UI using `admin/funders`) |
| `src/app/admin/(panel)/opportunities/[id]/edit/page.tsx` | Edit opportunity fields (loaded from `GET admin/opportunities/:id`) |
| `src/app/admin/(panel)/funders/page.tsx` | Quick-create funder: `name`, `website`, `contactEmail` |
| `src/app/admin/(panel)/funders/[id]/edit/page.tsx` | Full funder edit payload aligned with admin API |
| `src/app/admin/(panel)/agencies/[id]/page.tsx` | Create application for agency: `funderId`, `opportunityId` (optional); status updates; match approve/reject |
| `src/app/admin/(panel)/applications/[id]/page.tsx` | `notes`, `status`, “generate AI” |
| `src/views/admin/AdminSettings.tsx` | `firstName`, `lastName`, `email` (password fields in schema but not wired to backend password change) |
| `src/app/admin/(panel)/dashboard/page.tsx` | “Recompute all matches” button |

### 3.3 API calls (`adminApi`, baseURL `/api/`)

| Consumer | Calls |
|----------|--------|
| Admin login | `POST admin/auth/login` |
| Admin shell / session | (no `admin/auth/me` call in UI; relies on login payload + `AdminAuthContext`) |
| Dashboard | `GET admin/dashboard`, `POST admin/matches/recompute-all` |
| Activity | `GET admin/activity-logs`, `GET admin/activity-logs/:id` |
| Agencies | `GET admin/agencies`, `GET admin/agencies/:id`, `GET admin/funders`, `POST admin/applications/create-for-agency`, `PUT admin/applications/:id/status`, `PUT admin/matches/:id/approve`, `PUT admin/matches/:id/reject` |
| Opportunities | `GET admin/opportunities`, `GET admin/funders`, `POST admin/opportunities`, `GET admin/opportunities/:id`, `PUT admin/opportunities/:id`, `DELETE admin/opportunities/:id` |
| Funders | `GET/POST admin/funders`, `GET/PUT/DELETE admin/funders/:id` |
| Applications | `GET admin/applications`, `GET admin/applications/:id`, `PUT admin/applications/:id`, `PUT admin/applications/:id/status`, `POST admin/applications/:id/generate-ai` |
| Users | `GET admin/users`, `GET admin/users/:id` |
| AdminSettings | `GET settings`, `PUT settings` → resolves to **`/api/settings`** (same as agency settings module; works for any authenticated user including `role: admin`) |

**Backend exposes but UI does not use:** `PUT /api/admin/users/:id/role`.

### 3.4 Authentication flow (admin)

1. **`middleware.ts`:** Paths `/admin` and `/admin/*` except `/admin/login` require cookie **`rdg_admin_token`**. If logged in user hits `/admin/login`, redirect to `/admin/dashboard`.
2. **`AdminAuthContext`:** Stores `rdg_admin_token`, `rdg_admin_user` in `localStorage`; sets `rdg_admin_token` cookie; clears agency session on admin login.
3. **`adminApi`:** Bearer `rdg_admin_token`; 401 clears admin storage and redirects to `/admin/login`.
4. **Backend:** `POST /api/admin/auth/login` uses `auth.service.loginAdmin` — requires `user.role === "admin"`. Subsequent admin routes use **`protectAdmin`** (`src/middlewares/adminAuth.middleware.js`): JWT + **`role === "admin"`**.

---

## 4. BACKEND API

Global: **`GET /health`** (no auth). **`GET /api-docs`** (Swagger UI). **`/api`** rate limit: 500 req / 15 min per `src/app.js`.

Unless noted, “Agency JWT” means `protect` in `src/middlewares/auth.middleware.js` (any valid user; admin users get a token but agency login blocks them; agency-only enforcement via **`requireAgency`** is **not** applied on routes — exported but unused).

### 4.1 Endpoint table

| Method | Path | Role | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | Public | Register agency user (`role` forced agency in service) |
| POST | `/api/auth/login` | Public | Agency login; **403 if admin** |
| GET | `/api/auth/me` | Agency JWT | Current user |
| GET | `/api/organizations` | Agency JWT | Paginated orgs **scoped to user’s `organizationId`** |
| POST | `/api/organizations` | Agency JWT | Create org |
| GET | `/api/organizations/:id` | Agency JWT | **Only if `:id` equals user’s org** |
| PUT | `/api/organizations/:id` | Agency JWT | **Only if `:id` equals user’s org** |
| GET | `/api/opportunities` | Agency JWT | List opportunities |
| GET | `/api/opportunities/:id` | Agency JWT | Get one |
| GET | `/api/matches` | Agency JWT | Scoped to org via controller |
| POST | `/api/matches` | Agency JWT | Create match for org |
| POST | `/api/matches/compute` | Agency JWT | Compute one match |
| POST | `/api/matches/compute-all` | Agency JWT | Compute all for org (**body org id resolved server-side**) |
| GET | `/api/matches/:id` | Agency JWT | Get one if in org |
| PUT | `/api/matches/:id/approve` | Agency JWT | **403** — “handled by staff” |
| PUT | `/api/matches/:id/reject` | Agency JWT | **403** |
| GET | `/api/applications` | Agency JWT | List for org |
| POST | `/api/applications` | Agency JWT | Create |
| POST | `/api/applications/generate` | Agency JWT | AI create (`funderId` and/or `opportunityId`) |
| GET | `/api/applications/:id` | Agency JWT | Get if in org |
| PUT | `/api/applications/:id` | Agency JWT | Update if in org |
| DELETE | `/api/applications/:id` | Agency JWT | Delete if in org |
| PUT | `/api/applications/:id/submit` | Agency JWT | Submit |
| PUT | `/api/applications/:id/status` | Agency JWT | Status + history |
| POST | `/api/applications/:id/regenerate` | Agency JWT | Regenerate AI sections |
| POST | `/api/applications/:id/align` | Agency JWT | Funder-aligned rewrite |
| GET | `/api/applications/:id/export` | Agency JWT | Export |
| GET | `/api/agencies` | Agency JWT | List agencies |
| POST | `/api/agencies` | Agency JWT | Create agency |
| GET | `/api/agencies/:id` | Agency JWT | Get one |
| PUT | `/api/agencies/:id` | Agency JWT | Update |
| GET | `/api/alerts` | Agency JWT | User’s alerts |
| PUT | `/api/alerts/read-all` | Agency JWT | Mark all read |
| PUT | `/api/alerts/:id/read` | Agency JWT | Mark one read |
| DELETE | `/api/alerts/:id` | Agency JWT | Delete |
| GET | `/api/outbox` | Agency JWT | List |
| POST | `/api/outbox/queue` | Agency JWT | Queue email |
| GET | `/api/outbox/:id` | Agency JWT | Get one |
| POST | `/api/outbox/:id/send` | Agency JWT | Send one |
| POST | `/api/outbox/:id/retry` | Agency JWT | Retry failed |
| GET | `/api/digests` | Agency JWT | List |
| POST | `/api/digests/generate` | Agency JWT | Generate digest |
| POST | `/api/digests/preview` | Agency JWT | Preview |
| GET | `/api/digests/:id` | Agency JWT | Get one |
| POST | `/api/digests/:id/send` | Agency JWT | Send digest |
| POST | `/api/ai/generate-summary` | Agency JWT | AI opportunity summary |
| POST | `/api/ai/generate-email` | Agency JWT | AI outreach email |
| POST | `/api/ai/generate-application` | Agency JWT | AI application |
| POST | `/api/ai/compute-match` | Agency JWT | AI match score |
| GET | `/api/dashboard/stats` | Agency JWT | Dashboard attention items |
| POST | `/api/onboarding/complete` | Agency JWT | Complete onboarding + create/update org |
| GET | `/api/settings` | Agency JWT | Get user settings document |
| PUT | `/api/settings` | Agency JWT | Update profile, notifications, org `canMeetLocalMatch` |
| DELETE | `/api/settings/account` | Agency JWT | Soft-delete (`isActive: false`) |
| POST | `/api/funders/:id/save` | Agency JWT | “Save” funder for org |
| GET | `/api/funders/:id` | Agency JWT | Funder detail + match scoring for org |
| GET | `/api/wins/insights` | Agency JWT | Aggregated insights |
| GET | `/api/wins` | Agency JWT | List wins |
| GET | `/api/outreach` | Agency JWT | List outreach |
| GET | `/api/outreach/:id` | Agency JWT | Get one in org |
| POST | `/api/outreach/generate` | Agency JWT | Generate from `funderId` or `opportunityId` |
| PUT | `/api/outreach/:id` | Agency JWT | Update draft |
| PUT | `/api/outreach/:id/sent` | Agency JWT | Mark sent |
| GET | `/api/followups` | Agency JWT | List follow-ups |
| PUT | `/api/followups/:id/send` | Agency JWT | Mark sent |
| PUT | `/api/followups/:id/skip` | Agency JWT | Skip |
| GET | `/api/tracker/stats` | Agency JWT | Tracker stats |
| GET | `/api/tracker` | Agency JWT | Tracker rows |
| POST | `/api/ashleen/chat` | Agency JWT | Chat completion |
| POST | `/api/admin/auth/login` | Public | Staff login |
| GET | `/api/admin/auth/me` | Admin JWT | Staff me |
| GET | `/api/admin/dashboard` | Admin JWT | Staff dashboard aggregates |
| GET | `/api/admin/activity-logs` | Admin JWT | Paginated activity logs |
| GET | `/api/admin/activity-logs/:id` | Admin JWT | One log |
| GET | `/api/admin/agencies` | Admin JWT | List |
| GET | `/api/admin/agencies/:id` | Admin JWT | Detail |
| GET | `/api/admin/opportunities` | Admin JWT | List |
| POST | `/api/admin/opportunities` | Admin JWT | Create |
| GET | `/api/admin/opportunities/:id` | Admin JWT | Get |
| PUT | `/api/admin/opportunities/:id` | Admin JWT | Update |
| DELETE | `/api/admin/opportunities/:id` | Admin JWT | Delete |
| GET | `/api/admin/funders` | Admin JWT | List |
| POST | `/api/admin/funders` | Admin JWT | Create |
| GET | `/api/admin/funders/:id` | Admin JWT | Get |
| PUT | `/api/admin/funders/:id` | Admin JWT | Update |
| DELETE | `/api/admin/funders/:id` | Admin JWT | Delete |
| GET | `/api/admin/applications` | Admin JWT | List |
| POST | `/api/admin/applications/create-for-agency` | Admin JWT | Create app for agency |
| GET | `/api/admin/applications/:id` | Admin JWT | Get |
| PUT | `/api/admin/applications/:id` | Admin JWT | Update |
| PUT | `/api/admin/applications/:id/status` | Admin JWT | Status |
| POST | `/api/admin/applications/:id/generate-ai` | Admin JWT | AI generation |
| GET | `/api/admin/matches` | Admin JWT | List |
| POST | `/api/admin/matches/recompute-all` | Admin JWT | Recompute all |
| PUT | `/api/admin/matches/:id/approve` | Admin JWT | Approve |
| PUT | `/api/admin/matches/:id/reject` | Admin JWT | Reject |
| GET | `/api/admin/users` | Admin JWT | List users |
| GET | `/api/admin/users/:id` | Admin JWT | User detail |
| PUT | `/api/admin/users/:id/role` | Admin JWT | Change role |

### 4.2 Missing / mismatched endpoints vs frontend

- **`GET /api/funders`** — **Funders.tsx** requires a paginated list; backend only **`GET /api/funders/:id`** and **`POST /api/funders/:id/save`**.
- **`PUT /api/funders/:id`** (agency) — **FunderDetail.tsx** calls it for `notes`; **no route** (admin has **`PUT /api/admin/funders/:id`** only).
- **`requireAgency` unused** — theoretically an admin JWT could call agency `/api/*` routes if they had an `organizationId`; product intent in `auth.middleware.js` comments says admins should use `/api/admin`.

---

## 5. CURRENT ISSUES

### 5.1 Broken / incomplete / mismatched

1. **Missing file / broken page:** `src/app/agencies/page.tsx` imports `@/views/Agencies` which **does not exist**.
2. **`axios` not declared** in `red-dog-radios-frontend/package.json` / lockfile while `api.ts` and `adminApi.ts` import it — installs may not provide `axios` unless hoisted from elsewhere.
3. **Onboarding completion payload bugs (`OnboardingStep5.tsx`):**
   - Reads `rdg_onboarding_step1` as `{ opportunityTitle, location, websiteUrl, missionStatement }` but Step1 stores **`organizationName`** (not `opportunityTitle`) → organization name often becomes backend default **“My Organization”**.
   - Reads Step2 as `{ agencyType }` but Step2 stores **`{ agencyTypes: string[] }`** → **`agencyTypes` sent as `[]`**.
   - Reads Step3 as `{ programArea }` but Step3 stores **`{ programAreas: string[] }`** → **`programAreas` sent wrong / empty**.
4. **Password reset / OTP flows** are **UI-only** (no email, no API).
5. **Agency funders UI** calls non-existent **`GET /funders`** and **`PUT /funders/:id`**.
6. **`Organizations.tsx`** is **orphaned** from routing: `/organizations` **redirects** to `/settings`.
7. **Admin `/admin/matches`** **redirects** to dashboard — no staff matches table page despite **`GET /api/admin/matches`** existing.
8. **`PUT /api/admin/users/:id/role`** has **no UI** on `src/app/admin/(panel)/users/[id]/page.tsx`.
9. **Outreach routes (`outreach.route.js`):** `GET /:id` is registered **before** `POST /generate`; a hypothetical **`GET /api/outreach/generate`** would be captured as `id="generate"` (low practical risk; worth reordering for consistency).
10. **Swagger vs code:** Opportunity routes document POST/PUT/DELETE on `/api/opportunities` but router only registers **GET** for `/` and `/:id`.
11. **`AshleenChat` context string** uses `agencyContext.agencyType`, `city`, `state` — **`Organization`** schema uses `agencyTypes[]`, `location`, not those field names → **weak / empty context**.
12. **Duplicate path entries in git status** for some backend admin files (`admin.controller.js` etc. with backslash variants) — on Windows, verify a single canonical file to avoid drift.

### 5.2 UI/UX

- **Main nav** omits several implemented pages (`/funders`, `/alerts`, `/weekly-summary`, `/outbox`).
- **Matches** filter tabs include **approved/rejected** which are **staff-controlled**; agency users see status but cannot approve/reject via API (403).
- **Weekly Summary** only **browses** digests; no in-app **generate** or **send** despite backend support.
- **Settings** / **AdminSettings** collect **password change** fields in schema/UI but **agency `PUT /settings`** does not implement password updates (only profile, notifications, preferences, `canMeetLocalMatch`).

### 5.3 Placeholder / branding

- Onboarding and `PrimaryNavigationMenuSection` still show **“RED DOG LOGO”**, **“TAGLINE”** placeholder strings.

---

## 6. WHAT IS WORKING (end-to-end, when backend + DB are up)

- **Agency auth:** register, login, JWT usage on protected routes; middleware cookie gating; admin blocked from agency login.
- **Staff auth:** `/admin/login` + `protectAdmin` routes.
- **Onboarding → org linkage:** `POST /api/onboarding/complete` creates/updates **`Organization`** and sets **`user.organizationId`** (payload quality issues aside).
- **Opportunities & matches (read + compute):** list opportunities/matches, **`compute-all`**, single match compute.
- **Applications:** list, detail, AI generate/regenerate/align, status updates, export, submit (where used).
- **Tracker & dashboard stats:** `GET /tracker`, `GET /tracker/stats`, `GET /dashboard/stats` wired from **`PlatformDashboardSection`** and **`Tracker`**.
- **Wins & alerts:** list + basic mutations on alerts.
- **Outreach builder:** fetch/update/mark sent for existing records.
- **Outbox:** list + retry.
- **Digests:** list for weekly summary view.
- **Ashleen chat:** `POST /api/ashleen/chat` with conversation history.
- **Settings (agency):** load/save notifications, preferences, profile fields, `canMeetLocalMatch`, delete account.
- **Admin CRUD:** opportunities, funders, applications (incl. create-for-agency, AI), agencies detail, match approve/reject, dashboard, activity logs, users list/detail, staff settings via `/api/settings`.

---

## 7. DATABASE (MongoDB / Mongoose)

Default DB name from `server.js`: **`reddog_db`** (overridable via `MONGO_URI`).

Mongoose registers these **models** (collection names are typically lowercase pluralized forms, e.g. `User` → `users`):

### 7.1 `User` — `src/modules/auth/user.schema.js`

| Field | Type / notes |
|-------|----------------|
| `fullName` | String |
| `firstName` | String |
| `lastName` | String |
| `email` | String, required, unique |
| `password` | String, required, min 8, `select: false` |
| `role` | enum `agency` \| `admin`, default `agency` |
| `isActive` | Boolean, default true |
| `organizationId` | ObjectId → Organization |
| `onboardingCompleted` | Boolean, default false |
| `settings.notifications` | `highFitAlerts`, `deadlineReminders`, `weeklySummary`, `alertUpdates`, `systemAlerts` (booleans) |
| `settings.preferences` | `language`, `country`, `timezone` |
| `settings.reportEmail` | String |
| `settings.apiKey` | String |
| `timestamps` | `createdAt`, `updatedAt` |

### 7.2 `Organization` — `src/modules/organizations/organization.schema.js`

| Field | Type / notes |
|-------|----------------|
| `name` | String, required |
| `email` | String |
| `location` | String |
| `website`, `websiteUrl` | String |
| `missionStatement` | String |
| `focusAreas` | [String] |
| `agencyTypes` | enum list (law_enforcement, fire_services, …) |
| `programAreas` | [String] |
| `budgetRange` | enum `under_25k`, `25k_150k`, `150k_500k`, `500k_plus` |
| `timeline` | enum `urgent`, `planned` |
| `goals` | [String] |
| `populationServed` | Number |
| `coverageArea` | String |
| `numberOfStaff` | Number |
| `currentEquipment` | String |
| `mainProblems` | [String] |
| `fundingPriorities` | [String] |
| `canMeetLocalMatch` | Boolean |
| `matchCount` | Number, default 0 |
| `status` | enum `active`, `inactive` |
| `createdBy` | ObjectId → User |
| `lastMatchRecomputedAt` | Date |
| `timestamps` | |

### 7.3 `Opportunity` — `src/modules/opportunities/opportunity.schema.js`

`title`, `funder`, `deadline`, `minAmount`, `maxAmount`, `sourceUrl`, `keywords[]`, `agencyTypes[]`, `description`, `category`, `equipmentTags[]`, `localMatchRequired`, `status` (`open`|`closing`|`closed`), `createdBy`, timestamps.

### 7.4 `Match` — `src/modules/matches/match.schema.js`

`organization`, `opportunity`, `fitScore`, `reasons[]`, `fitReasons[]`, `disqualifiers[]`, `recommendedAction`, `state`, `breakdown` (numeric sub-scores), `status` (`pending`|`approved`|`rejected`), `scoreVersion`, `lastUpdated`, timestamps. Unique index on `(organization, opportunity)`.

### 7.5 `Application` — `src/modules/applications/application.schema.js`

`organization`, `opportunity`, `status` (large enum including `draft`, `submitted`, `in_review`, `awarded`, `rejected`, `not_started`, `drafting`, `ready_to_submit`, `follow_up_needed`, `denied`), narrative fields (`projectTitle`, `projectSummary`, `communityImpact`, `amountRequested`, `timeline`, `contactName`, `contactEmail`, `submittedAt`), AI sections (`problemStatement`, `proposedSolution`, `measurableOutcomes`, `urgency`, `budgetSummary`), `alignedVersion` subdocument, tracker fields (`dateStarted`, `dateSubmitted`, `followUpDate`, `notes`), `statusHistory[]`, `isWinner`, `winTags`, `funder` ref, timestamps.

### 7.6 `Agency` — `src/modules/agencies/agency.schema.js`

`name`, `type` (enum subset of public safety types), `location`, `grantContactEmail`, `matchCount`, `status`, timestamps.

### 7.7 `Alert` — `src/modules/alerts/alert.schema.js`

`organization`, `opportunity`, `user`, `orgName`, `grantName`, `type`, `priority`, `message`, `isRead`, `alertKey`; virtuals `read`, `userId`; unique sparse index on `alertKey`.

### 7.8 `Outbox` — `src/modules/outbox/outbox.schema.js`

`recipient`, `recipientName`, `subject`, `htmlBody`, `emailType`, `scheduledFor`, `status`, `retryCount`, `providerMessageId`, `errorMessage`, `sentAt`, `isTest`, `emailKey`, `relatedOrganization`, `relatedUser`, timestamps.

### 7.9 `Digest` — `src/modules/digests/digest.schema.js`

`organization`, `user`, `orgName`, `periodStart`, `periodEnd`, `matches[]`, `opportunities[]` (embedded summary objects), `aiIntro`, `htmlContent`, `status`, `sentAt`, `itemCount`, timestamps.

### 7.10 `Funder` — `src/modules/funders/funder.schema.js`

`name`, `website`, `contactName`, `contactEmail`, `contactPhone`, `missionStatement`, `locationFocus[]`, `fundingCategories[]`, `agencyTypesFunded[]`, `equipmentTags[]`, `localMatchRequired`, `avgGrantMin`, `avgGrantMax`, `deadline`, `cyclesPerYear`, `pastGrantsAwarded[]`, `notes`, `maxApplicationsAllowed`, `currentApplicationCount`, `isLocked`, `status`, `addedBy`, timestamps.

### 7.11 `FollowUp` — `src/modules/followups/followup.schema.js`

`application`, `user`, `organization`, `funder`, `opportunity`, `followUpNumber`, `scheduledFor`, `emailSubject`, `emailBody`, `status`, `sentAt`, timestamps.

### 7.12 `Outreach` — `src/modules/outreach/outreach.schema.js`

`organization`, `funder`, `opportunity`, `user`, `subject`, `contactName`, `body`, `status`, `sentAt`, timestamps.

### 7.13 `Win` — `src/modules/wins/win.schema.js`

`applicationId`, `agencyType`, `fundingType`, `projectType`, `funderName`, `awardAmount`, narrative fields, `winFactors[]`, `lessonsLearned`, timestamps.

### 7.14 `ActivityLog` — `src/modules/activityLogs/activityLog.schema.js`

`category` (`opportunity`|`funder`|`application`|`match`|`ai`|`user`|`system`), `action`, `summary`, `severity`, `actorId`, `meta` (Mixed), timestamps; index `createdAt` descending.

---

*End of audit document.*
