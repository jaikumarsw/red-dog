'use strict';

const express = require('express');
const { protect } = require('../../middlewares/auth.middleware');
const ctrl = require('./nylas.controller');

const router = express.Router();

// Agency self-serve
router.get('/oauth/connect-self', protect, ctrl.oauthConnectSelf);
router.get('/oauth/status-self', protect, ctrl.oauthStatusSelf);
router.delete('/oauth/disconnect-self', protect, ctrl.oauthDisconnectSelf);

// Nylas redirect target (no auth — Nylas sends user here)
router.get('/oauth/callback', ctrl.oauthCallback);

// Admin / org-scoped
router.get('/oauth/connect', protect, ctrl.oauthConnect);
router.get('/oauth/status/:organizationId', protect, ctrl.oauthStatus);
router.delete('/oauth/disconnect/:organizationId', protect, ctrl.oauthDisconnect);

module.exports = router;
