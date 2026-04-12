const express = require('express');
const { getAll, getQueue, updateAgencyNotes, getOne, saveFunder } = require('./funder.controller');
const { protect } = require('../../middlewares/auth.middleware');

const router = express.Router();

router.get('/', protect, getAll);
router.get('/:id/queue', protect, getQueue);
router.put('/:id', protect, updateAgencyNotes);
router.post('/:id/save', protect, saveFunder);
router.get('/:id', protect, getOne);

module.exports = router;
