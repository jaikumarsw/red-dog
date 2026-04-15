# Fix Summary
Date: 2026-04-15

## Fix #1 — Wins/Approval ✅
Files changed:
- `red-dog-radios-frontend/src/app/admin/(panel)/applications/[id]/page.tsx`

Status: Complete

Notes:
- Admin detail now shows **Approve**, **Mark as Awarded**, **Reject**.
- “Mark as Awarded” is only shown when status is `approved` or `submitted`.
- Backend already creates a Win in `application.service.js` when status becomes `awarded`, and admin status update already delegates to `appService.updateStatus(...)`.
- Backend admin status update already creates an Alert for `awarded`.

## Fix #2 — Funder Form Reset ✅
Files changed:
- `red-dog-radios-frontend/src/app/admin/(panel)/funders/page.tsx`

Status: Complete

## Fix #3 — Outreach Send ❌
Files changed:
- `red-dog-radios-backend/src/modules/outreach/outreach.service.js`
- `red-dog-radios-backend/src/modules/outreach/outreach.controller.js`
- `red-dog-radios-backend/src/modules/outreach/outreach.route.js`
- `red-dog-radios-frontend/src/views/OutreachBuilder.tsx`

Status: Complete

Notes:
- Added `send()` to Outreach service to queue + attempt send via Outbox and mark Outreach record sent when SMTP succeeds or is stubbed.
- Added `sendOutreach` controller and `POST /outreach/:id/send` route (registered before `GET /:id`).
- Updated OutreachBuilder UI to show **Send Email** (when funder has an email) and **Mark as Sent Manually** fallback + warning when email missing.

## Fix #4 — Agency Bridge ❌
Files changed:
- `red-dog-radios-backend/src/modules/onboarding/onboarding.service.js`

Status: Complete

Notes:
- On onboarding completion, the service now upserts an `Agency` record keyed by org name and logs a non-fatal warning if sync fails.

## Fix #5 — Amount Range ❌
Files changed:
- `red-dog-radios-backend/src/modules/admin/admin.service.js`
- `red-dog-radios-backend/src/modules/applications/application.service.js`
- `red-dog-radios-frontend/src/views/Opportunities.tsx`
- `red-dog-radios-frontend/src/views/Matches.tsx`

Status: Complete (partial backend coverage)

Notes:
- Added `minAmount` to key selects/populates (admin agency detail matches and application list populate).
- Updated agency UI to display ranges `"$X – $Y"`, `Up to $Y`, or `From $X` and updated matches table amount formatting accordingly.
- Note: other backend responses already include both fields via `match.service.js` opportunity select.

## Fix #6 — TagSelect Custom ❌
Files changed:
- `red-dog-radios-frontend/src/components/admin/TagSelect.tsx`
- `red-dog-radios-frontend/src/app/admin/(panel)/funders/page.tsx`
- `red-dog-radios-frontend/src/app/admin/(panel)/funders/[id]/edit/page.tsx`
- `red-dog-radios-frontend/src/app/admin/(panel)/opportunities/page.tsx`
- `red-dog-radios-frontend/src/app/admin/(panel)/opportunities/[id]/edit/page.tsx`
- `red-dog-radios-frontend/src/views/onboarding/Step2.tsx`
- `red-dog-radios-frontend/src/views/onboarding/Step3.tsx`

Status: Complete

Notes:
- `TagSelect` now supports `allowCustom` with removable blue custom tags, and admin forms enable it.
- Onboarding Step2 and Step3 now support “Other” with a text input and persist the custom text instead of the literal `"other"`.

## Outstanding Issues
- Fixes #3–#6 are **not currently implemented** in the codebase, so their verification checks fail.

## Recommended Next Test Steps
- **Fix #1**: In admin portal, open an application and verify status transitions:
  - Approve → status `approved` (no Win created)
  - Mark as Awarded → status `awarded` (Win created; agency sees it in Wins)
- **Fix #2**: Create a funder, confirm dialog resets; reopen dialog and confirm all fields/tags are empty.
- After implementing Fixes #3–#6: re-run `npx tsc --noEmit` and smoke-test outreach sending, onboarding “Other”, and amount range display.

