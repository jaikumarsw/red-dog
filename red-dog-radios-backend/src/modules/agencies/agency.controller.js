const asyncHandler = require('../../utils/asyncHandler');
const { success, created, paginate } = require('../../utils/apiResponse');
const agencyService = require('./agency.service');

const getAll = asyncHandler(async (req, res) => {
  const result = await agencyService.getAll(req.query);
  return paginate(res, result.docs, result, 'Agencies retrieved');
});

const getOne = asyncHandler(async (req, res) => {
  const agency = await agencyService.getOne(req.params.id);
  return success(res, agency);
});

const create = asyncHandler(async (req, res) => {
  const agency = await agencyService.create(req.body);
  return created(res, agency, 'Agency created');
});

const update = asyncHandler(async (req, res) => {
  const agency = await agencyService.update(req.params.id, req.body);
  return success(res, agency, 'Agency updated');
});

const remove = asyncHandler(async (req, res) => {
  await agencyService.remove(req.params.id);
  return success(res, null, 'Agency deactivated');
});

module.exports = { getAll, getOne, create, update, remove };
