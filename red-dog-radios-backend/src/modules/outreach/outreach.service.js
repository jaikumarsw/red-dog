const Outreach = require('./outreach.schema');
const Organization = require('../organizations/organization.schema');
const Funder = require('../funders/funder.schema');
const Opportunity = require('../opportunities/opportunity.schema');
const openai = require('../../config/openai.config');
const logger = require('../../utils/logger');
const { AppError } = require('../../middlewares/error.middleware');
const { sendEmail } = require('../../config/email.config');
const { marked } = require('marked');

const AI_FALLBACK = {
  subject: 'Partnership Opportunity: Communications Infrastructure for Public Safety',
  contactName: 'Program Officer',
  body: 'Dear Program Officer,\n\nI am reaching out on behalf of our agency to express our strong interest in partnering with your organization. Our agency serves a community facing significant communications infrastructure challenges that directly impact emergency response.\n\nWe believe our mission closely aligns with your commitment to public safety and community resilience. We would welcome the opportunity to discuss how grant funding could help us address these critical needs.\n\nWould you be available for a brief conversation in the coming weeks?\n\nThank you for your consideration.\n\nSincerely,\n[Agency Representative]',
};

const OUTREACH_AI_SYSTEM_PROMPT =
  'You are a professional grant coordinator for a public safety agency. You write relationship-building outreach emails to grant funders that open doors and start conversations.\n\n' +
  'Your emails always:\n' +
  '- Are under 180 words — funders are busy people\n' +
  '- Open with one sentence about who you are and who you protect\n' +
  "- Reference the funder's specific mission or program by name\n" +
  "- State the specific equipment need in plain language (e.g., 'replace our 15-year-old radio fleet')\n" +
  '- Include one compelling statistic (population served, coverage area, call volume, or equipment age)\n' +
  '- Request a specific next step (call, email, application review)\n' +
  '- Close with genuine appreciation, not flattery\n' +
  '- Sound like a real human wrote it — not a mail merge template\n\n' +
  'You never write:\n' +
  "- 'I hope this email finds you well'\n" +
  "- 'We are reaching out to express our interest'\n" +
  "- 'Please do not hesitate to contact us'\n" +
  '- Anything longer than 3 short paragraphs\n' +
  '- Generic phrases that could apply to any agency\n\n' +
  'The tone is: professional, direct, mission-driven, and human.';

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
        messages: [
          { role: 'system', content: OUTREACH_AI_SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        max_tokens: 500,
      });
      const raw = res.choices[0]?.message?.content?.trim() || '';
      const cleaned = raw.replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim();
      emailContent = JSON.parse(cleaned);
      if (emailContent.body) {
        emailContent.body = emailContent.body
          .replace(/\[DATA NEEDED\][^\n]*/g, '')
          .replace(/\n{3,}/g, '\n\n')
          .trim();
      }
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
        messages: [
          { role: 'system', content: OUTREACH_AI_SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        max_tokens: 400,
      });
      const raw = res.choices[0]?.message?.content?.trim() || '';
      const cleaned = raw.replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim();
      emailContent = JSON.parse(cleaned);
      if (emailContent.body) {
        emailContent.body = emailContent.body
          .replace(/\[DATA NEEDED\][^\n]*/g, '')
          .replace(/\n{3,}/g, '\n\n')
          .trim();
      }
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
      { path: 'opportunity', populate: { path: 'funderId', select: 'contactEmail contactName contactPhone' } },
      { path: 'organization', select: 'name' },
    ],
  });
};

const getOne = async (id) => {
  const record = await Outreach.findById(id)
    .populate('funder', 'name contactName contactEmail')
    .populate({ path: 'opportunity', populate: { path: 'funderId', select: 'contactEmail contactName contactPhone' } })
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

const send = async (id) => {
  const record = await Outreach.findById(id)
    .populate('funder', 'contactEmail contactName name')
    .populate({ path: 'opportunity', populate: { path: 'funderId', select: 'contactEmail contactName contactPhone' } })
    .populate('organization', 'name');

  if (!record) throw new AppError('Outreach record not found', 404);

  const recipient = record.funder?.contactEmail || record.opportunity?.funderId?.contactEmail;
  if (!recipient) {
    throw new AppError('No contact email on file for this funder — please ask your admin to update the funder record.', 400);
  }

  // Final cleanup of placeholders just in case
  const cleanedBody = String(record.body || '')
    .replace(/\[DATA NEEDED\][^\n]*/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Convert to HTML
  const bodyHtml = marked.parse(cleanedBody);

  const htmlBody = `
    <p>Dear ${record.contactName || record.funder?.contactName || record.opportunity?.funderId?.contactName || 'Program Officer'},</p>
    <br/>
    ${bodyHtml}
    <br/>
    <p>Best regards,<br/>${record.organization?.name || 'Red Dog Radios'}</p>
  `;

  const result = await sendEmail({
    to: recipient,
    subject: record.subject || 'Grant Outreach',
    html: htmlBody,
    organizationId: record.organization._id,
  });

  if (result.success || result.stub) {
    await Outreach.findByIdAndUpdate(id, { status: 'sent', sentAt: new Date() });
  }

  return {
    sent: result.success || false,
    id: result.id,
  };
};

module.exports = { generateFromFunder, generateFromOpportunity, getAll, getOne, update, markSent, send };
