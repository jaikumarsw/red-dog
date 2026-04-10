const Outreach = require('./outreach.schema');
const Organization = require('../organizations/organization.schema');
const Funder = require('../funders/funder.schema');
const Opportunity = require('../opportunities/opportunity.schema');
const openai = require('../../config/openai.config');
const logger = require('../../utils/logger');
const { AppError } = require('../../middlewares/error.middleware');

const AI_FALLBACK = {
  subject: 'Partnership Opportunity: Communications Infrastructure for Public Safety',
  contactName: 'Program Officer',
  body: 'Dear Program Officer,\n\nI am reaching out on behalf of our agency to express our strong interest in partnering with your organization. Our agency serves a community facing significant communications infrastructure challenges that directly impact emergency response.\n\nWe believe our mission closely aligns with your commitment to public safety and community resilience. We would welcome the opportunity to discuss how grant funding could help us address these critical needs.\n\nWould you be available for a brief conversation in the coming weeks?\n\nThank you for your consideration.\n\nSincerely,\n[Agency Representative]',
};

const generateFromFunder = async (funderId, organizationId, userId) => {
  const [org, funder] = await Promise.all([
    Organization.findById(organizationId),
    Funder.findById(funderId),
  ]);
  if (!org) throw new AppError('Organization not found', 404);
  if (!funder) throw new AppError('Funder not found', 404);

  let emailContent = AI_FALLBACK;

  if (openai) {
    try {
      const prompt = `Write a short professional outreach email from ${org.name} to ${funder.name}.
The agency is a ${org.agencyTypes?.[0] || 'public safety'} agency serving ${org.populationServed || 'the community'} people.
Their main challenge: ${org.mainProblems?.join(', ') || 'communications infrastructure needs'}.
The funder supports: ${funder.fundingCategories?.join(', ') || 'public safety'}.
Return JSON only with keys: subject (string), contactName (string), body (plain text under 200 words).`;

      const res = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
      });
      const raw = res.choices[0]?.message?.content?.trim() || '';
      const cleaned = raw.replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim();
      emailContent = JSON.parse(cleaned);
    } catch (e) {
      logger.warn('[Outreach] AI generation failed, using fallback:', e.message);
      emailContent = AI_FALLBACK;
    }
  }

  const record = await Outreach.create({
    organization: organizationId,
    funder: funderId,
    user: userId,
    subject: emailContent.subject || AI_FALLBACK.subject,
    contactName: funder.contactName || emailContent.contactName || 'Program Officer',
    body: emailContent.body || AI_FALLBACK.body,
    status: 'draft',
  });

  return record;
};

const generateFromOpportunity = async (opportunityId, organizationId, userId) => {
  const [org, opp] = await Promise.all([
    Organization.findById(organizationId),
    Opportunity.findById(opportunityId),
  ]);
  if (!org) throw new AppError('Organization not found', 404);
  if (!opp) throw new AppError('Opportunity not found', 404);

  let emailContent = AI_FALLBACK;

  if (openai) {
    try {
      const prompt = `Write a short professional outreach email from ${org.name} to ${opp.funder}.
Agency type: ${org.agencyTypes?.[0] || 'public safety'}. Grant: ${opp.title}.
Return JSON only with keys: subject, contactName, body (under 200 words).`;

      const res = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 400,
      });
      const raw = res.choices[0]?.message?.content?.trim() || '';
      const cleaned = raw.replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim();
      emailContent = JSON.parse(cleaned);
    } catch (e) {
      logger.warn('[Outreach] AI generation failed, using fallback:', e.message);
    }
  }

  const record = await Outreach.create({
    organization: organizationId,
    opportunity: opportunityId,
    user: userId,
    subject: emailContent.subject || AI_FALLBACK.subject,
    contactName: emailContent.contactName || 'Program Officer',
    body: emailContent.body || AI_FALLBACK.body,
    status: 'draft',
  });

  return record;
};

const getAll = async ({ page = 1, limit = 20, userId, organizationId } = {}) => {
  const query = {};
  if (userId) query.user = userId;
  if (organizationId) query.organization = organizationId;

  return Outreach.paginate(query, {
    page: parseInt(page),
    limit: parseInt(limit),
    sort: { createdAt: -1 },
    populate: [
      { path: 'funder', select: 'name contactName contactEmail' },
      { path: 'opportunity', select: 'title funder' },
      { path: 'organization', select: 'name' },
    ],
  });
};

const getOne = async (id) => {
  const record = await Outreach.findById(id)
    .populate('funder', 'name contactName contactEmail')
    .populate('opportunity', 'title funder')
    .populate('organization', 'name');
  if (!record) throw new AppError('Outreach email not found', 404);
  return record;
};

const update = async (id, data) => {
  const record = await Outreach.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!record) throw new AppError('Outreach email not found', 404);
  return record;
};

const markSent = async (id) => {
  const record = await Outreach.findByIdAndUpdate(
    id,
    { status: 'sent', sentAt: new Date() },
    { new: true }
  );
  if (!record) throw new AppError('Outreach email not found', 404);
  return record;
};

module.exports = { generateFromFunder, generateFromOpportunity, getAll, getOne, update, markSent };
