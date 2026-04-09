const asyncHandler = require('../../utils/asyncHandler');
const { success } = require('../../utils/apiResponse');
const dashboardService = require('./dashboard.service');

const getStats = asyncHandler(async (req, res) => {
  const data = await dashboardService.getStats();
  return success(res, data, 'Dashboard stats fetched');
});

module.exports = { getStats };
