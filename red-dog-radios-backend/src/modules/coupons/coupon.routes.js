const express = require('express');
const router = express.Router();
const ctrl = require('./coupon.controller');
const { protect, adminOnly } = require('../../middlewares/auth.middleware');

// Public — validate only (no auth needed for UI check)
router.get('/validate', ctrl.validate);

// Agency — redeem (must be logged in)
router.post('/redeem', protect, ctrl.redeem);

// Admin only
router.get('/', protect, adminOnly, ctrl.list);
router.post('/', protect, adminOnly, ctrl.create);
router.patch('/:id/deactivate', protect, adminOnly, ctrl.deactivate);

module.exports = router;
