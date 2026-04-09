const asyncHandler = require('../../utils/asyncHandler');
const { success, created, paginate } = require('../../utils/apiResponse');
const oppService = require('./opportunity.service');

const getAll = asyncHandler(async (req, res) => {
  const result = await oppService.getAll(req.query);
  return paginate(res, result.docs, result, 'Opportunities retrieved');
});

const getOne = asyncHandler(async (req, res) => {
  const opp = await oppService.getOne(req.params.id);
  return success(res, opp);
});

const create = asyncHandler(async (req, res) => {
  const opp = await oppService.create(req.body, req.user._id);
  return created(res, opp, 'Opportunity created');
});

const update = asyncHandler(async (req, res) => {
  const opp = await oppService.update(req.params.id, req.body);
  return success(res, opp, 'Opportunity updated');
});

const remove = asyncHandler(async (req, res) => {
  await oppService.remove(req.params.id);
  return success(res, null, 'Opportunity deleted');
});

module.exports = { getAll, getOne, create, update, remove };
