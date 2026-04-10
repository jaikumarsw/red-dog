const express = require('express');
const router = express.Router();
const { chat } = require('./ashleen.controller');
const { protect } = require('../../middlewares/auth.middleware');

router.post('/chat', protect, chat);

module.exports = router;
