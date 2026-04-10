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

const adminLogin = asyncHandler(async (req, res) => {
  const { adminKey } = req.body;
  const ADMIN_KEY = process.env.ADMIN_KEY || 'RDGADMIN2024';
  if (!adminKey || adminKey !== ADMIN_KEY) throw new AppError('Invalid admin key', 401);
  const result = await authService.loginAsAdmin();
  return success(res, result, 'Admin authenticated');
});

module.exports = { register, login, getMe, adminLogin };
