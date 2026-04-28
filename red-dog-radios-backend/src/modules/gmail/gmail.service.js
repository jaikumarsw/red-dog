'use strict';

const Organization = require('../organizations/organization.schema');
const logger = require('../../utils/logger');
const { AppError } = require('../../middlewares/error.middleware');
const { getAuthUrl, exchangeCodeForTokens } = require('../../config/gmail.config');
const { setupGmailWatch } = require('./gmail.watch');

const getConnectUrl = async (organizationId) => {
  try {
    if (!organizationId) throw new AppError('organizationId is required', 400);
    const org = await Organization.findById(organizationId).select('_id');
    if (!org) throw new AppError('Organization not found', 404);
    return getAuthUrl(organizationId);
  } catch (err) {
    logger.error('[GmailService] getConnectUrl failed:', err.message);
    throw err;
  }
};

const handleOAuthCallback = async ({ organizationId, code }) => {
  try {
    if (!organizationId) throw new AppError('Missing state (organizationId)', 400);
    if (!code) throw new AppError('Missing code', 400);

    const org = await Organization.findById(organizationId);
    if (!org) throw new AppError('Organization not found', 404);

    const tokens = await exchangeCodeForTokens(code);
    if (!tokens?.access_token) throw new AppError('Google did not return an access token', 502);

    // NOTE: refresh_token may be undefined if the user previously consented.
    const refreshToken = tokens.refresh_token || org?.gmailOAuth?.refreshToken;
    if (!refreshToken) {
      throw new AppError(
        'Google did not return a refresh token. Reconnect with prompt=consent or disconnect first.',
        502
      );
    }

    const senderEmail = org?.gmailOAuth?.senderEmail || org?.email || undefined;

    org.gmailOAuth = {
      accessToken: tokens.access_token,
      refreshToken,
      tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
      senderEmail,
      isConnected: true,
      connectedAt: new Date(),
    };

    await org.save();

    // Setup Gmail watch immediately after connect (push notifications expire ~7 days)
    try {
      await setupGmailWatch(org);
    } catch (watchErr) {
      logger.error('[GmailService] setupGmailWatch failed:', watchErr.message);
    }

    return {
      isConnected: true,
      senderEmail: org.gmailOAuth.senderEmail,
      connectedAt: org.gmailOAuth.connectedAt,
    };
  } catch (err) {
    logger.error('[GmailService] handleOAuthCallback failed:', err.message);
    throw err;
  }
};

const getStatus = async (organizationId) => {
  try {
    if (!organizationId) throw new AppError('organizationId is required', 400);
    const org = await Organization.findById(organizationId).select('gmailOAuth');
    if (!org) throw new AppError('Organization not found', 404);
    return {
      isConnected: !!org?.gmailOAuth?.isConnected,
      senderEmail: org?.gmailOAuth?.senderEmail,
      connectedAt: org?.gmailOAuth?.connectedAt,
    };
  } catch (err) {
    logger.error('[GmailService] getStatus failed:', err.message);
    throw err;
  }
};

const disconnect = async (organizationId) => {
  try {
    if (!organizationId) throw new AppError('organizationId is required', 400);
    const org = await Organization.findById(organizationId);
    if (!org) throw new AppError('Organization not found', 404);

    org.gmailOAuth = {
      accessToken: undefined,
      refreshToken: undefined,
      tokenExpiry: undefined,
      senderEmail: undefined,
      isConnected: false,
      connectedAt: undefined,
    };
    await org.save();

    return { isConnected: false };
  } catch (err) {
    logger.error('[GmailService] disconnect failed:', err.message);
    throw err;
  }
};

module.exports = { getConnectUrl, handleOAuthCallback, getStatus, disconnect };

