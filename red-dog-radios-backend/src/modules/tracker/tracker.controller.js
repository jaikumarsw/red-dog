const asyncHandler = require('../../utils/asyncHandler');
const { success, paginate } = require('../../utils/apiResponse');
const trackerService = require('./tracker.service');
const Organization = require('../organizations/organization.schema');

const getTracker = asyncHandler(async (req, res) => {
  const { page, limit, status } = req.query;
  const org = await Organization.findOne({ createdBy: req.user._id });
  const result = await trackerService.getTracker({ page, limit, status, organizationId: org?._id });
  return paginate(res, result.docs, result.totalDocs, result.page, result.totalPages, 'Tracker data retrieved');
});

const getTrackerStats = asyncHandler(async (req, res) => {
  const org = await Organization.findOne({ createdBy: req.user._id });
  const stats = await trackerService.getTrackerStats(org?._id);
  return success(res, stats, 'Tracker stats retrieved');
});

module.exports = { getTracker, getTrackerStats };
