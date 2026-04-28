const asyncHandler = require('../../utils/asyncHandler');
const { success, created, paginate } = require('../../utils/apiResponse');
const outboxService = require('./outbox.service');
const { resolveAgencyOrganizationId } = require('../../utils/resolveAgencyOrg');
const { AppError } = require('../../middlewares/error.middleware');
const Reply = require('../replies/reply.schema');
const Outbox = require('./outbox.schema');

const getAll = asyncHandler(async (req, res) => {
  const organizationId = await resolveAgencyOrganizationId(req.user);
  if (!organizationId) throw new AppError('No organization linked to your account', 400);
  const result = await outboxService.getAll({ ...req.query, relatedOrganization: organizationId });
  return paginate(res, result.docs, result, 'Outbox records retrieved');
});

const getOne = asyncHandler(async (req, res) => {
  const organizationId = await resolveAgencyOrganizationId(req.user);
  const record = await outboxService.getOne(req.params.id);
  if (!organizationId || String(record.relatedOrganization) !== String(organizationId)) {
    throw new AppError('Outbox record not found', 404);
  }
  return success(res, record);
});

const getGrantHistory = asyncHandler(async (req, res) => {
  const organizationId = await resolveAgencyOrganizationId(req.user);
  if (!organizationId) throw new AppError('No organization linked to your account', 400);

  const grantId = req.params.grantId;
  const outbox = await Outbox.find({
    relatedOrganization: organizationId,
    relatedGrant: grantId,
  })
    .sort({ sentAt: -1, createdAt: -1 })
    .populate({ path: 'relatedUser', select: 'fullName firstName lastName email' })
    .lean();

  const outboxIds = outbox.map((o) => o._id);
  const replyAgg = await Reply.aggregate([
    { $match: { userId: req.user._id, outboxId: { $in: outboxIds } } },
    {
      $group: {
        _id: '$outboxId',
        count: { $sum: 1 },
        unread: { $sum: { $cond: [{ $eq: ['$isRead', false] }, 1, 0] } },
      },
    },
  ]);
  const map = {};
  for (const r of replyAgg) {
    map[String(r._id)] = { replyCount: r.count, hasUnread: r.unread > 0 };
  }

  const result = outbox.map((o) => {
    const stats = map[String(o._id)] || { replyCount: 0, hasUnread: false };
    return { ...o, ...stats };
  });

  return success(res, result, 'Grant email history retrieved');
});

// ── Admin endpoints ─────────────────────────────────────────────────────────

const adminGetAll = asyncHandler(async (req, res) => {
  const result = await outboxService.getAllAdmin(req.query);
  return paginate(res, result.docs, result, 'Outbox records retrieved');
});

const adminGetOne = asyncHandler(async (req, res) => {
  const record = await outboxService.getOneAdmin(req.params.id);
  return success(res, record, 'Outbox record retrieved');
});

const adminRetryNow = asyncHandler(async (req, res) => {
  const record = await outboxService.retryNowAdmin(req.params.id);
  return success(res, record, 'Email retried');
});

const adminDeleteOne = asyncHandler(async (req, res) => {
  const record = await outboxService.deleteOneAdmin(req.params.id);
  return success(res, record, 'Outbox record deleted');
});

const queueEmail = asyncHandler(async (req, res) => {
  const record = await outboxService.queueEmail(req.body);
  return created(res, record, 'Email queued');
});

const sendEmail = asyncHandler(async (req, res) => {
  const result = await outboxService.sendEmail(req.params.id);
  return success(res, result, result.success ? 'Email sent' : 'Email failed');
});

const retryFailed = asyncHandler(async (req, res) => {
  const record = await outboxService.retryFailed(req.params.id);
  return success(res, record, 'Email queued for retry');
});

module.exports = {
  getAll,
  getOne,
  getGrantHistory,
  adminGetAll,
  adminGetOne,
  adminRetryNow,
  adminDeleteOne,
  queueEmail,
  sendEmail,
  retryFailed,
};
