const express = require('express');
const router = express.Router();
const { chat } = require('./ashleen.controller');
const { protect } = require('../../middlewares/auth.middleware');
const { requireActiveSubscription } = require('../../middlewares/paywall.middleware');

router.post('/chat', protect, requireActiveSubscription, chat);

module.exports = router;
