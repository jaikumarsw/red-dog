const express = require('express');
const { getAll, markSent, skip } = require('./followup.controller');
const { protect } = require('../../middlewares/auth.middleware');

const router = express.Router();

router.get('/', protect, getAll);
router.put('/:id/send', protect, markSent);
router.put('/:id/skip', protect, skip);

module.exports = router;
