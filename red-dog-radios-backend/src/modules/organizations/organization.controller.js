const asyncHandler = require('../../utils/asyncHandler');
const { success, created, paginate } = require('../../utils/apiResponse');
const orgService = require('./organization.service');

const getAll = asyncHandler(async (req, res) => {
  const result = await orgService.getAll(req.query);
  return paginate(res, result.docs, result, 'Organizations retrieved');
});

const getOne = asyncHandler(async (req, res) => {
  const org = await orgService.getOne(req.params.id);
  return success(res, org);
});

const create = asyncHandler(async (req, res) => {
  const org = await orgService.create(req.body, req.user._id);
  return created(res, org, 'Organization created');
});

const update = asyncHandler(async (req, res) => {
  const org = await orgService.update(req.params.id, req.body);
  return success(res, org, 'Organization updated');
});

const remove = asyncHandler(async (req, res) => {
  await orgService.remove(req.params.id);
  return success(res, null, 'Organization deactivated');
});

module.exports = { getAll, getOne, create, update, remove };
