const asyncHandler = require('../../utils/asyncHandler');
const { success, paginate } = require('../../utils/apiResponse');
const funderService = require('./funder.service');
const { resolveAgencyOrganizationId } = require('../../utils/resolveAgencyOrg');
const { AppError } = require('../../middlewares/error.middleware');

const getAll = asyncHandler(async (req, res) => {
  const organizationId = await resolveAgencyOrganizationId(req.user);
  const result = await funderService.getAll({ ...req.query, organizationId });
  return paginate(res, result.docs, result, 'Funders retrieved');
});

const getQueue = asyncHandler(async (req, res) => {
  const organizationId = await resolveAgencyOrganizationId(req.user);
  if (!organizationId) throw new AppError('No organization linked to your account', 400);
  const data = await funderService.getQueueForAgency(req.params.id, organizationId);
  return success(res, data, 'Queue position retrieved');
});

const updateAgencyNotes = asyncHandler(async (req, res) => {
  const { notes } = req.body;
  if (notes === undefined) throw new AppError('notes is required', 400);
  await funderService.updateAgencyNotesOnly(req.params.id, notes);
  const organizationId = await resolveAgencyOrganizationId(req.user);
  const funder = await funderService.getOne(req.params.id, organizationId);
  return success(res, funder, 'Notes updated');
});

const getOne = asyncHandler(async (req, res) => {
  const organizationId = await resolveAgencyOrganizationId(req.user);
  const funder = await funderService.getOne(req.params.id, organizationId);
  return success(res, funder, 'Funder retrieved');
});

const saveFunder = asyncHandler(async (req, res) => {
  const orgId = await resolveAgencyOrganizationId(req.user);
  const result = await funderService.saveFunder(req.params.id, orgId);
  return success(res, result, 'Funder saved');
});

module.exports = { getAll, getQueue, updateAgencyNotes, getOne, saveFunder };
