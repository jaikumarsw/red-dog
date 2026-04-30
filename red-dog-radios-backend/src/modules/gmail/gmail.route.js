'use strict';

const express = require('express');
const { protect } = require('../../middlewares/auth.middleware');
const ctrl = require('./gmail.controller');

const router = express.Router();

// Agency self-serve OAuth (no organizationId query — resolved from authenticated user)
router.get('/oauth/connect-self', protect, ctrl.oauthConnectSelf);
router.get('/oauth/status-self', protect, ctrl.oauthStatusSelf);
router.delete('/oauth/disconnect-self', protect, ctrl.oauthDisconnectSelf);

// OAuth connect (admin)
router.get('/oauth/connect', protect, ctrl.oauthConnect);

// OAuth callback (Google redirect)
router.get('/oauth/callback', ctrl.oauthCallback);

// Status (agency/admin; controller enforces org access)
router.get('/oauth/status/:organizationId', protect, ctrl.oauthStatus);

// Disconnect (agency/admin; controller enforces org access)
router.delete('/oauth/disconnect/:organizationId', protect, ctrl.oauthDisconnect);

module.exports = router;

