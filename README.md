# Red Dog Radio — Grant Intelligence Platform

A full-stack AI-powered grant intelligence platform built for **public safety agencies** (law enforcement, fire departments, EMS). It helps agencies discover grants, assess fit, draft applications with AI assistance, track submissions, build funder relationships, and analyze wins — all from a single dashboard.

---

## Purpose

Public safety agencies frequently miss grant opportunities because:
- Finding grants requires hours of manual research
- Evaluating fit with agency needs is subjective and time-consuming
- Writing competitive applications demands grant-writing expertise many agencies lack
- Tracking deadlines, outcomes, and follow-ups is difficult to manage

**Red Dog Radio** solves all of this. The platform surfaces relevant grants, scores match quality automatically, and puts an AI grant writing expert ("Ashleen") in every user's pocket — from initial discovery through final submission.

---

## Key Features

| Feature | Description |
|---|---|
| **Grant Discovery** | Browse a curated list of grant opportunities with match scores, deadlines, and keyword filters |
| **AI Match Scoring** | Each grant is scored 0–100 against your agency's profile (category match, budget range, equipment needs) |
| **Ashleen AI** | Floating AI assistant available on every page; can answer grant questions, explain opportunities, and write application content |
| **Apply with Ashleen** | Full AI-guided application flow — Ashleen researches the grant, auto-drafts Project Summary and Community Impact, then lets you refine via chat |
| **Application Builder** | Edit, regenerate, and align AI-written application sections; export as PDF |
| **Submission Tracker** | Track all applications by status (draft → submitted → awarded/rejected); monitor total dollars requested and awarded |
| **Win Database** | Log and analyze past grant wins; see win rate, average award size, and top funder types |
| **Private Funder Library** | Build a private library of funders with contact info, focus areas, and match scores — not reliant on public scrapers |
| **Outreach Builder** | AI-drafts cold outreach emails to funders; manage follow-up tasks |
| **Alerts & Digest** | Deadline alerts, high-fit match notifications, and weekly email digests |
| **Settings** | Language, timezone, notification preferences, and account management |

---

## Tech Stack

**Backend**
- Node.js 20 / Express 4
- MongoDB 7 (local instance)
- JWT authentication (jsonwebtoken + bcryptjs)
- OpenAI GPT-4o-mini for AI features
- node-cron for scheduled jobs
- Swagger UI at `/api-docs`

**Frontend**
- Next.js 15 (App Router, TypeScript)
- Tailwind CSS + Shadcn/UI (Radix primitives)
- TanStack Query (React Query) — all data fetching
- React Hook Form + Zod — all forms
- Oswald + Montserrat typefaces throughout

---

## Complete Demo Flow

### 1. Sign In

Navigate to the app. You will land on the **Login** page.

**Test credentials (admin):**
```
Email:    admin@reddogradios.com
Password: Admin1234!
```

**Test credentials (regular user):**
```
Email:    jane@valleyfire.org
Password: Password1234!
```

After logging in you are redirected to the Dashboard (if onboarding is complete) or to the Onboarding flow.

---

### 2. Onboarding (first-time users)

New accounts are routed through a 5-step onboarding wizard before accessing the platform:

| Step | What you fill in |
|------|-----------------|
| 1 — Agency Info | Name, type (Police / Fire / EMS / County), state, city |
| 2 — Coverage | Population served, coverage area (sq mi), number of staff |
| 3 — Equipment | Current equipment, critical gaps / main problems |
| 4 — Grant History | Past grant experience, average award sizes |
| 5 — Notifications | Email alert preferences (deadline reminders, high-match alerts) |

Once submitted the platform computes initial match scores and routes you to the Dashboard.

---

### 3. Dashboard

The Dashboard gives a live snapshot of your grant pipeline:

- **Total Opportunities** found matching your profile
- **Active Applications** currently in progress
- **Total Dollars Requested** across all submissions
- **Total Dollars Awarded** from won grants
- **Recent Alerts** — deadline warnings and new high-fit grants
- **Top Matched Opportunities** — highest-scoring grants ready to apply for

