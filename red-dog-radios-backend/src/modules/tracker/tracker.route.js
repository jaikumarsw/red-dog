const express = require('express');
const { getTracker, getTrackerStats } = require('./tracker.controller');
const { protect } = require('../../middlewares/auth.middleware');

const router = express.Router();

router.get('/stats', protect, getTrackerStats);
router.get('/', protect, getTracker);

module.exports = router;
