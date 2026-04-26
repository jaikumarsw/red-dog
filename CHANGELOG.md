# Changelog — April 25, 2026

## [1.4.0] — Stripe Payments, Communication Log, Post-Award Sequence
### Added
- **Stripe Subscription Billing**: Two tiers ($199 Basic / $385 Premium) with Stripe Checkout integration, billing portal, and webhook handlers for subscription lifecycle events.
- **Beta Coupon → Premium Access**: BETA2026 coupon now grants free Premium tier access via grantBetaAccessFromCoupon flow.
- **Paywall Middleware**: Active subscription required to generate AI applications. Other features remain accessible.
- **Communication Log**: Per-application timeline showing system events (status changes, AI generation, submission) plus admin-logged emails, calls, meetings, and notes. Visible to both admin and agency.
- **Post-Award Email Sequence**: When an application is marked awarded, the system automatically sends a congratulations email asking what equipment will be purchased, schedules a 3-day follow-up with Red Dog radio recommendations, and notifies admin.
- **Award Response Capture**: Agency can respond to the post-award email with their equipment plans, captured for personalized follow-up.
- **Priority Agencies System**: Daily cron flags agencies that have been on the platform 60+ days without a win. Flagged agencies receive a +5 match score boost and appear in a "Priority Agencies" section on the admin dashboard.
- **Project Summary Section**: Now displayed in both admin and agency application detail views.

### Changed
- **AI Budget Discipline**: Strengthened prompt to prevent invented per-unit costs. AI now uses placeholders or labeled example ranges when profile data is insufficient.

### Fixed
- Onboarding step 5 redirect issue addressed.

### Infrastructure
- Two new daily cron jobs: post-award follow-up sender (9 AM MT), priority flags updater (8 AM MT).
- New Mongoose schemas: CommunicationLog, Coupon (already existed).
- New Organization fields: subscription block, postAwardSequence, priorityFlags.

### Pending Client Action
- Stripe API keys (Setup guide in red-dog-radios-backend/STRIPE_SETUP.md)
- Real opportunity deadlines via admin panel
- Private funders list
- Production server deployment

## [1.3.0] - Branding & UI Enhancements
### Changed
- **Branding Rename**: Updated all frontend display text from "Red Dog Radios" to "Red Dog Grant Intelligence" across:
  - Sidebar logo (both agency and admin portals)
  - Browser tab title and page metadata
  - Weekly summary page header
  - All layout and shell components
- **Sidebar Logo Structure**: Updated to show "RED DOG GRANT INTELLIGENCE" as primary text with "for Public Safety" as subtitle

---

## [1.2.5] - Weekly Summary Enhancements
### Added
- **Stats Bar on Weekly Summary**: Added a compact, read-only stats bar at the top of the weekly summary email preview showing: Matched Funders, In Progress, Submitted, Waiting on Info, Awards Won
- **Combined Awards Display**: Merged separate "Awards Won" and "$ Awarded" into a single card showing count and total dollar amount together
- **Dashboard Stat Cards**: Added "Waiting on Info" amber stat card to agency dashboard between Submitted and Awards Won, clickable to filter applications by that status

---

## [1.2.2] - Matching Engine Fix
### Fixed
- **Geography Scoring Bug**: National programs (opportunities with empty locationFocus array) were incorrectly receiving 0 geography points and a mismatch disqualifier.
  - Fix: Empty locationFocus now correctly awards full geography points (20) with reason "National program — open to all states"
  - State-specific programs (e.g., Colorado DHSEM) still correctly check agency location against locationFocus
- **Match Recomputation**: All existing match scores recomputed after the fix. FEMA AFG score for Colorado Springs Fire Department improved from 79 → 99.

---

## [1.2.0] - AI Logic & Funder Alignment
### Added
- **Dynamic Funder Language Alignment**: AI now automatically mirrors the funder's mission statement, tone, and specific terminology in the generated application.
- **Score-Based Opportunity Locking**: Opportunities now only count toward the maximum application cap if the agency's Match Fit score is 90% or higher.
- **Low-Score Application Warnings**: Agencies applying with a match score below 90% receive a warning that their fit is suboptimal, though they are still permitted to apply.
- **Improved Budget Reasoning**: Added system instructions for AI to use realistic P25 radio pricing ($5k-$8k per unit) or explicit placeholders when profile data is missing.

### Changed
- Removed the manual "Align to Funder Language" button; alignment is now part of the core generation process.
- Upgraded the AI Senior Grant Writer persona to prioritize FEMA AFG and DOJ scoring rubrics.
- Updated `unlockFunder` admin action to reset both total and high-score application counters.

---

## [1.1.0] - "Waiting on Info" Workflow
### Added
- **New Application Status**: `waiting_on_information`.
- **Status Context Tracking**: Added `infoRequestedAt` and `infoRequestedNote` to Application schema.
- **Admin "Request Information" Button**: Staff can now request details from agencies for any active application (drafting, submitted, in_review).
- **Agency Action Alerts**: Added "Information Requested" banner and input section to the agency application view.
- **Dashboard Stats**: Added "Waiting on Info" stat card to both Admin and Agency dashboards.

### Fixed
- Resolved 404 error on status update API by correctly routing status changes through the application controller.

---

## [1.0.1] - Beta Access & Onboarding
### Added
- **Coupon Code System**: Backend infrastructure for managing access codes.
- **BETA2026 Coupon**: Seeded a special access code for 50 uses with Dec 2026 expiry.
- **Onboarding Integration**: Added optional coupon code field to the final step of the agency onboarding flow.
- **Admin Coupon Management**: New portal at `/admin/coupons` to create and track code usage.
- **Date Anchoring**: Injected current system date into AI prompts to prevent future-date hallucinations in project timelines.

---

## Known Pending Items
- Logo asset pending from client (John to provide)
- Weekly Friday sync calls scheduled (8PM, every Friday)
