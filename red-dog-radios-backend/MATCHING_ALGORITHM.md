# Red Dog Grant Intelligence — Matching Algorithm

> Last updated: May 2026  
> Score version: v5

---

## Overview

The matching engine computes a **fit score** for every (agency, grant) pair and decides whether that grant is **relevant** to the agency. The displayed score on the card is the rubric score discounted by 18% to set realistic expectations. Every field an agency fills in directly improves the quality and accuracy of their matches.

---

## How a Score Is Computed

Each match goes through three sequential stages.

### Stage 1 — Eligibility Scoring (`computeMatchScore`)

Seven rule-based dimensions, totalling up to 100 raw points. This is the **internal** eligibility score — it is never shown directly to the user.

| # | Dimension | Max pts | What it checks |
|---|-----------|---------|----------------|
| 1 | **Agency Type** | 20 | Does the agency's type (`fire_services`, `law_enforcement`, etc.) match the grant's required applicant types? If the grant has no listed types, keyword fallback is used. |
| 1a | **Eligibility type** | +5 | Nonprofit 501(c)(3) vs government agency alignment with grant text |
| 1b | **Local match capacity** | +5 | If grant requires local match, does the agency confirm they can meet it? |
| 2 | **Geography** | 20 | Is the grant national (open to all states) or does it list the agency's state? Hard disqualifier if geographic mismatch. |
| 3 | **Thematic / semantic match** | 25 | See Stage 3 below — this is the most agency-specific dimension |
| 4 | **Deadline viability** | 10 | 30+ days: 10 pts · 14–30 days: 7 pts · 7–14 days: 3 pts · <7 days: 1 pt · past: disqualified |
| 5 | **Award size fit** | 10 | Agency's budget range vs grant max award |
| 6 | **Timeline alignment** | 10 | Agency's urgency level vs grant deadline proximity |
| 7 | **Data completeness** | 5 | How complete is the grant record (title, description, deadline, amount, etc.) |

**Priority boost:** Agencies with active status and no recent wins get +5 pts.

---

### Stage 2 — Rubric Scoring (`computeRubricScores`)

An 8-category assessment totalling 135 points, then normalised to 0–100. This is the score shown in the **Score Breakdown modal**.

| Category | Max | What drives it |
|----------|-----|----------------|
| Need / Problem | 25 | Number of challenges listed + overlap with grant priorities |
| Project Design | 25 | How complete the grant record is |
| Budget Justification | 15 | Award size fit × 1.5 |
| Organisational Capacity | 15 | Staff size + historical win rate |
| Impact / Outcomes | 20 | Population served + programme overlap |
| Evaluation | 10 | Grant data completeness × 2 |
| Sustainability | 10 | Local match capacity + budget + equipment + staff |
| Mission Alignment | 15 | Blend of agency type + geography + thematic scores |

**Formula:** `normalizedScore = round((totalScore / 135) × 100)`, clamped 5–100.

---

### Stage 3 — Thematic / Semantic Match (the agency-specific part)

This is the **25-point dimension** that makes each agency see different grants. It uses two approaches depending on whether OpenAI embeddings have been generated.

#### Path A — Semantic Embeddings (active when `OPENAI_API_KEY` is set)

When both the agency profile embedding and the grant description embedding exist, the engine computes **cosine similarity** between them.

**Agency profile text** fed to the embedding model (built from every content field):
```
agency_type. mission_statement. specific_request. biggest_challenge.
urgency_statement. who_benefits. current_equipment. coverage_area.
project_title. challenges. program_areas. focus_areas.
funding_priorities. goals. main_problems.
```

**Grant text** fed to the embedding model:
```
title. funder. category. description. keywords. equipment_tags.
public_safety_keywords_matched. eligible_applicants.
```

Similarity → score mapping:

| Cosine similarity | Points | Label |
|-------------------|--------|-------|
| ≥ 0.55 | 25 | Strong semantic match |
| 0.40 – 0.55 | 18 | Good semantic alignment |
| 0.25 – 0.40 | 8 | Moderate overlap |
| < 0.25 | 0 | Disqualifier — low semantic relevance |

This means **garbage or random text in the agency profile produces near-zero similarity** with any specific grant and scores 0 on this dimension, preventing irrelevant matches.

#### Path B — Keyword Fallback (used when embeddings are not yet generated)

Exact-string overlap between agency keywords and grant keywords/description tokens.

**Agency keywords come from** (in priority order):
1. `challenges` → mapped to specific keywords  
   e.g. `outdated_equipment` → `[equipment, apparatus, gear, vehicle, modernization, ...]`  
   e.g. `communication_issues` → `[communications, radio, interoperability, 911, ng911, ...]`
2. `programAreas` / `focusAreas` / `fundingPriorities` (free text)
3. Tokenised text from `missionStatement`, `specificRequest`, `biggestChallenge`, etc.

> **Note:** Agency type keywords (`fire`, `firefighter`, `police`, etc.) are intentionally **not** included in thematic scoring. Agency type is already scored in dimension 1. Including it in keywords would give every fire department the same score on every fire grant regardless of their actual stated needs.

**Grant corpus** is built from: `keywords[]`, `equipmentTags[]`, `category`, `funder`, and tokenised `title` + `description`.

