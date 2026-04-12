const asyncHandler = require('../../utils/asyncHandler');
const { success, created } = require('../../utils/apiResponse');
const authService = require('./auth.service');
const { AppError } = require('../../middlewares/error.middleware');

const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);
  return created(res, result, 'Account created successfully');
});

const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);
  return success(res, result, 'Login successful');
});

const getMe = asyncHandler(async (req, res) => {
  const user = await authService.getMe(req.user._id);
  return success(res, user);
});

const forgotPassword = asyncHandler(async (req, res) => {
  const result = await authService.forgotPassword(req.body);
  return success(res, result, result.message);
});

const verifyOtp = asyncHandler(async (req, res) => {
  const result = await authService.verifyOtp(req.body);
  return success(res, result, 'Code verified');
});

const resetPassword = asyncHandler(async (req, res) => {
  const result = await authService.resetPassword(req.body);
  return success(res, result, 'Password updated');
});

module.exports = { register, login, getMe, forgotPassword, verifyOtp, resetPassword };
