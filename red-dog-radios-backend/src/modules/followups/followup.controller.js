const asyncHandler = require('../../utils/asyncHandler');
const { success, paginate } = require('../../utils/apiResponse');
const followupService = require('./followup.service');

const getAll = asyncHandler(async (req, res) => {
  const { page, limit, status, dueToday } = req.query;
  const result = await followupService.getAll({ page, limit, userId: req.user._id, status, dueToday });
  return paginate(res, result.docs, result, 'Follow-ups retrieved');
});

const markSent = asyncHandler(async (req, res) => {
  const fu = await followupService.markSent(req.params.id);
  return success(res, fu, 'Follow-up marked as sent');
});

const skip = asyncHandler(async (req, res) => {
  const fu = await followupService.skip(req.params.id);
  return success(res, fu, 'Follow-up skipped');
});

module.exports = { getAll, markSent, skip };
