const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('./error.middleware');
const User = require('../modules/auth/user.schema');

const STAFF_ONLY_MSG = 'This area is restricted to Red Dog Radio staff only.';

const protectAdmin = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError('No token provided', 401);
  }

  const token = authHeader.split(' ')[1];
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  const user = await User.findById(decoded.id).select('-password');
  if (!user) throw new AppError('User no longer exists', 401);

  if (user.role !== 'admin') {
    throw new AppError(STAFF_ONLY_MSG, 403);
  }

  req.user = user;
  next();
});

module.exports = { protectAdmin, STAFF_ONLY_MSG };
