const express = require('express');
const router = express.Router();
const { protect } = require('../../middlewares/auth.middleware');
const { restrictTo } = require('../../middlewares/auth.middleware');
const ctrl = require('./reply.controller');

// Agency routes — agencies can see replies to their own outreach
router.get('/agency/replies', protect, ctrl.agencyReplies);
router.get('/agency/replies/:id', protect, ctrl.agencyReplyDetail);
router.post('/agency/replies/:id/viewed', protect, ctrl.markAgencyViewed);
router.post('/agency/send-reply', protect, ctrl.sendAgencyReply);

// All admin-only — agency does NOT have an inbox in our app, 
router.get('/', protect, restrictTo('admin'), ctrl.adminListReplies);
router.get('/communications', protect, restrictTo('admin'), ctrl.adminCommunications);
router.post('/poll-now', protect, restrictTo('admin'), ctrl.triggerPoll);
router.get('/by-outbox/:outboxId', protect, restrictTo('admin'), ctrl.adminRepliesByOutbox);
router.get('/:id', protect, restrictTo('admin'), ctrl.adminGetReply);

module.exports = router;
