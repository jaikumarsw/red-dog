# REQUIREMENTS_AUDIT

## Verdict

The codebase does not currently implement a single, 4-step intake flow end to end. What exists today is a 5-step onboarding wizard that stages data in `sessionStorage`, submits a partial payload to `/api/onboarding/complete`, and then redirects to `/dashboard` instead of showing a post-submit results screen. The backend does persist several agency profile fields, but other schema-backed fields are not exposed in the frontend, and one of the onboarding fields is collected in the UI but ignored by the backend service.

The six grant-application narrative sections are real and persisted in the application model, but they are produced later in the application builder flow, not from onboarding completion. That means the current system can support parts of the requested experience, but it does not yet satisfy the requirements as a unified intake-and-results product.

## What Exists Today

### Onboarding flow

- Step 1 captures agency identity: organization name, location, website URL, and mission statement. See [Step1.tsx](red-dog-radios-frontend/src/views/onboarding/Step1.tsx#L25) and [Step1.tsx](red-dog-radios-frontend/src/views/onboarding/Step1.tsx#L83).
- Step 2 captures agency types with a multi-select UI and an `Other` option. See [Step2.tsx](red-dog-radios-frontend/src/views/onboarding/Step2.tsx#L14) and [Step2.tsx](red-dog-radios-frontend/src/views/onboarding/Step2.tsx#L72).
- Step 3 captures program areas with the same pattern. See [Step3.tsx](red-dog-radios-frontend/src/views/onboarding/Step3.tsx#L14) and [Step3.tsx](red-dog-radios-frontend/src/views/onboarding/Step3.tsx#L68).
- Step 4 captures a request description plus budget, timeline, population served, coverage area, number of staff, and current equipment. See [Step4.tsx](red-dog-radios-frontend/src/views/onboarding/Step4.tsx#L34) and [Step4.tsx](red-dog-radios-frontend/src/views/onboarding/Step4.tsx#L79).
- Step 5 captures goals, posts the assembled payload, clears the staged onboarding keys, and redirects to the dashboard. See [Step5.tsx](red-dog-radios-frontend/src/views/onboarding/Step5.tsx#L96), [Step5.tsx](red-dog-radios-frontend/src/views/onboarding/Step5.tsx#L108), and [Step5.tsx](red-dog-radios-frontend/src/views/onboarding/Step5.tsx#L119).

### Backend onboarding persistence

- The onboarding endpoint is a single `POST /complete` route protected by auth. See [onboarding.route.js](red-dog-radios-backend/src/modules/onboarding/onboarding.route.js#L1) and [onboarding.controller.js](red-dog-radios-backend/src/modules/onboarding/onboarding.controller.js#L1).
- The service creates or updates the Organization record, saves the mapped agency types, program areas, budget range, timeline, goals, population served, coverage area, number of staff, and current equipment, then marks the user as onboarded. See [onboarding.service.js](red-dog-radios-backend/src/modules/onboarding/onboarding.service.js#L84), [onboarding.service.js](red-dog-radios-backend/src/modules/onboarding/onboarding.service.js#L145), and [onboarding.service.js](red-dog-radios-backend/src/modules/onboarding/onboarding.service.js#L150).
- The backend never stores `specificRequest` or `requestDescription`. The frontend sends `specificRequest`, but the service destructures `specificRequest` and then never writes it into the Organization schema. See [Step5.tsx](red-dog-radios-frontend/src/views/onboarding/Step5.tsx#L97) and [onboarding.service.js](red-dog-radios-backend/src/modules/onboarding/onboarding.service.js#L84).

### Settings and profile editing

- Agency profile editing in the settings screen only exposes name, location, website URL, mission statement, and local match capacity. See [Settings.tsx](red-dog-radios-frontend/src/views/Settings.tsx#L73) and [Settings.tsx](red-dog-radios-frontend/src/views/Settings.tsx#L160).
- `canMeetLocalMatch` is persisted through the settings service, not through onboarding. See [settings.service.js](red-dog-radios-backend/src/modules/settings/settings.service.js#L14), [settings.service.js](red-dog-radios-backend/src/modules/settings/settings.service.js#L55), and [settings.service.js](red-dog-radios-backend/src/modules/settings/settings.service.js#L61).
- The settings service populates the organization with only `name`, `location`, `websiteUrl`, `missionStatement`, and `canMeetLocalMatch` on readback, which confirms the limited editable surface. See [settings.service.js](red-dog-radios-backend/src/modules/settings/settings.service.js#L6) and [settings.service.js](red-dog-radios-backend/src/modules/settings/settings.service.js#L73).

### Application and AI outputs

- The application model stores the six narrative sections required by the AI writing flow: problem statement, community impact, proposed solution, measurable outcomes, urgency, and budget summary. See [application.schema.js](red-dog-radios-backend/src/modules/applications/application.schema.js#L27) and [application.schema.js](red-dog-radios-backend/src/modules/applications/application.schema.js#L35).
- The application builder can regenerate and align those six sections after an application exists. See [ApplicationBuilder.tsx](red-dog-radios-frontend/src/views/ApplicationBuilder.tsx#L22), [ApplicationBuilder.tsx](red-dog-radios-frontend/src/views/ApplicationBuilder.tsx#L111), and [ApplicationBuilder.tsx](red-dog-radios-frontend/src/views/ApplicationBuilder.tsx#L192).
- Those six outputs are real, but they are not part of onboarding completion and they do not serve as the immediate post-submit results surface the new requirements describe.

## Field Reality Matrix

Status legend:

- REAL = persisted and wired through the intended backend path.
- PARTIAL = present in the UI or backend, but not fully connected end to end.
- DUMMY = only a visual or placeholder concept, not a real persisted field.
- MISSING = not implemented in the current codebase.

| Field / requirement | Current surface | Backend field or output | Status | Notes |
| --- | --- | --- | --- | --- |
| Organization name | Onboarding step 1 | `Organization.name` | REAL | Saved during onboarding and required by schema. |
| Location | Onboarding step 1, settings profile editor | `Organization.location` | REAL | Persisted by onboarding and editable in settings. |
| Website URL | Onboarding step 1, settings profile editor | `Organization.websiteUrl` | REAL | Persisted by onboarding and editable in settings. |
| Mission statement | Onboarding step 1, settings profile editor | `Organization.missionStatement` | REAL | Persisted by onboarding and editable in settings. |
| Agency types | Onboarding step 2 | `Organization.agencyTypes` | REAL | Frontend IDs are mapped to backend enum values in onboarding service. |
| Program areas | Onboarding step 3 | `Organization.programAreas` | REAL | Persisted as an array and also mirrored to `focusAreas`. |
| Primary request / request description | Onboarding step 4 | `specificRequest` payload only | PARTIAL | Collected in the UI, sent to the backend, but not saved to the Organization model. |
| Budget range | Onboarding step 4 | `Organization.budgetRange` | REAL | Mapped from frontend values before save. |
| Timeline | Onboarding step 4 | `Organization.timeline` | REAL | Stored as `urgent` or `planned`. |
| Population served | Onboarding step 4 | `Organization.populationServed` | REAL | Optional numeric field; saved when provided. |
| Coverage area | Onboarding step 4 | `Organization.coverageArea` | REAL | Optional text field; saved when provided. |
| Number of staff | Onboarding step 4 | `Organization.numberOfStaff` | REAL | Optional numeric field; saved when provided. |
| Current equipment | Onboarding step 4 | `Organization.currentEquipment` | REAL | Optional text field; saved when provided. |
| Goals | Onboarding step 5 | `Organization.goals` | REAL | Saved during onboarding and used later in AI/prompting. |
| Local match capacity | Settings screen only | `Organization.canMeetLocalMatch` | REAL | Works, but the control lives in Settings rather than onboarding. |
| Main problems | No current frontend field | `Organization.mainProblems` | MISSING | Schema exists, AI/matching code references it, but no UI captures it. |
| Funding priorities | No current frontend field | `Organization.fundingPriorities` | MISSING | Schema exists, AI/matching code references it, but no UI captures it. |
| Focus areas | No dedicated frontend field | `Organization.focusAreas` | PARTIAL | Backend writes it from onboarding data, but there is no distinct user-facing control. |
| Agency email | Not surfaced in onboarding/profile | `Organization.email` | MISSING | Present in schema but not populated by current flows. |
| Post-submit results screen | None | None | MISSING | Onboarding currently jumps to dashboard after submit. |
| Immediate match results | None | Match computation exists elsewhere | MISSING | No onboarding-completion response renders match results. |
| Six grant narrative outputs | Application builder | `Application.problemStatement`, `communityImpact`, `proposedSolution`, `measurableOutcomes`, `urgency`, `budgetSummary` | REAL | These are implemented in the application flow, not onboarding. |
| Funder-aligned rewrite | Application builder | `Application.alignedVersion.*` | REAL | Exists, but only after an application is created. |

## Gap Analysis Against The Target 4-Step Intake

### Step 1: Agency identity

Mostly covered. The current step 1 captures the expected identity fields, and the settings page can edit the same core profile values later. The gap is not data capture; it is consolidation and consistency of where that data is edited.

### Step 2: Agency intelligence

Only partially covered. Agency type and program area are collected, but the schema-backed strategic fields `mainProblems` and `fundingPriorities` are not exposed anywhere in the current UI. `canMeetLocalMatch` is real, but it is hidden in Settings rather than onboarding, so the user experience is split.

### Step 3: Funding need / request details

Partially covered. The UI collects a request description plus budget, timeline, population served, coverage area, number of staff, and current equipment, but the request description is effectively lost because the backend never persists it. The rest of the step is real.

### Step 4: Goals and submit

The goals selection is real, but the post-submit experience is missing. The current implementation only saves the onboarding record and routes to the dashboard. There is no dedicated results page, no immediate match summary, and no surfaced next-step recommendation.

## What Needs To Change

1. Decide whether `specificRequest` is a real required field. If yes, add it to the Organization schema and persist it in onboarding. If not, remove it from the UI and payload so the contract is honest.
2. Add capture and persistence for `mainProblems` and `fundingPriorities`, since the schema and AI/match code already expect them.
3. Consolidate `canMeetLocalMatch` into the intake flow or explicitly document it as a separate settings-only attribute; right now it is real but split across screens.
4. Replace the current dashboard redirect with a post-submit results experience that shows the saved profile, initial match results, and next recommended action.
5. If the new 4-step requirement is meant to be the canonical intake, collapse the current 5-step onboarding/sessionStorage staging into one backend contract so the frontend and service validate the same payload.
6. Keep the six application narrative outputs in the application builder, but do not treat them as a substitute for onboarding results. They solve a different part of the workflow.

## Bottom Line

The platform already has the raw data model for a good portion of the requested experience, but the implementation is fragmented. Identity, agency type, program area, and most operational request fields are real. Strategic profile fields are incomplete, the request description is not actually saved, and the submit flow ends with a dashboard redirect instead of a results page. The fastest path forward is to close the contract gap first, then add a real post-submit result surface.