---

### 4. Explore Opportunities

Navigate to **Opportunities** in the left sidebar.

- Browse the full grant library with search, keyword filters, status filters (Open / Closing Soon / Closed), and amount filters
- Each card shows the grant name, funder, award amount, deadline, category, and a **match score badge** (green ≥ 75, orange 50–74, red < 50)
- Click **"Preview"** on any card to see the full description, eligibility, and source link
- Click **"Apply with Ashleen"** to launch the AI-powered application flow (see Step 5)
- Use **"Add Opportunity"** to manually enter a grant you found elsewhere

---

### 5. Apply with Ashleen (Full AI Application Flow)

Clicking **"Apply with Ashleen"** on any opportunity opens a chat-style modal:

**Step 0 — Initial Greeting**
Ashleen introduces herself and presents three options:
- **Tell me more** — Ashleen fetches detailed information about the grant (what it funds, eligibility, key requirements, 2 application tips specific to public safety agencies)
- **Apply Now** — Immediately creates a draft application and goes straight to the form
- **Not interested** — Closes the modal

**Step 1 — Tell Me More (optional)**
Ashleen returns a detailed, AI-generated briefing on the grant in about 5 seconds. Once you've read it, click **"Start Application →"** to proceed.

**Step 2 — AI-Powered Application Form**
The form opens pre-filled with your organization's details (pulled from your profile). Simultaneously, Ashleen auto-generates two key sections:

- **Project Summary** — 2–3 professional paragraphs tailored to the specific grant and your agency type
- **Community Impact** — 1–2 paragraphs on measurable community benefit

A loading overlay appears on each field while Ashleen writes. When done, a message appears in the Ashleen chat bar: *"I've drafted the Project Summary and Community Impact sections!"*

You can then:
- Edit any field manually
- Click **"✦ Regenerate"** next to Project Summary or Community Impact to get a fresh AI draft
- Type in the **Ashleen chat bar** at the bottom to refine content, for example:
  - *"Make the project summary more formal"*
  - *"Add radio equipment detail to the community impact"*
  - *"Focus on officer safety"*
  - Ashleen will rewrite the targeted field and confirm: *"Done! I've updated the Project Summary."*

Fill in the remaining fields (contact info is pre-populated, project title defaults to the grant name).

Click **"Looks good, Review & Submit"** when ready.

**Step 3 — Final Review**
Ashleen displays a clean summary of your application (organization, contact, project title, amount, timeline). Click **"Submit Application"** to submit. You are redirected to the Application detail page. The application appears in the Tracker as **Submitted**.

---

### 6. Applications Page

Navigate to **Applications** in the sidebar to see all your submissions in a list.

- Filter by status (Draft / Submitted / Under Review / Awarded / Rejected)
- Click any application to open the **Application Builder** — a full editor where you can:
  - View and edit every section of the application
  - Regenerate any AI section individually
  - Align the application to the specific funder's voice
  - Export the complete application as a formatted document

---

### 7. Tracker

Navigate to **Tracker** to see the big picture of your grant pipeline:

- Total applications submitted
- Applications awarded
- Applications rejected / pending
- **Total dollars requested** across all submissions
- **Total dollars awarded**
- Status update controls — move any application through the pipeline (e.g., mark as Awarded)
- When an application is marked **Awarded**, the platform automatically creates a record in the Win Database

---

### 8. Win Database

Navigate to **Wins** to see all successfully awarded grants:

- Full list of wins with funder name, amount, date, and notes
- **Win Rate** — percentage of submitted applications that were awarded
- **Average Award** — mean dollar value per win
- **Top Funder Type** — which category of funder (federal, foundation, corporate) wins most often

---

### 9. Funder Library

Navigate to **Funders** to manage your private funder contacts:

