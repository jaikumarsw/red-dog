const asyncHandler = require('../../utils/asyncHandler');
const { success, created, paginate } = require('../../utils/apiResponse');
const outboxService = require('./outbox.service');
const { resolveAgencyOrganizationId } = require('../../utils/resolveAgencyOrg');
const { AppError } = require('../../middlewares/error.middleware');
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

  return success(res, outbox, 'Grant email history retrieved');
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

const sendOrSchedule = asyncHandler(async (req, res) => {
  const organizationId = await resolveAgencyOrganizationId(req.user);
  if (!organizationId) throw new AppError('No organization linked to your account', 400);

  const {
    subject,
    htmlBody,
    recipient,
    recipientName,
    senderName,
    senderCompany,
    senderLocation,
    senderWebsite,
    relatedGrant,
    emailType,
    sendMode,
    scheduledFor,
  } = req.body;

  if (!subject || !htmlBody || !recipient) {
    throw new AppError('subject, htmlBody, and recipient are required', 400);
  }

  let resolvedScheduledFor = scheduledFor ? new Date(scheduledFor) : new Date();

  if (sendMode === 'draft') {
    // Drafts are pending but scheduled for far future to avoid auto-sending
    resolvedScheduledFor = new Date('2099-12-31');
  }

  const queued = await outboxService.queueEmail({
    recipient,
    recipientName,
    subject,
    htmlBody,
    emailType: emailType || 'outreach',
    senderName,
    senderCompany,
    senderLocation,
    senderWebsite,
    relatedOrganization: organizationId,
    relatedAgency: organizationId,
    relatedUser: req.user._id,
    relatedGrant,
    scheduledFor: resolvedScheduledFor,
  });

  if (sendMode === 'now') {
    await outboxService.sendEmail(queued._id);
    // Reload to get updated status/sentAt
    const updated = await outboxService.getOne(queued._id);
    return success(res, updated, 'Email sent successfully');
  }

  return created(
    res,
    queued,
    sendMode === 'scheduled' ? 'Email scheduled' : 'Draft saved'
  );
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
  sendOrSchedule,
  retryFailed,
};
