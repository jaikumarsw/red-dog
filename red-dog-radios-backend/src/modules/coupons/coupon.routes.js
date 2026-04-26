const express = require('express');
const router = express.Router();
const ctrl = require('./coupon.controller');
const { protect, restrictTo } = require('../../middlewares/auth.middleware');

// Public — validate only (no auth needed for UI check)
router.get('/validate', ctrl.validate);

// Agency — redeem (must be logged in)
router.post('/redeem', protect, ctrl.redeem);

// Admin only
router.get('/', protect, restrictTo('admin'), ctrl.list);
router.post('/', protect, restrictTo('admin'), ctrl.create);
router.patch('/:id/deactivate', protect, restrictTo('admin'), ctrl.deactivate);

module.exports = router;
