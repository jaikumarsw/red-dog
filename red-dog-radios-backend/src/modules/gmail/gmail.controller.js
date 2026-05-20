'use strict';

const asyncHandler = require('../../utils/asyncHandler');
const { success } = require('../../utils/apiResponse');
const gmailService = require('./gmail.service');
const { AppError } = require('../../middlewares/error.middleware');
const { resolveAgencyOrganizationId } = require('../../utils/resolveOrganizationId');

const assertOrgAccess = (req, organizationId) => {
  if (!req.user) throw new AppError('Not authenticated', 401);
  if (req.user.role === 'admin') return;
  const userOrgId = req.user.organizationId ? String(req.user.organizationId) : '';
  if (!userOrgId || userOrgId !== String(organizationId)) {
    throw new AppError('You do not have access to this organization', 403);
  }
};

const oauthConnectSelf = asyncHandler(async (req, res) => {
  const orgId = await resolveAgencyOrganizationId(req.user);
  if (!orgId) {
    throw new AppError('Complete onboarding before connecting Gmail', 400);
  }
  const source = req.query.source || 'settings';
  const url = await gmailService.getConnectUrl(orgId, source);
  return res.json({ success: true, data: { url } });
});

const oauthStatusSelf = asyncHandler(async (req, res) => {
  const orgId = await resolveAgencyOrganizationId(req.user);
  if (!orgId) {
    return res.json({ 
      success: true, 
      data: { isConnected: false, senderEmail: null } 
    });
  }
  const status = await gmailService.getStatus(orgId);
  return res.json({ success: true, data: status });
});

const oauthDisconnectSelf = asyncHandler(async (req, res) => {
  const orgId = await resolveAgencyOrganizationId(req.user);
  if (!orgId) throw new AppError('Organization required', 400);
  const result = await gmailService.disconnect(orgId);
  return res.json({ success: true, data: result });
});

// Admin-initiated `oauthConnect` was removed: starting a Google OAuth grant
// on behalf of an agency would create a billable mailbox connection without
// the agency owner first accepting the paywall. Status + disconnect remain
// available so admins can still inspect and revoke an existing connection.

const oauthCallback = asyncHandler(async (req, res) => {
  const code = req.query.code;
  const stateStr = req.query.state || '';
  const [organizationId, source] = stateStr.split('|');

  await gmailService.handleOAuthCallback({ organizationId, code });

  const frontend = process.env.FRONTEND_URL || 'https://red-dog-frontend-production.up.railway.app';
  if (source === 'onboarding') {
    return res.redirect(`${frontend}/onboarding/results?gmail=connected`);
  }
  return res.redirect(`${frontend}/settings/agency?gmail=connected`);
});

const oauthStatus = asyncHandler(async (req, res) => {
  assertOrgAccess(req, req.params.organizationId);
  const result = await gmailService.getStatus(req.params.organizationId);
  return success(res, result, 'Gmail OAuth status retrieved');
});

const oauthDisconnect = asyncHandler(async (req, res) => {
  assertOrgAccess(req, req.params.organizationId);
  const result = await gmailService.disconnect(req.params.organizationId);
  return success(res, result, 'Gmail OAuth disconnected');
});

module.exports = {
  oauthConnectSelf,
  oauthStatusSelf,
  oauthDisconnectSelf,
  oauthCallback,
  oauthStatus,
  oauthDisconnect,
};
