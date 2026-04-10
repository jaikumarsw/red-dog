const asyncHandler = require('../../utils/asyncHandler');
const { success, paginate } = require('../../utils/apiResponse');
const outreachService = require('./outreach.service');
const Organization = require('../organizations/organization.schema');

const getAll = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const org = await Organization.findOne({ createdBy: req.user._id });
  const result = await outreachService.getAll({ page, limit, userId: req.user._id, organizationId: org?._id });
  return paginate(res, result.docs, result.totalDocs, result.page, result.totalPages, 'Outreach emails retrieved');
});

const getOne = asyncHandler(async (req, res) => {
  const record = await outreachService.getOne(req.params.id);
  return success(res, record, 'Outreach email retrieved');
});

const generate = asyncHandler(async (req, res) => {
  const { funderId, opportunityId, organizationId } = req.body;
  const org = organizationId || (await Organization.findOne({ createdBy: req.user._id }))?._id;
  let record;
  if (funderId) {
    record = await outreachService.generateFromFunder(funderId, org, req.user._id);
  } else if (opportunityId) {
    record = await outreachService.generateFromOpportunity(opportunityId, org, req.user._id);
  } else {
    return res.status(400).json({ success: false, message: 'funderId or opportunityId is required' });
  }
  return success(res, record, 'Outreach email generated', 201);
});

const update = asyncHandler(async (req, res) => {
  const record = await outreachService.update(req.params.id, req.body);
  return success(res, record, 'Outreach email updated');
});

const markSent = asyncHandler(async (req, res) => {
  const record = await outreachService.markSent(req.params.id);
  return success(res, record, 'Outreach email marked as sent');
});

module.exports = { getAll, getOne, generate, update, markSent };
