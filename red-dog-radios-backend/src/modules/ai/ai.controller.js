const asyncHandler = require('../../utils/asyncHandler');
const { success } = require('../../utils/apiResponse');
const aiService = require('./ai.service');
const { resolveAgencyOrganizationId } = require('../../utils/resolveAgencyOrg');
const { AppError } = require('../../middlewares/error.middleware');
const outboxService = require('../outbox/outbox.service');

const generateSummary = asyncHandler(async (req, res) => {
  const { opportunityId } = req.body;
  const result = await aiService.generateGrantSummary(opportunityId);
  return success(res, result, 'Grant summary generated');
});

const generateEmail = asyncHandler(async (req, res) => {
  const organizationId = await resolveAgencyOrganizationId(req.user);
  if (!organizationId) throw new AppError('No organization linked to your account', 400);
  const { opportunityId, contactName, contactEmail, senderName, senderCompany, grantId } = req.body;
  if (!contactEmail) throw new AppError('contactEmail is required', 400);
  const result = await aiService.generateOutreachEmail(
    opportunityId,
    organizationId,
    contactName,
    senderName,
    senderCompany
  );

  const queued = await outboxService.queueEmail({
    recipient: contactEmail,
    recipientName: contactName,
    subject: result.subject,
    htmlBody: '<p>' + String(result.body || '').replace(/\n/g, '<br>') + '</p>',
    emailType: 'outreach',
    relatedOrganization: organizationId,
    relatedAgency: organizationId,
    relatedUser: req.user._id,
    relatedGrant: grantId || undefined,
  });

  return success(
    res,
    { generated: result, outbox: queued },
    'Outreach email generated and queued'
  );
});

const generateApplication = asyncHandler(async (req, res) => {
  const organizationId = await resolveAgencyOrganizationId(req.user);
  if (!organizationId) throw new AppError('No organization linked to your account', 400);
  const { opportunityId } = req.body;
  const result = await aiService.generateApplication(opportunityId, organizationId);
  return success(res, result, 'Application content generated');
});

const computeMatch = asyncHandler(async (req, res) => {
  const organizationId = await resolveAgencyOrganizationId(req.user);
  if (!organizationId) throw new AppError('No organization linked to your account', 400);
  const { opportunityId } = req.body;
  const result = await aiService.computeMatchWithAI(opportunityId, organizationId);
  return success(res, result, 'AI match score computed');
});

module.exports = { generateSummary, generateEmail, generateApplication, computeMatch };
