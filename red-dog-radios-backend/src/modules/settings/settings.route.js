const express = require('express');
const { getSettings, updateSettings, deleteAccount } = require('./settings.controller');
const { protect } = require('../../middlewares/auth.middleware');

const router = express.Router();

router.get('/', protect, getSettings);
router.put('/', protect, updateSettings);
router.delete('/account', protect, deleteAccount);

module.exports = router;
