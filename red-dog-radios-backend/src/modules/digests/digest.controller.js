const asyncHandler = require('../../utils/asyncHandler');
const { success, created, paginate } = require('../../utils/apiResponse');
const digestService = require('./digest.service');
const { resolveAgencyOrganizationId } = require('../../utils/resolveAgencyOrg');
const { AppError } = require('../../middlewares/error.middleware');

const getAll = asyncHandler(async (req, res) => {
  const organizationId = await resolveAgencyOrganizationId(req.user);
  if (!organizationId) throw new AppError('No organization linked to your account', 400);
  const result = await digestService.getAll({ ...req.query, organizationId });
  return paginate(res, result.docs, result, 'Digests retrieved');
});

const getOne = asyncHandler(async (req, res) => {
  const organizationId = await resolveAgencyOrganizationId(req.user);
  const digest = await digestService.getOne(req.params.id);
  if (!organizationId || String(digest.organization?._id || digest.organization) !== String(organizationId)) {
    throw new AppError('Digest not found', 404);
  }
  return success(res, digest);
});

const generate = asyncHandler(async (req, res) => {
  const organizationId = await resolveAgencyOrganizationId(req.user);
  if (!organizationId) throw new AppError('No organization linked to your account', 400);
  const { weekStart, weekEnd } = req.body;
  const digest = await digestService.generateDigest(
    organizationId,
    req.user._id,
    weekStart ? new Date(weekStart) : new Date(),
    weekEnd ? new Date(weekEnd) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  );
  return created(res, digest, 'Digest generated');
});

const preview = asyncHandler(async (req, res) => {
  const organizationId = await resolveAgencyOrganizationId(req.user);
  if (!organizationId) throw new AppError('No organization linked to your account', 400);
  const { weekStart, weekEnd } = req.body;
  const result = await digestService.generateDigest(
    organizationId,
    req.user._id,
    weekStart ? new Date(weekStart) : new Date(),
    weekEnd ? new Date(weekEnd) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    false
  );
  return success(res, result, 'Digest preview generated');
});

const send = asyncHandler(async (req, res) => {
  const organizationId = await resolveAgencyOrganizationId(req.user);
  const digest = await digestService.getOne(req.params.id);
  if (!organizationId || String(digest.organization?._id || digest.organization) !== String(organizationId)) {
    throw new AppError('Digest not found', 404);
  }
  const { recipientEmail, recipientName } = req.body;
  const sent = await digestService.sendDigest(req.params.id, recipientEmail, recipientName);
  return success(res, sent, 'Digest sent');
});

module.exports = { getAll, getOne, generate, preview, send };
