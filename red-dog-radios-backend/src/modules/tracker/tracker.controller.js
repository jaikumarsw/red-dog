const asyncHandler = require('../../utils/asyncHandler');
const { success, paginate } = require('../../utils/apiResponse');
const trackerService = require('./tracker.service');
const { resolveAgencyOrganizationId } = require('../../utils/resolveAgencyOrg');
const { AppError } = require('../../middlewares/error.middleware');

const getTracker = asyncHandler(async (req, res) => {
  const organizationId = await resolveAgencyOrganizationId(req.user);
  if (!organizationId) throw new AppError('No organization linked to your account', 400);
  const { page, limit, status } = req.query;
  const result = await trackerService.getTracker({ page, limit, status, organizationId });
  return paginate(res, result.docs, result, 'Tracker data retrieved');
});

const getTrackerStats = asyncHandler(async (req, res) => {
  const organizationId = await resolveAgencyOrganizationId(req.user);
  if (!organizationId) throw new AppError('No organization linked to your account', 400);
  const stats = await trackerService.getTrackerStats(organizationId);
  return success(res, stats, 'Tracker stats retrieved');
});

module.exports = { getTracker, getTrackerStats };
