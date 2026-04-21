const express = require('express');
const rateLimit = require('express-rate-limit');
const {
  register,
  login,
  getMe,
  forgotPassword,
  verifyOtp,
  resetPassword,
  verifySignupOtp,
  resendVerificationOtp,
} = require('./auth.controller');
const { protect } = require('../../middlewares/auth.middleware');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many login attempts. Try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: { success: false, message: 'Too many reset requests. Try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many verification attempts. Try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const resendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: { success: false, message: 'Too many resend requests. Try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many attempts. Try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               firstName: { type: string }
 *               lastName: { type: string }
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 8 }
 *     responses:
 *       201: { description: User created successfully }
 *       409: { description: Email already registered }
 */
router.post('/register', register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login and get a JWT token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *     responses:
 *       200: { description: Login successful, returns JWT token }
 *       401: { description: Invalid credentials }
 */
router.post('/login', loginLimiter, login);

router.post('/forgot-password', forgotPasswordLimiter, forgotPassword);
router.post('/verify-otp', otpLimiter, verifyOtp);
router.post('/reset-password', resetPasswordLimiter, resetPassword);
router.post('/verify-email', otpLimiter, verifySignupOtp);
router.post('/resend-verification', resendLimiter, resendVerificationOtp);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get the currently authenticated user
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Current user data }
 *       401: { description: Not authenticated }
 */
router.get('/me', protect, getMe);

module.exports = router;
