'use strict';

const express = require('express');
const { protect, restrictTo } = require('../../middlewares/auth.middleware');
const {
  oauthConnect,
  oauthCallback,
  oauthStatus,
  oauthDisconnect,
  replyWebhook,
  gmailPushWebhook,
} = require('./gmail.controller');

const router = express.Router();

// OAuth connect (admin only)
router.get('/oauth/connect', protect, restrictTo('admin'), oauthConnect);

// OAuth callback (Google redirect)
router.get('/oauth/callback', oauthCallback);

// Status (admin only)
router.get('/oauth/status/:organizationId', protect, restrictTo('admin'), oauthStatus);

// Disconnect (admin only)
router.delete('/oauth/disconnect/:organizationId', protect, restrictTo('admin'), oauthDisconnect);

// Webhook stub for inbound replies (no auth)
router.post('/webhook/reply', replyWebhook);

// Real Pub/Sub push endpoint (no auth)
router.post('/webhook/push', gmailPushWebhook);

module.exports = router;