- **8 funders pre-seeded:** FEMA, DOJ COPS, DHS/FEMA BSIR, Motorola Solutions Foundation, Texas TDEM, AT&T FirstNet, Walmart Foundation, Community Foundation of North Texas
- Add custom funders with: name, type, focus areas, geographic scope, average grant range, website, and contact info
- Each funder has a computed **match score** against your agency profile
- Click any funder to open the **Funder Detail** page — view all linked opportunities, past outreach, and notes
- From Funder Detail, launch the **Outreach Builder** to send a cold introduction email

---

### 10. Outreach Builder

From any Funder Detail page, click **"Draft Outreach Email"**:

- Ashleen AI drafts a personalized cold outreach email to the funder based on your agency profile and the funder's focus areas
- Edit the subject line, body, and signature
- Send via the platform (requires SMTP config) or copy and send manually
- All sent outreach is logged in the funder's history

---

### 11. Matches

Navigate to **Matches** to see all AI-computed grant matches:

- Each match shows the opportunity, match score, matched keywords, and reasoning
- **Approve** a match to add it to your active pipeline
- **Reject** a match to remove it from future suggestions

Matches are refreshed nightly via a scheduled cron job and recomputed whenever your agency profile changes.

---

### 12. Alerts

Navigate to **Alerts** to see all system notifications:

- **Deadline alerts** — 14 days, 7 days, and 3 days before any opportunity you've engaged with closes
- **High-match alerts** — new grants that score ≥ 75 against your profile
- Mark individual alerts as read or delete them

---

### 13. Weekly Summary

Navigate to **Weekly Summary** to see AI-generated digest emails:

- Each digest summarizes the week's new opportunities, match changes, and application activity
- Digests are auto-generated every Monday and can be triggered manually

---

### 14. Settings

Navigate to **Settings** to manage your account:

| Section | Options |
|---------|---------|
| Profile | Name, email, phone |
| Preferences | Language (English / Spanish / French / German / Portuguese), Timezone (all major US + international zones) |
| Notifications | Deadline reminders, match alerts, digest emails — toggle on/off |
| Security | Change password |
| Account | Delete account (destructive — requires confirmation) |

---

### 15. Ashleen AI (Global Chat)

A floating **Ashleen** button (bottom-right on every authenticated page) opens a global AI chat panel. Ask Ashleen anything:

- *"Which grants close this month?"*
- *"What makes a strong FEMA application?"*
- *"How do I calculate our budget justification?"*
- *"Summarize the DOJ COPS grant for me"*

Ashleen maintains conversation history within the session and responds with grant-writing expertise.

---

## Seed Data

The database is seeded with realistic sample data on first run:

- 1 admin user (`admin@reddogradios.com`)
- 1 regular user (`jane@valleyfire.org`) with a complete agency profile (Valley Fire Department)
- 10+ grant opportunities across federal, foundation, and corporate categories
- 8 funders in the private library
- Sample applications, matches, alerts, wins, and outreach records

---

## Running the App

The `start.sh` script in the project root handles everything:

```bash
bash start.sh
```

This starts:
1. **MongoDB** (local instance, data stored in `./data/db`)
2. **Express backend** on port 4000
3. **Next.js frontend** on port 5000

### Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `MONGO_URI` | MongoDB connection string | `mongodb://localhost:27017/reddog_db` |
| `JWT_SECRET` | JWT signing secret | (required) |
| `PORT` | Backend port | `4000` |
| `NODE_ENV` | Environment | `development` |
| `OPENAI_API_KEY` | Enables real AI responses | (optional — falls back to keyword mode) |
| `SMTP_HOST` | Outreach email sending | (optional) |
| `SMTP_USER` | SMTP username | (optional) |
| `SMTP_PASS` | SMTP password | (optional) |

> **Without an OpenAI API key:** All Ashleen AI features fall back to intelligent keyword-based responses. The platform is fully functional; AI-generated content will be templated rather than dynamically written.

---

## API Documentation

Swagger UI is available at:
```
http://localhost:4000/api-docs
```

All endpoints require a Bearer JWT token (except `/api/auth/login` and `/api/auth/register`).
