'use strict';

const express = require('express');
const { protect } = require('../../middlewares/auth.middleware');
const { requireActiveSubscription } = require('../../middlewares/paywall.middleware');
const ctrl = require('./nylas.controller');

const router = express.Router();

// Agency self-serve.
// `connect-self` is paywalled because every new Nylas grant is billable on
// the client's Nylas account — free-plan agencies must subscribe before they
// can attach a mailbox. `status-self` and `disconnect-self` remain open so
// downgraded users can still see/remove their existing connection.
router.get(
  '/oauth/connect-self',
  protect,
  requireActiveSubscription,
  ctrl.oauthConnectSelf
);
router.get('/oauth/status-self', protect, ctrl.oauthStatusSelf);
router.delete('/oauth/disconnect-self', protect, ctrl.oauthDisconnectSelf);

// Nylas redirect target (no auth — Nylas sends user here)
router.get('/oauth/callback', ctrl.oauthCallback);

// Admin / org-scoped.
// NOTE: the admin-initiated `/oauth/connect` route was removed intentionally.
// Admins can still view connection status and disconnect on behalf of an
// agency, but they cannot start a Nylas grant for someone else — every grant
// is billable and must originate from the agency owner (who has accepted the
// paywall) to keep costs and consent under their control.
router.get('/oauth/status/:organizationId', protect, ctrl.oauthStatus);
router.delete('/oauth/disconnect/:organizationId', protect, ctrl.oauthDisconnect);

module.exports = router;
