const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('./error.middleware');
const User = require('../modules/auth/user.schema');

const protect = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError('No token provided', 401);
  }

  const token = authHeader.split(' ')[1];
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  const user = await User.findById(decoded.id).select('-password');
  if (!user) throw new AppError('User no longer exists', 401);

  req.user = user;
  next();
});

const restrictTo = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    throw new AppError('Access denied', 403);
  }
  next();
};

/** Agency members only (public safety app). Admins must use /api/admin. */
const requireAgency = (req, res, next) => {
  if (!req.user || req.user.role !== 'agency') {
    throw new AppError('This action is only available to agency accounts.', 403);
  }
  next();
};

module.exports = { protect, restrictTo, requireAgency };
