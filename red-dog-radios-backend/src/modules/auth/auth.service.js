const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('./user.schema');
const { AppError } = require('../../middlewares/error.middleware');

const { sendOtpEmail } = require('../../config/email.config');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

const register = async (body) => {
  const { fullName, firstName, lastName, email, password } = body;
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) throw new AppError('Email already registered', 409);

  const resolvedFullName = fullName || [firstName, lastName].filter(Boolean).join(' ');
  const resolvedFirst = firstName || (fullName ? fullName.split(' ')[0] : '');
  const resolvedLast = lastName || (fullName ? fullName.split(' ').slice(1).join(' ') : '');

  if (!password || String(password).length < 8) {
    throw new AppError('Password must be at least 8 characters', 400);
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const hashedOtp = await bcrypt.hash(otp, 10);

  const user = await User.create({
    fullName: resolvedFullName,
    firstName: resolvedFirst,
    lastName: resolvedLast,
    email: normalizedEmail,
    password,
    role: 'agency',
    isVerified: false,
    verificationOtp: hashedOtp,
    verificationOtpExpiry: new Date(Date.now() + 15 * 60 * 1000),
  });

  try {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[DEBUG] Sending OTP email to:', normalizedEmail, 'OTP:', otp);
    } else {
      console.log('[auth] Sending verification OTP to:', normalizedEmail);
    }

    const result = await sendOtpEmail({
      to: normalizedEmail,
      otp,
      name: resolvedFullName || resolvedFirst || '',
      type: 'signup',
    });

    if (!result?.success) {
      console.error('[auth] Verification email send failed:', result?.error || '(stub/no error provided)');
    }
  } catch (e) {
    // Do not leak OTP; allow account creation but require resend from client.
  }

  return {
    success: true,
    message: 'Account created. Please check your email for verification code.',
    email: normalizedEmail,
  };
};

const login = async ({ email, password }) => {
  const normalized = String(email || '').trim().toLowerCase();
  const user = await User.findOne({ email: normalized }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw new AppError('Invalid email or password', 401);
  }
  if (user.role === 'admin') {
    throw new AppError(
      'Red Dog Radio staff must sign in through the staff portal at /admin/login.',
      403
    );
  }
  if (!user.isVerified) {
    throw new AppError(
      'Please verify your email before logging in. Check your inbox for the verification code.',
      403
    );
  }
  const token = signToken(user._id);
  const safeUser = user.toObject();
  delete safeUser.password;
  return { user: safeUser, token };
};

const verifySignupOtp = async ({ email, otp }) => {
  if (!email || !otp) throw new AppError('Email and OTP are required', 400);

  const normalized = String(email || '').trim().toLowerCase();
  const user = await User.findOne({ email: normalized }).select('+verificationOtp +verificationOtpExpiry');

  if (!user) throw new AppError('Account not found', 404);
  if (user.isVerified) throw new AppError('Account already verified', 400);

  if (!user.verificationOtp || !user.verificationOtpExpiry) {
    throw new AppError('No verification code found. Request a new one.', 400);
  }

  if (new Date() > user.verificationOtpExpiry) {
    throw new AppError('Verification code has expired. Request a new one.', 400);
  }

  const isMatch = await bcrypt.compare(String(otp).trim(), user.verificationOtp);
  if (!isMatch) throw new AppError('Invalid verification code', 400);

  user.isVerified = true;
  user.verificationOtp = undefined;
  user.verificationOtpExpiry = undefined;
  await user.save();

  const token = signToken(user._id);

  return {
    user: {
      _id: user._id,
      fullName: user.fullName,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      onboardingCompleted: user.onboardingCompleted,
      isVerified: user.isVerified,
    },
    token,
  };
};

const resendVerificationOtp = async ({ email }) => {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized) throw new AppError('Email is required', 400);

  const user = await User.findOne({ email: normalized });
  if (!user) throw new AppError('Account not found', 404);
  if (user.isVerified) throw new AppError('Account already verified', 400);

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const hashedOtp = await bcrypt.hash(otp, 10);

  user.verificationOtp = hashedOtp;
  user.verificationOtpExpiry = new Date(Date.now() + 15 * 60 * 1000);
  await user.save();

  if (process.env.NODE_ENV !== 'production') {
    console.log('[DEBUG] Sending OTP email to:', normalized, 'OTP:', otp);
  } else {
    console.log('[auth] Resending verification OTP to:', normalized);
  }

  const result = await sendOtpEmail({
    to: normalized,
    otp,
    name: user.fullName || user.firstName || '',
    type: 'signup',
  });

  if (!result?.success) {
    console.error('[auth] Resend verification email failed:', result?.error || '(stub/no error provided)');
  }

  return { success: true, message: 'New verification code sent to your email.' };
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
    if (process.env.NODE_ENV !== 'production') {
      console.log('[DEBUG] Sending RESET OTP email to:', user.email, 'OTP:', otp);
    }

    await sendOtpEmail({
      to: user.email,
      otp,
      name: user.fullName || user.firstName || 'there',
      type: 'reset',
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
  verifySignupOtp,
  resendVerificationOtp,
};
