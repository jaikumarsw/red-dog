const express = require('express');
const rateLimit = require('express-rate-limit');
const { getAll, getOne, create, generate, update, updateStatus, submit, remove, regenerate, alignToFunder, exportApplication } = require('./application.controller');
const { protect } = require('../../middlewares/auth.middleware');

const router = express.Router();

const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => (req.user?._id?.toString() || req.ip),
  message: { success: false, message: 'AI generation limit reached. Try again in 1 hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.route('/').get(protect, getAll).post(protect, create);
router.post('/generate', protect, aiLimiter, generate);
router.route('/:id').get(protect, getOne).put(protect, update).delete(protect, remove);
router.put('/:id/submit', protect, submit);
router.put('/:id/status', protect, updateStatus);
router.post('/:id/regenerate', protect, aiLimiter, regenerate);
router.post('/:id/align', protect, aiLimiter, alignToFunder);
router.get('/:id/export', protect, exportApplication);

module.exports = router;
