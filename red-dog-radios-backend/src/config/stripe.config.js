const Stripe = require('stripe');
const logger = require('../utils/logger');

let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-11-20.acacia',
  });
  logger.info('[Stripe] Initialized in test mode');
} else {
  logger.warn('[Stripe] STRIPE_SECRET_KEY not set — billing disabled');
}

const TIERS = {
  basic: {
    name: 'Basic',
    price: 199,
    priceId: process.env.STRIPE_PRICE_BASIC,
    features: [
      'Smart funder matching',
      'AI grant writing (unlimited)',
      'Deadline alerts',
      'Weekly digest emails',
    ],
  },
  premium: {
    name: 'Premium',
    price: 385,
    priceId: process.env.STRIPE_PRICE_PREMIUM,
    features: [
      'Everything in Basic',
      'Private foundation access',
      'White-glove submission support',
      'Priority application queue',
      'Dedicated account support',
    ],
  },
};

module.exports = { stripe, TIERS };
