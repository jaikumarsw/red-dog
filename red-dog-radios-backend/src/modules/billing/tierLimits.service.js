const Organization = require('../organizations/organization.schema');
const { AppError } = require('../../middlewares/error.middleware');
const {
  TIER_LIMITS,
  USAGE_FIELD_BY_FEATURE,
  LIMIT_KEY_BY_FEATURE,
  FEATURE_LABELS,
} = require('../../config/tierLimits.config');

const startOfCalendarMonth = (d = new Date()) =>
  new Date(d.getFullYear(), d.getMonth(), 1);

const endOfCalendarMonth = (d = new Date()) =>
  new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);

const getEffectiveTier = (sub) => {
  if (!sub) return 'none';
  if (sub.betaAccess === true || sub.status === 'beta_access') return 'premium';
  if (sub.status === 'active' && sub.tier && sub.tier !== 'none') return sub.tier;
  return 'none';
};

const getLimitsForTier = (tierKey) => TIER_LIMITS[tierKey] || null;

const getBillingPeriod = (sub) => {
  const start = sub?.currentPeriodStart
    ? new Date(sub.currentPeriodStart)
    : startOfCalendarMonth();
  const end = sub?.currentPeriodEnd
    ? new Date(sub.currentPeriodEnd)
    : endOfCalendarMonth();
  return { start, end };
};

const defaultUsage = () => ({
  periodStart: null,
  ashleenDrafts: 0,
  outreachEmails: 0,
  chatMessages: 0,
  outboxSends: 0,
});

const ensureUsagePeriod = (org) => {
  const sub = org.subscription || {};
  const { start } = getBillingPeriod(sub);
  org.subscription = org.subscription || {};
  org.subscription.usage = org.subscription.usage || defaultUsage();

  const periodStart = org.subscription.usage.periodStart
    ? new Date(org.subscription.usage.periodStart)
    : null;

  if (!periodStart || periodStart.getTime() !== start.getTime()) {
    org.subscription.usage = {
      periodStart: start,
      ashleenDrafts: 0,
      outreachEmails: 0,
      chatMessages: 0,
      outboxSends: 0,
    };
  }
};

const computeUsageSnapshot = (subscription) => {
  const tier = getEffectiveTier(subscription);
  const limits = getLimitsForTier(tier);
  const { start, end } = getBillingPeriod(subscription);
  const usage = subscription?.usage || defaultUsage();

  const buildMetric = (featureKey) => {
    const usageField = USAGE_FIELD_BY_FEATURE[featureKey];
    const limitKey = LIMIT_KEY_BY_FEATURE[featureKey];
    const limit = limits ? limits[limitKey] : 0;
    const used = usage[usageField] ?? 0;
    return {
      used,
      limit,
      remaining: limit === null ? null : Math.max(0, limit - used),
      unlimited: limit === null,
    };
  };

  return {
    tier,
    periodStart: start,
    periodEnd: end,
    limits,
    usage: {
      ashleenDrafts: buildMetric('ashleenDraft'),
      outreachEmails: buildMetric('outreachEmail'),
      chatMessages: buildMetric('chat'),
      outboxSends: buildMetric('outboxSend'),
    },
    privateFoundationAccess: limits?.privateFoundationAccess ?? false,
  };
};

const getUsageSnapshot = async (orgId) => {
  const org = await Organization.findById(orgId).select('subscription');
  if (!org) throw new AppError('Organization not found', 404);

  ensureUsagePeriod(org);
  if (org.isModified()) await org.save();

  return computeUsageSnapshot(org.subscription);
};

const hasActiveSubscriptionAccess = (sub) => {
  if (!sub) return false;
  if (sub.betaAccess === true || sub.status === 'beta_access') return true;
  if (sub.status === 'active') return true;
  return false;
};

const assertWithinLimit = async (orgId, featureKey) => {
  const org = await Organization.findById(orgId).select('subscription');
  if (!org) throw new AppError('Organization not found', 404);

  if (!hasActiveSubscriptionAccess(org.subscription)) {
    const err = new AppError(
      'An active subscription is required to access this feature.',
      402
    );
    err.code = 'SUBSCRIPTION_REQUIRED';
    err.redirectTo = '/pricing';
    throw err;
  }

  const tier = getEffectiveTier(org.subscription);
  const limits = getLimitsForTier(tier);
  if (!limits) {
    throw new AppError('Subscription tier not recognized', 403);
  }

  const limitKey = LIMIT_KEY_BY_FEATURE[featureKey];
  const cap = limits[limitKey];
  if (cap === null) return { tier, unlimited: true };

  ensureUsagePeriod(org);
  const usageField = USAGE_FIELD_BY_FEATURE[featureKey];
  const used = org.subscription.usage[usageField] ?? 0;

  if (used >= cap) {
    const label = FEATURE_LABELS[featureKey] || featureKey;
    const upgradeTier = tier === 'basic' ? 'Premium' : 'a higher plan';
    const err = new AppError(
      `Monthly limit reached for ${label} (${cap} per month). Upgrade to ${upgradeTier} for unlimited access.`,
      402
    );
    err.code = tier === 'basic' ? 'LIMIT_REACHED_UPGRADE_PREMIUM' : 'LIMIT_REACHED';
    err.feature = featureKey;
    err.used = used;
    err.limit = cap;
    err.tier = tier;
    err.redirectTo = '/pricing';
    throw err;
  }

  if (org.isModified()) await org.save();
  return { tier, unlimited: false, used, limit: cap };
};

const recordUsage = async (orgId, featureKey, amount = 1) => {
  const org = await Organization.findById(orgId).select('subscription');
  if (!org) return;

  // Always track counts for the billing dashboard — unlimited plans skip caps, not metering.
  ensureUsagePeriod(org);
  const usageField = USAGE_FIELD_BY_FEATURE[featureKey];
  org.subscription.usage[usageField] =
    (org.subscription.usage[usageField] ?? 0) + amount;
  await org.save();
};

module.exports = {
  getEffectiveTier,
  getLimitsForTier,
  computeUsageSnapshot,
  getUsageSnapshot,
  assertWithinLimit,
  recordUsage,
  hasActiveSubscriptionAccess,
  TIER_LIMITS,
};
