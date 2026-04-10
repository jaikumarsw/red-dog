const asyncHandler = require('../../utils/asyncHandler');
const { success, created, paginate } = require('../../utils/apiResponse');
const appService = require('./application.service');
const Organization = require('../organizations/organization.schema');

const getAll = asyncHandler(async (req, res) => {
  const result = await appService.getAll(req.query);
  return paginate(res, result.docs, result, 'Applications retrieved');
});

const getOne = asyncHandler(async (req, res) => {
  const app = await appService.getOne(req.params.id);
  return success(res, app);
});

const create = asyncHandler(async (req, res) => {
  const app = await appService.create(req.body);
  return created(res, app, 'Application created');
});

// AI-powered application generation — auto-resolves organization from user
const generate = asyncHandler(async (req, res) => {
  const { funderId, opportunityId } = req.body;
  let { organizationId } = req.body;
  if (!organizationId) {
    const org = await Organization.findOne({ createdBy: req.user._id });
    if (!org) return res.status(400).json({ success: false, message: 'No organization found for your account. Please create one first.' });
    organizationId = org._id;
  }
  const app = await appService.createWithAI({ opportunityId, funderId, organizationId, userId: req.user._id });
  return created(res, app, 'Application generated with AI');
});

const update = asyncHandler(async (req, res) => {
  const app = await appService.update(req.params.id, req.body);
  return success(res, app, 'Application updated');
});

const updateStatus = asyncHandler(async (req, res) => {
  const app = await appService.updateStatus(req.params.id, req.body);
  return success(res, app, 'Application status updated');
});

const submit = asyncHandler(async (req, res) => {
  const app = await appService.submit(req.params.id);
  return success(res, app, 'Application submitted');
});

const remove = asyncHandler(async (req, res) => {
  await appService.remove(req.params.id);
  return success(res, null, 'Application deleted');
});

const regenerate = asyncHandler(async (req, res) => {
  const app = await appService.regenerate(req.params.id);
  return success(res, app, 'Application regenerated');
});

const alignToFunder = asyncHandler(async (req, res) => {
  const aligned = await appService.alignToFunder(req.params.id);
  return success(res, aligned, 'Application aligned to funder');
});

const exportApplication = asyncHandler(async (req, res) => {
  const text = await appService.exportApplication(req.params.id);
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Content-Disposition', `attachment; filename="application-${req.params.id}.txt"`);
  return res.send(text);
});

module.exports = { getAll, getOne, create, generate, update, updateStatus, submit, remove, regenerate, alignToFunder, exportApplication };
