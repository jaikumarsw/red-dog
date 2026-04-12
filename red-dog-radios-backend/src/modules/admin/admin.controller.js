const asyncHandler = require('../../utils/asyncHandler');
const { success, created, paginate } = require('../../utils/apiResponse');
const { AppError } = require('../../middlewares/error.middleware');
const authService = require('../auth/auth.service');
const adminService = require('./admin.service');
const activityLogService = require('../activityLogs/activityLog.service');

const adminLogin = asyncHandler(async (req, res) => {
  const result = await authService.loginAdmin(req.body);
  return success(res, result, 'Staff login successful');
});

const adminMe = asyncHandler(async (req, res) => {
  return success(res, req.user);
});

const dashboard = asyncHandler(async (req, res) => {
  const data = await adminService.dashboard();
  return success(res, data);
});

const listAgencies = asyncHandler(async (req, res) => {
  const result = await adminService.listAgencies(req.query);
  return paginate(res, result.docs, result, 'Agencies retrieved');
});

const getAgency = asyncHandler(async (req, res) => {
  const data = await adminService.getAgencyDetail(req.params.id);
  return success(res, data);
});

const listOpportunities = asyncHandler(async (req, res) => {
  const result = await adminService.listOpportunitiesAdmin(req.query);
  return paginate(res, result.docs, result, 'Opportunities retrieved');
});

const createOpportunity = asyncHandler(async (req, res) => {
  const opp = await adminService.createOpportunityAdmin(req.body, req.user._id);
  await activityLogService.log({
    category: 'opportunity',
    action: 'created',
    summary: `Opportunity "${opp.title}" created`,
    actorId: req.user._id,
    meta: { opportunityId: opp._id },
  });
  return created(res, opp, 'Opportunity created');
});

const getOpportunity = asyncHandler(async (req, res) => {
  const opp = await adminService.getOpportunityAdmin(req.params.id);
  return success(res, opp);
});

const updateOpportunity = asyncHandler(async (req, res) => {
  const opp = await adminService.updateOpportunityAdmin(req.params.id, req.body);
  await activityLogService.log({
    category: 'opportunity',
    action: 'updated',
    summary: `Opportunity "${opp.title}" updated`,
    actorId: req.user._id,
    meta: { opportunityId: opp._id },
  });
  return success(res, opp, 'Opportunity updated');
});

const deleteOpportunity = asyncHandler(async (req, res) => {
  await adminService.deleteOpportunityAdmin(req.params.id, req.user._id);
  return success(res, null, 'Opportunity deleted');
});

const listFunders = asyncHandler(async (req, res) => {
  const result = await adminService.listFundersAdmin(req.query);
  return paginate(res, result.docs, result, 'Funders retrieved');
});

const createFunder = asyncHandler(async (req, res) => {
  const f = await adminService.createFunderAdmin(req.body, req.user._id);
  await activityLogService.log({
    category: 'funder',
    action: 'created',
    summary: `Funder "${f.name}" created`,
    actorId: req.user._id,
    meta: { funderId: f._id },
  });
  return created(res, f, 'Funder created');
});

const updateFunder = asyncHandler(async (req, res) => {
  const f = await adminService.updateFunderAdmin(req.params.id, req.body);
  await activityLogService.log({
    category: 'funder',
    action: 'updated',
    summary: `Funder "${f.name}" updated`,
    actorId: req.user._id,
    meta: { funderId: f._id },
  });
  return success(res, f, 'Funder updated');
});

const deleteFunder = asyncHandler(async (req, res) => {
  await adminService.deleteFunderAdmin(req.params.id, req.user._id);
  return success(res, null, 'Funder deleted');
});

const listApplications = asyncHandler(async (req, res) => {
  const result = await adminService.listApplicationsAdmin(req.query);
  return paginate(res, result.docs, result, 'Applications retrieved');
});

const getApplication = asyncHandler(async (req, res) => {
  const app = await adminService.getApplicationAdmin(req.params.id);
  return success(res, app);
});

const deleteApplication = asyncHandler(async (req, res) => {
  await adminService.deleteApplicationAdmin(req.params.id);
  return success(res, null, 'Application deleted');
});

const updateApplication = asyncHandler(async (req, res) => {
  const app = await adminService.updateApplicationAdmin(req.params.id, req.body);
  return success(res, app, 'Application updated');
});

const updateApplicationStatus = asyncHandler(async (req, res) => {
  const app = await adminService.updateApplicationStatusAdmin(req.params.id, req.body, req.user._id);
  return success(res, app, 'Status updated');
});

const generateApplicationAI = asyncHandler(async (req, res) => {
  const app = await adminService.generateApplicationAIAdmin(req.params.id);
  await activityLogService.log({
    category: 'ai',
    action: 'application_regenerate',
    summary: `Admin regenerated AI for application ${req.params.id}`,
    actorId: req.user._id,
    meta: { applicationId: req.params.id },
  });
  return success(res, app, 'AI content generated');
});

