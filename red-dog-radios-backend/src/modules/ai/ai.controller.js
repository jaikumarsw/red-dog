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
  const { opportunityId, contactName, contactEmail, grantId } = req.body;
  if (!contactEmail) throw new AppError('contactEmail is required', 400);

  const Organization = require('../organizations/organization.schema');
  const org = await Organization.findById(organizationId).lean();
  if (!org) throw new AppError('Organization not found', 404);

  // Pull sender info silently from agency profile (Organization) and User
  const resolvedSenderName = org.contact_name || req.user.fullName || req.user.firstName + ' ' + (req.user.lastName || '');
  const resolvedSenderCompany = org.organisation_name || org.name;

  const result = await aiService.generateOutreachEmail(
    opportunityId,
    organizationId,
    contactName,
    resolvedSenderName,
    resolvedSenderCompany,
    grantId
  );

  const sigName    = (resolvedSenderName    || '').trim();
  const sigCompany = (resolvedSenderCompany || '').trim();

  // Strip [DATA NEEDED] placeholders and excessive blank lines from the AI body.
  const cleanedBody = String(result.body || '')
    .replace(/\[DATA NEEDED\][^\n]*/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const signature = [
    '<br><br>',
    '<p style="margin:0;font-family:sans-serif;">Thank you,</p>',
    '<br>',
    sigName    ? `<p style="margin:0;font-family:sans-serif;"><strong>${sigName}</strong></p>`    : '',
    sigCompany ? `<p style="margin:0;font-family:sans-serif;">${sigCompany}</p>`                 : '',
  ].filter(Boolean).join('\n');

  // Append the signature to the cleaned body (outboxService.queueEmail will run marked.parse
  // on the combined content, so we keep the AI body as markdown and the signature as raw HTML).
  const bodyWithSignature = cleanedBody + '\n\n' + signature;

  const queued = await outboxService.queueEmail({
    recipient: contactEmail,
    recipientName: contactName,
    subject: result.subject,
    htmlBody: bodyWithSignature,
    emailType: 'outreach',
    senderName: sigName || undefined,
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
