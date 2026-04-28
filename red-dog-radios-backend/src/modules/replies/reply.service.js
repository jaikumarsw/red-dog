'use strict';

const Reply = require('./reply.schema');
const { AppError } = require('../../middlewares/error.middleware');
const logger = require('../../utils/logger');

const getAllAdmin = async ({ page = 1, limit = 20, organizationId, outboxId, isRead }) => {
  try {
    const query = {};
    if (organizationId) query.organizationId = organizationId;
    if (outboxId) query.outboxId = outboxId;
    if (isRead !== undefined && isRead !== null && isRead !== '') {
      query.isRead = isRead === 'true' || isRead === true;
    }

    return Reply.paginate(query, {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { receivedAt: -1 },
      populate: [
        { path: 'outboxId', select: 'subject recipient recipientName' },
        { path: 'organizationId', select: 'name' },
        { path: 'userId', select: 'fullName firstName lastName email' },
      ],
    });
  } catch (err) {
    logger.error('[ReplyService] getAllAdmin failed:', err.message);
    throw err;
  }
};

const getOneAdmin = async (id) => {
  const r = await Reply.findById(id)
    .populate('outboxId')
    .populate('organizationId')
    .populate({ path: 'userId', select: 'fullName firstName lastName email' });
  if (!r) throw new AppError('Reply not found', 404);
  return r;
};

const markReadAdmin = async (id) => {
  const r = await Reply.findByIdAndUpdate(id, { isRead: true }, { new: true });
  if (!r) throw new AppError('Reply not found', 404);
  return r;
};

const getMy = async ({ page = 1, limit = 20, userId, outboxId, isRead }) => {
  const query = { userId };
  if (outboxId) query.outboxId = outboxId;
  if (isRead !== undefined && isRead !== null && isRead !== '') {
    query.isRead = isRead === 'true' || isRead === true;
  }
  return Reply.paginate(query, {
    page: parseInt(page),
    limit: parseInt(limit),
    sort: { receivedAt: -1 },
    populate: [{ path: 'outboxId', select: 'subject recipient recipientName htmlBody sentAt replyTo sentViaGmail' }],
  });
};

const countUnreadForUser = async (userId) => {
  return Reply.countDocuments({ userId, isRead: false });
};

const markReadForUser = async ({ id, userId }) => {
  const r = await Reply.findOneAndUpdate({ _id: id, userId }, { isRead: true }, { new: true });
  if (!r) throw new AppError('Reply not found', 404);
  return r;
};

const countByOutboxForUser = async ({ userId, outboxIds }) => {
  const ids = (outboxIds || []).filter(Boolean);
  if (ids.length === 0) return {};
  const rows = await Reply.aggregate([
    { $match: { userId: userId, outboxId: { $in: ids } } },
    { $group: { _id: '$outboxId', count: { $sum: 1 } } },
  ]);
  const map = {};
  for (const r of rows) {
    map[String(r._id)] = r.count;
  }
  for (const id of ids) {
    const k = String(id);
    if (map[k] == null) map[k] = 0;
  }
  return map;
};

const getThreadByOutboxForUser = async ({ userId, outboxId }) => {
  const query = { userId, outboxId };
  const rows = await Reply.find(query)
    .sort({ receivedAt: 1 })
    .select('from subject body htmlBody receivedAt isRead gmailMessageId outboxId')
    .lean();
  return rows;
};

module.exports = {
  getAllAdmin,
  getOneAdmin,
  markReadAdmin,
  markReadForUser,
  getMy,
  countUnreadForUser,
  countByOutboxForUser,
  getThreadByOutboxForUser,
};

