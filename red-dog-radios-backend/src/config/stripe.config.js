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
    price: 225,
    priceId: process.env.STRIPE_PRICE_BASIC,
    features: [
      'Smart funder matching',
      'Up to 20 Apply with Ashleen drafts / month',
      'Up to 15 outreach emails generated / month',
      'Up to 75 Ashleen chat messages / month',
      'Up to 50 outbound emails / month',
      'Deadline alerts & weekly digest emails',
    ],
  },
  premium: {
    name: 'Premium',
    price: 449,
    priceId: process.env.STRIPE_PRICE_PREMIUM,
    features: [
      'Everything in Basic — unlimited',
      'Unlimited Apply with Ashleen drafts',
      'Unlimited outreach email generation',
      'Unlimited Ashleen chat & outbound emails',
      'Private foundation access',
      'White-glove submission support',
      'Priority application queue & dedicated support',
    ],
  },
};

module.exports = { stripe, TIERS };
