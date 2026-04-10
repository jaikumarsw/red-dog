# Red Dog Radio — Test Data for All Forms

Use this file to fill in every form in the app during testing.

---

## 1. Sign Up

| Field | Value |
|-------|-------|
| First Name | `Marcus` |
| Last Name | `Webb` |
| Email | `marcus@pinecountysheriff.org` |
| Password | `SecurePass1!` |

---

## 2. Onboarding — Step 1: Your Organization

> Screen: **YOUR ORGANIZATION** — "Tell us who you are so Ashleen can find the right grants."

| Field | Value |
|-------|-------|
| Organization Name | `Pine County Sheriff's Office` |
| Location | `Austin, TX` |
| Website URL | `https://pinecountysheriff.org` |
| Mission Statement | `To protect and serve the residents of Pine County through community-focused policing, advanced communications technology, and rapid emergency response coordination across all 420 square miles of our jurisdiction.` |

---

## 3. Onboarding — Step 2: Agency Type

Click the tile that matches your agency. For testing, click:

- **Law Enforcement** *(Police / Sheriff / Corrections)*

You can also click additional tiles to test multi-select, e.g.:
- **911 Centers / PSAPs**

---

## 4. Onboarding — Step 3: Your Request

Paste into the text area:

```
We are seeking funding to upgrade our radio communications infrastructure. Our current equipment is over 12 years old and is incompatible with neighboring counties' systems. We serve a population of 85,000 residents across 420 square miles with 62 sworn officers and 14 civilian staff. The primary need is P25 Phase II compliant portable radios, vehicle-mounted units, and base station replacements to achieve full interoperability with the Texas statewide emergency network.
```

---

## 5. Onboarding — Step 4: Notifications

Toggle **ON**:
- Deadline Reminders
- High-Match Alerts
- Weekly Digest Email

---

## 6. Add Organization
*(Sidebar → Organizations → Add Organization)*

| Field | Value |
|-------|-------|
| Organization Name | `Riverside Valley Fire District` |
| Location | `Houston, TX` |
| Website | `https://rvfd.org` |
| Mission Statement | `To provide professional fire suppression, emergency medical services, and rescue operations to the Riverside Valley community while promoting fire safety education and disaster preparedness for all residents.` |
| Focus Areas | `public safety, fire, EMS, emergency response, community education` |

---

## 7. Add Agency
*(Sidebar → Agencies → Add Agency)*

| Field | Value |
|-------|-------|
| Agency Name | `Eastside Emergency Communications Center` |
| Type | `911 Center` |
| Location | `Dallas, TX` |
| Email | `dispatch@eastsidecomm.org` |

---

## 8. Add Opportunity
*(Sidebar → Opportunities → Add Opportunity)*

| Field | Value |
|-------|-------|
| Title | `Emergency Communications Infrastructure Grant` |
| Funder | `FEMA Hazard Mitigation Grant Program` |
| Deadline | `09/30/2026` |
| Max Amount | `250000` |
| Source URL | `https://www.fema.gov/grants/mitigation` |
| Keywords | `communications, radio, interoperability, public safety, infrastructure` |
| Description | `Federal grant supporting state and local governments in implementing long-term hazard mitigation solutions to reduce the loss of life and property from disasters. Eligible activities include upgrades to emergency communication systems, radio interoperability projects, 911 center improvements, and first responder equipment modernization.` |

---

## 9. Apply with Ashleen — Application Form
*(Opportunities → click any grant → Apply with Ashleen → Apply Now)*

Ashleen auto-fills Project Summary and Community Impact. Fill in the remaining fields:

| Field | Value |
|-------|-------|
| Organization Name | `Pine County Sheriff's Office` |
| Contact Name | `Marcus Webb` |
| Contact Email | `marcus@pinecountysheriff.org` |
| Project Timeline | `12 months (Oct 2026 – Sep 2027)` |
| Amount Requested | `175000` |
| Project Title | `Pine County Radio Interoperability Upgrade` |

**If Ashleen doesn't auto-fill (no OpenAI key), paste these manually:**

