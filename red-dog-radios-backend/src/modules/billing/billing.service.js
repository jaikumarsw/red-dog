const { stripe, TIERS } = require('../../config/stripe.config');
const Organization = require('../organizations/organization.schema');
const User = require('../auth/user.schema');
const logger = require('../../utils/logger');
const { AppError } = require('../../middlewares/error.middleware');
const tierLimitsService = require('./tierLimits.service');

const isStripeReady = () => Boolean(stripe);

// Get or create a Stripe customer for an organization
const getOrCreateCustomer = async (orgId) => {
  if (!isStripeReady()) throw new AppError('Stripe not configured', 503);
  
  const org = await Organization.findById(orgId);
  if (!org) throw new AppError('Organization not found', 404);
  
  const existingId = org.subscription?.stripeCustomerId;
  if (existingId) {
    // Verify the stored customer still exists in the *current* Stripe account
    // (it may not after a test→live key swap, account change, or manual delete).
    try {
      const existing = await stripe.customers.retrieve(existingId);
      if (existing && !existing.deleted) return existingId;
    } catch (err) {
      const code = err?.raw?.code || err?.code;
      if (code !== 'resource_missing') throw err;
      logger.warn(
        `[Stripe] Stored customer ${existingId} not found in current account — recreating`
      );
    }
  }

  // Find primary user email
  const user = await User.findOne({ organizationId: orgId })
    .sort({ createdAt: 1 })
    .select('email firstName lastName');

  const customer = await stripe.customers.create({
    email: user?.email || org.email,
    name: org.name,
    metadata: {
      organizationId: String(orgId),
      agencyName: org.name,
    },
  });

  org.subscription = org.subscription || {};
  org.subscription.stripeCustomerId = customer.id;
  await org.save();

  return customer.id;
};

// Create a Stripe Checkout session for subscription signup
const createCheckoutSession = async ({ orgId, tier }) => {
  if (!isStripeReady()) throw new AppError('Stripe not configured', 503);
  if (!['basic', 'premium'].includes(tier)) {
    throw new AppError('Invalid tier', 400);
  }
  
  const tierConfig = TIERS[tier];
  if (!tierConfig.priceId) {
    throw new AppError(`${tier} price ID not configured`, 503);
  }
  
  const customerId = await getOrCreateCustomer(orgId);
  
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: tierConfig.priceId, quantity: 1 }],
    success_url: process.env.STRIPE_SUCCESS_URL,
    cancel_url: process.env.STRIPE_CANCEL_URL,
    metadata: {
      organizationId: String(orgId),
      tier,
    },
    subscription_data: {
      metadata: {
        organizationId: String(orgId),
        tier,
      },
    },
  });
  
  return { url: session.url, sessionId: session.id };
};

// Create a Stripe billing portal session for managing subscription
const createPortalSession = async (orgId) => {
  if (!isStripeReady()) throw new AppError('Stripe not configured', 503);
  
  const org = await Organization.findById(orgId);
  if (!org?.subscription?.stripeCustomerId) {
    throw new AppError('No subscription found', 404);
  }
  
  const session = await stripe.billingPortal.sessions.create({
    customer: org.subscription.stripeCustomerId,
    return_url: `${process.env.FRONTEND_URL}/account/billing`,
  });
  
  return { url: session.url };
};

// Get current subscription status for an org
const getSubscriptionStatus = async (orgId) => {
  const org = await Organization.findById(orgId).select('subscription');
  if (!org) throw new AppError('Organization not found', 404);

  let usageLimits = null;
  if (hasActiveAccess(org.subscription)) {
    try {
      usageLimits = await tierLimitsService.getUsageSnapshot(orgId);
    } catch (err) {
      logger.error('[Billing] Failed to load usage snapshot:', err.message);
      usageLimits = tierLimitsService.computeUsageSnapshot(org.subscription || {});
    }
  }

  return {
    status: org.subscription?.status || 'none',
    tier: org.subscription?.tier || 'none',
    betaAccess: org.subscription?.betaAccess || false,
    currentPeriodEnd: org.subscription?.currentPeriodEnd || null,
    cancelAtPeriodEnd: org.subscription?.cancelAtPeriodEnd || false,
    hasAccess: hasActiveAccess(org.subscription),
    hasPremium: hasPremiumAccess(org.subscription),
    usageLimits,
  };
};

