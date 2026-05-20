const express = require('express');
const rateLimit = require('express-rate-limit');
const { getAll, getOne, create, generate, update, updateStatus, submit, remove, exportApplication, respondToAward } = require('./application.controller');
const { protect } = require('../../middlewares/auth.middleware');
const {
  requireActiveSubscription,
  checkUsageLimit,
} = require('../../middlewares/paywall.middleware');

const router = express.Router();

const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => (req.user?._id?.toString() || req.ip),
  message: { success: false, message: 'AI generation limit reached. Try again in 1 hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router
  .route('/')
  .get(protect, getAll)
  // POST creates a manual application without AI generation.
  // No paywall: this is a free record-keeping feature.
  // The AI-generation path is /generate which is gated.
  .post(protect, create);
router.post(
  '/generate',
  protect,
  requireActiveSubscription,
  checkUsageLimit('ashleenDraft'),
  aiLimiter,
  generate
);
router.route('/:id').get(protect, getOne).put(protect, update).delete(protect, remove);
router.put('/:id/submit', protect, submit);
router.patch('/:id/status', protect, updateStatus);
router.post('/:id/award-response', protect, respondToAward);
router.get('/:id/export', protect, exportApplication);

module.exports = router;
