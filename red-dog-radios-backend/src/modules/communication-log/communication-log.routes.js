const express = require('express');
const router = express.Router();
const ctrl = require('./communication-log.controller');
const { protect, restrictTo } = require('../../middlewares/auth.middleware');

// Admin: full CRUD (for now: create, list, delete)
router.post('/', protect, restrictTo('admin'), ctrl.create);
router.get('/admin/application/:applicationId', protect, restrictTo('admin'), ctrl.listAdmin);
router.get('/admin/all', protect, restrictTo('admin'), ctrl.listAllAdmin);
router.delete('/:id', protect, restrictTo('admin'), ctrl.remove);

// Agency: read-only for their own applications (visibleToAgency=true entries only)
router.get('/agency/application/:applicationId', protect, ctrl.listAgency);

module.exports = router;

