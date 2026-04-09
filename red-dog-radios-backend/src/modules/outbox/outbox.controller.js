const asyncHandler = require('../../utils/asyncHandler');
const { success, created, paginate } = require('../../utils/apiResponse');
const outboxService = require('./outbox.service');

const getAll = asyncHandler(async (req, res) => {
  const result = await outboxService.getAll(req.query);
  return paginate(res, result.docs, result, 'Outbox records retrieved');
});

const getOne = asyncHandler(async (req, res) => {
  const record = await outboxService.getOne(req.params.id);
  return success(res, record);
});

const queueEmail = asyncHandler(async (req, res) => {
  const record = await outboxService.queueEmail(req.body);
  return created(res, record, 'Email queued');
});

const sendEmail = asyncHandler(async (req, res) => {
  const result = await outboxService.sendEmail(req.params.id);
  return success(res, result, result.success ? 'Email sent' : 'Email failed');
});

const processQueue = asyncHandler(async (req, res) => {
  const result = await outboxService.processQueue(req.body.limit || 50);
  return success(res, result, `Queue processed — sent: ${result.sent}, failed: ${result.failed}`);
});

const retryFailed = asyncHandler(async (req, res) => {
  const record = await outboxService.retryFailed(req.params.id);
  return success(res, record, 'Email queued for retry');
});

module.exports = { getAll, getOne, queueEmail, sendEmail, processQueue, retryFailed };
