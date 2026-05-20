const Organization = require('../modules/organizations/organization.schema');
const billingService = require('../modules/billing/billing.service');
const tierLimitsService = require('../modules/billing/tierLimits.service');
const logger = require('../utils/logger');
const { resolveAgencyOrganizationId } = require('../utils/resolveOrganizationId');

// Block access if org doesn't have an active subscription or beta access
const requireActiveSubscription = async (req, res, next) => {
  try {
    const orgId = await resolveAgencyOrganizationId(req.user);
    if (!orgId) {
      return res.status(403).json({ 
        success: false, 
        code: 'NO_ORGANIZATION',
        message: 'Organization required' 
      });
    }
    
    const org = await Organization.findById(orgId).select('subscription');
    if (!org) {
      return res.status(404).json({ 
        success: false, 
        message: 'Organization not found' 
      });
    }
    
    if (!billingService.hasActiveAccess(org.subscription)) {
      return res.status(402).json({ 
        success: false, 
        code: 'SUBSCRIPTION_REQUIRED',
        message: 'An active subscription is required to access this feature.',
        redirectTo: '/pricing'
      });
    }
    
    next();
  } catch (err) {
    logger.error('[Paywall] Error checking subscription:', err.message);
    next(err);
  }
};

// Block access if org doesn't have Premium tier
const requirePremium = async (req, res, next) => {
  try {
    const orgId = await resolveAgencyOrganizationId(req.user);
    if (!orgId) {
      return res.status(403).json({
        success: false,
        code: 'NO_ORGANIZATION',
        message: 'Organization required',
      });
    }
    const org = await Organization.findById(orgId).select('subscription');

    if (!billingService.hasPremiumAccess(org?.subscription)) {
      return res.status(402).json({ 
        success: false, 
        code: 'PREMIUM_REQUIRED',
        message: 'This feature requires the Premium tier.',
        redirectTo: '/pricing'
      });
    }
    next();
  } catch (err) { next(err); }
};

/** Enforce monthly tier usage cap (ashleenDraft, outreachEmail, chat, outboxSend). */
const checkUsageLimit = (featureKey) => async (req, res, next) => {
  try {
    const orgId = await resolveAgencyOrganizationId(req.user);
    if (!orgId) {
      return res.status(403).json({
        success: false,
        code: 'NO_ORGANIZATION',
        message: 'Organization required',
      });
    }
    await tierLimitsService.assertWithinLimit(orgId, featureKey);
    next();
  } catch (err) {
    if (err.isOperational && err.statusCode === 402) {
      return res.status(402).json({
        success: false,
        message: err.message,
        code: err.code || 'LIMIT_REACHED',
        redirectTo: err.redirectTo || '/pricing',
        feature: err.feature,
        used: err.used,
        limit: err.limit,
        tier: err.tier,
      });
    }
    next(err);
  }
};

module.exports = {
  requireActiveSubscription,
  requirePremium,
  checkUsageLimit,
};
