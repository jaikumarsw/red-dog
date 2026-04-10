const express = require('express');
const { getAll, getOne, create, update, updateStatus, submit, remove, regenerate, alignToFunder, exportApplication } = require('./application.controller');
const { protect } = require('../../middlewares/auth.middleware');

const router = express.Router();

router.route('/').get(protect, getAll).post(protect, create);
router.route('/:id').get(protect, getOne).put(protect, update).delete(protect, remove);
router.put('/:id/submit', protect, submit);
router.put('/:id/status', protect, updateStatus);
router.post('/:id/regenerate', protect, regenerate);
router.post('/:id/align', protect, alignToFunder);
router.get('/:id/export', protect, exportApplication);

module.exports = router;
