# Grant Opportunity Fetching — System Overview

## Data Source

All grant opportunities are pulled from **[Simpler.Grants.gov](https://simpler.grants.gov)**, the official U.S. federal grant database maintained by the Department of Health and Human Services. This is the same platform where federal agencies post every grant program — covering FEMA, Department of Justice, Department of Health, and all other federal agencies.

- **Coverage:** Every active and forecasted federal grant opportunity in the United States
- **Cost:** Free — no licensing or data fees
- **Authority:** Official U.S. government source; data is always current and authoritative

---

## How It Works — Step by Step

### Step 1: Category Pre-Filtering (at the API level)

Rather than downloading all 10,000+ active grants and filtering locally, the system tells the Grants.gov API to **only return opportunities from four public-safety-relevant categories**:

| Category Slug | What It Covers |
|---|---|
| `law_justice_and_legal_services` | COPS Hiring, Byrne JAG, corrections, crime prevention, forensics |
| `disaster_prevention_and_relief` | FEMA/AFG, BRIC, emergency management, wildfire, flood mitigation |
| `health` | EMS, paramedics, emergency medical services, public health emergency |
| `science_technology_and_other_research_and_development` | NG911, P25/LMR communications, FirstNet, interoperable radio infrastructure |

This means only the grants most relevant to public safety agencies ever enter the pipeline. General grants for education, housing, arts, agriculture, etc. are never downloaded.

---

### Step 2: Public Safety Relevance Scoring

Every opportunity that passes the category filter is then scored against a **keyword relevance model** to remove noise within those categories (e.g., general health grants that are not relevant to fire/EMS/police).

**How scoring works:**

Each opportunity's title, funder name, description, funding categories, and eligible applicant types are searched for public safety keywords. Each keyword carries a weight based on how specifically it relates to Red Dog's customers:

| Tier | Example Keywords | Weight |
|---|---|---|
| Tier 1 — Bullseye | `interoperability`, `P25`, `land mobile radio`, `assistance to firefighters`, `COPS hiring`, `UASI`, `NG911` | 8–14 pts each |
| Tier 2 — Strong domain | `public safety`, `first responder`, `law enforcement`, `fire department`, `firefighter`, `EMS`, `911`, `dispatch center`, `PSAP` | 6–10 pts each |
| Tier 3 — Equipment/context | `radio`, `repeater`, `body-worn camera`, `SCBA`, `turnout gear`, `mobile data terminal`, `computer aided dispatch` | 3–8 pts each |
| Tier 4 — Disaster/resilience | `hazard mitigation`, `critical infrastructure`, `CBRN`, `active shooter`, `mass casualty`, `hazmat` | 4–10 pts each |

**Minimum score to be saved: 8 points.**

A grant titled *"Assistance to Firefighters Grant Program"* from FEMA would score 14+ points on its title alone and be immediately saved. A general health research grant about obesity prevention would score 0 and be discarded.

**Disqualifier:** Any opportunity matching foreign-aid signals (`Department of State`, `bureau of counterterrorism`, `embassy`, `U.S. Mission to`) receives a −20 penalty, dropping it below the threshold regardless of other matches.

---

### Step 3: Detail Enrichment

For every opportunity that passes the score filter, the system makes a second API call to fetch the **full grant record**, which includes:

- Program officer contact email
- Program officer contact name
- Full application URL
- Any additional descriptive fields not included in the search results

This enriched data is what powers the outreach email feature — so users can contact the right person at the funding agency directly from the platform.

---

### Step 4: Upsert to Database

Each opportunity is saved using an **upsert** (insert or update) keyed on the Grants.gov opportunity ID, so:

- New opportunities are inserted and immediately matched against all registered agencies
- Existing opportunities are updated if their title, deadline, award amounts, status, or eligible applicants have changed
- Unchanged opportunities are skipped (no write, no match recompute)

---

### Step 5: Stale Opportunity Closing

At the end of each ingestion run, any opportunity **within the four target categories** that was not seen in the current run is automatically marked as `closed`. This keeps the platform's opportunity list current — grants that have been removed from Grants.gov disappear from the platform automatically.

> **Safety guard:** The stale-close only runs if at least 50 opportunities were parsed in the current run. This prevents accidentally mass-closing everything if the API had a partial failure.

---

## Schedule

| Trigger | When | Who |
|---|---|---|
| **Automatic daily sync** | Every day at 5:30 AM Mountain Time | Cron job (automatic) |
| **Manual sync** | On-demand via admin panel | Admin user |

The daily sync ensures the platform always reflects the current state of Grants.gov within 24 hours. The manual trigger allows an admin to force a refresh immediately — useful after onboarding a new agency or after a major grant program announcement.

---

## Admin Panel

The **Opportunities** page in the admin panel includes:

- **"Sync from Grants.gov" button** — triggers an immediate background ingestion. Returns instantly; the sync runs in the background and typically completes within 5–15 minutes depending on how many new opportunities are available.
- **Last sync status bar** — shows when the last sync ran, whether it succeeded, and key stats:
  - **Fetched** — how many opportunities were returned by the API across all pages
  - **Saved** — how many new opportunities were inserted into the database
  - **Filtered** — how many were discarded by the relevance score

---

## Match Computation

Every time a new opportunity is inserted, the system immediately computes **match scores** against all registered agencies. Match scoring considers:

- Agency type (fire, EMS, law enforcement, etc.)
- Agency location
- Equipment needs on file
- Prior application history

This means agencies see new relevant grants in their dashboard within minutes of them being ingested — not just once a day.

---

## Summary of Volumes (Expected)

| Stage | Approximate Count |
|---|---|
| Total active federal grants on Grants.gov | ~10,000–30,000 |
| After category pre-filter (4 categories) | ~500–2,000 |
| After relevance score filter (≥ 8 pts) | ~200–800 |
| Saved to platform per daily run (new only) | Varies — typically 10–100 new per day |

The platform maintains a live database of all currently open and forecasted public-safety-relevant federal grants, refreshed daily.

---

## Technology

| Component | Detail |
|---|---|
| Data source | Simpler.Grants.gov REST API v1 |
| Scheduling | Node.js cron (runs inside the backend process) |
| Database | MongoDB (upsert by `externalSourceId`) |
| Rate limiting | ~55 requests/minute (safely under the 60/min API limit) |
| Retry logic | Up to 3 retries with exponential backoff on any failed request |
| Pagination | 100 records per page; no page cap enforced below 1,000 pages |