// Helper: does the org have active access (paid OR beta)
const hasActiveAccess = (sub) => {
  if (!sub) return false;
  if (sub.betaAccess === true || sub.status === 'beta_access') return true;
  if (sub.status === 'active') return true;
  return false;
};

// Helper: does the org have premium tier access
const hasPremiumAccess = (sub) => {
  if (!sub) return false;
  if (sub.betaAccess === true || sub.status === 'beta_access') return true;
  return sub.status === 'active' && sub.tier === 'premium';
};

// Apply BETA2026 (or any full-access coupon) to grant beta access
const grantBetaAccessFromCoupon = async (orgId, couponCode) => {
  const org = await Organization.findById(orgId);
  if (!org) throw new AppError('Organization not found', 404);
  
  org.subscription = org.subscription || {};
  org.subscription.status = 'beta_access';
  org.subscription.tier = 'premium';
  org.subscription.betaAccess = true;
  org.subscription.betaAccessCouponCode = couponCode;
  org.subscription.betaAccessGrantedAt = new Date();
  
  await org.save();
  logger.info(
    `[Billing] Granted beta access to org ${org.name} via ${couponCode}`
  );
  return org;
};

// Webhook handler: process Stripe events
const handleWebhookEvent = async (event) => {
  logger.info(`[Stripe Webhook] Received: ${event.type}`);
  
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const orgId = session.metadata?.organizationId;
      const tier = session.metadata?.tier;
      if (!orgId) break;
      
      await Organization.findByIdAndUpdate(orgId, {
        $set: {
          'subscription.stripeSubscriptionId': session.subscription,
          'subscription.tier': tier,
          'subscription.status': 'active',
        },
      });
      logger.info(`[Stripe] Subscription activated for org ${orgId} (${tier})`);
      break;
    }
    
    case 'customer.subscription.updated': {
      const sub = event.data.object;
      const orgId = sub.metadata?.organizationId;
      if (!orgId) break;
      
      const newStatus = sub.status === 'active' ? 'active' 
        : sub.status === 'past_due' ? 'past_due' 
        : sub.status === 'canceled' ? 'cancelled' 
        : 'none';
      
      await Organization.findByIdAndUpdate(orgId, {
        $set: {
          'subscription.status': newStatus,
          'subscription.currentPeriodStart': new Date(sub.current_period_start * 1000),
          'subscription.currentPeriodEnd': new Date(sub.current_period_end * 1000),
          'subscription.cancelAtPeriodEnd': sub.cancel_at_period_end,
        },
      });
      logger.info(`[Stripe] Subscription updated for org ${orgId} → ${newStatus}`);
      break;
    }
    
    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      const orgId = sub.metadata?.organizationId;
      if (!orgId) break;
      
      await Organization.findByIdAndUpdate(orgId, {
        $set: {
          'subscription.status': 'cancelled',
          'subscription.tier': 'none',
        },
      });
      logger.info(`[Stripe] Subscription cancelled for org ${orgId}`);
      break;
    }
    
    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      const customerId = invoice.customer;
      const org = await Organization.findOne({
        'subscription.stripeCustomerId': customerId,
      });
      if (!org) break;
      
      org.subscription.status = 'past_due';
      await org.save();
      logger.warn(`[Stripe] Payment failed for org ${org._id}`);
      break;
    }
    
    default:
      logger.info(`[Stripe] Unhandled event type: ${event.type}`);
  }
};

module.exports = {
  isStripeReady,
  getOrCreateCustomer,
  createCheckoutSession,
  createPortalSession,
  getSubscriptionStatus,
  hasActiveAccess,
  hasPremiumAccess,
  grantBetaAccessFromCoupon,
  handleWebhookEvent,
  TIERS,
};
