const express = require('express');
const router = express.Router();
const { chat } = require('./ashleen.controller');
const { protect } = require('../../middlewares/auth.middleware');
const {
  requireActiveSubscription,
  checkUsageLimit,
} = require('../../middlewares/paywall.middleware');

router.post(
  '/chat',
  protect,
  requireActiveSubscription,
  checkUsageLimit('chat'),
  chat
);

module.exports = router;