**Project Summary:**
```
Pine County Sheriff's Office proposes a comprehensive upgrade of our emergency radio communications infrastructure serving 85,000 residents across 420 square miles. Current equipment installed in 2012 operates on an incompatible frequency band that prevents real-time coordination with neighboring county agencies and state emergency management. This project will replace 62 portable radios, 14 vehicle-mounted units, and two base stations with P25 Phase II compliant equipment fully compatible with the Texas statewide interoperability network. The upgrade will eliminate 12% coverage dead zones and enable seamless multi-agency communication during large-scale incidents.
```

**Community Impact:**
```
This upgrade will directly benefit all 85,000 Pine County residents by enabling seamless communication between Sheriff's deputies, fire departments, EMS units, and state emergency management during multi-agency incidents. The new P25 equipment will reduce emergency response coordination time by an estimated 40% and eliminate current communication dead zones. Officers responding to critical incidents will have reliable communication in every part of the county for the first time, directly improving public safety outcomes and officer safety.
```

**Ashleen chat prompts to test editing:**
- `Make the project summary more concise`
- `Add a line about officer safety to the community impact`
- `Make the tone more urgent`
- `Shorten the community impact to one paragraph`

---

## 10. Funder Notes
*(Sidebar → Funders → click any funder, e.g. FEMA → Notes field)*

```
Met with regional program officer at FEMA Region VI conference in March 2026. Strong interest in P25 interoperability projects. Suggested applying for the Hazard Mitigation cycle opening in Q3 2026. Follow up by July before the Notice of Intent deadline. Key contact: Sarah Dominguez, sdominguez@fema.dhs.gov
```

---

## 11. Outreach Email
*(Funders → click any funder → Draft Outreach Email)*

Let Ashleen draft the email. If editing manually:

| Field | Value |
|-------|-------|
| Subject | `Introduction — Pine County Sheriff's Office Grant Inquiry` |

**Body:**
```
Dear Grant Programs Team,

I am writing on behalf of Pine County Sheriff's Office to introduce our agency and explore potential funding opportunities aligned with your grant programs.

Pine County Sheriff's Office serves 85,000 residents across 420 square miles in central Texas with 62 sworn officers and 14 civilian staff. We are currently seeking funding to modernize our emergency radio communications infrastructure, replacing aging equipment that is incompatible with the Texas statewide interoperability network.

We believe our project aligns closely with your focus on public safety and community resilience. I would welcome the opportunity to discuss how we might partner on this initiative.

Thank you for your consideration.

Sincerely,
Marcus Webb
Pine County Sheriff's Office
marcus@pinecountysheriff.org
```

---

## 12. Tracker — Status Updates
*(Sidebar → Tracker)*

Move any application through these statuses to test the full pipeline:

| Step | Status to Set |
|------|--------------|
| 1 | `Draft` → `Submitted` |
| 2 | `Submitted` → `Under Review` |
| 3 | `Under Review` → `Awarded` ← automatically creates a Win record |

To test rejection path:
| Step | Status to Set |
|------|--------------|
| 3 alt | `Under Review` → `Rejected` |

---

## 13. Settings
*(Sidebar → Settings)*

| Section | Field | Value |
|---------|-------|-------|
| Profile | First Name | `Marcus` |
| Profile | Last Name | `Webb` |
| Preferences | Language | `English` |
| Preferences | Timezone | `America/Chicago` |

---

## 14. Ashleen Global Chat
*(Floating button, bottom-right, any page)*

| Prompt | What it tests |
|--------|--------------|
| `What FEMA grants are open for radio upgrades?` | Grant knowledge |
| `How do I write a strong budget justification?` | Grant writing help |
| `What deadlines are coming up this month?` | Deadline awareness |
| `Summarize the DOJ COPS grant for me` | Grant-specific summary |
| `What makes a competitive application for a foundation grant?` | Strategy advice |

---

## 15. Login (Existing Seed Accounts)

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@reddogradios.com` | `Admin1234!` |
| Regular User | `jane@valleyfire.org` | `Password1234!` |
