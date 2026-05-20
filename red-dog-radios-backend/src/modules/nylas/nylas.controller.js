'use strict';

const asyncHandler = require('../../utils/asyncHandler');
const { success } = require('../../utils/apiResponse');
const nylasService = require('./nylas.service');
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

// Self-serve: agency resolves own org from JWT
const oauthConnectSelf = asyncHandler(async (req, res) => {
  const orgId = await resolveAgencyOrganizationId(req.user);
  if (!orgId) throw new AppError('Complete onboarding before connecting email', 400);
  const source = req.query.source || 'settings';
  const url = await nylasService.getConnectUrl(orgId, source);
  return res.json({ success: true, data: { url } });
});

const oauthStatusSelf = asyncHandler(async (req, res) => {
  const orgId = await resolveAgencyOrganizationId(req.user);
  if (!orgId) return res.json({ success: true, data: { isConnected: false, email: null } });
  const status = await nylasService.getStatus(orgId);
  return res.json({ success: true, data: status });
});

const oauthDisconnectSelf = asyncHandler(async (req, res) => {
  const orgId = await resolveAgencyOrganizationId(req.user);
  if (!orgId) throw new AppError('Organization required', 400);
  const result = await nylasService.disconnect(orgId);
  return res.json({ success: true, data: result });
});

// OAuth callback — Nylas redirects here after user auth
const oauthCallback = asyncHandler(async (req, res) => {
  const code = req.query.code;
  const stateStr = req.query.state || '';
  const [organizationId, source] = stateStr.split('|');

  await nylasService.handleOAuthCallback({ organizationId, code });

  const frontend = process.env.FRONTEND_URL || 'https://red-dog-frontend-production.up.railway.app';
  if (source === 'onboarding') {
    return res.redirect(`${frontend}/onboarding/results?email=connected`);
  }
  return res.redirect(`${frontend}/settings/agency?email=connected`);
});

// Admin routes (org-scoped).
// Admin-initiated `oauthConnect` was removed: starting a Nylas grant on
// behalf of an agency would create a billable connection without the agency
// owner accepting the paywall. Status + disconnect remain available so admins
// can still inspect and revoke an existing connection.

const oauthStatus = asyncHandler(async (req, res) => {
  assertOrgAccess(req, req.params.organizationId);
  const result = await nylasService.getStatus(req.params.organizationId);
  return success(res, result, 'Nylas connection status');
});

const oauthDisconnect = asyncHandler(async (req, res) => {
  assertOrgAccess(req, req.params.organizationId);
  const result = await nylasService.disconnect(req.params.organizationId);
  return success(res, result, 'Nylas disconnected');
});

module.exports = {
  oauthConnectSelf,
  oauthStatusSelf,
  oauthDisconnectSelf,
  oauthCallback,
  oauthStatus,
  oauthDisconnect,
};
