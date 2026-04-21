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
  const normalizedEmail = String(email || '')
    .trim()
    .toLowerCase();

  if (!normalizedEmail) {
    throw new AppError('Email is required', 400);
  }

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    if (existingUser.role === 'admin') {
      throw new AppError(
        'This email is already in use for a staff account. Please sign in at /admin/login.',
        409
      );
    }
    if (existingUser.isVerified) {
      throw new AppError(
        'This email is already registered. Please sign in or use forgot password.',
        409
      );
    }
    await User.deleteOne({ _id: existingUser._id });
  }

  const resolvedFullName = fullName || [firstName, lastName].filter(Boolean).join(' ');
  const resolvedFirst = firstName || (fullName ? fullName.split(' ')[0] : '');
  const resolvedLast = lastName || (fullName ? fullName.split(' ').slice(1).join(' ') : '');

  if (!password || String(password).length < 8) {
    throw new AppError('Password must be at least 8 characters', 400);
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const hashedOtp = await bcrypt.hash(otp, 10);

  let user;
  try {
    user = await User.create({
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
  } catch (e) {
    if (e && e.code === 11000) {
      throw new AppError('This email is already registered. Please sign in.', 409);
    }
    throw e;
  }

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
    console.error('[auth] Verification email send error (account still created):', e?.message || e);
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
    throw new AppError('Incorrect email or password.', 401);
  }
  if (user.role === 'admin') {
    throw new AppError(
      'This email belongs to a staff account. Please use the staff sign-in page at /admin/login.',
      403
    );
  }
  if (!user.isVerified) {
    throw new AppError('Please verify your email first.', 403);
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

  try {
    const result = await sendOtpEmail({
      to: normalized,
      otp,
      name: user.fullName || user.firstName || '',
      type: 'signup',
    });
    if (!result?.success) {
      console.error('[resendVerification] Email failed:', result?.error || '(stub/no error provided)');
    }
  } catch (emailErr) {
    console.error('[resendVerification] Email error:', emailErr.message);
    // Non-fatal — OTP saved, user can try again
  }

  return { success: true, message: 'New verification code sent to your email.' };
};

const getMe = async (userId) => {
  const user = await User.findById(userId).populate('organizationId', 'name location');
  if (!user) throw new AppError('User not found', 404);
  return user;
};

const loginAdmin = async ({ email, password }) => {
  const normalized = String(email || '').trim().toLowerCase();
  const user = await User.findOne({ email: normalized }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw new AppError(
      "We couldn't sign you in. Check your email and password for typos.",
      401
    );
  }
  if (user.role !== 'admin') {
    throw new AppError(
      'This portal is for Red Dog Radio staff only. Agency members should use the main sign-in page at /login.',
      403
    );
  }
  const token = signToken(user._id);
  const safeUser = user.toObject();
  delete safeUser.password;
  return { user: safeUser, token };
};

const forgotPassword = async ({ email }) => {
  const normalizedEmail = email?.toLowerCase()?.trim();
  if (!normalizedEmail) throw new AppError('Email is required', 400);

  const user = await User.findOne({ email: normalizedEmail });
  console.log('[forgotPassword] Email:', normalizedEmail, '| Found:', user ? 'YES' : 'NO');

  if (!user) {
    throw new AppError('No account found with this email. Please sign up first.', 404);
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const hashedOtp = await bcrypt.hash(otp, 10);

  user.resetOtp = hashedOtp;
  user.resetOtpExpiry = new Date(Date.now() + 15 * 60 * 1000);
  user.resetToken = undefined;
  user.resetTokenExpiry = undefined;
  await user.save();

  console.log('[forgotPassword] OTP generated for:', normalizedEmail);
  if (process.env.NODE_ENV !== 'production') {
    console.log('[DEBUG forgotPassword] OTP for', normalizedEmail, ':', otp);
  }

  try {
    const result = await sendOtpEmail({
      to: normalizedEmail,
      otp,
      name: user.firstName || user.fullName || 'there',
      type: 'reset',
    });
    console.log('[forgotPassword] Email result:', result);
  } catch (emailErr) {
    console.error('[forgotPassword] Email failed:', emailErr.message);
    // Non-fatal — OTP is saved, user can request resend
  }

  return {
    message: 'If that email exists, a reset code has been sent.',
    email: normalizedEmail,
  };
};

const verifyOtp = async ({ email, otp }) => {
  const normalizedEmail = email?.toLowerCase()?.trim();
  if (!normalizedEmail || !otp) {
    throw new AppError('Email and OTP are required', 400);
  }

  const user = await User.findOne({ email: normalizedEmail }).select('+resetOtp +resetOtpExpiry');

  if (!user) throw new AppError('Invalid or expired code', 400);

  if (!user.resetOtp || !user.resetOtpExpiry) {
    throw new AppError('No reset code found. Request a new one.', 400);
  }

  if (new Date() > user.resetOtpExpiry) {
    throw new AppError('Reset code has expired. Request a new one.', 400);
  }

  const isMatch = await bcrypt.compare(String(otp).trim(), user.resetOtp);
  if (!isMatch) throw new AppError('Invalid reset code', 400);

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

  user.resetToken = hashedToken;
  user.resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  user.resetOtp = undefined;
  user.resetOtpExpiry = undefined;
  await user.save();

  return {
    resetToken,
    email: normalizedEmail,
    message: 'OTP verified. You can now reset your password.',
  };
};

const resetPassword = async ({ email, resetToken, newPassword }) => {
  if (!email || !resetToken || !newPassword) {
    throw new AppError('All fields are required', 400);
  }
  if (String(newPassword).length < 8) {
    throw new AppError('Password must be at least 8 characters', 400);
  }

  const normalizedEmail = email?.toLowerCase()?.trim();
  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

  const user = await User.findOne({ email: normalizedEmail })
    .select('+resetToken +resetTokenExpiry');

  console.log('[resetPassword] Looking for user:', normalizedEmail);
  console.log('[resetPassword] User found:', user ? 'YES' : 'NO');

  if (!user) {
    throw new AppError('Invalid or expired reset link. Request a new one.', 400);
  }

  if (!user.resetToken) {
    throw new AppError('No reset session found. Please request a new code.', 400);
  }

  const tokenMatches = user.resetToken === hashedToken;
  console.log('[resetPassword] Token matches:', tokenMatches);

  if (!tokenMatches) {
    throw new AppError('Invalid reset token. Please request a new code.', 400);
  }

  if (user.resetTokenExpiry && new Date() > user.resetTokenExpiry) {
    throw new AppError('Reset link has expired. Please request a new code.', 400);
  }

  // Hash manually and use findByIdAndUpdate to bypass the pre-save hook,
  // which would otherwise hash an already-hashed password a second time.
  const hashedPassword = await bcrypt.hash(newPassword, 12);

  await User.findByIdAndUpdate(user._id, {
    password: hashedPassword,
    resetToken: undefined,
    resetTokenExpiry: undefined,
    resetOtp: undefined,
    resetOtpExpiry: undefined,
  });

  console.log('[resetPassword] Password updated successfully for:', normalizedEmail);

  return { message: 'Password reset successfully. You can now sign in.' };
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
