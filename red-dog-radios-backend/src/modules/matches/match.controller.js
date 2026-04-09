const asyncHandler = require('../../utils/asyncHandler');
const { success, created, paginate } = require('../../utils/apiResponse');
const matchService = require('./match.service');

const getAll = asyncHandler(async (req, res) => {
  const result = await matchService.getAll(req.query);
  return paginate(res, result.docs, result, 'Matches retrieved');
});

const getOne = asyncHandler(async (req, res) => {
  const match = await matchService.getOne(req.params.id);
  return success(res, match);
});

const create = asyncHandler(async (req, res) => {
  const match = await matchService.create(req.body);
  return created(res, match, 'Match created');
});

const computeAndSave = asyncHandler(async (req, res) => {
  const { opportunityId, organizationId } = req.body;
  const match = await matchService.computeAndSave(opportunityId, organizationId);
  return success(res, match, 'Match computed and saved');
});

const computeAll = asyncHandler(async (req, res) => {
  const { organizationId } = req.body;
  const result = await matchService.computeAllForOrganization(organizationId);
  return success(res, result, `Computed matches for all opportunities. Processed: ${result.processed}, Errors: ${result.errors}`);
});

const approve = asyncHandler(async (req, res) => {
  const match = await matchService.approveMatch(req.params.id);
  return success(res, match, 'Match approved');
});

const reject = asyncHandler(async (req, res) => {
  const match = await matchService.rejectMatch(req.params.id);
  return success(res, match, 'Match rejected');
});

module.exports = { getAll, getOne, create, computeAndSave, computeAll, approve, reject };
