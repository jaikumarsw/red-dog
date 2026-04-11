const asyncHandler = require('../../utils/asyncHandler');
const { success, created, paginate } = require('../../utils/apiResponse');
const authService = require('../auth/auth.service');
const adminService = require('./admin.service');

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
  return created(res, opp, 'Opportunity created');
});

const getOpportunity = asyncHandler(async (req, res) => {
  const opp = await adminService.getOpportunityAdmin(req.params.id);
  return success(res, opp);
});

const updateOpportunity = asyncHandler(async (req, res) => {
  const opp = await adminService.updateOpportunityAdmin(req.params.id, req.body);
  return success(res, opp, 'Opportunity updated');
});

const deleteOpportunity = asyncHandler(async (req, res) => {
  await adminService.deleteOpportunityAdmin(req.params.id);
  return success(res, null, 'Opportunity deleted');
});

const listFunders = asyncHandler(async (req, res) => {
  const result = await adminService.listFundersAdmin(req.query);
  return paginate(res, result.docs, result, 'Funders retrieved');
});

const createFunder = asyncHandler(async (req, res) => {
  const f = await adminService.createFunderAdmin(req.body, req.user._id);
  return created(res, f, 'Funder created');
});

const updateFunder = asyncHandler(async (req, res) => {
  const f = await adminService.updateFunderAdmin(req.params.id, req.body);
  return success(res, f, 'Funder updated');
});

const deleteFunder = asyncHandler(async (req, res) => {
  await adminService.deleteFunderAdmin(req.params.id);
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
  return success(res, app, 'AI content generated');
});

const createApplicationForAgency = asyncHandler(async (req, res) => {
  const app = await adminService.createApplicationForAgency({
    ...req.body,
    adminUserId: req.user._id,
  });
  return created(res, app, 'Application created and generated');
});

const listMatches = asyncHandler(async (req, res) => {
  const result = await adminService.listMatchesAdmin(req.query);
  return paginate(res, result.docs, result, 'Matches retrieved');
});

const recomputeMatches = asyncHandler(async (req, res) => {
  const result = await adminService.recomputeAllMatches();
  return success(res, result, 'Match recompute complete');
});

const listUsers = asyncHandler(async (req, res) => {
  const result = await adminService.listUsersAdmin(req.query);
  return paginate(res, result.docs, result, 'Users retrieved');
});

const updateUserRole = asyncHandler(async (req, res) => {
  const u = await adminService.updateUserRole(req.params.id, req.body);
  return success(res, u, 'User role updated');
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
  updateApplication,
  updateApplicationStatus,
  generateApplicationAI,
  createApplicationForAgency,
  listMatches,
  recomputeMatches,
  listUsers,
  updateUserRole,
};
