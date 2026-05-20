/**
 * Per-tier monthly usage caps. `null` = unlimited for that metric.
 * Beta access is treated as Premium (see tierLimits.service.js).
 */
const TIER_LIMITS = {
  basic: {
    ashleenDraftsPerMonth: 20,
    outreachEmailsPerMonth: 15,
    chatMessagesPerMonth: 75,
    outboxEmailsPerMonth: 50,
    privateFoundationAccess: false,
  },
  premium: {
    ashleenDraftsPerMonth: null,
    outreachEmailsPerMonth: null,
    chatMessagesPerMonth: null,
    outboxEmailsPerMonth: null,
    privateFoundationAccess: true,
  },
};

const USAGE_FIELD_BY_FEATURE = {
  ashleenDraft: 'ashleenDrafts',
  outreachEmail: 'outreachEmails',
  chat: 'chatMessages',
  outboxSend: 'outboxSends',
};

const LIMIT_KEY_BY_FEATURE = {
  ashleenDraft: 'ashleenDraftsPerMonth',
  outreachEmail: 'outreachEmailsPerMonth',
  chat: 'chatMessagesPerMonth',
  outboxSend: 'outboxEmailsPerMonth',
};

const FEATURE_LABELS = {
  ashleenDraft: 'AI grant drafts (Apply with Ashleen)',
  outreachEmail: 'outreach emails generated',
  chat: 'Ashleen chat messages',
  outboxSend: 'outbound emails sent',
};

module.exports = {
  TIER_LIMITS,
  USAGE_FIELD_BY_FEATURE,
  LIMIT_KEY_BY_FEATURE,
  FEATURE_LABELS,
};
