'use strict';

const express = require('express');
const { protect } = require('../../middlewares/auth.middleware');
const {
  oauthConnect,
  oauthCallback,
  oauthStatus,
  oauthDisconnect,
} = require('./gmail.controller');

const router = express.Router();

// OAuth connect (agency/admin; controller enforces org access)
router.get('/oauth/connect', protect, oauthConnect);

// OAuth callback (Google redirect)
router.get('/oauth/callback', oauthCallback);

// Status (agency/admin; controller enforces org access)
router.get('/oauth/status/:organizationId', protect, oauthStatus);

// Disconnect (agency/admin; controller enforces org access)
router.delete('/oauth/disconnect/:organizationId', protect, oauthDisconnect);

module.exports = router;

