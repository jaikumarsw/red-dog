# Red Dog Radios — Grant Intelligence Platform

## Overview
A full-stack Grant Intelligence Platform for public safety agencies (law enforcement, fire, EMS). Provides real-time grant discovery, match scoring, AI-powered summaries, and automated alerts.

## Architecture

### Backend (`red-dog-radios-backend/`)
- **Runtime**: Node.js 20 (CommonJS)
- **Framework**: Express 4
- **Database**: MongoDB 7 (local instance via `mongod`)
- **Port**: 4000 (localhost only)
- **Auth**: JWT (`jsonwebtoken` + `bcryptjs`)
- **AI**: OpenAI GPT-4o-mini for summaries, emails, match scoring
- **Jobs**: node-cron for nightly match refresh and deadline alerts
- **Docs**: Swagger UI at `/api-docs`
- **Entry**: `src/server.js`
- **Config**: `.env` file in backend directory

### Frontend (`red-dog-radios-frontend/`)
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Radix UI (Shadcn/UI)
- **State**: TanStack Query (React Query)
- **Forms**: React Hook Form + Zod
- **Port**: 5000 (0.0.0.0 for Replit proxy)

## How to Run

The `start.sh` script in the root handles everything:
1. Starts MongoDB (`mongod`) with data in `/home/runner/workspace/data/db`
2. Starts backend (`node src/server.js`) on port 4000
3. Starts frontend (`next dev -p 5000 -H 0.0.0.0`) on port 5000

## Environment Variables

Set in Replit Secrets/Env Vars:
- `MONGO_URI` — MongoDB connection string (default: `mongodb://localhost:27017/reddog_db`)
- `JWT_SECRET` — JWT signing secret
- `PORT` — Backend port (default: 4000)
- `NODE_ENV` — Environment (development/production)
- `CORS_ORIGIN` — CORS allowed origin (default: *)
- `OPENAI_API_KEY` — (Optional) OpenAI API key for AI features
- `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` — (Optional) SMTP config for email

Also set in `red-dog-radios-backend/.env` for local runtime.

## Key Modules (Backend)
- `auth` — JWT-based registration/login
- `organizations` — Organization management (extended with populationServed, coverageArea, numberOfStaff, currentEquipment, mainProblems)
- `opportunities` — Grant opportunities (CRUD)
- `matches` — Match scoring between orgs and grants
- `applications` — Application tracking (extended with 6 AI content sections, status lifecycle, regenerate/align/export endpoints; auto-creates Win record on status→awarded)
- `agencies` — Agency profiles
- `alerts` — Automated deadline and match alerts
- `outbox` — Email outbox management
- `digests` — Weekly digest generation
- `ai` — OpenAI-powered tools (summarize, draft email, generate-application, align-to-funder, generate-outreach)
- `funders` — Private funder library (CRUD + match scoring); 8 funders seeded
- `tracker` — Grant submission tracker with stats (totalApplied, awarded, totalRequested, totalAwarded)
- `wins` — Win database with insights (winRate, avgAward, topFunderType)
- `outreach` — Outreach email builder (separate from Outbox); linked to funders/opportunities
- `followups` — Follow-up task tracking for applications
- `dashboard` — Stats endpoint with extended metrics (totalDollarsRequested, totalDollarsAwarded, openOpportunities, pendingMatches)
- `onboarding` — Complete onboarding flow
- `settings` — User settings CRUD
- `ashleen` — Global AI chat assistant (personality-driven, keyword fallback when no OpenAI key); registered at `/api/ashleen/chat`

## Frontend Integration (Completed)
All pages are fully wired to the backend API (no mock data in production paths):

### Auth & Infrastructure
- `api.ts` — Axios client with Bearer token interceptor, rewrites `/api/*` → `http://localhost:4000/api/*`
- `AuthContext.tsx` — Login/logout/updateUser, JWT + user stored in localStorage + cookies for middleware
- `middleware.ts` — Route protection: unauthenticated → `/login`, onboarding incomplete → `/onboarding`
- `providers.tsx` — AuthProvider wraps the entire app
- `AshleenChat.tsx` — Global floating AI chat in `AppShell` (available on every authenticated page)

### Pages & API Endpoints Used
| Page | Endpoint |
|------|----------|
| Login / SignUp | `POST /api/auth/login`, `POST /api/auth/register` |
| Onboarding Steps 1–5 | `POST /api/onboarding/complete` |
| Dashboard | `GET /api/dashboard/stats` |
| Organizations | `GET /api/organizations`, `POST /api/organizations` |
| Opportunities | `GET /api/opportunities`, `POST /api/opportunities` |
| Funders | `GET /api/funders`, `POST /api/funders` |
| Funder Detail | `GET /api/funders/:id`, `PUT /api/funders/:id`, `POST /api/outreach` |
| Application Builder | `GET /api/applications/:id`, `PUT /api/applications/:id/section`, `POST /api/applications/:id/export` |
| Tracker | `GET /api/tracker/stats`, `PUT /api/applications/:id/status` |
| Wins | `GET /api/wins`, `GET /api/wins/insights` |
| Outreach Builder | `GET /api/outreach/:id`, `PUT /api/outreach/:id`, `POST /api/outreach/:id/send` |
| Matches | `GET /api/matches`, `PUT /api/matches/:id/approve`, `PUT /api/matches/:id/reject` |
| Applications | `GET /api/applications` |
| Agencies | `GET /api/agencies`, `POST /api/agencies` |
| Alerts | `GET /api/alerts`, `PUT /api/alerts/:id/read`, `DELETE /api/alerts/:id` |
| Outbox | `GET /api/outbox` |
| Weekly Summary | `GET /api/digests` |
| Settings | `GET /api/settings`, `PUT /api/settings`, `DELETE /api/settings/account` |
| Ashleen AI Chat | `POST /api/ashleen/chat` |

### Error Handling
All React Query `useQuery` calls across every view include `isError` + `refetch` for proper error display and retry UX.

### Test Credentials (seed data)
- Admin: `admin@reddogradios.com` / `Admin1234!`
- Regular: `jane@valleyfire.org` / `Password1234!`

### Seeded Funders (8)
FEMA, DOJ COPS, DHS/FEMA BSIR, Motorola Solutions Foundation, Texas TDEM, AT&T FirstNet, Walmart Foundation, Community Foundation of North Texas

## Deployment
- Target: VM (always-running, needs local MongoDB state)
- Build: `cd red-dog-radios-frontend && npm run build`
- Run: `bash start.sh`
