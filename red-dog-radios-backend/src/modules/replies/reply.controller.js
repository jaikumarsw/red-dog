'use strict';

const asyncHandler = require('../../utils/asyncHandler');
const { success, paginate } = require('../../utils/apiResponse');
const replyService = require('./reply.service');

const adminGetAll = asyncHandler(async (req, res) => {
  const result = await replyService.getAllAdmin(req.query);
  return paginate(res, result.docs, result, 'Replies retrieved');
});

const adminGetOne = asyncHandler(async (req, res) => {
  const r = await replyService.getOneAdmin(req.params.id);
  return success(res, r, 'Reply retrieved');
});

const adminMarkRead = asyncHandler(async (req, res) => {
  const r = await replyService.markReadAdmin(req.params.id);
  return success(res, r, 'Marked read');
});

const myReplies = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, outboxId, isRead } = req.query;
  const result = await replyService.getMy({ page, limit, userId: req.user._id, outboxId, isRead });
  return paginate(res, result.docs, result, 'My replies retrieved');
});

const myUnreadCount = asyncHandler(async (req, res) => {
  const count = await replyService.countUnreadForUser(req.user._id);
  return success(res, { unread: count }, 'Unread count retrieved');
});

const myMarkRead = asyncHandler(async (req, res) => {
  const r = await replyService.markReadForUser({ id: req.params.id, userId: req.user._id });
  return success(res, r, 'Marked read');
});

const myCountByOutbox = asyncHandler(async (req, res) => {
  const raw = String(req.query.outboxIds || '').trim();
  const outboxIds = raw ? raw.split(',').map((s) => s.trim()).filter(Boolean) : [];
  const map = await replyService.countByOutboxForUser({ userId: req.user._id, outboxIds });
  return success(res, map, 'Counts retrieved');
});

const myThreadByOutbox = asyncHandler(async (req, res) => {
  const rows = await replyService.getThreadByOutboxForUser({ userId: req.user._id, outboxId: req.params.outboxId });
  return success(res, rows, 'Thread retrieved');
});

module.exports = {
  adminGetAll,
  adminGetOne,
  adminMarkRead,
  myReplies,
  myUnreadCount,
  myMarkRead,
  myCountByOutbox,
  myThreadByOutbox,
};

