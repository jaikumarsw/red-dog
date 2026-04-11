const asyncHandler = require('../../utils/asyncHandler');
const { success, created, paginate } = require('../../utils/apiResponse');
const outboxService = require('./outbox.service');
const { resolveAgencyOrganizationId } = require('../../utils/resolveAgencyOrg');
const { AppError } = require('../../middlewares/error.middleware');

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

module.exports = { getAll, getOne, queueEmail, sendEmail, retryFailed };
