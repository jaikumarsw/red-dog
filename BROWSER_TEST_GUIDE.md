# Browser Test Guide
Date: 2026-04-15

---

## TEST 1 — Application Approval & Wins Flow
**Who:** Admin + Agency accounts open side by side

Steps:
1. Login as agency → go to /applications
2. Note any existing application OR generate one from /funders
3. Login as admin → go to /admin/applications
4. Click into the application
5. Verify you see THREE buttons: Approve, Mark as Awarded, Reject
6. Click "Approve" → confirm modal → submit
7. Switch to agency browser → refresh /applications
8. Verify status shows "approved" badge (not editable by agency)
9. Back in admin → click "Mark as Awarded" (should now be visible)
10. Confirm modal → submit
11. Switch to agency → refresh /wins
12. Verify application appears in Wins with correct data
13. Check /alerts — should show award notification

Expected: Win record created, Wins page shows entry, Alert visible
❌ Fail if: Wins page empty after awarded, no alert shown

---

## TEST 2 — Funder Form Reset
**Who:** Admin

Steps:
1. Login as admin → go to /admin/funders
2. Click "New Funder"
3. Fill ALL fields including name, email, grant range, categories
4. Click Create
5. Verify success toast appears
6. Click "New Funder" again immediately
7. Verify ALL fields are empty (name, email, tags, everything)
8. Close dialog without creating
9. Open again — verify still empty

Expected: Form fully clears after each create
❌ Fail if: Previous values appear in reopened form

---

## TEST 3 — Outreach Email Send
**Who:** Agency

Steps:
1. Login as agency → go to /funders
2. Click into a funder that has contactEmail filled
3. Click "Generate Outreach Email"
4. Edit the email body if desired
5. Verify TWO buttons visible: "Send Email" + "Mark as Sent Manually"
6. Click "Send Email"
7. Verify success toast: "Email sent!"
8. Verify status changes to "Sent"
9. Go to /outbox — verify email appears in outbox list

Now test with funder that has NO email:
1. Find/create a funder with no contactEmail
2. Open outreach builder for that funder
3. Verify warning: "No funder email on file"
4. Verify "Send Email" button is hidden
5. Verify "Mark as Sent Manually" still available

Expected: Real email queued when email exists, clear warning when not
❌ Fail if: "Send Email" does nothing, or crashes on missing email

---

## TEST 4 — TagSelect Custom Values (Admin)
**Who:** Admin

Steps:
1. Login as admin → go to /admin/funders → New Funder
2. In Funding Categories: click predefined tags (should turn red)
3. Type a custom value in the text input → press Enter
4. Verify custom value appears as BLUE tag (removable with ×)
5. Click × on custom tag → verify it disappears
6. Submit funder → verify custom category saved
7. Edit that funder → verify custom category still shows

Repeat for Equipment Tags and Agency Types Funded.
Repeat same test on /admin/opportunities → New Opportunity.

Expected: Custom values saved alongside predefined ones
❌ Fail if: Custom input does nothing, or values lost on save

---

## TEST 5 — Onboarding "Other" Option
**Who:** New agency user (use incognito)

Steps:
1. Sign up as new user → reach onboarding
2. Step 2 (Agency Type): scroll to find "Other" card
3. Click "Other" → verify text input appears below cards
4. Type "Coast Guard Auxiliary"
5. Click Continue
6. Step 3 (Program Areas): click "Other" card
7. Type "Marine Safety Communications"
8. Click Continue through remaining steps
9. Complete onboarding → go to /dashboard

Then check admin:
10. Login as admin → go to /admin/agencies
11. Find the new agency → verify agencyTypes shows "Coast Guard Auxiliary"

Expected: Custom values saved through onboarding to database
❌ Fail if: "Other" text input doesn't appear, or custom value not saved

---

## TEST 6 — Amount Range Display
**Who:** Admin creates, Agency views

Steps:
1. Login as admin → /admin/opportunities → New Opportunity
2. Set Min Amount: 50000 and Max Amount: 250000
3. Save opportunity
4. Login as agency → /opportunities
5. Find the opportunity
6. Verify amount shows as "$50,000 – $250,000" (NOT just "Up to $250,000")
7. Go to /matches → verify same range format in match cards

Test edge cases:
- Opportunity with only Max → should show "Up to $X"
- Opportunity with only Min → should show "From $X"
- Opportunity with both → should show "$X – $Y"

Expected: Range displayed correctly in all cases
❌ Fail if: Only max shown, or amount missing entirely

---

## TEST 7 — Back Navigation Preserves Onboarding Data
**Who:** New user in incognito

Steps:
1. Sign up → reach onboarding step 1
2. Fill ALL fields: agency name, location, website, mission
3. Click Continue to step 2
4. Select agency types
5. Click BACK
6. Verify step 1 fields still filled (not cleared)
7. Click Continue again
8. Verify step 2 selections still selected
9. Continue to step 3, make selections, go Back
10. Verify step 2 preserved again

Expected: All form values survive back navigation
❌ Fail if: Any field clears when navigating back

---

## TEST 8 — Agency Cannot Set Admin-Only Status
**Who:** Agency user

Steps:
1. Login as agency → /applications
2. Find application in "Drafting" status
3. Click Update Status dropdown
4. Verify only these options appear:
   - Drafting
   - Ready to Submit  
   - Submitted
   - Withdrawn
5. Verify these do NOT appear:
   - Under Review
   - Awarded
   - Declined
   - Approved
6. Try to force via browser console:
   fetch('/api/applications/[id]/status', {
     method: 'PUT',
     headers: {'Content-Type':'application/json', 
       'Authorization': 'Bearer ' + localStorage.rdg_token},
     body: JSON.stringify({status: 'awarded'})
   }).then(r=>r.json()).then(console.log)
7. Verify response is 403 Forbidden

Expected: 403 on forced admin-only status
❌ Fail if: Agency can set awarded/approved via UI or API

---

## PRIORITY ORDER FOR TESTING
Test in this order (most critical first):
1. TEST 8 (security — agency status restriction)
2. TEST 1 (wins/approval — core business flow)
3. TEST 3 (outreach send — trust/reliability)
4. TEST 7 (onboarding back nav — UX)
5. TEST 2 (funder reset — data quality)
6. TEST 4 (custom tags — admin UX)
7. TEST 5 (onboarding other — data capture)
8. TEST 6 (amount range — display accuracy)

