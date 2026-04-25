const billingService = require('./billing.service');
const { TIERS } = require('../../config/stripe.config');
const { stripe } = require('../../config/stripe.config');
const logger = require('../../utils/logger');

// GET /api/billing/tiers — public, returns available tiers
const getTiers = async (req, res, next) => {
  try {
    const tiers = Object.entries(TIERS).map(([key, val]) => ({
      key,
      name: val.name,
      price: val.price,
      features: val.features,
    }));
    res.json({ success: true, data: tiers });
  } catch (err) { next(err); }
};

// GET /api/billing/status — current org's subscription status
const getStatus = async (req, res, next) => {
  try {
    const orgId = req.user?.organizationId;
    if (!orgId) {
      return res.json({ 
        success: true, 
        data: { hasAccess: false, status: 'none', tier: 'none' } 
      });
    }
    const status = await billingService.getSubscriptionStatus(orgId);
    res.json({ success: true, data: status });
  } catch (err) { next(err); }
};

// POST /api/billing/checkout — create Stripe Checkout session
const createCheckout = async (req, res, next) => {
  try {
    const orgId = req.user?.organizationId;
    const { tier } = req.body;
    if (!orgId) return res.status(400).json({ 
      success: false, message: 'Organization required' 
    });
    
    const result = await billingService.createCheckoutSession({ 
      orgId, tier 
    });
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

// POST /api/billing/portal — create Stripe Billing Portal session
const createPortal = async (req, res, next) => {
  try {
    const orgId = req.user?.organizationId;
    if (!orgId) return res.status(400).json({ 
      success: false, message: 'Organization required' 
    });
    const result = await billingService.createPortalSession(orgId);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

// POST /api/billing/webhook — Stripe webhook receiver
// IMPORTANT: this endpoint needs raw body parsing
const handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    logger.error('[Stripe Webhook] Signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  try {
    await billingService.handleWebhookEvent(event);
    res.json({ received: true });
  } catch (err) {
    logger.error('[Stripe Webhook] Handler error:', err.message);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
};

module.exports = { 
  getTiers, getStatus, createCheckout, createPortal, handleWebhook 
};