const createApplicationForAgency = asyncHandler(async (req, res) => {
  const { agencyId, funderId, opportunityId } = req.body || {};
  if (!agencyId || !funderId || !opportunityId) {
    throw new AppError('agencyId, funderId, and opportunityId are required', 400);
  }
  const app = await adminService.createApplicationForAgency({
    ...req.body,
    adminUserId: req.user._id,
  });
  await activityLogService.log({
    category: 'application',
    action: 'created_for_agency',
    summary: `Admin created AI application for agency (application ${app._id})`,
    actorId: req.user._id,
    meta: { applicationId: app._id, organizationId: app.organization },
  });
  return created(res, app, 'Application created and generated');
});

const listMatches = asyncHandler(async (req, res) => {
  const result = await adminService.listMatchesAdmin(req.query);
  return paginate(res, result.docs, result, 'Matches retrieved');
});

const recomputeMatches = asyncHandler(async (req, res) => {
  const result = await adminService.recomputeAllMatches();
  await activityLogService.log({
    category: 'match',
    action: 'recompute_all',
    summary: `Full match recompute finished (${result.processed} pairs)`,
    actorId: req.user._id,
    meta: result,
  });
  return success(res, result, 'Match recompute complete');
});

const approveMatch = asyncHandler(async (req, res) => {
  const match = await adminService.approveMatchAdmin(req.params.id);
  await activityLogService.log({
    category: 'match',
    action: 'approved',
    summary: `Match ${req.params.id} approved`,
    actorId: req.user._id,
    meta: { matchId: req.params.id },
  });
  return success(res, match, 'Match approved');
});

const rejectMatch = asyncHandler(async (req, res) => {
  const match = await adminService.rejectMatchAdmin(req.params.id);
  await activityLogService.log({
    category: 'match',
    action: 'rejected',
    summary: `Match ${req.params.id} rejected`,
    actorId: req.user._id,
    meta: { matchId: req.params.id },
  });
  return success(res, match, 'Match rejected');
});

const listUsers = asyncHandler(async (req, res) => {
  const result = await adminService.listUsersAdmin(req.query);
  return paginate(res, result.docs, result, 'Users retrieved');
});

const getUser = asyncHandler(async (req, res) => {
  const data = await adminService.getUserAdmin(req.params.id);
  return success(res, data, 'User retrieved');
});

const getFunder = asyncHandler(async (req, res) => {
  const data = await adminService.getFunderAdmin(req.params.id);
  return success(res, data, 'Funder retrieved');
});

const unlockFunder = asyncHandler(async (req, res) => {
  const f = await adminService.unlockFunderAdmin(req.params.id);
  await activityLogService.log({
    category: 'funder',
    action: 'unlocked',
    summary: `Funder "${f.name}" unlocked / application count reset`,
    actorId: req.user._id,
    meta: { funderId: f._id },
  });
  return success(res, f, 'Funder unlocked');
});

const setFunderLimit = asyncHandler(async (req, res) => {
  const f = await adminService.setFunderLimitAdmin(req.params.id, req.body);
  await activityLogService.log({
    category: 'funder',
    action: 'limit_updated',
    summary: `Funder "${f.name}" max applications set to ${f.maxApplicationsAllowed}`,
    actorId: req.user._id,
    meta: { funderId: f._id, maxApplicationsAllowed: f.maxApplicationsAllowed },
  });
  return success(res, f, 'Limit updated');
});

const getActivityLog = asyncHandler(async (req, res) => {
  const data = await adminService.getActivityLogAdmin(req.params.id);
  return success(res, data, 'Activity log retrieved');
});

const updateUserRole = asyncHandler(async (req, res) => {
  const u = await adminService.updateUserRole(req.params.id, req.body);
  await activityLogService.log({
    category: 'user',
    action: 'role_updated',
    summary: `User ${u.email} role set to ${req.body.role}`,
    actorId: req.user._id,
    meta: { userId: u._id, role: req.body.role },
  });
  return success(res, u, 'User role updated');
});

const listActivityLogs = asyncHandler(async (req, res) => {
  const result = await adminService.listActivityLogsAdmin(req.query);
  return paginate(res, result.docs, result, 'Activity logs retrieved');
});

module.exports = {
  adminLogin,
  adminMe,
  dashboard,
  listAgencies,
  getAgency,
  listOpportunities,
  createOpportunity,
  getOpportunity,
  updateOpportunity,
  deleteOpportunity,
  listFunders,
  createFunder,
  updateFunder,
  deleteFunder,
  listApplications,
  getApplication,
  deleteApplication,
  updateApplication,
  updateApplicationStatus,
  generateApplicationAI,
  createApplicationForAgency,
  listMatches,
  recomputeMatches,
  approveMatch,
  rejectMatch,
  listUsers,
  getUser,
  getFunder,
  unlockFunder,
  setFunderLimit,
  getActivityLog,
  updateUserRole,
  listActivityLogs,
};
