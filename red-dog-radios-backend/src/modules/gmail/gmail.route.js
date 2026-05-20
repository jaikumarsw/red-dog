'use strict';

const express = require('express');
const { protect } = require('../../middlewares/auth.middleware');
const { requireActiveSubscription } = require('../../middlewares/paywall.middleware');
const ctrl = require('./gmail.controller');

const router = express.Router();

// Agency self-serve OAuth (no organizationId query — resolved from authenticated user)
// Connecting a mailbox is paywalled so free-plan agencies can't generate
// billable OAuth grants on the client's Google account.
router.get(
  '/oauth/connect-self',
  protect,
  requireActiveSubscription,
  ctrl.oauthConnectSelf
);
router.get('/oauth/status-self', protect, ctrl.oauthStatusSelf);
router.delete('/oauth/disconnect-self', protect, ctrl.oauthDisconnectSelf);

// OAuth callback (Google redirect)
router.get('/oauth/callback', ctrl.oauthCallback);

// Admin-initiated `/oauth/connect` route removed intentionally — see the
// matching note in nylas.route.js. Admins keep status + disconnect access
// but cannot start a Gmail grant on behalf of an agency.

// Status (agency/admin; controller enforces org access)
router.get('/oauth/status/:organizationId', protect, ctrl.oauthStatus);

// Disconnect (agency/admin; controller enforces org access)
router.delete('/oauth/disconnect/:organizationId', protect, ctrl.oauthDisconnect);

module.exports = router;

