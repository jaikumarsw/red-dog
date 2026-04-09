const asyncHandler = require('../../utils/asyncHandler');
const { success, created, paginate } = require('../../utils/apiResponse');
const digestService = require('./digest.service');

const getAll = asyncHandler(async (req, res) => {
  const result = await digestService.getAll(req.query);
  return paginate(res, result.docs, result, 'Digests retrieved');
});

const getOne = asyncHandler(async (req, res) => {
  const digest = await digestService.getOne(req.params.id);
  return success(res, digest);
});

const generate = asyncHandler(async (req, res) => {
  const { organizationId, weekStart, weekEnd } = req.body;
  const digest = await digestService.generateDigest(
    organizationId,
    req.user._id,
    weekStart ? new Date(weekStart) : new Date(),
    weekEnd ? new Date(weekEnd) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  );
  return created(res, digest, 'Digest generated');
});

const preview = asyncHandler(async (req, res) => {
  const { organizationId, weekStart, weekEnd } = req.body;
  const result = await digestService.generateDigest(
    organizationId,
    req.user._id,
    weekStart ? new Date(weekStart) : new Date(),
    weekEnd ? new Date(weekEnd) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    false
  );
  return success(res, result, 'Digest preview generated');
});

const send = asyncHandler(async (req, res) => {
  const { recipientEmail, recipientName } = req.body;
  const digest = await digestService.sendDigest(req.params.id, recipientEmail, recipientName);
  return success(res, digest, 'Digest sent');
});

module.exports = { getAll, getOne, generate, preview, send };
