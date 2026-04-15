const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('./user.schema');
const { AppError } = require('../../middlewares/error.middleware');

const { sendPasswordResetEmail } = require('../../config/email.config');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

const register = async (body) => {
  const { fullName, firstName, lastName, email, password } = body;
  const existing = await User.findOne({ email });
  if (existing) throw new AppError('Email already registered', 409);

  const resolvedFullName = fullName || [firstName, lastName].filter(Boolean).join(' ');
  const resolvedFirst = firstName || (fullName ? fullName.split(' ')[0] : '');
  const resolvedLast = lastName || (fullName ? fullName.split(' ').slice(1).join(' ') : '');

  const user = await User.create({
    fullName: resolvedFullName,
    firstName: resolvedFirst,
    lastName: resolvedLast,
    email,
    password,
    role: 'agency',
  });
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
  if (user.role === 'admin') {
    throw new AppError(
      'Red Dog Radio staff must sign in through the staff portal at /admin/login.',
      403
    );
  }
  const token = signToken(user._id);
  const safeUser = user.toObject();
  delete safeUser.password;
  return { user: safeUser, token };
};

const getMe = async (userId) => {
  const user = await User.findById(userId).populate('organizationId', 'name location');
  if (!user) throw new AppError('User not found', 404);
  return user;
};

const loginAdmin = async ({ email, password }) => {
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw new AppError('Invalid email or password', 401);
  }
  if (user.role !== 'admin') {
    throw new AppError(
      'Agency members should use the main login page. This portal is for Red Dog Radio staff only.',
      403
    );
  }
  const token = signToken(user._id);
  const safeUser = user.toObject();
  delete safeUser.password;
  return { user: safeUser, token };
};

const forgotPassword = async ({ email }) => {
  const normalized = String(email || '')
    .trim()
    .toLowerCase();
  const generic = { ok: true, message: 'If an account exists for this email, a reset code was sent.' };
  if (!normalized) return generic;

  const user = await User.findOne({ email: normalized });
  if (!user) return generic;

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  user.resetOtp = await bcrypt.hash(otp, 10);
  user.resetOtpExpiry = new Date(Date.now() + 15 * 60 * 1000);
  user.resetToken = undefined;
  user.resetTokenExpiry = undefined;
  await user.save();

  try {
    await sendPasswordResetEmail({
      to: user.email,
      otp,
      name: user.firstName || user.fullName || 'there',
    });
  } catch (e) {
    console.error('[auth] Forgot password email failed:', e.message);
  }

  return generic;
};

const verifyOtp = async ({ email, otp }) => {
  const normalized = String(email || '')
    .trim()
    .toLowerCase();
  const user = await User.findOne({ email: normalized }).select('+resetOtp +resetOtpExpiry');
  if (!user?.resetOtp || !user.resetOtpExpiry) throw new AppError('Invalid or expired code', 400);
  if (user.resetOtpExpiry < new Date()) throw new AppError('Invalid or expired code', 400);
  const ok = await bcrypt.compare(String(otp).trim(), user.resetOtp);
  if (!ok) throw new AppError('Invalid or expired code', 400);

  const resetToken = crypto.randomBytes(32).toString('hex');
  user.resetToken = await bcrypt.hash(resetToken, 10);
  user.resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);
  user.resetOtp = undefined;
  user.resetOtpExpiry = undefined;
  await user.save();

  return { resetToken };
};

const resetPassword = async ({ email, resetToken, newPassword }) => {
  if (!newPassword || String(newPassword).length < 8) {
    throw new AppError('Password must be at least 8 characters', 400);
  }
  const normalized = String(email || '')
    .trim()
    .toLowerCase();
  const user = await User.findOne({ email: normalized }).select('+password +resetToken +resetTokenExpiry');
  if (!user?.resetToken || !user.resetTokenExpiry) throw new AppError('Invalid or expired reset link', 400);
  if (user.resetTokenExpiry < new Date()) throw new AppError('Invalid or expired reset link', 400);
  const ok = await bcrypt.compare(String(resetToken).trim(), user.resetToken);
  if (!ok) throw new AppError('Invalid or expired reset link', 400);

  user.password = newPassword;
  user.resetToken = undefined;
  user.resetTokenExpiry = undefined;
  await user.save();
  return { ok: true };
};

module.exports = {
  register,
  login,
  getMe,
  loginAdmin,
  forgotPassword,
  verifyOtp,
  resetPassword,
};
