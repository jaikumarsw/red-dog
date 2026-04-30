'use strict';

const asyncHandler = require('../../utils/asyncHandler');
const { success } = require('../../utils/apiResponse');
const gmailService = require('./gmail.service');
const { AppError } = require('../../middlewares/error.middleware');

const assertOrgAccess = (req, organizationId) => {
  if (!req.user) throw new AppError('Not authenticated', 401);
  if (req.user.role === 'admin') return;
  const userOrgId = req.user.organizationId ? String(req.user.organizationId) : '';
  if (!userOrgId || userOrgId !== String(organizationId)) {
    throw new AppError('You do not have access to this organization', 403);
  }
};

const oauthConnect = asyncHandler(async (req, res) => {
  const organizationId = req.query.organizationId || req.body?.organizationId;
  if (!organizationId) throw new AppError('organizationId is required', 400);
  assertOrgAccess(req, organizationId);
  const url = await gmailService.getConnectUrl(organizationId);
  return success(res, { url }, 'Google OAuth URL generated');
});

const oauthCallback = asyncHandler(async (req, res) => {
  const code = req.query.code;
  const organizationId = req.query.state; // state = organizationId

  await gmailService.handleOAuthCallback({ organizationId, code });

  const frontend = process.env.FRONTEND_URL || 'http://localhost:3000';
  return res.redirect(`${frontend}/settings/agency?connected=true`);
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
  oauthConnect,
  oauthCallback,
  oauthStatus,
  oauthDisconnect,
};

