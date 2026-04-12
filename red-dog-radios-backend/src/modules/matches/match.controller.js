const asyncHandler = require('../../utils/asyncHandler');
const { success, created, paginate } = require('../../utils/apiResponse');
const matchService = require('./match.service');
const { resolveAgencyOrganizationId } = require('../../utils/resolveAgencyOrg');
const { AppError } = require('../../middlewares/error.middleware');

const assertMatchInOrg = async (matchId, organizationId) => {
  const match = await matchService.getOne(matchId);
  if (!organizationId || String(match.organization?._id || match.organization) !== String(organizationId)) {
    throw new AppError('Match not found', 404);
  }
  return match;
};

const getAll = asyncHandler(async (req, res) => {
  const organizationId = await resolveAgencyOrganizationId(req.user);
  if (!organizationId) throw new AppError('No organization linked to your account', 400);
  const result = await matchService.getAll({ ...req.query, organizationId });
  return paginate(res, result.docs, result, 'Matches retrieved');
});

const getOne = asyncHandler(async (req, res) => {
  const organizationId = await resolveAgencyOrganizationId(req.user);
  await assertMatchInOrg(req.params.id, organizationId);
  const match = await matchService.getOne(req.params.id);
  return success(res, match);
});

const create = asyncHandler(async (req, res) => {
  const organizationId = await resolveAgencyOrganizationId(req.user);
  if (!organizationId) throw new AppError('No organization linked to your account', 400);
  const match = await matchService.create({ ...req.body, organization: organizationId });
  return created(res, match, 'Match created');
});

const computeAndSave = asyncHandler(async (req, res) => {
  const organizationId = await resolveAgencyOrganizationId(req.user);
  if (!organizationId) throw new AppError('No organization linked to your account', 400);
  const { opportunityId } = req.body;
  const match = await matchService.computeAndSave(opportunityId, organizationId);
  return success(res, match, 'Match computed and saved');
});

const computeAll = asyncHandler(async (req, res) => {
  const organizationId = await resolveAgencyOrganizationId(req.user);
  if (!organizationId) throw new AppError('No organization linked to your account', 400);
  const result = await matchService.computeAllForOrganization(organizationId);
  return success(res, result, `Computed matches for all opportunities. Processed: ${result.processed}, Errors: ${result.errors}`);
});

const approve = asyncHandler(async () => {
  throw new AppError('Match approval is handled by Red Dog staff in the admin portal.', 403);
});

const reject = asyncHandler(async () => {
  throw new AppError('Match rejection is handled by Red Dog staff in the admin portal.', 403);
});

module.exports = { getAll, getOne, create, computeAndSave, computeAll, approve, reject };
