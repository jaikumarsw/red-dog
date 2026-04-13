# BUG INVESTIGATION REPORT
Date: 2026-04-13
Investigator: Claude Code

---

## SUMMARY TABLE

| # | Title | Severity | Root Cause Found | Files Affected | Fix Complexity |
|---|-------|----------|-----------------|----------------|----------------|
| 1 | Onboarding Field Persistence | High | YES | Step1–4.tsx | MEDIUM |
| 2 | Agency Data Saved as Organization | High | YES | onboarding.service.js, agency.schema.js | COMPLEX |
| 3 | Dashboard Navbar Missing Scroll | Medium | PARTIAL | AppShellLayout.tsx | SIMPLE |
| 4 | Settings Wrong Label and Redirect | Medium | YES | Settings.tsx | SIMPLE |
| 5 | Agency Profile Missing Fields | High | YES | Step1–5.tsx, organization.schema.js | MEDIUM |
| 6 | Ashleen AI Not Responsive | Medium | YES | AshleenChat.tsx | SIMPLE |
| 7 | Opportunities No Dropdowns | Medium | YES | admin/(panel)/opportunities/page.tsx | MEDIUM |
| 8 | Funders No Dropdowns | Medium | YES | admin/(panel)/funders/page.tsx | MEDIUM |
| 9 | Funders Show Details Not Working | High | PARTIAL | Funders.tsx, FunderDetail.tsx | SMALL |
| 10 | Agencies Cannot See Opportunities | High | YES | match.route.js | SIMPLE |

---

## BUG #1 — Onboarding Field Persistence

### Status: CONFIRMED

### Root Cause:
Steps 1–4 each save form data to `sessionStorage` on Continue, but **none of them read from `sessionStorage` on mount**. When the user navigates back, the component remounts and re-initializes state from its hardcoded `defaultValues`, erasing whatever was typed.

- **Step1.tsx line 21–28:** `useForm` initializes with `defaultValues: { organizationName: "", location: "", websiteUrl: "", missionStatement: "" }`. No `useEffect` reads `sessionStorage`. Back press navigates to `/onboarding` (Welcome screen).
- **Step2.tsx line 31:** `useState<string[]>(["law-enforcement"])` always resets to the default selection on mount. No sessionStorage read.
- **Step3.tsx line 29:** `useState<string[]>(["comms"])` always resets. No sessionStorage read.
- **Step4.tsx lines 33–42:** `useState("under-25k")`, `useState("urgent")`, and `useForm defaultValues { requestDescription: "" }` all reset on mount. No sessionStorage read.

Step5 only reads from sessionStorage when submitting (lines 71–79), not for restoring its own state. However Step5 only has a goal-selection (already defaulted to `["discover"]`), so its data loss on back is less critical.

### Files That Need Changes:
- `src/views/onboarding/Step1.tsx` — add `useEffect` to read `rdg_onboarding_step1` and call `reset()` on the form
- `src/views/onboarding/Step2.tsx` — add `useEffect` to read `rdg_onboarding_step2` and call `setSelected()`
- `src/views/onboarding/Step3.tsx` — add `useEffect` to read `rdg_onboarding_step3` and call `setSelected()`
- `src/views/onboarding/Step4.tsx` — add `useEffect` to read `rdg_onboarding_step4` and call `reset()`, `setSelectedBudget()`, `setSelectedTimeline()`

### Exact Fix:

**Step1.tsx** — add after the `useForm` call:
```tsx
useEffect(() => {
  if (typeof window === "undefined") return;
  try {
    const saved = sessionStorage.getItem("rdg_onboarding_step1");
    if (saved) reset(JSON.parse(saved));
  } catch {}
}, [reset]);
```

**Step2.tsx** — add after the `useState` call:
```tsx
useEffect(() => {
  if (typeof window === "undefined") return;
  try {
    const saved = sessionStorage.getItem("rdg_onboarding_step2");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed.agencyTypes)) setSelected(parsed.agencyTypes);
    }
  } catch {}
}, []);
```

**Step3.tsx** — same pattern as Step2 but key `rdg_onboarding_step3` and field `programAreas`.

**Step4.tsx** — add after all useState/useForm declarations:
```tsx
useEffect(() => {
  if (typeof window === "undefined") return;
  try {
    const saved = sessionStorage.getItem("rdg_onboarding_step4");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.requestDescription) reset({ requestDescription: parsed.requestDescription });
      if (parsed.budgetRange) setSelectedBudget(parsed.budgetRange);
      if (parsed.timeline) setSelectedTimeline(parsed.timeline);
    }
  } catch {}
}, [reset]);
```

### Estimated Effort: MEDIUM

---

## BUG #2 — Data Model — Agency Data Saved as Organization

### Status: CONFIRMED (naming/architecture issue)

