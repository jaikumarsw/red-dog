const asyncHandler = require('../../utils/asyncHandler');
const { success } = require('../../utils/apiResponse');
const dashboardService = require('./dashboard.service');
const { resolveAgencyOrganizationId } = require('../../utils/resolveAgencyOrg');
const { AppError } = require('../../middlewares/error.middleware');

const getStats = asyncHandler(async (req, res) => {
  const organizationId = await resolveAgencyOrganizationId(req.user);
  if (!organizationId) throw new AppError('No organization linked to your account', 400);
  const data = await dashboardService.getStats(organizationId);
  return success(res, data, 'Dashboard stats fetched');
});

module.exports = { getStats };
