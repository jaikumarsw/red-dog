const asyncHandler = require('../../utils/asyncHandler');
const { success, created, paginate } = require('../../utils/apiResponse');
const appService = require('./application.service');

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

const update = asyncHandler(async (req, res) => {
  const app = await appService.update(req.params.id, req.body);
  return success(res, app, 'Application updated');
});

const submit = asyncHandler(async (req, res) => {
  const app = await appService.submit(req.params.id);
  return success(res, app, 'Application submitted');
});

const remove = asyncHandler(async (req, res) => {
  await appService.remove(req.params.id);
  return success(res, null, 'Application deleted');
});

module.exports = { getAll, getOne, create, update, submit, remove };
