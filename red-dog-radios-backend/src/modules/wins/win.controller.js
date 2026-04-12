const asyncHandler = require('../../utils/asyncHandler');
const { success, paginate } = require('../../utils/apiResponse');
const winService = require('./win.service');
const { resolveAgencyOrganizationId } = require('../../utils/resolveAgencyOrg');
const { AppError } = require('../../middlewares/error.middleware');
const { parsePagination } = require('../../utils/parsePagination');

const getAll = asyncHandler(async (req, res) => {
  const organizationId = await resolveAgencyOrganizationId(req.user);
  if (!organizationId) throw new AppError('No organization linked to your account', 400);
  const { agencyType, fundingType, projectType } = req.query;
  const { page, limit } = parsePagination(req.query);
  const result = await winService.getAll({
    page,
    limit,
    agencyType,
    fundingType,
    projectType,
    organizationId,
  });
  return paginate(res, result.docs, result, 'Win database retrieved');
});

const getInsights = asyncHandler(async (req, res) => {
  const organizationId = await resolveAgencyOrganizationId(req.user);
  if (!organizationId) throw new AppError('No organization linked to your account', 400);
  const insights = await winService.getInsights(organizationId);
  return success(res, insights, 'Win insights retrieved');
});

const getPatterns = asyncHandler(async (req, res) => {
  const organizationId = await resolveAgencyOrganizationId(req.user);
  if (!organizationId) throw new AppError('No organization linked to your account', 400);
  const patterns = await winService.getPatterns();
  return success(res, patterns, 'Win patterns retrieved');
});

module.exports = { getAll, getInsights, getPatterns };
