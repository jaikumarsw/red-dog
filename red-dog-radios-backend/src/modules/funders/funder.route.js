const express = require('express');
const { getAll, getOne, create, update, deactivate, saveFunder } = require('./funder.controller');
const { protect } = require('../../middlewares/auth.middleware');

const router = express.Router();

router.route('/').get(protect, getAll).post(protect, create);
router.route('/:id').get(protect, getOne).put(protect, update).delete(protect, deactivate);
router.post('/:id/save', protect, saveFunder);

module.exports = router;
