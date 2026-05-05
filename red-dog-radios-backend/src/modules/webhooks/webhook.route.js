const express = require('express');
const router = express.Router();
const ctrl = require('./webhook.controller');

// Handle inbound emails
router.post('/inbound-reply', ctrl.handleInboundReply);

module.exports = router;
