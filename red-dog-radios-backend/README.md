# Red Dog Radio — Grant Intelligence Platform Backend

A modular Node.js + Express + Mongoose backend API for the Red Dog Radio Grant Intelligence Platform.

## Tech Stack

- **Runtime**: Node.js (CommonJS)
- **Framework**: Express 4
- **Database**: MongoDB + Mongoose 8
- **Auth**: JWT (jsonwebtoken + bcryptjs)
- **Pagination**: mongoose-paginate-v2
- **Uploads**: Cloudinary + multer
- **Email**: nodemailer (stubbed until SMTP configured)
- **AI**: OpenAI gpt-4o-mini (stubbed until API key set)
- **Jobs**: node-cron (4 scheduled jobs)
- **Docs**: Swagger UI at `/api-docs`

## Quick Start

```bash
cd backend
npm install
cp .env.example .env    # Edit with your MongoDB URI and JWT secret
npm run dev             # Starts on port 4000
```

After starting, open:
- API health: `http://localhost:4000/health`
- Swagger docs: `http://localhost:4000/api-docs`

## Environment Variables

Edit `.env` after copying from `.env.example`:

| Variable | Required | Description |
|---|---|---|
| `MONGO_URI` | YES | MongoDB connection string (Atlas or local) |
| `JWT_SECRET` | YES | Secret for signing JWT tokens |
| `JWT_EXPIRES_IN` | — | Token lifetime (default: `7d`) |
| `PORT` | — | Server port (default: `4000`) |
| `CLOUDINARY_CLOUD_NAME` | — | Cloudinary for file uploads |
| `CLOUDINARY_API_KEY` | — | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | — | Cloudinary API secret |
| `SMTP_HOST` | — | Email SMTP host |
| `SMTP_USER` | — | Email sender address |
| `SMTP_PASS` | — | Email app password |
| `SMTP_FROM` | — | From address in emails |
| `OPENAI_API_KEY` | — | OpenAI key for AI features |

## Seed Data

```bash
npm run seed
```

Creates:
- Admin: `admin@reddogradios.com` / `Admin1234!`
- 3 Organizations, 3 Opportunities, scored Matches, 4 Agencies, 3 Alerts

## API Reference

All routes require `Authorization: Bearer <token>` except `/api/auth/register` and `/api/auth/login`.

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/auth/register` | — | Create account |
| POST | `/api/auth/login` | — | Login, returns JWT |
| GET | `/api/auth/me` | JWT | Get current user |
| GET | `/api/organizations` | JWT | List orgs (paginated) |
| POST | `/api/organizations` | JWT | Create org |
| GET/PUT | `/api/organizations/:id` | JWT | Get / update org |
| DELETE | `/api/organizations/:id` | Admin | Deactivate org |
| GET | `/api/opportunities` | JWT | List opps (paginated) |
| POST | `/api/opportunities` | JWT | Create opp |
| GET/PUT | `/api/opportunities/:id` | JWT | Get / update opp |
| DELETE | `/api/opportunities/:id` | Admin | Delete opp |
| GET | `/api/matches` | JWT | List matches |
| POST | `/api/matches/compute` | JWT | Score one org+opp pair |
| POST | `/api/matches/compute-all` | JWT | Score all opps for org |
| PUT | `/api/matches/:id/approve` | JWT | Approve match |
| PUT | `/api/matches/:id/reject` | JWT | Reject match |
| GET/POST | `/api/applications` | JWT | List / create applications |
| PUT | `/api/applications/:id/submit` | JWT | Submit application |
| GET/POST | `/api/agencies` | JWT | List / create agencies |
| GET | `/api/alerts` | JWT | List user alerts |
| PUT | `/api/alerts/read-all` | JWT | Mark all read |
| PUT | `/api/alerts/:id/read` | JWT | Mark one read |
| DELETE | `/api/alerts/:id` | JWT | Delete alert |
| POST | `/api/alerts/generate-deadline` | Admin | Run deadline alert job |
| POST | `/api/alerts/generate-high-fit` | Admin | Run high-fit alert job |
| GET | `/api/outbox` | JWT | List outbox emails |
| POST | `/api/outbox/queue` | JWT | Queue an email |
| POST | `/api/outbox/process` | Admin | Process queue |
| POST | `/api/outbox/:id/send` | JWT | Send specific email |
| POST | `/api/outbox/:id/retry` | JWT | Retry failed email |
| GET | `/api/digests` | JWT | List digests |
| POST | `/api/digests/generate` | JWT | Generate weekly digest |
| POST | `/api/digests/preview` | JWT | Preview without saving |
| POST | `/api/digests/:id/send` | JWT | Queue + send digest |
| POST | `/api/ai/generate-summary` | JWT | Summarize opportunity (AI) |
| POST | `/api/ai/generate-email` | JWT | Outreach email (AI) |
| POST | `/api/ai/generate-application` | JWT | Application content (AI) |
| POST | `/api/ai/compute-match` | JWT | AI fit score |

## Match Scoring (0–100 points)

| Dimension | Max | Logic |
|---|---|---|
| Agency type match | 20 | Org type in opp required types |
| Geography | 20 | Org location in opp keywords |
| Program/keyword overlap | 25 | Count matching areas |
| Deadline viability | 10 | Days until deadline |
| Award size fit | 10 | Org budget vs max award |
| Timeline alignment | 10 | Urgent vs planned |
| Data completeness | 5 | Fields present on opportunity |

## Cron Jobs

| Schedule | Job |
|---|---|
| Daily 2:00 AM | Recompute all matches for active orgs |
| Daily 2:30 AM | Deadline alerts (30 days, fitScore >= 75) |
| Daily 2:45 AM | High-fit alerts (fitScore >= 75) |
| Hourly | Process pending outbox queue |

## Stubbed Services

- **OpenAI**: Returns realistic fallback text when `OPENAI_API_KEY` not set
- **Email**: Marks emails as sent (stub) when SMTP not configured  
- **Cloudinary**: Config loaded at startup, ready to wire into upload routes
