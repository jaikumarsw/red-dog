'use strict';

const { sendOtpEmail } = require('../config/email.config');

const getTimeoutMs = () => {
  const n = parseInt(process.env.EMAIL_SEND_TIMEOUT_MS || '12000', 10);
  return Number.isFinite(n) && n > 0 ? n : 12000;
};

/**
 * OTP delivery with a hard timeout so auth routes respond quickly when SMTP
 * is blocked (Railway Hobby) or slow (provider firewall / wrong port).
 */
const deliverOtpEmail = async (params) => {
  const timeoutMs = getTimeoutMs();
  let timer;

  const timeoutPromise = new Promise((resolve) => {
    timer = setTimeout(() => {
      resolve({
        success: false,
        error: `Connection timeout after ${timeoutMs}ms`,
        timedOut: true,
      });
    }, timeoutMs);
  });

  try {
    return await Promise.race([sendOtpEmail(params), timeoutPromise]);
  } finally {
    clearTimeout(timer);
  }
};

module.exports = { deliverOtpEmail };
