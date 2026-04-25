const express = require('express');
const router = express.Router();
const ctrl = require('./billing.controller');
const { protect } = require('../../middlewares/auth.middleware');

router.get('/tiers', ctrl.getTiers);
router.get('/status', protect, ctrl.getStatus);
router.post('/checkout', protect, ctrl.createCheckout);
router.post('/portal', protect, ctrl.createPortal);

module.exports = router;
