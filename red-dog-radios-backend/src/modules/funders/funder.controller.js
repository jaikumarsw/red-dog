const asyncHandler = require('../../utils/asyncHandler');
const { success, paginate } = require('../../utils/apiResponse');
const funderService = require('./funder.service');
const { AppError } = require('../../middlewares/error.middleware');

const getAll = asyncHandler(async (req, res) => {
  const { page, limit, search, category, location, status } = req.query;
  const organizationId = req.query.organizationId || null;
  const result = await funderService.getAll({ page, limit, search, category, location, status, organizationId });
  return paginate(res, result.docs, result.totalDocs, result.page, result.totalPages, 'Funders retrieved');
});

const getOne = asyncHandler(async (req, res) => {
  const organizationId = req.query.organizationId || null;
  const funder = await funderService.getOne(req.params.id, organizationId);
  return success(res, funder, 'Funder retrieved');
});

const create = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') throw new AppError('Admin access required', 403);
  const funder = await funderService.create(req.body, req.user._id);
  return success(res, funder, 'Funder created', 201);
});

const update = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') throw new AppError('Admin access required', 403);
  const funder = await funderService.update(req.params.id, req.body);
  return success(res, funder, 'Funder updated');
});

const deactivate = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') throw new AppError('Admin access required', 403);
  const funder = await funderService.deactivate(req.params.id);
  return success(res, funder, 'Funder deactivated');
});

const saveFunder = asyncHandler(async (req, res) => {
  const org = await require('../organizations/organization.schema').findOne({ createdBy: req.user._id });
  const result = await funderService.saveFunder(req.params.id, org?._id);
  return success(res, result, 'Funder saved');
});

module.exports = { getAll, getOne, create, update, deactivate, saveFunder };
