const asyncHandler = require('../../utils/asyncHandler');
const { success, created, paginate } = require('../../utils/apiResponse');
const appService = require('./application.service');
const Application = require('./application.schema');
const activityLogService = require('../activityLogs/activityLog.service');
const { resolveAgencyOrganizationId } = require('../../utils/resolveAgencyOrg');
const { AppError } = require('../../middlewares/error.middleware');

const assertAppInOrg = async (applicationId, organizationId) => {
  const row = await Application.findById(applicationId).select('organization');
  if (!row || !organizationId || String(row.organization) !== String(organizationId)) {
    throw new AppError('Application not found', 404);
  }
};

const getAll = asyncHandler(async (req, res) => {
  const organizationId = await resolveAgencyOrganizationId(req.user);
  if (!organizationId) throw new AppError('No organization linked to your account', 400);
  const result = await appService.getAll({ ...req.query, organizationId });
  return paginate(res, result.docs, result, 'Applications retrieved');
});

const getOne = asyncHandler(async (req, res) => {
  const organizationId = await resolveAgencyOrganizationId(req.user);
  await assertAppInOrg(req.params.id, organizationId);
  const app = await appService.getOne(req.params.id);
  return success(res, app);
});

const create = asyncHandler(async (req, res) => {
  const organizationId = await resolveAgencyOrganizationId(req.user);
  if (!organizationId) throw new AppError('No organization linked to your account', 400);
  const app = await appService.create({ ...req.body, organization: organizationId });
  return created(res, app, 'Application created');
});

// AI-powered application generation — auto-resolves organization from user
const generate = asyncHandler(async (req, res) => {
  const { funderId, opportunityId } = req.body;
  const organizationId = await resolveAgencyOrganizationId(req.user);
  if (!organizationId) throw new AppError('No organization linked to your account', 400);
  const app = await appService.createWithAI({
    opportunityId,
    funderId,
    organizationId,
    userId: req.user._id,
  });
  await activityLogService.log({
    category: 'application',
    action: 'ai_generated',
    summary: `Agency generated AI application draft (${app.projectTitle || app._id})`,
    actorId: req.user._id,
    meta: { applicationId: app._id, organizationId, funderId, opportunityId },
  });
  return created(res, app, 'Application generated with AI');
});

const update = asyncHandler(async (req, res) => {
  const organizationId = await resolveAgencyOrganizationId(req.user);
  await assertAppInOrg(req.params.id, organizationId);
  const app = await appService.update(req.params.id, req.body);
  return success(res, app, 'Application updated');
});

const updateStatus = asyncHandler(async (req, res) => {
  const organizationId = await resolveAgencyOrganizationId(req.user);
  await assertAppInOrg(req.params.id, organizationId);
  const app = await appService.updateStatus(req.params.id, req.body, { actorId: req.user._id });
  return success(res, app, 'Application status updated');
});

const submit = asyncHandler(async (req, res) => {
  const organizationId = await resolveAgencyOrganizationId(req.user);
  await assertAppInOrg(req.params.id, organizationId);
  const app = await appService.submit(req.params.id, req.user._id);
  return success(res, app, 'Application submitted');
});

const remove = asyncHandler(async (req, res) => {
  const organizationId = await resolveAgencyOrganizationId(req.user);
  await assertAppInOrg(req.params.id, organizationId);
  await appService.remove(req.params.id);
  return success(res, null, 'Application deleted');
});

const regenerate = asyncHandler(async (req, res) => {
  const organizationId = await resolveAgencyOrganizationId(req.user);
  await assertAppInOrg(req.params.id, organizationId);
  const app = await appService.regenerate(req.params.id);
  return success(res, app, 'Application regenerated');
});

const alignToFunder = asyncHandler(async (req, res) => {
  const organizationId = await resolveAgencyOrganizationId(req.user);
  await assertAppInOrg(req.params.id, organizationId);
  const aligned = await appService.alignToFunder(req.params.id);
  return success(res, aligned, 'Application aligned to funder');
});

const exportApplication = asyncHandler(async (req, res) => {
  const organizationId = await resolveAgencyOrganizationId(req.user);
  await assertAppInOrg(req.params.id, organizationId);
  const text = await appService.exportApplication(req.params.id);
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Content-Disposition', `attachment; filename="application-${req.params.id}.txt"`);
  return res.send(text);
});

module.exports = { getAll, getOne, create, generate, update, updateStatus, submit, remove, regenerate, alignToFunder, exportApplication };
