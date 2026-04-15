# QA AUDIT REPORT
Date: 2026-04-15

## SUMMARY TABLE
| # | Bug | Confirmed | Root Cause Summary | Files Affected | Fix Complexity |
|---|-----|-----------|-------------------|----------------|----------------|
| 1 | Missing “Other” option in selection fields | PARTIAL | “Other” missing in admin constants + TagSelect has no custom value support; onboarding Step2 has no “Other”; Step3 has “Other” but no custom input persisted | `red-dog-radios-frontend/src/lib/adminConstants.ts`, `red-dog-radios-frontend/src/components/admin/TagSelect.tsx`, `red-dog-radios-frontend/src/views/onboarding/Step2.tsx`, `red-dog-radios-frontend/src/views/onboarding/Step3.tsx`, admin pages using TagSelect | MEDIUM |
| 2 | Agency data saved to wrong collection | CONFIRMED | Onboarding writes to `Organization` (not `Agency`), while an `Agency` model/route exists; admin “agencies” list uses `Organization` too | `red-dog-radios-backend/src/modules/onboarding/onboarding.service.js`, `red-dog-radios-backend/src/modules/agencies/*`, `red-dog-radios-backend/src/modules/admin/admin.service.js` | MEDIUM |
| 3 | Funder form not resetting after submission | CONFIRMED | Create success handler clears tag selections + closes dialog but never resets `form` state, leaving old values in memory and likely reused on next open | `red-dog-radios-frontend/src/app/admin/(panel)/funders/page.tsx` | SMALL |
| 4 | Grant range not saved in funders | NOT CONFIRMED (in current code) | Backend schema fields are `avgGrantMin/avgGrantMax` and admin create/edit sends those exact fields; issue likely comes from UI reuse (Bug #3) or older code | Backend: `red-dog-radios-backend/src/modules/funders/funder.schema.js`; Frontend: `red-dog-radios-frontend/src/app/admin/(panel)/funders/page.tsx`, `.../funders/[id]/edit/page.tsx` | SMALL |
| 5 | Amount range not saved/retrieved correctly in opportunities | PARTIAL | Backend stores `minAmount/maxAmount`, admin create/edit sends them, but agency-side UI/types only use `maxAmount`; several populates/selects omit `minAmount` so it’s not returned in common flows | Backend: `.../opportunities/opportunity.schema.js`, `.../admin/admin.service.js`, `.../applications/application.service.js`; Frontend: `red-dog-radios-frontend/src/views/Opportunities.tsx`, `src/views/Matches.tsx` | MEDIUM |
| 6 | Outreach email inconsistency | CONFIRMED | “Send” is not implemented: frontend only calls “mark as sent”; backend `/outreach/:id/sent` just flips status—no email is sent and Outbox queue is never used | `red-dog-radios-frontend/src/views/OutreachBuilder.tsx`, `red-dog-radios-backend/src/modules/outreach/outreach.*`, `red-dog-radios-backend/src/modules/outbox/outbox.*` | MEDIUM |
| 7 | Application approval and wins tracking broken | CONFIRMED | Admin “Approve Application” sets status to `approved`, but win creation only happens when status becomes `awarded`; therefore “approved” apps never create Win records and don’t appear in Wins | `red-dog-radios-frontend/src/app/admin/(panel)/applications/[id]/page.tsx`, `red-dog-radios-backend/src/modules/applications/application.service.js`, `red-dog-radios-frontend/src/views/Wins.tsx` | SMALL |

---

## BUG #1 — Missing "Other" Option
### Status: PARTIAL

### Root Cause:
- **Admin tag pickers cannot accept custom values**:
  - `red-dog-radios-frontend/src/components/admin/TagSelect.tsx` L5–58 renders only the provided `options` and has no “Other” handling or text input.
  - `red-dog-radios-frontend/src/lib/adminConstants.ts` L1–43 provides option arrays with **no `"Other"`** entry (e.g., `FUNDING_CATEGORIES`, `EQUIPMENT_TAGS`, `FUNDER_AGENCY_TYPES`).
- **Onboarding**:
  - `red-dog-radios-frontend/src/views/onboarding/Step2.tsx` L14–23 defines `agencyTypes` without an “Other” card and has no custom input storage.
  - `red-dog-radios-frontend/src/views/onboarding/Step3.tsx` L92–96 includes an “Other” toggle, but **there is no text input** and the persisted value is only `"other"` in `sessionStorage` (L60) with no custom text.

### Files To Change:
- `red-dog-radios-frontend/src/components/admin/TagSelect.tsx` — add optional “Other/custom” entry + controlled input + ensure custom value is included in `selected`.
- `red-dog-radios-frontend/src/lib/adminConstants.ts` — decide whether to literally include `"Other"` in option arrays or let `TagSelect` render it when `allowOther` is enabled.
- `red-dog-radios-frontend/src/app/admin/(panel)/funders/page.tsx` — enable custom values for funding categories / agency types / equipment tags in create dialog.
- `red-dog-radios-frontend/src/app/admin/(panel)/funders/[id]/edit/page.tsx` — same for edit page.
- `red-dog-radios-frontend/src/app/admin/(panel)/opportunities/page.tsx` + `.../opportunities/[id]/edit/page.tsx` — same for tags/categories if desired.
- `red-dog-radios-frontend/src/views/onboarding/Step2.tsx` — add “Other” + custom agency type input saved to sessionStorage.
- `red-dog-radios-frontend/src/views/onboarding/Step3.tsx` — add custom program area input when “Other” selected; persist actual string(s).

### Exact Fix:

#### A) Add `allowCustom` support to `TagSelect`

```tsx
// red-dog-radios-frontend/src/components/admin/TagSelect.tsx
"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  label?: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  allowCustom?: boolean;
  customLabel?: string; // default: "Other"
  customPlaceholder?: string; // default: "Enter custom value…"
};

export function TagSelect({
  label,
  options,
  selected,
  onChange,
  allowCustom = false,
  customLabel = "Other",
  customPlaceholder = "Enter custom value…",
}: Props) {
  const [customDraft, setCustomDraft] = useState("");

  const normalizedOptions = useMemo(() => {
    // Keep options unique/stable; do not include user-entered values here.
    return Array.from(new Set(options));
  }, [options]);

  const toggle = (opt: string) => {
    if (selected.includes(opt)) onChange(selected.filter((s) => s !== opt));
    else onChange([...selected, opt]);
  };

  const addCustom = () => {
    const v = customDraft.trim();
    if (!v) return;
    if (!selected.includes(v)) onChange([...selected, v]);
    setCustomDraft("");
  };

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <span className="text-sm font-medium text-[#111827] [font-family:'Montserrat',Helvetica]">
          {label}
        </span>
      )}

      <div className="flex flex-wrap gap-1.5">
        {normalizedOptions.map((opt) => {
          const active = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors [font-family:'Montserrat',Helvetica]",
                active
                  ? "border-[#ef3e34] bg-[#ef3e34] text-white"
                  : "border-[#e5e7eb] bg-white text-[#6b7280] hover:border-[#ef3e34]/50"
              )}
            >
              {opt}
            </button>
          );
        })}
      </div>

      {allowCustom && (
        <div className="mt-2 flex gap-2">
          <input
            value={customDraft}
            onChange={(e) => setCustomDraft(e.target.value)}
            placeholder={customPlaceholder}
            className="w-full rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustom();
              }
            }}
          />
          <button
            type="button"
            onClick={addCustom}
            className="rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm font-semibold"
          >
            Add {customLabel}
          </button>
        </div>
      )}

      {selected.length > 0 && (
        <p className="text-xs text-[#9ca3af] [font-family:'Montserrat',Helvetica]">
          Selected: {selected.join(", ")}
        </p>
      )}
    </div>
  );
}
```

#### B) Enable custom tags on admin Funders/Opportunities

```tsx
// red-dog-radios-frontend/src/app/admin/(panel)/funders/page.tsx
<TagSelect
  label="Funding categories"
  options={FUNDER_FUNDING_CATEGORIES}
  selected={selectedFundingCategories}
  onChange={setSelectedFundingCategories}
  allowCustom
/>
<TagSelect
  label="Agency types funded"
  options={FUNDER_AGENCY_TYPES}
  selected={selectedAgencyTypesFunded}
  onChange={setSelectedAgencyTypesFunded}
  allowCustom
/>
<TagSelect
  label="Equipment tags"
  options={EQUIPMENT_TAGS}
  selected={selectedEquipmentTags}
  onChange={setSelectedEquipmentTags}
  allowCustom
/>
```

Repeat similarly in `.../funders/[id]/edit/page.tsx` (TagSelect calls at L126–143) and `.../opportunities/page.tsx` (TagSelect at L276–281) if you want “Other” for equipment tags and/or categories/keywords.

#### C) Onboarding “Other” with persisted custom value
Minimal, compatible approach (no backend schema change): store custom text as a real string entry in the array and **do not** store the literal `"other"` marker.

```tsx
// Step2.tsx: add UI + state
const [otherAgencyType, setOtherAgencyType] = useState("");
// When saving:
const final = selected
  .filter((x) => x !== "other")
  .concat(otherAgencyType.trim() ? [otherAgencyType.trim()] : []);
sessionStorage.setItem("rdg_onboarding_step2", JSON.stringify({ agencyTypes: final, otherAgencyType }));
```

```tsx
// Step3.tsx: add UI + state
const [otherProgramArea, setOtherProgramArea] = useState("");
const final = selected
  .filter((x) => x !== "other")
  .concat(otherProgramArea.trim() ? [otherProgramArea.trim()] : []);
sessionStorage.setItem("rdg_onboarding_step3", JSON.stringify({ programAreas: final, otherProgramArea }));
```

### Effort: MEDIUM

---

## BUG #2 — Agency data saved to wrong collection
### Status: CONFIRMED

### Root Cause:
- `red-dog-radios-backend/src/modules/onboarding/onboarding.service.js` imports `Organization` (L2) and creates/updates **Organization** records (L79–116). It never touches the `Agency` model.
- Yet an `Agency` model exists: `red-dog-radios-backend/src/modules/agencies/agency.schema.js` defines `mongoose.model('Agency')` (L25).
- Admin “agencies” list is actually backed by `Organization`:
  - `red-dog-radios-backend/src/modules/admin/admin.service.js` imports `Organization` (L2) and `listAgencies` paginates `Organization` (L125–160).
- The agency-facing agencies endpoint filters `Agency` docs by matching the logged-in org’s name:
  - `red-dog-radios-backend/src/modules/agencies/agency.controller.js` loads an `Organization` for the user (L8–12), then queries `Agency` by `agencyName: org.name` (L24–25). If onboarding never creates an `Agency` doc, this endpoint will return empty.

### Files To Change:
- `red-dog-radios-backend/src/modules/onboarding/onboarding.service.js` — create/update a mirror `Agency` record when onboarding completes.
- (Optional) `red-dog-radios-backend/src/modules/admin/admin.service.js` — if admin truly intends to manage `Agency` docs, switch admin list/detail to `Agency` or show both.
- (Optional) `red-dog-radios-backend/src/utils/resolveAgencyOrg.js` — if you adopt `Agency` as primary, expand resolver accordingly.

### Exact Fix:
Safest fix without a schema migration: **keep `Organization` as the primary record** (since many modules reference it), but **upsert a corresponding `Agency` record** for compatibility with `/api/agencies` and any tooling expecting `Agency` collection.

```js
// red-dog-radios-backend/src/modules/onboarding/onboarding.service.js
const Agency = require('../agencies/agency.schema');

// ... inside complete(), after creating/updating org and before return:
const primaryType = (mappedAgencyTypes || [])[0];
if (primaryType) {
  await Agency.findOneAndUpdate(
    { name: orgName },
    {
      $set: {
        name: orgName,
        type: primaryType,
        location: location || undefined,
        status: 'active',
      },
    },
    { upsert: true, new: true, runValidators: true }
  );
}
```

If you need the `Agency` record tied to the user/org deterministically, consider adding an `organizationId` field to `Agency` schema and upsert by that instead (requires schema change + migration).

### Effort: MEDIUM

---

## BUG #3 — Funder form not resetting after submission
### Status: CONFIRMED

### Root Cause:
- `red-dog-radios-frontend/src/app/admin/(panel)/funders/page.tsx`:
  - `form` is initialized once in state (L24–40).
  - On create success, it clears tag selections and closes dialog (L76–82) but **does not call `setForm(...)`**, so old values remain in memory and can reappear if the dialog is reopened (depending on how the Dialog component preserves children state).

### Files To Change:
- `red-dog-radios-frontend/src/app/admin/(panel)/funders/page.tsx` — reset `form` to initial values in `onSuccess` (and also when closing dialog without creating, for safety).

### Exact Fix:

```tsx
// red-dog-radios-frontend/src/app/admin/(panel)/funders/page.tsx
const emptyCreateForm = {
  name: "",
  website: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  missionStatement: "",
  locationFocus: "",
  localMatchRequired: false,
  avgGrantMin: "",
  avgGrantMax: "",
  deadline: "",
  cyclesPerYear: "1",
  pastGrantsAwarded: "",
  notes: "",
  maxApplicationsAllowed: "5",
};

// useState(emptyCreateForm) instead of inline object
const [form, setForm] = useState(emptyCreateForm);

// in mutation onSuccess:
onSuccess: () => {
  setForm(emptyCreateForm);
  setSelectedFundingCategories([]);
  setSelectedAgencyTypesFunded([]);
  setSelectedEquipmentTags([]);
  setOpen(false);
  refetch();
}

// also reset when dialog closes:
<Dialog open={open} onOpenChange={(v) => {
  setOpen(v);
  if (!v) {
    setForm(emptyCreateForm);
    setSelectedFundingCategories([]);
    setSelectedAgencyTypesFunded([]);
    setSelectedEquipmentTags([]);
  }
}}>
```

### Effort: SMALL

---

## BUG #4 — Grant range not saved in funders
### Status: NOT CONFIRMED (in current code)

### Root Cause:
- Backend schema uses **`avgGrantMin`** and **`avgGrantMax`**:
  - `red-dog-radios-backend/src/modules/funders/funder.schema.js` L21–22.
- Admin create and edit send **exactly** those fields:
  - Create: `red-dog-radios-frontend/src/app/admin/(panel)/funders/page.tsx` L67–68.
  - Edit: `red-dog-radios-frontend/src/app/admin/(panel)/funders/[id]/edit/page.tsx` L73–74.
- Admin controller/service passes body through to funder service; no whitelist extraction that would drop fields:
  - `red-dog-radios-backend/src/modules/admin/admin.service.js` uses `createFunderAdmin = (body, userId) => funderService.create(normalizeFunderPayload(body), userId);` (L286–287).

### Files To Change:
- No schema/API changes required based on current code.
- If users still report missing values, check for:
  - Bug #3 (stale values / confusion)
  - Existing seed data without these fields
  - Client rendering defaulting to 0 (funders list prints `Number(r.avgGrantMin || 0)` at `.../funders/page.tsx` L117–119)

### Exact Fix:
No fix recommended without reproducing a failing request/response showing dropped fields.

### Effort: SMALL

---

## BUG #5 — Amount range not saved or retrieved correctly in opportunities
### Status: PARTIAL

### Root Cause:
- Backend **does store** `minAmount` and `maxAmount`:
  - `red-dog-radios-backend/src/modules/opportunities/opportunity.schema.js` L9–10.
- Admin edit submits both correctly:
  - `red-dog-radios-frontend/src/app/admin/(panel)/opportunities/[id]/edit/page.tsx` L54–55.
- Admin create submits both correctly:
  - `red-dog-radios-frontend/src/app/admin/(panel)/opportunities/page.tsx` L93–95.

But common agency-side views only model/display `maxAmount`:
- `red-dog-radios-frontend/src/views/Opportunities.tsx` defines `Opportunity` with `maxAmount?: number` only (L12–25) and renders “Up to …” (L325–333).
- `red-dog-radios-frontend/src/views/Matches.tsx` `ApiMatch.opportunity` includes `maxAmount` but not `minAmount` (L33–38), and the table renders only a single “Amount”.
- Backend often omits `minAmount` when populating:
  - In `red-dog-radios-backend/src/modules/admin/admin.service.js`, `getAgencyDetail` populates match opportunities selecting `_id title funder deadline category status maxAmount` (L165–168) — **no `minAmount`**.
  - In `red-dog-radios-backend/src/modules/applications/application.service.js`, application listing populates `opportunity` selecting `title funder maxAmount deadline` (L152–155) — **no `minAmount`**.

### Files To Change:
- Backend: include `minAmount` anywhere an opportunity is selected/populated for UI display:
  - `red-dog-radios-backend/src/modules/admin/admin.service.js`
  - `red-dog-radios-backend/src/modules/applications/application.service.js`
  - Any other controller/service that does `.select('... maxAmount ...')`
- Frontend: add `minAmount?: number` to opportunity types and render “\(min–max\)” when present.
  - `red-dog-radios-frontend/src/views/Opportunities.tsx`
  - `red-dog-radios-frontend/src/views/Matches.tsx`

### Exact Fix:

#### A) Backend: include `minAmount` in selects

```js
// red-dog-radios-backend/src/modules/admin/admin.service.js
// in getAgencyDetail(): populate('opportunity', ...)
.populate('opportunity', '_id title funder deadline category status minAmount maxAmount');
```

```js
// red-dog-radios-backend/src/modules/applications/application.service.js
// in getAll() populate array:
{ path: 'opportunity', select: 'title funder minAmount maxAmount deadline' },
```

#### B) Frontend: model + display range

```tsx
// red-dog-radios-frontend/src/views/Opportunities.tsx
interface Opportunity {
  // ...
  minAmount?: number;
  maxAmount?: number;
}

const fmtAmount = (n?: number) => (n != null ? "$" + n.toLocaleString() : null);
const fmtRange = (min?: number, max?: number) => {
  if (min != null && max != null) return `${fmtAmount(min)} – ${fmtAmount(max)}`;
  if (max != null) return `Up to ${fmtAmount(max)}`;
  if (min != null) return `From ${fmtAmount(min)}`;
  return null;
};

// render:
const range = fmtRange(opp.minAmount, opp.maxAmount);
{range && <span> {range} </span>}
```

And in `Matches.tsx`, extend `ApiMatch.opportunity` to include `minAmount?: number` and display similarly in `mapMatch`.

### Effort: MEDIUM

---

## BUG #6 — Outreach email inconsistency
### Status: CONFIRMED

### Root Cause:
- Frontend has **no “send email” action**; it only saves and “Mark as Sent”:
  - `red-dog-radios-frontend/src/views/OutreachBuilder.tsx` calls `api.put(/outreach/${id}/sent)` (L59–66) and labels it “Mark as Sent” (L137–145). No call includes a recipient email address.
- Backend `/outreach/:id/sent` **only updates status fields**:
  - `red-dog-radios-backend/src/modules/outreach/outreach.service.js` `markSent` (L134–142) sets `{ status: 'sent', sentAt: new Date() }` and returns.
- Outbox queue exists and can send email (or stub-send when SMTP is absent):
  - `red-dog-radios-backend/src/modules/outbox/outbox.service.js` `sendEmail` sends via SMTP or marks as sent in stub mode (L55–89).
- Outreach does **not** enqueue anything in Outbox, so behavior will differ depending on whether users are manually emailing vs expecting platform email sending.

### Files To Change:
- Backend:
  - `red-dog-radios-backend/src/modules/outreach/outreach.service.js` — add `send()` that queues into Outbox and optionally processes/sends.
  - `red-dog-radios-backend/src/modules/outreach/outreach.controller.js` + `outreach.route.js` — add `POST /outreach/:id/send`.
- Frontend:
  - `red-dog-radios-frontend/src/views/OutreachBuilder.tsx` — replace “Mark as Sent” with “Send Email” (calls new API), and keep “Mark as Sent” as optional manual override if you want.

### Exact Fix:

#### A) Backend: add outreach send that uses Outbox

```js
// red-dog-radios-backend/src/modules/outreach/outreach.service.js
const OutboxService = require('../outbox/outbox.service');

const send = async (id) => {
  const record = await Outreach.findById(id).populate('funder', 'contactEmail contactName name').populate('organization', 'name');
  if (!record) throw new AppError('Outreach email not found', 404);

  const recipient = record.funder?.contactEmail;
  if (!recipient) throw new AppError('Funder does not have a contact email on file', 400);

  const htmlBody = `<p>Dear ${record.contactName || record.funder?.contactName || 'Program Officer'},</p>
<p>${String(record.body || '').replace(/\n/g, '<br/>')}</p>`;

  const outbox = await OutboxService.queueEmail({
    recipient,
    recipientName: record.funder?.contactName,
    subject: record.subject,
    htmlBody,
    emailType: 'outreach',
    relatedOrganization: record.organization?._id ?? record.organization,
    relatedUser: record.user,
    emailKey: `outreach:${String(record._id)}`,
  });

  // Option 1: send immediately
  const sendResult = await OutboxService.sendEmail(outbox._id);
  if (sendResult.success) {
    await Outreach.findByIdAndUpdate(id, { status: 'sent', sentAt: new Date() }, { new: true });
  }
  return { outboxId: outbox._id, ...sendResult };
};

module.exports = { generateFromFunder, generateFromOpportunity, getAll, getOne, update, markSent, send };
```

```js
// red-dog-radios-backend/src/modules/outreach/outreach.controller.js
const send = asyncHandler(async (req, res) => {
  const organizationId = await resolveAgencyOrganizationId(req.user);
  const existing = await outreachService.getOne(req.params.id);
  const existingOrgId = existing.organization?._id ?? existing.organization;
  if (!organizationId || String(existingOrgId) !== String(organizationId)) {
    throw new AppError('Outreach record not found', 404);
  }
  const result = await outreachService.send(req.params.id);
  return success(res, result, 'Outreach email sent');
});

module.exports = { getAll, getOne, generate, update, markSent, send };
```

```js
// red-dog-radios-backend/src/modules/outreach/outreach.route.js
router.post('/:id/send', protect, send);
```

#### B) Frontend: add “Send Email” button

```tsx
// red-dog-radios-frontend/src/views/OutreachBuilder.tsx
const sendMutation = useMutation({
  mutationFn: () => api.post(`/outreach/${id}/send`),
  onSuccess: () => {
    toast({ title: "Email sent" });
    queryClient.invalidateQueries({ queryKey: qk.outreachItem(id) });
    queryClient.invalidateQueries({ queryKey: qk.outreach() });
  },
  onError: (err: unknown) => {
    const msg = err instanceof Error ? err.message : "Failed to send.";
    toast({ title: "Error", description: msg, variant: "destructive" });
  },
});
```

### Effort: MEDIUM

---

## BUG #7 — Wins not showing after approval
### Status: CONFIRMED

### Root Cause:
- Admin “Approve Application” sets status to `"approved"`:
  - `red-dog-radios-frontend/src/app/admin/(panel)/applications/[id]/page.tsx` `onConfirmApprove` calls `statusMutation.mutate({ status: "approved" });` (L112–114).
- Win records are created only when status becomes `"awarded"`:
  - `red-dog-radios-backend/src/modules/applications/application.service.js` inside `updateStatus`, win creation is guarded by `if (status === 'awarded')` (L363–382).
- The Wins screen relies on `/wins` and backend filters by the org’s applications:
  - `red-dog-radios-frontend/src/views/Wins.tsx` fetches `GET /wins` (L85–91).
  - `red-dog-radios-backend/src/modules/wins/win.service.js` filters by `organizationId` by looking up application IDs (L10–13). If no Win was created, it will not appear.

### Files To Change:
- `red-dog-radios-frontend/src/app/admin/(panel)/applications/[id]/page.tsx` — change what “Approve” means:
  - either rename it to “Mark as Approved (non-win)”
  - or (per bug report expectation) make it set status `"awarded"` so it creates a Win.
- Optional: backend `application.service.js` — if you need both states, add win creation for `"approved"` *or* create a separate win workflow.

### Exact Fix:
Assuming “Approve” should create a win (per report), update the admin action to set status to `awarded`.

```tsx
// red-dog-radios-frontend/src/app/admin/(panel)/applications/[id]/page.tsx
const onConfirmApprove = () => {
  statusMutation.mutate({ status: "awarded" });
};
```

If you need both statuses, use two buttons:
- “Approve” → `approved`
- “Mark Awarded (creates win)” → `awarded`

### Effort: SMALL

---

## FIELD NAME MISMATCHES FOUND
| Field | Frontend Name | Backend Name | Schema Name | Match? |
|-------|--------------|--------------|-------------|--------|
| Funder grant min | `avgGrantMin` | `avgGrantMin` | `Funder.avgGrantMin` | ✅ |
| Funder grant max | `avgGrantMax` | `avgGrantMax` | `Funder.avgGrantMax` | ✅ |
| Opportunity min | `minAmount` (admin only) | `minAmount` | `Opportunity.minAmount` | ✅ (but omitted in agency UI & some selects) |
| Opportunity max | `maxAmount` | `maxAmount` | `Opportunity.maxAmount` | ✅ |
| Onboarding agency types | `agencyTypes` (array) | `agencyTypes` | `Organization.agencyTypes` | ✅ (but “Other” custom text not supported today) |
| Onboarding program areas | `programAreas` (array) | `programAreas` | `Organization.programAreas` | ✅ (Step3 stores `"other"` with no custom value) |

---

## PRIORITIZED FIX ORDER
| Priority | Bug # | Title | Effort | Reason |
|----------|-------|-------|--------|--------|
| 1 | 7 | Wins not showing after approval | SMALL | Directly breaks a core KPI view (“Wins”) and is a one-line fix if “Approve” == “Awarded” |
| 2 | 3 | Funder form not resetting | SMALL | Prevents duplicate entries / reduces data-quality issues immediately |
| 3 | 6 | Outreach email sending missing | MEDIUM | Current behavior is misleading (status changes without sending); impacts user trust |
| 4 | 2 | Agencies saved to wrong collection | MEDIUM | Causes empty `/agencies` results and inconsistent data model; add upsert bridge first |
| 5 | 5 | Opportunity amount range not retrieved/displayed | MEDIUM | Data exists but UI/API drops minAmount; improves accuracy and UX |
| 6 | 1 | “Other” option + custom values | MEDIUM | UX/data capture improvement across onboarding/admin; best done with shared component support |
| 7 | 4 | Funder grant range not saved | SMALL | Not reproducible from code; revisit only if real failing payloads are captured |

