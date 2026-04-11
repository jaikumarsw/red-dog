const express = require('express');
const { getOne, saveFunder } = require('./funder.controller');
const { protect } = require('../../middlewares/auth.middleware');

const router = express.Router();

router.post('/:id/save', protect, saveFunder);
router.get('/:id', protect, getOne);

module.exports = router;
