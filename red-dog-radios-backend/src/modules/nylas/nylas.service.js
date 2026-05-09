'use strict';

const Organization = require('../organizations/organization.schema');
const logger = require('../../utils/logger');
const { AppError } = require('../../middlewares/error.middleware');
const { getNylasClient, assertConfigured, CLIENT_ID, CLIENT_SECRET, REDIRECT_URI } = require('../../config/nylas.config');

const getConnectUrl = async (organizationId, source) => {
  assertConfigured();
  const org = await Organization.findById(organizationId).select('_id');
  if (!org) throw new AppError('Organization not found', 404);

  const nylas = getNylasClient();
  const state = source ? `${organizationId}|${source}` : String(organizationId);

  const url = nylas.auth.urlForOAuth2({
    clientId: CLIENT_ID,
    redirectUri: REDIRECT_URI,
    state,
  });

  return url;
};

const handleOAuthCallback = async ({ organizationId, code }) => {
  assertConfigured();
  if (!organizationId) throw new AppError('Missing organizationId in state', 400);
  if (!code) throw new AppError('Missing authorization code', 400);

  const org = await Organization.findById(organizationId);
  if (!org) throw new AppError('Organization not found', 404);

  const nylas = getNylasClient();

  const tokenData = await nylas.auth.exchangeCodeForToken({
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    redirectUri: REDIRECT_URI,
    code,
  });

  if (!tokenData?.grantId) {
    throw new AppError('Nylas did not return a grant ID', 502);
  }

  org.nylasGrant = {
    grantId: tokenData.grantId,
    email: tokenData.email || null,
    provider: tokenData.provider || null,
    isConnected: true,
    connectedAt: new Date(),
  };

  await org.save();

  return {
    isConnected: true,
    email: org.nylasGrant.email,
    provider: org.nylasGrant.provider,
    connectedAt: org.nylasGrant.connectedAt,
  };
};

const getStatus = async (organizationId) => {
  const org = await Organization.findById(organizationId).select('nylasGrant');
  if (!org) throw new AppError('Organization not found', 404);
  return {
    isConnected: !!org?.nylasGrant?.isConnected,
    email: org?.nylasGrant?.email || null,
    provider: org?.nylasGrant?.provider || null,
    connectedAt: org?.nylasGrant?.connectedAt || null,
  };
};

const disconnect = async (organizationId) => {
  const org = await Organization.findById(organizationId);
  if (!org) throw new AppError('Organization not found', 404);

  // Best-effort revoke on Nylas side
  if (org.nylasGrant?.grantId) {
    try {
      const nylas = getNylasClient();
      await nylas.grants.destroy({ grantId: org.nylasGrant.grantId });
    } catch (err) {
      logger.warn('[NylasService] Grant revoke failed (continuing):', err.message);
    }
  }

  org.nylasGrant = {
    grantId: undefined,
    email: undefined,
    provider: undefined,
    isConnected: false,
    connectedAt: undefined,
  };
  await org.save();

  return { isConnected: false };
};

/**
 * Send an email via Nylas using the org's connected grant.
 * Returns { success, messageId, provider }
 */
const sendViaNylas = async ({ grantId, to, subject, htmlBody, replyTo }) => {
  assertConfigured();
  const nylas = getNylasClient();

  const toRecipients = Array.isArray(to)
    ? to.map((e) => ({ email: e }))
    : [{ email: to }];

  const requestBody = {
    to: toRecipients,
    subject: subject || '',
    body: htmlBody || '',
  };

  if (replyTo) {
    requestBody.replyTo = [{ email: replyTo }];
  }

  const response = await nylas.messages.send({
    identifier: grantId,
    requestBody,
  });

  return {
    success: true,
    messageId: response?.data?.id || response?.id || null,
  };
};

module.exports = { getConnectUrl, handleOAuthCallback, getStatus, disconnect, sendViaNylas };
