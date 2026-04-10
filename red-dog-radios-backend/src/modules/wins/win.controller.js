const asyncHandler = require('../../utils/asyncHandler');
const { success, paginate } = require('../../utils/apiResponse');
const winService = require('./win.service');

const getAll = asyncHandler(async (req, res) => {
  const { page, limit, agencyType, fundingType, projectType } = req.query;
  const result = await winService.getAll({ page, limit, agencyType, fundingType, projectType });
  return paginate(res, result.docs, result.totalDocs, result.page, result.totalPages, 'Win database retrieved');
});

const getInsights = asyncHandler(async (req, res) => {
  const insights = await winService.getInsights();
  return success(res, insights, 'Win insights retrieved');
});

module.exports = { getAll, getInsights };
