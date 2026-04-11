const asyncHandler = require('../../utils/asyncHandler');
const { success, paginate } = require('../../utils/apiResponse');
const outreachService = require('./outreach.service');
const { resolveAgencyOrganizationId } = require('../../utils/resolveAgencyOrg');
const { AppError } = require('../../middlewares/error.middleware');

const getAll = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const organizationId = await resolveAgencyOrganizationId(req.user);
  const result = await outreachService.getAll({
    page,
    limit,
    userId: req.user._id,
    organizationId,
  });
  return paginate(res, result.docs, result, 'Outreach emails retrieved');
});

const getOne = asyncHandler(async (req, res) => {
  const organizationId = await resolveAgencyOrganizationId(req.user);
  const record = await outreachService.getOne(req.params.id);
  if (!organizationId || String(record.organization) !== String(organizationId)) {
    throw new AppError('Outreach record not found', 404);
  }
  return success(res, record, 'Outreach email retrieved');
});

const generate = asyncHandler(async (req, res) => {
  const organizationId = await resolveAgencyOrganizationId(req.user);
  if (!organizationId) throw new AppError('No organization linked to your account', 400);
  const { funderId, opportunityId } = req.body;
  const org = organizationId;
  let record;
  if (funderId) {
    record = await outreachService.generateFromFunder(funderId, org, req.user._id);
  } else if (opportunityId) {
    record = await outreachService.generateFromOpportunity(opportunityId, org, req.user._id);
  } else {
    return res.status(400).json({ success: false, message: 'funderId or opportunityId is required' });
  }
  return success(res, record, 'Outreach email generated', 201);
});

const update = asyncHandler(async (req, res) => {
  const organizationId = await resolveAgencyOrganizationId(req.user);
  const existing = await outreachService.getOne(req.params.id);
  if (!organizationId || String(existing.organization) !== String(organizationId)) {
    throw new AppError('Outreach record not found', 404);
  }
  const record = await outreachService.update(req.params.id, req.body);
  return success(res, record, 'Outreach email updated');
});

const markSent = asyncHandler(async (req, res) => {
  const organizationId = await resolveAgencyOrganizationId(req.user);
  const existing = await outreachService.getOne(req.params.id);
  if (!organizationId || String(existing.organization) !== String(organizationId)) {
    throw new AppError('Outreach record not found', 404);
  }
  const record = await outreachService.markSent(req.params.id);
  return success(res, record, 'Outreach email marked as sent');
});

module.exports = { getAll, getOne, generate, update, markSent };
