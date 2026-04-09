const asyncHandler = require('../../utils/asyncHandler');
const { success } = require('../../utils/apiResponse');
const aiService = require('./ai.service');

const generateSummary = asyncHandler(async (req, res) => {
  const { opportunityId } = req.body;
  const result = await aiService.generateGrantSummary(opportunityId);
  return success(res, result, 'Grant summary generated');
});

const generateEmail = asyncHandler(async (req, res) => {
  const { opportunityId, organizationId, contactName, senderName, senderCompany } = req.body;
  const result = await aiService.generateOutreachEmail(opportunityId, organizationId, contactName, senderName, senderCompany);
  return success(res, result, 'Outreach email generated');
});

const generateApplication = asyncHandler(async (req, res) => {
  const { opportunityId, organizationId } = req.body;
  const result = await aiService.generateApplication(opportunityId, organizationId);
  return success(res, result, 'Application content generated');
});

const computeMatch = asyncHandler(async (req, res) => {
  const { opportunityId, organizationId } = req.body;
  const result = await aiService.computeMatchWithAI(opportunityId, organizationId);
  return success(res, result, 'AI match score computed');
});

module.exports = { generateSummary, generateEmail, generateApplication, computeMatch };
