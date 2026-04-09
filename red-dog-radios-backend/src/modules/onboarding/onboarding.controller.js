const asyncHandler = require('../../utils/asyncHandler');
const { success } = require('../../utils/apiResponse');
const onboardingService = require('./onboarding.service');

const complete = asyncHandler(async (req, res) => {
  const result = await onboardingService.complete(req.user._id, req.body);
  return success(res, result, 'Onboarding completed successfully');
});

module.exports = { complete };
