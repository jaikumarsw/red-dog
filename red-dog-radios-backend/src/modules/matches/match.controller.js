const asyncHandler = require('../../utils/asyncHandler');
const { success, created, paginate } = require('../../utils/apiResponse');
const matchService = require('./match.service');
const { resolveAgencyOrganizationId } = require('../../utils/resolveAgencyOrg');
const { AppError } = require('../../middlewares/error.middleware');
const { DEFAULT_MIN_RELEVANCE_SCORE } = require('../../utils/agencyProfileTags');
const logger = require('../../utils/logger');

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

  const relevantOnly =
    req.query.relevantOnly === undefined ? true : req.query.relevantOnly !== 'false';
  const minScore =
    req.query.minScore !== undefined ? req.query.minScore : DEFAULT_MIN_RELEVANCE_SCORE;

  const result = await matchService.getAll({
    ...req.query,
    organizationId,
    relevantOnly,
    minScore,
  });
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

  setImmediate(() => {
    matchService
      .computeAllForOrganization(organizationId)
      .then((stats) => {
        logger.info(`[Matches] Background compute-all finished for org ${organizationId}`, stats);
      })
      .catch((err) => {
        logger.warn('[Matches] Background compute-all failed:', err?.message || err);
      });
  });

  return success(
    res,
    { recomputing: true, organizationId },
    'Match recomputation started. Results will update shortly.'
  );
});

const approve = asyncHandler(async () => {
  throw new AppError('Match approval is handled by Red Dog staff in the admin portal.', 403);
});

const reject = asyncHandler(async () => {
  throw new AppError('Match rejection is handled by Red Dog staff in the admin portal.', 403);
});

module.exports = { getAll, getOne, create, computeAndSave, computeAll, approve, reject };
