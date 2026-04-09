const asyncHandler = require('../../utils/asyncHandler');
const { success, noContent } = require('../../utils/apiResponse');
const settingsService = require('./settings.service');

const getSettings = asyncHandler(async (req, res) => {
  const data = await settingsService.getSettings(req.user._id);
  return success(res, data, 'Settings fetched');
});

const updateSettings = asyncHandler(async (req, res) => {
  const data = await settingsService.updateSettings(req.user._id, req.body);
  return success(res, data, 'Settings updated');
});

const deleteAccount = asyncHandler(async (req, res) => {
  await settingsService.deleteAccount(req.user._id);
  return success(res, { deleted: true }, 'Account deleted');
});

module.exports = { getSettings, updateSettings, deleteAccount };