### Root Cause:
`onboarding.service.js` (line 1) imports and writes to `Organization` model, which maps to the `organizations` MongoDB collection. There IS a separate `Agency` model (`agencies` collection, defined in `agency.schema.js`), but it has a completely different, minimal schema (only: name, type, location, grantContactEmail, matchCount, status) and is **not used anywhere in the main signup/onboarding flow**.

The admin `listAgencies` function (`admin.service.js` line 132) also queries from `Organization`, not `Agency`. This means the `Agency` model is essentially a dead schema — it was never integrated into the system. All agency data (including the rich profile fields needed for matching) lives in the `organizations` collection.

The `User` schema (`user.schema.js`) has `organizationId: ObjectId (ref: 'Organization')`, which confirms that the `Organization` model is the intended agency profile store.

The naming is inverted from what was intended: `organizations` stores agencies, and `funders` stores funders. The `agencies` collection is unused/orphaned.

### Files That Need Changes:
Option A — Rename (safe but large change):
- `red-dog-radios-backend/src/modules/organizations/organization.schema.js` — rename model from `Organization` to `Agency`, rename collection from `organizations` to `agencies`
- All files that `require('../organizations/organization.schema')` — update import
- User schema — update `organizationId` ref to `'Agency'`
- Migration script needed to rename collection in MongoDB