| Keyword overlap count | Points |
|-----------------------|--------|
| 4+ matches | 25 |
| 2–3 matches | 18 |
| 1 match | 8 |
| 0, but profile has keywords | 0 + disqualifier |
| Profile has no keywords | 0 (prompt to complete profile) |

---

## Disqualifiers

Any disqualifier sets `isRelevant = false` — the grant will not appear for the agency.

| Disqualifier | Trigger |
|---|---|
| Deadline passed | Grant deadline is in the past |
| Geographic mismatch | Grant lists specific states; agency's state not in the list |
| Local match not met | Grant requires local match; agency said they cannot meet it |
| Off-domain | Funder is NIH/CDC/NSF/DoE AND thematic overlap < 2 (prevents health research grants appearing for fire/police) |
| No thematic overlap | Agency has keywords but none matched the grant |
| Low semantic relevance | Embedding cosine similarity < 0.25 |
| Score below threshold | Final rubric score < 50 |

---

## Display Score

The number shown on the grant card is **not** the raw rubric score. It is discounted by 18% to avoid creating false confidence:

```
displayScore = round(normalizedScore × 0.82)
```

Example: rubric score 98 → card shows **80**.

The `rawFitScore` (original eligibility score) is stored internally for reference but never shown.

---

## Win Probability

```
winProbability = (rawFitScore × 0.5) + ((1 − competitionLevel) × 100 × 0.3) + (pastSuccessFactor × 100 × 0.2)
```

| Input | Source |
|---|---|
| `rawFitScore` | Stage 1 eligibility score |
| `competitionLevel` | Ratio of other agencies also scoring ≥ 90 on this grant (0.2 Low → 1.0 Saturated) |
| `pastSuccessFactor` | Agency's historical win rate (awarded / submitted applications) |

---

## Relevance Decision (`isRelevant`)

A grant is marked relevant only if **all** of the following pass:

1. No hard disqualifiers (deadline, geography, local match, off-domain, semantic)
2. Rubric normalised score ≥ 50 (configurable via `AGENCY_MIN_FIT_SCORE` env var)
3. Thematic dimension score > 0 OR semantic similarity > 0 (agency must have meaningful content)

---

## When Matches Are Computed

| Event | Action |
|---|---|
| Agency completes onboarding | `computeAllForOrganization` runs in background |
| New grant added | `computeAllForOpportunity` runs in background |
| Grant updated | `computeAllForOpportunity` re-runs if content fields changed |
| Admin clicks Recompute All | Full pass over all active agencies |
| Agency updates profile | Re-triggers `computeAllForOrganization` |

---

## Embedding Lifecycle

```
Agency saves profile
    → setImmediate: refreshOrgEmbedding()
        → buildAgencyProfileText(org)  [all content fields joined]
        → OpenAI text-embedding-3-small API call
        → saves profileEmbedding ([1536 floats]) to Organization document

Grant is created / updated
    → setImmediate: refreshOppEmbedding()
        → buildOpportunityText(opp)  [title + description + keywords + ...]
        → OpenAI text-embedding-3-small API call
        → saves descriptionEmbedding ([1536 floats]) to Opportunity document

Match scoring reads profileEmbedding + descriptionEmbedding
    → cosineSimilarity(orgEmb, oppEmb)  [pure math, no API call]
    → maps to 0 / 8 / 18 / 25 pts
```

Embeddings are stored with `select: false` so they are never included in normal API responses — they are only loaded when the match engine explicitly selects them.

To backfill embeddings for existing agencies and grants:
```
POST /api/admin/matches/backfill-embeddings
```

---

## Probe Output (Live Example)

Running `node probe.js` against Colorado Springs Fire Department:

```
Opps with EMPTY agencyTypes: 736 / 736
Fire-relevant grants found: 17

fit:100 relevant:true  | USGS Cooperative Landslide Hazard Mapping
fit:97  relevant:true  | Emergency Medical Services for Children
fit:92  relevant:true  | Enhancing sustainable health information
fit:88  relevant:true  | NIJ FY25 Research on Drugs and Crime
fit:85  relevant:true  | Rural Emergency Medical Services Training
fit:80  relevant:true  | Maternal Health Emergency Management Training
```

**Key observation:** All 736 grants in the database have empty `agencyTypes`. This means the engine always uses the eligibility-text fallback (awarding 6–18 pts instead of a clean match/no-match), and grants containing the word "emergency" can score high even if they are health research grants. This will be corrected once embeddings are generated — semantic similarity will properly separate "emergency medicine research" from "emergency response equipment funding".

---

## Files

| File | Role |
|---|---|
| `src/modules/matches/match.service.js` | Core engine: all scoring functions |
| `src/utils/agencyProfileTags.js` | Profile builder, keyword extractor, `isAgencyRelevant` |
| `src/utils/embedding.service.js` | OpenAI embedding generation and cosine similarity |
| `src/modules/matches/match.schema.js` | Match document schema |
| `src/modules/organizations/organization.schema.js` | Agency profile schema (`profileEmbedding` field) |
| `src/modules/opportunities/opportunity.schema.js` | Grant schema (`descriptionEmbedding` field) |
| `src/modules/onboarding/onboarding.service.js` | Triggers embedding after agency saves |
| `src/modules/opportunities/opportunity.service.js` | Triggers embedding after grant saves |
| `src/modules/admin/admin.service.js` | `recomputeAllMatches` — full recompute pipeline |
| `scripts/recompute-matches.js` | CLI script to run a full recompute |
