const Stripe = require('stripe');
const logger = require('../utils/logger');

let stripe = null;
const key = process.env.STRIPE_SECRET_KEY;
const isPlaceholder = !key
  || key.includes('REPLACE_ME')
  || key === ''
  || key.length < 20;

if (!isPlaceholder) {
  stripe = new Stripe(key, {
    apiVersion: '2024-11-20.acacia',
  });
  logger.info('[Stripe] Initialized');
} else {
  logger.warn(
    '[Stripe] Not configured (key missing or placeholder) — ' +
    'billing features will return 503 until configured'
  );
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
