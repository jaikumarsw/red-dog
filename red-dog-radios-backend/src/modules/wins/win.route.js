const express = require('express');
const { getAll, getInsights } = require('./win.controller');
const { protect } = require('../../middlewares/auth.middleware');

const router = express.Router();

router.get('/insights', protect, getInsights);
router.get('/', protect, getAll);

module.exports = router;
