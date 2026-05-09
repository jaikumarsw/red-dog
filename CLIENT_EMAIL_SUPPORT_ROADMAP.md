# Red Dog Email Connectivity Roadmap (Client Version)

## Why this change is needed

Today, mailbox connectivity is effectively tied to Google OAuth flows. This works for Gmail-based users, but creates friction for agencies using:

- Yahoo Mail
- Microsoft 365 / Outlook
- Custom domain email (for example, `@cityfire.gov`, `@countyems.org`)
- Hosted mail providers (cPanel, Zoho, Fastmail, Rackspace, etc.)

To support all agencies reliably, we should separate:

1. **How users log in to the platform** (authentication), and  
2. **How their mailbox is connected** (email transport/inbox integration).

---

## Current state (simple view)

- Login: mostly OAuth-led
- Mail integration: Gmail-first behavior
- Limitation: non-Gmail agencies require manual workarounds or cannot fully use automated email features

---

## Target state (what we are moving to)

Any user should be able to:

- Log in using Google, Microsoft, magic link, or password
- Connect any mailbox using one of these connector types:
  - **Gmail OAuth**
  - **Microsoft OAuth**
  - **Other Email (IMAP/SMTP)** for Yahoo and custom domains

This creates a universal setup where login method and mailbox provider are independent.

---

## Proposed architecture

## 1) Decouple Auth from Mail

- `auth_provider`: `google | microsoft | magic_link | password`
- `mail_provider`: `gmail | m365 | imap_smtp | none`

Example:
- User logs in with Google, but sends/receives from `chief@countyfire.org` via IMAP/SMTP.

## 2) Unified Mail Connector Layer

Create a provider abstraction:

- `sendMessage()`
- `listRecentMessages()`
- `getThread()`
- `reply()`
- `healthCheck()`

Provider implementations:

- `gmailConnector`
- `m365Connector`
- `imapSmtpConnector`

## 3) Credential Security Model

- Encrypt tokens/passwords at rest
- Store only encrypted secrets in DB
- Keep keys in KMS/secret manager
- Add token refresh + credential health monitoring

## 4) Deliverability & Compliance

- Enforce SPF/DKIM/DMARC guidance for custom domains
- Add warm-up and send-rate safeguards
- Add bounce/error classification and retry strategy

---

## Phased implementation plan

## Phase 0 - Design & alignment (2-3 days)

- Finalize provider matrix and scope
- Confirm supported mailbox types in v1:
  - Gmail OAuth
  - Microsoft OAuth
  - IMAP/SMTP (Yahoo + custom)
- Approve UX copy and support policy

**Deliverable:** approved technical design + UX wireframe

## Phase 1 - Foundation (4-6 days)

- Introduce provider-agnostic mail interface
- Add DB fields (`auth_provider`, `mail_provider`, connection metadata)
- Build credential encryption helpers and rotation-ready storage

**Deliverable:** backend ready for multiple connectors

## Phase 2 - IMAP/SMTP connector (5-8 days)

- Add “Other Email” onboarding flow
- Implement IMAP read + SMTP send pipeline
- Add connection test (send + fetch)
- Add common templates for Yahoo/custom setup instructions

**Deliverable:** Yahoo and custom-domain users can connect and use messaging features

## Phase 3 - Microsoft 365 connector (4-6 days)

- Add Microsoft OAuth mailbox connect
- Implement token refresh + mailbox health checks
- Validate reply/thread behavior parity with Gmail

**Deliverable:** Outlook/M365 mailbox support

## Phase 4 - Hardening & observability (3-5 days)

- Provider-specific retry/backoff rules
- Monitoring dashboards and alerting
- Admin diagnostics (“why mailbox sync failed”)
- Support runbook

**Deliverable:** production-grade reliability and faster support resolution

---

## UX flow (client-facing)

1. User signs in (Google/Microsoft/magic link/password)
2. User opens **Mailbox Settings**
3. User selects:
   - Gmail
   - Outlook
   - Other Email (IMAP/SMTP)
4. Platform runs connection test
5. On success, mailbox is marked **Connected**
6. Automated outreach, replies, and tracking are enabled

---

## Risks and mitigation

- **Risk:** provider-specific edge cases (Yahoo security policies, custom TLS settings)  
  **Mitigation:** guided setup wizard + preflight checks + fallback diagnostics.

- **Risk:** token expiration / credential drift  
  **Mitigation:** proactive health checks, refresh routines, user alerts before disruption.

- **Risk:** deliverability issues on custom domains  
  **Mitigation:** SPF/DKIM/DMARC checks and onboarding checklist.

- **Risk:** support complexity across multiple providers  
  **Mitigation:** standardized connector interface + internal support playbooks.

---

## Estimated effort

- **MVP (Gmail + IMAP/SMTP with existing auth):** ~2-3 weeks
- **Full universal model (Gmail + M365 + IMAP/SMTP + hardening):** ~4-6 weeks

Timeline depends on QA depth, security review, and production rollout strategy.

---

## Success criteria

We consider this successful when:

- 95%+ of agency domains can connect without engineering intervention
- New mailbox setup takes under 10 minutes on average
- Core messaging features work consistently across Gmail, Outlook, and custom mailboxes
- Support tickets related to “cannot connect email” drop materially after launch

---

## Recommendation

Proceed in two releases:

1. **Release A (fast impact):** add IMAP/SMTP “Other Email” support first  
2. **Release B (enterprise depth):** add Microsoft 365 OAuth + advanced monitoring

This sequence unlocks most non-Gmail users quickly while keeping technical risk controlled.

