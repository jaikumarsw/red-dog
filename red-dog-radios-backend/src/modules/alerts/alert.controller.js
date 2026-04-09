const asyncHandler = require('../../utils/asyncHandler');
const { success, paginate } = require('../../utils/apiResponse');
const alertService = require('./alert.service');

const getAll = asyncHandler(async (req, res) => {
  const result = await alertService.getAll({ ...req.query, userId: req.user._id });
  return paginate(res, result.docs, result, 'Alerts retrieved');
});

const markRead = asyncHandler(async (req, res) => {
  const alert = await alertService.markRead(req.params.id);
  return success(res, alert, 'Alert marked as read');
});

const markAllRead = asyncHandler(async (req, res) => {
  await alertService.markAllRead(req.user._id);
  return success(res, null, 'All alerts marked as read');
});

const remove = asyncHandler(async (req, res) => {
  await alertService.remove(req.params.id);
  return success(res, null, 'Alert deleted');
});

const generateDeadlineAlerts = asyncHandler(async (req, res) => {
  const { daysAhead = 30, minFitScore = 75 } = req.body;
  const count = await alertService.createDeadlineAlerts(daysAhead, minFitScore);
  return success(res, { count }, `Generated ${count} deadline alert(s)`);
});

const generateHighFitAlerts = asyncHandler(async (req, res) => {
  const { minFitScore = 75 } = req.body;
  const count = await alertService.createHighFitAlerts(minFitScore);
  return success(res, { count }, `Generated ${count} high-fit alert(s)`);
});

module.exports = { getAll, markRead, markAllRead, remove, generateDeadlineAlerts, generateHighFitAlerts };