Option B — Fix naming only (minimal):
- `red-dog-radios-backend/src/modules/agencies/agency.schema.js` — this thin schema is unused; either delete it or acknowledge it is an orphan
- Add a code comment in organization.schema.js clarifying that `Organization` represents an **agency applicant profile**
- `red-dog-radios-frontend/src/views/Settings.tsx` — label fixes (see Bug #4)

### Exact Fix:
Recommended: **Option B** — document the intent and fix surface labels.
Add a comment to `organization.schema.js` line 1:
```js
// NOTE: Despite the name, this model stores AGENCY profiles (the organizations that apply for grants).
// Funders (grant-making organizations) are stored in the Funder model.
// The thin Agency schema in src/modules/agencies/ is unused and can be removed.
```

Delete or archive `src/modules/agencies/agency.schema.js` as it is an unused orphan that causes naming confusion.

Option A (full rename) requires a database migration and is high-risk. Proceed only with careful testing.

### Estimated Effort: COMPLEX (if renaming) / SMALL (if documenting + label fixes)

---

## BUG #3 — Dashboard — Navbar Missing Scroll

### Status: PARTIALLY CONFIRMED

### Root Cause:
The `AppShellLayout.tsx` does set `overflow-y-auto` on the nav items container (line 122):
```tsx
<div className="flex min-h-0 w-full flex-1 flex-col overflow-y-auto overscroll-y-contain ...">
```

However, the outer `nav` uses `self-stretch` and `min-h-screen` (line 272), which means the nav's height grows with the page content rather than being bounded to the viewport. When the page content is short (typical dashboard), the nav spans the full viewport and `flex-1` on the content div properly constrains the scrollable area. But when:
1. The viewport is very short (e.g., small laptop or scaled browser), the items may overflow without triggering scroll properly due to the `min-h-screen` + `self-stretch` interaction.
2. The nav lacks an explicit `max-h-screen` or `h-screen` constraint.

The **desktop sidebar** (line 272) has `min-h-screen` which makes it always at least full screen height. It does NOT have `h-screen` or `max-h-screen`, meaning the nav can grow taller than the viewport if the main content pushes it.

The **mobile drawer** (line 303–317) correctly uses `h-[100dvh] max-h-[100dvh]` — this one IS properly bounded and should scroll.

The **collapsed sidebar** (line 284) has the same `min-h-screen` issue.

### Files That Need Changes:
- `src/components/AppShellLayout.tsx` — add `h-screen` (or `max-h-screen`) to the desktop sidebar nav

### Exact Fix:
Line 272 — change:
```tsx
nav className="z-10 hidden w-72 shrink-0 flex-col items-stretch self-stretch overflow-hidden border-r border-solid border-[#1f1f1f] bg-[#0d0d0d] min-h-screen lg:flex"
```
To:
```tsx
nav className="z-10 hidden w-72 shrink-0 flex-col items-stretch overflow-hidden border-r border-solid border-[#1f1f1f] bg-[#0d0d0d] h-screen sticky top-0 lg:flex"
```

Line 284 — same change for the collapsed sidebar:
```tsx
nav className="z-10 hidden w-16 shrink-0 flex-col items-stretch overflow-hidden border-r border-solid border-[#1f1f1f] bg-[#0d0d0d] h-screen sticky top-0 md:flex lg:hidden"
```

Using `h-screen sticky top-0` instead of `min-h-screen self-stretch` keeps the sidebar fixed at viewport height and always in view while scrolling main content.

### Estimated Effort: SMALL

---

## BUG #4 — Settings — Wrong Label and Incorrect Redirect

### Status: CONFIRMED

### Root Cause:
**Wrong label:** `Settings.tsx` line 214 uses `<label className={labelCls}>Organization</label>` to label the agency's name field. Since this is an agency-side app, it should say "Agency".

**Misleading link:** `Settings.tsx` lines 217–222 renders a link labeled `"Manage organizations"` pointing to `href="/organizations"`. The `/organizations` page (`src/views/Organizations.tsx`) is an agency-side organization management page. It is NOT an admin page. However, the label "Manage organizations" is confusing because:
1. The word "organizations" implies admin-managed entities (funders)
2. The link should say "Edit agency profile" or similar

Note: Bug report says this "redirects to admin page" — from the code, `href="/organizations"` does NOT redirect to an admin page. It routes to `src/views/Organizations.tsx`, which is an agency-accessible page. However the page is also not in the sidebar navigation menu, which may make it feel disjointed.

### Files That Need Changes:
- `src/views/Settings.tsx` — change label text and link label

### Exact Fix:
**Line 214:** Change:
```tsx
<label className={labelCls}>Organization</label>
```
To:
```tsx
<label className={labelCls}>Agency</label>
```

**Lines 217–222:** Change:
```tsx
<Link href="/organizations" className="...">
  Manage organizations
</Link>
```
To:
```tsx
<Link href="/organizations" className="...">
  Edit agency profile
</Link>
```

Also add "Organizations" (or "Agency Profile") to the AppShell menu in `src/components/AppShell.tsx` so users can navigate there directly.

### Estimated Effort: SMALL

---

## BUG #5 — Agency Profile — Missing Fields Not Collected at Onboarding

### Status: CONFIRMED

### Root Cause:
The admin agency detail page (`src/app/admin/(panel)/agencies/[id]/page.tsx`, lines 164–191) displays these Organization fields:
- `profile.populationServed` (line 166)
- `profile.coverageArea` (line 169)
- `profile.numberOfStaff` (line 172)
- `profile.currentEquipment` (line 175–177)
- `profile.mainProblems` (line 178–184)
- `profile.fundingPriorities` (line 185–191)

All of these exist in the `organization.schema.js` (lines 29–34) but **none are collected in any of the 5 onboarding steps**. The onboarding only collects: `organizationName, location, websiteUrl, missionStatement, agencyTypes, programAreas, specificRequest, budgetRange, timeline, goals`.

The `mainProblems` and `fundingPriorities` fields are used by `AshleenChat.tsx` (lines 68–70) to build AI context — since these are never collected, Ashleen always has incomplete context.

### Files That Need Changes:
- `src/views/onboarding/Step1.tsx` — could add `populationServed`, `coverageArea`, `numberOfStaff`
- OR create a new `src/views/onboarding/Step6.tsx` (and route `src/app/onboarding/step6/page.tsx`)
- `src/views/onboarding/Step4.tsx` — could add `currentEquipment`, `mainProblems`, `fundingPriorities`
- `src/views/onboarding/Step5.tsx` — update payload to include new fields
- `red-dog-radios-backend/src/modules/onboarding/onboarding.service.js` — accept and save new fields

### Exact Fix:
Add new fields to the onboarding payload. The best approach is to extend Step4 or add a new Step 5 (shifting current Step5 to Step6):

**New onboarding step (or extend Step4):**
```tsx
// Fields to add to the onboarding form:
// - Population Served (number input)
// - Coverage Area (text input, e.g. "3 counties in King County, WA")
// - Staff Count (number input)
// - Current Equipment (textarea, e.g. "Motorola APX radios, 15 units")
// - Main Problems (multi-text, comma separated)
// - Funding Priorities (multi-text, comma separated)
```

**Update onboarding.service.js** to accept and save these new fields:
```js
const { populationServed, coverageArea, numberOfStaff, currentEquipment, mainProblems, fundingPriorities } = data;
// In Organization.create({}) and org.save() blocks, add:
populationServed: populationServed ? Number(populationServed) : undefined,
coverageArea: coverageArea || undefined,
numberOfStaff: numberOfStaff ? Number(numberOfStaff) : undefined,
currentEquipment: currentEquipment || undefined,
mainProblems: Array.isArray(mainProblems) ? mainProblems : [],
fundingPriorities: Array.isArray(fundingPriorities) ? fundingPriorities : [],
```

### Estimated Effort: MEDIUM

---

## BUG #6 — Ashleen AI — Not Responsive on Agency Side

### Status: CONFIRMED

### Root Cause:
`AshleenChat.tsx` uses **hardcoded pixel dimensions** for the floating chat panel (line 142–143):
```tsx
style={{ bottom: 100, right: 28, width: 380, height: 560, ... }}
```

On viewports narrower than **436px** (380px panel + 28px right offset + ~28px gutter), the left edge of the panel extends beyond the viewport boundary, breaking the layout.

On a 375px iPhone screen: left edge would be at `375 - 380 - 28 = -33px` — 33px off-screen.
On a 320px screen: `-88px` off-screen.

Additionally, there is a data field mismatch bug in the agency context banner (line 172–173):
```tsx
<span>{(agencyContext.name as string)} · {(agencyContext.city as string)}, {(agencyContext.state as string)}</span>
```
The `Organization` model has **no `city` or `state` fields** — only a combined `location` string (e.g. `"Seattle, WA"`). Both `agencyContext.city` and `agencyContext.state` will always be `undefined`, rendering as `"AgencyName · undefined, undefined"`.

### Files That Need Changes:
- `src/components/AshleenChat.tsx` — fix panel dimensions to be responsive; fix context banner fields

### Exact Fix:

**1. Make the chat panel responsive** — replace the `style` prop on the panel div (line 142):
```tsx
// Remove:
style={{ bottom: 100, right: 28, width: 380, height: 560, fontFamily: "Montserrat, Arial, sans-serif" }}

// Replace with:
className="fixed z-[9999] flex flex-col overflow-hidden rounded-2xl border border-[#f0f0f0] bg-white shadow-[0_8px_40px_rgba(0,0,0,0.18)]"
style={{
  bottom: 100,
  right: 28,
  width: "min(380px, calc(100vw - 32px))",
  left: "max(16px, auto)",
  height: 560,
  fontFamily: "Montserrat, Arial, sans-serif"
}}
```

Or use Tailwind with a responsive approach:
```tsx
className="fixed z-[9999] flex flex-col overflow-hidden rounded-2xl border border-[#f0f0f0] bg-white shadow-[0_8px_40px_rgba(0,0,0,0.18)] bottom-[100px] right-4 w-[calc(100vw-32px)] sm:w-[380px] sm:right-7"
style={{ height: 560, fontFamily: "Montserrat, Arial, sans-serif" }}
```

**2. Fix context banner** — line 173, replace:
```tsx
<span>{(agencyContext.name as string)} · {(agencyContext.city as string)}, {(agencyContext.state as string)}</span>
```
With:
```tsx
<span>{(agencyContext.name as string)}{agencyContext.location ? ` · ${agencyContext.location as string}` : ""}</span>
```

### Estimated Effort: SMALL

---

## BUG #7 — Opportunities — No Dropdowns for Categories and Equipment Tags

### Status: CONFIRMED

### Root Cause:
In the admin opportunity creation dialog (`src/app/admin/(panel)/opportunities/page.tsx`), both `category` (line 287–294) and `equipmentTags` (line 270–278) are plain `<Input>` text fields:

```tsx
<div>
  <Label>Equipment tags (comma separated)</Label>
  <Input value={form.equipmentTags} onChange={(e) => setForm({ ...form, equipmentTags: e.target.value })} />
</div>
<div>
  <Label>Category</Label>
  <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
</div>
```

Free-form text means different admins can enter inconsistent values (e.g., "Radios", "radios", "radio equipment"). The matching algorithm in `match.service.js` uses string matching on these fields — inconsistent values break match accuracy.

### Files That Need Changes:
- `src/app/admin/(panel)/opportunities/page.tsx` — replace text inputs with dropdowns/multi-selects for `category` and `equipmentTags`
- `src/app/admin/(panel)/opportunities/[id]/edit/page.tsx` — apply same fix to the edit form

### Exact Fix:
Define canonical values and use `<select>` (or multi-select) for these fields:

```tsx
// Add constants above the component:
const OPPORTUNITY_CATEGORIES = [
  "Communications & Interoperability",
  "Vehicles & Fleet",
  "Technology & IT",
  "Facilities & Infrastructure",
  "PPE & Safety",
  "Medical Equipment",
  "Public Safety Broadband",
  "Community Programs",
  "Training & Development",
  "Cybersecurity",
  "Other",
];

const EQUIPMENT_TAG_OPTIONS = [
  "radios", "repeaters", "dispatch", "body-worn-cameras",
  "patrol-vehicles", "fire-apparatus", "ambulances", "CAD-systems",
  "defibrillators", "SCBA", "body-armor", "turnout-gear",
  "LTE-broadband", "cybersecurity", "training-equipment",
];

// Replace the Category input:
<select
  className="mt-1 w-full rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-[#111827]"
  value={form.category}
  onChange={(e) => setForm({ ...form, category: e.target.value })}
>
  <option value="">Select a category…</option>
  {OPPORTUNITY_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
</select>

// For equipmentTags — use a multi-select or checkbox list
```

### Estimated Effort: MEDIUM

---

## BUG #8 — Funders — No Dropdowns for Categories and Equipment Tags

### Status: CONFIRMED

### Root Cause:
The admin funder creation dialog (`src/app/admin/(panel)/funders/page.tsx`) renders all form fields via a generic loop (lines 140–183):
```tsx
{(["name", "website", ..., "fundingCategories", "agencyTypesFunded", "equipmentTags", ...] as const).map((key) => (
  <div key={key}>
    <Label>...</Label>
    <Input value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
  </div>
))}
```

`fundingCategories`, `agencyTypesFunded`, and `equipmentTags` are all free-text `<Input>` fields. The funder scoring algorithm in `funder.service.js` (lines 17–68) matches these fields against the agency's `programAreas` and `agencyTypes` using string comparison — inconsistent casing or phrasing breaks this matching.

Furthermore, `agencyTypesFunded` should specifically match the enum values used in `organization.schema.js` (`law_enforcement`, `fire_services`, etc.) but free-text entry allows any string.

### Files That Need Changes:
- `src/app/admin/(panel)/funders/page.tsx` — break the generic field loop; render `fundingCategories`, `agencyTypesFunded`, and `equipmentTags` as structured inputs
- `src/app/admin/(panel)/funders/[id]/edit/page.tsx` — apply same fix to the edit form

### Exact Fix:
Use the same canonical values from Bug #7. For `agencyTypesFunded`, use the exact enum values:

```tsx
const AGENCY_TYPES = [
  { value: "law_enforcement", label: "Law Enforcement" },
  { value: "fire_services", label: "Fire Services" },
  { value: "ems", label: "EMS / Ambulance" },
  { value: "emergency_management", label: "Emergency Management" },
  { value: "911_centers", label: "911 Centers / PSAPs" },
  { value: "hospitals", label: "Hospitals / Healthcare" },
  { value: "public_safety_comms", label: "Public Safety Comms" },
  { value: "multi_agency", label: "Multi-Agency / Regional" },
];

// Render agencyTypesFunded as a multi-checkbox or multi-select:
<div>
  <Label>Agency Types Funded</Label>
  <div className="grid grid-cols-2 gap-1 mt-1">
    {AGENCY_TYPES.map(({ value, label }) => (
      <label key={value} className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.agencyTypesFunded.split(",").map(s => s.trim()).includes(value)}
          onChange={(e) => {
            const current = form.agencyTypesFunded.split(",").map(s => s.trim()).filter(Boolean);
            const updated = e.target.checked
              ? [...current, value]
              : current.filter(v => v !== value);
            setForm({ ...form, agencyTypesFunded: updated.join(", ") });
          }}
        />
        {label}
      </label>
    ))}
  </div>
</div>
```

### Estimated Effort: MEDIUM

---

## BUG #9 — Funders — Show Details Button Not Working on Agency Side

### Status: PARTIALLY CONFIRMED

### Root Cause:
From static code analysis, the navigation logic in `Funders.tsx` is **structurally correct**:

- The card container (line 195–206) has `onClick={() => router.push('/funders/${f._id}')}` — clicking anywhere on the card navigates.
- The "View Details" button (lines 288–295) uses `e.stopPropagation()` and also calls `router.push('/funders/${f._id}')`.
- The route `/funders/[id]` exists at `src/app/funders/[id]/page.tsx` which renders `<FunderDetail />`.
- `FunderDetail.tsx` uses `useParams<{ id: string }>()` to get the ID and calls `api.get('/funders/${id}')`.

**However**, the bug report says the button "does not respond." One likely cause: the `FunderDetail` API call may fail for some funders if `resolveAgencyOrganizationId` returns `null` (no organization linked to account). Looking at `funder.controller.js` line 7–11:
```js
const getOne = asyncHandler(async (req, res) => {
  const organizationId = await resolveAgencyOrganizationId(req.user);
  const funder = await funderService.getOne(req.params.id, organizationId);
  return success(res, funder, 'Funder retrieved');
});
```
If `organizationId` is `null`, `funderService.getOne` still executes (it just skips scoring) — so the funder should still return. The page would show without match scores.

A second possible cause: the button does navigate, but the `FunderDetail` page shows a loading state that the user doesn't wait for. Since `FunderDetail.tsx` shows a skeleton loader during `isLoading`, the user might click, see the navigation happen, but the detail page briefly shows a loader before data arrives — which might be perceived as "not responding."

**Note:** There is no "eye icon" or "Show Details" icon button in the current `Funders.tsx` code — only a full-width red "View Details" button. The bug report's reference to "eye button" may indicate an expected UI element that doesn't exist, or may be describing the "View Details" button by a different name.

### Files That Need Changes:
- `src/views/Funders.tsx` — if needed, verify the `router.push` is not being blocked
- `src/views/FunderDetail.tsx` — if there's a crash on mount (check browser console for errors)

### Exact Fix:
Verify in browser console whether clicking "View Details" produces a JavaScript error. If the navigation is working but the page crashes, look at the `isError` branch in FunderDetail.

If the intention was to have an "eye icon" button (as on the admin table), add one:
```tsx
import { Eye } from "lucide-react";
// Replace or supplement the "View Details" button with:
<button
  type="button"
  onClick={(e) => {
    e.stopPropagation();
    router.push(`/funders/${f._id}`);
  }}
  className="flex items-center gap-2 ..."
>
  <Eye size={14} /> View Details
</button>
```

### Estimated Effort: SMALL

---

## BUG #10 — Opportunities — Agencies Cannot See Admin-Created Opportunities

### Status: CONFIRMED

### Root Cause:
**Primary cause — match score computation is blocked for agencies:**

`src/red-dog-radios-backend/src/modules/matches/match.route.js` line 78:
```js
router.post('/compute-all', protect, protectAdmin, computeAll);
```

The `computeAll` controller (`match.controller.js` lines 44–49) is designed for agency users — it calls `resolveAgencyOrganizationId(req.user)` to get the calling user's organization:
```js
const computeAll = asyncHandler(async (req, res) => {
  const organizationId = await resolveAgencyOrganizationId(req.user);
  if (!organizationId) throw new AppError('No organization linked to your account', 400);
  const result = await matchService.computeAllForOrganization(organizationId);
  ...
});
```

However, the **`protectAdmin` middleware** on the route **blocks all agency users from calling it**. Agency users get a 403 Forbidden response. The "Refresh match scores" button in `Opportunities.tsx` (line 133–143) calls `api.post('/matches/compute-all', {})` using the agency token — this always fails. No match scores are ever computed for agencies unless an admin manually runs `POST /admin/matches/recompute-all` for all organizations.

Without computed matches, all opportunities appear in the "unmatched" section at the bottom of the Opportunities page with `fitScore: null`. This is why agencies feel they "cannot see" opportunities that should match — the opportunities ARE listed but with no fit scores and no ranking.

**Secondary cause — opportunities do exist in the list but lack scores:**

The `GET /opportunities` endpoint (accessible to agencies) correctly returns all opportunities from the shared collection regardless of who created them. Admin-created opportunities DO appear in the list. But they all show `fitScore: null` until matches are computed.

### Files That Need Changes:
- `red-dog-radios-backend/src/modules/matches/match.route.js` — remove `protectAdmin` from the `compute-all` route

### Exact Fix:
Line 78 — change:
```js
router.post('/compute-all', protect, protectAdmin, computeAll);
```
To:
```js
router.post('/compute-all', protect, computeAll);
```

This allows any authenticated user (agency or admin) to compute matches for their own organization. The controller already guards against missing organizations via `resolveAgencyOrganizationId`.

### Estimated Effort: SMALL

---

## ADDITIONAL BUGS FOUND

### EXTRA #1 — "business" Agency Type Silently Dropped on Submission
### Severity: Medium

### Root Cause:
`Step2.tsx` (lines 25–27) offers "Business" as a selectable agency type with id `"business"`. But `onboarding.service.js`'s `agencyTypeMap` (lines 48–57) does NOT include a mapping for `"business"`. The mapping returns `undefined` for it, and `filter(Boolean)` on line 59 silently removes it.

Furthermore, `"business"` is not in the `organization.schema.js` `agencyTypes` enum, so even if it reached the database, Mongoose validation would strip or reject it.

### Files Affected:
- `red-dog-radios-backend/src/modules/onboarding/onboarding.service.js`
- `red-dog-radios-backend/src/modules/organizations/organization.schema.js`
- `src/views/onboarding/Step2.tsx`

### Exact Fix:
Option A — Remove "Business" from Step2 options since it's not a supported type:
```tsx
// In Step2.tsx, remove from fullWidthItems:
const fullWidthItems = []; // or remove the business entry
```

Option B — Add it to the schema and map:
In `organization.schema.js` add `'business'` to the enum array.
In `onboarding.service.js` add `'business': 'business'` to `agencyTypeMap`.

---

### EXTRA #2 — Onboarding Budget Range "25k-100k" Maps to "25k_150k" (Misleading Enum)
### Severity: Low

### Root Cause:
`Step4.tsx` displays `"$25K – $100K"` as a budget option with id `"25k-100k"`. In `onboarding.service.js`, this maps to `"25k_150k"` (line 65). The schema enum is `'25k_150k'`. The displayed label says $100K but the enum says 150K. The match scoring in `match.service.js` uses budget midpoints (`'25k_150k': 87500`) which is the midpoint between $25K and $150K — different from the label.

### Files Affected:
- `src/views/onboarding/Step4.tsx`

### Exact Fix:
Change the budget option label in Step4.tsx from `"$25K – $100K"` to `"$25K – $150K"`:
```tsx
{ id: "25k-100k", title: "$25K – $150K", sub: "Mid-size equipment, fleet" },
```

---

### EXTRA #3 — AshleenChat Context Banner Shows "undefined, undefined"
### Severity: Low

### Root Cause:
Already documented in Bug #6 root cause. `AshleenChat.tsx` line 173 references `agencyContext.city` and `agencyContext.state`, but the `Organization` model only has a single `location` field (e.g., `"Seattle, WA"`). Both fields will always be `undefined`.

### Files Affected:
- `src/components/AshleenChat.tsx`

### Exact Fix:
Documented in Bug #6 fix above.

---

### EXTRA #4 — `/matches/compute-all` Designed for Agency But Protected by Admin Middleware
### Severity: High

Already documented in Bug #10. Listed here as a standalone issue because the controller has contradictory logic — the implementation is clearly for agency self-service but the route protection blocks all agencies.

---

### EXTRA #5 — Opportunity Edit Page Redirects Instead of Rendering
### Severity: Medium

### Root Cause:
`src/app/admin/(panel)/opportunities/new/page.tsx` and `src/app/admin/(panel)/funders/new/page.tsx` both simply `redirect("/admin/opportunities")` and `redirect("/admin/funders")` respectively. These routes serve no purpose — clicking "Add opportunity" opens a dialog on the list page (not a new-page route). This is not a bug per se, but if any external link or bookmark targets `/admin/opportunities/new`, it redirects silently with no explanation.

---

### EXTRA #6 — Onboarding Step1 Labels Agency as "Organization"
### Severity: Low

### Root Cause:
`Step1.tsx` line 55: heading text says `"Your Organization"`. Since this is an agency-focused app, it should say `"Your Agency"`.

### Files Affected:
- `src/views/onboarding/Step1.tsx`

### Exact Fix:
Line 55:
```tsx
// Change:
Your Organization
// To:
Your Agency
```

---

### EXTRA #7 — Admin `listAgencies` Queries `Organization` (Not `Agency`) Model
### Severity: Low (related to Bug #2)

### Root Cause:
`admin.service.js` `listAgencies` (line 132) does `Organization.paginate(...)`. The admin panel's "Agencies" list shows `Organization` documents, not `Agency` documents. This is architecturally consistent (since all data IS in Organizations), but the misleading naming means the `Agency` schema in `src/modules/agencies/` is a dead model that is never written to or read from in production flows.

---

### EXTRA #8 — Funder Detail "Apply" Button Always Disabled When Funder Has Multiple Opportunities
### Severity: Medium

### Root Cause:
`FunderDetail.tsx` line 150–151:
```js
const generateDisabled = applyMutation.isPending || multipleOpps || singleOppLocked;
```

When a funder has multiple linked opportunities (`multipleOpps === true`), the "Apply with Ashleen AI" button is permanently disabled. The page shows a warning: "Start your application from Matches or Opportunities." However, if the agency doesn't have match scores computed (Bug #10), the Opportunities page won't show ranked results, creating a circular dead-end.

### Files Affected:
- `src/views/FunderDetail.tsx`

### Exact Fix:
Render a list of opportunities for the funder with individual "Apply" buttons rather than a single disabled button:
```tsx
{multipleOpps && (
  <div className="space-y-2">
    {opps.map((opp) => (
      <button
        key={opp._id}
        onClick={() => generateMutation.mutate(opp._id)}
        className="..."
      >
        Apply to: {opp.title}
      </button>
    ))}
  </div>
)}
```
And update `applyMutation` to accept `opportunityId` as a parameter.

---

## CONSTANTS AND SHARED VALUES THAT ARE WRONG

| Location | Wrong Value | Correct Value | Impact |
|----------|-------------|---------------|--------|
| `Step4.tsx` line 22 | Budget label `"$25K – $100K"` | `"$25K – $150K"` | Misleads users about budget ranges; enum is `25k_150k` |
| `onboarding.service.js` line 55 | `'public-communication': 'public_safety_comms'` | Correct mapping | No bug, but inconsistent with schema field name |
| `Step2.tsx` line 25 | Agency type `"business"` offered but not in schema enum | Remove or add to schema | Business type silently dropped |
| `AshleenChat.tsx` line 173 | `agencyContext.city`, `agencyContext.state` | `agencyContext.location` | Always renders `undefined, undefined` |
| `Settings.tsx` line 214 | Label `"Organization"` | `"Agency"` | Wrong terminology |
| `Settings.tsx` line 217 | Link text `"Manage organizations"` | `"Edit agency profile"` | Confusing terminology |
| `Step1.tsx` line 55 | Heading `"Your Organization"` | `"Your Agency"` | Wrong terminology |
| `match.route.js` line 78 | `protect, protectAdmin` on compute-all | `protect` only | Blocks agencies from computing their own match scores |

---

## DATA FLOW ISSUES

### Issue 1 — Match Score Compute-All Blocked for Agencies
**Created by:** Admin (via `POST /admin/matches/recompute-all`, admin panel only)
**Read by:** Agency (`GET /matches`, Opportunities.tsx and Matches page)
**Gap:** Agency users cannot trigger score computation themselves. The agency-side "Refresh match scores" button (`Opportunities.tsx` line 133–140) calls `POST /matches/compute-all` which requires admin auth. Agency users receive a 403 error and no toast feedback indicates the real problem. Opportunities show with `fitScore: null` for all admin-created content.

### Issue 2 — Agency Profile Fields Never Collected
**Created by:** Onboarding (Steps 1–5) — does NOT collect: `populationServed`, `coverageArea`, `numberOfStaff`, `currentEquipment`, `mainProblems`, `fundingPriorities`
**Read by:** Admin agency detail page (shows these fields as blanks), AshleenChat (uses `mainProblems` and `fundingPriorities` for AI context)
**Gap:** These fields exist in the schema but no UI path allows an agency to fill them in. AshleenChat's context-building loop (lines 68–70) always produces empty/dash values for these fields.

### Issue 3 — "Business" Agency Type Lost in Transit
**Created by:** Onboarding Step2 (user selects "Business")
**Stored by:** `sessionStorage` (correctly)
**Lost at:** `onboarding.service.js` line 59 — `agencyTypeMap["business"]` returns `undefined`, filtered out by `filter(Boolean)`
**Read by:** Match scoring, Funder scoring — never sees "business" type

### Issue 4 — Organizations vs Agencies Collection Naming
**Written to by:** Onboarding → `Organization` model → `organizations` collection
**Read from by:** All agency-side queries, admin agencies list, match scoring — all use `Organization` model
**Orphaned:** `Agency` model → `agencies` collection — written to by nothing, read by nothing in production flows
**Impact:** No functional data loss, but creates confusion when new developers work on the codebase.

---

## PRIORITIZED FIX ORDER

| Priority | Bug # | Title | Effort | Reason |
|----------|-------|-------|--------|--------|
| 1 | 10 | Agencies Cannot Compute Match Scores | SMALL | One-line route fix; unblocks core matching value prop |
| 2 | 1 | Onboarding Field Persistence | MEDIUM | High-friction UX bug; users lose work on back navigation |
| 3 | 6 | Ashleen AI Panel Not Responsive | SMALL | Breaks on mobile; easy CSS fix |
| 4 | 4 | Settings Wrong Label / Link | SMALL | Quick label fixes; improves clarity |
| 5 | 3 | Navbar Missing Scroll | SMALL | CSS fix; items inaccessible on short viewports |
| 6 | Extra #1 | "Business" Type Silently Dropped | SMALL | Data integrity; user selection ignored silently |
| 7 | Extra #2 | Budget Range Label Mismatch | SMALL | Misleading UI text |
| 8 | 9 | Funders Show Details Needs Investigation | SMALL | Needs browser testing to confirm |
| 9 | 7 | Opportunities No Dropdowns | MEDIUM | Inconsistent data breaks matching |
| 10 | 8 | Funders No Dropdowns | MEDIUM | Inconsistent data breaks scoring |
| 11 | 5 | Agency Profile Missing Fields | MEDIUM | Missing data reduces AI quality |
| 12 | Extra #8 | Funder Apply Button Disabled for Multi-Opp | MEDIUM | UX dead-end |
| 13 | 2 | Agency Data in Organization Collection | COMPLEX | Architectural rename; data migration risk; low runtime impact |

---

## RISKY CHANGES WARNING

### 1. Bug #2 — Organization → Agency Collection Rename (HIGH RISK)
If a full rename of the `Organization` model to `Agency` is chosen:
- **Database migration required:** All documents in `organizations` collection must be moved to `agencies` collection (or the collection renamed in MongoDB).
- **All references updated:** Every `require('../organizations/organization.schema')` across ~15+ files must be updated.
- **User schema migration:** The `users.organizationId` field references `Organization` — changing the ref requires updating all user documents.
- **Risk of data loss** if migration is incomplete or rolled back mid-way.
- **Recommendation:** Use the "document-only" fix (Option B) unless a full rename is explicitly planned with a migration script and rollback strategy.

### 2. Bug #10 — Removing `protectAdmin` from compute-all (LOW RISK, VERIFY INTENT)
Removing `protectAdmin` allows any authenticated agency user to trigger match computation for their own organization. This is low risk functionally but verify:
- Rate limiting should be considered (a user could spam the endpoint, triggering heavy computation).
- The admin's separate `POST /admin/matches/recompute-all` endpoint remains untouched (computes for ALL agencies).

### 3. Bugs #7 and #8 — Dropdown Enforcement for Categories/Equipment Tags (MEDIUM RISK)
Changing free-text inputs to dropdowns with fixed lists:
- Existing funder/opportunity records in the database may have free-text values that won't appear in the new dropdown lists.
- A **data cleanup script** may be needed to normalize existing `fundingCategories`, `equipmentTags`, `agencyTypesFunded` values to the canonical list before enforcing dropdowns.
- Without the cleanup, existing records would have non-matching values that the dropdowns wouldn't recognize.

### 4. Bug #5 — Adding Fields to Onboarding (LOW RISK)
Adding new fields to onboarding is additive and non-destructive. Existing organization records will simply have `undefined` for new fields until the agency re-submits or an edit page is added. No migration needed.
