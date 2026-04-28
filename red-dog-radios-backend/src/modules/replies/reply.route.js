'use strict';

const express = require('express');
const { protect, restrictTo } = require('../../middlewares/auth.middleware');
const {
  adminGetAll,
  adminGetOne,
  adminMarkRead,
  myReplies,
  myUnreadCount,
  myMarkRead,
  myCountByOutbox,
  myThreadByOutbox,
} = require('./reply.controller');

const router = express.Router();

// Admin inbox
router.get('/', protect, restrictTo('admin'), adminGetAll);
router.get('/:id', protect, restrictTo('admin'), adminGetOne);
router.patch('/:id/read', protect, restrictTo('admin'), adminMarkRead);

// Agency user inbox
router.get('/count-by-outbox', protect, myCountByOutbox);
router.get('/by-outbox/:outboxId', protect, myThreadByOutbox);
router.get('/my', protect, myReplies);
router.get('/my/unread-count', protect, myUnreadCount);
router.patch('/:id/read', protect, myMarkRead);

module.exports = router;