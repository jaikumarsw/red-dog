const express = require('express');
const { complete } = require('./onboarding.controller');
const { protect } = require('../../middlewares/auth.middleware');

const router = express.Router();

router.post('/complete', protect, complete);

module.exports = router;
