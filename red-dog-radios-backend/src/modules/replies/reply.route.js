const express = require('express');
const router = express.Router();
const { protect } = require('../../middlewares/auth.middleware');
const { restrictTo } = require('../../middlewares/auth.middleware');
const ctrl = require('./reply.controller');

// All admin-only — agency does NOT have an inbox in our app, 
// they read replies in their own Gmail
router.get('/', protect, restrictTo('admin'), ctrl.adminListReplies);
router.get('/communications', protect, restrictTo('admin'), ctrl.adminCommunications);
router.post('/poll-now', protect, restrictTo('admin'), ctrl.triggerPoll);
router.get('/by-outbox/:outboxId', protect, restrictTo('admin'), ctrl.adminRepliesByOutbox);
router.get('/:id', protect, restrictTo('admin'), ctrl.adminGetReply);

module.exports = router;
