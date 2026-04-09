const jwt = require('jsonwebtoken');
const User = require('./user.schema');
const { AppError } = require('../../middlewares/error.middleware');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

const register = async ({ firstName, lastName, email, password }) => {
  const existing = await User.findOne({ email });
  if (existing) throw new AppError('Email already registered', 409);

  const user = await User.create({ firstName, lastName, email, password });
  const token = signToken(user._id);

  const safeUser = user.toObject();
  delete safeUser.password;
  return { user: safeUser, token };
};

const login = async ({ email, password }) => {
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw new AppError('Invalid email or password', 401);
  }
  const token = signToken(user._id);
  const safeUser = user.toObject();
  delete safeUser.password;
  return { user: safeUser, token };
};

const getMe = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new AppError('User not found', 404);
  return user;
};

module.exports = { register, login, getMe };
