const express = require('express');
const { getAll, getOne, generate, update, markSent } = require('./outreach.controller');
const { protect } = require('../../middlewares/auth.middleware');

const router = express.Router();

router.get('/', protect, getAll);
router.get('/:id', protect, getOne);
router.post('/generate', protect, generate);
router.put('/:id', protect, update);
router.put('/:id/sent', protect, markSent);

module.exports = router;
