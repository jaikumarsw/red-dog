const openai = require('../../config/openai.config');
const Opportunity = require('../opportunities/opportunity.schema');
const Organization = require('../organizations/organization.schema');
const { AppError } = require('../../middlewares/error.middleware');
const logger = require('../../utils/logger');

const callOpenAI = async (prompt, parseJson = false) => {
  if (!openai) {
    logger.info('[STUB] OpenAI not configured — returning stub response');
    return null;
  }
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 800,
  });
  const text = response.choices[0]?.message?.content?.trim() || '';
  if (parseJson) {
    try {
      const cleaned = text.replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim();
      return JSON.parse(cleaned);
    } catch {
      throw new AppError('AI returned invalid JSON', 502);
    }
  }
  return text;
};

const generateGrantSummary = async (opportunityId) => {
  const opp = await Opportunity.findById(opportunityId);
  if (!opp) throw new AppError('Opportunity not found', 404);

  const result = await callOpenAI(
    `Summarize this grant opportunity in 2-3 plain English sentences. Focus on who it's for, what it funds, and the deadline. Opportunity data: ${JSON.stringify(opp)}`
  );

  return {
    summary: result || `${opp.title} is offered by ${opp.funder}. It supports organizations in the public safety and emergency services sector. ${opp.deadline ? `Deadline: ${new Date(opp.deadline).toLocaleDateString()}.` : 'No deadline specified.'}`,
  };
};

const generateOutreachEmail = async (opportunityId, organizationId, contactName, senderName, senderCompany) => {
  const [opp, org] = await Promise.all([
    Opportunity.findById(opportunityId),
    Organization.findById(organizationId),
  ]);
  if (!opp) throw new AppError('Opportunity not found', 404);
  if (!org) throw new AppError('Organization not found', 404);

  const result = await callOpenAI(
    `Write a concise professional outreach email. From ${senderName} at ${senderCompany} to ${contactName}. About this grant opportunity: ${JSON.stringify(opp)}. Organization context: ${JSON.stringify(org)}. Return JSON only: { "subject": "...", "body": "..." }`,
    true
  );

  return result || {
    subject: `Grant Opportunity: ${opp.title}`,
    body: `Dear ${contactName},\n\nI am writing on behalf of ${senderCompany} regarding the "${opp.title}" grant offered by ${opp.funder}. We believe ${org.name} is well-positioned to apply given our mission and programmatic focus.\n\nWe would appreciate the opportunity to discuss this further.\n\nBest regards,\n${senderName}`,
  };
};

const generateApplication = async (opportunityId, organizationId) => {
  const [opp, org] = await Promise.all([
    Opportunity.findById(opportunityId),
    Organization.findById(organizationId),
  ]);
  if (!opp) throw new AppError('Opportunity not found', 404);
  if (!org) throw new AppError('Organization not found', 404);

  const result = await callOpenAI(
    `Write a grant application for ${org.name} applying to ${opp.title}. Include: projectTitle, projectSummary (2 paragraphs), communityImpact (1 paragraph). Return JSON only: { "projectTitle": "...", "projectSummary": "...", "communityImpact": "..." }`,
    true
  );

  return result || {
    projectTitle: `${org.name} — ${opp.title} Initiative`,
    projectSummary: `${org.name} seeks funding from ${opp.funder} to enhance our capacity to serve the community through targeted programs aligned with our mission. Our organization has a proven track record of delivering measurable outcomes in public safety and emergency communications.\n\nThis grant will enable us to expand our current programs, reach underserved populations, and build long-term resilience in our operational infrastructure.`,
    communityImpact: `The proposed initiative will directly benefit thousands of community members by strengthening emergency response capabilities, improving coordination among partner agencies, and ensuring that critical communications infrastructure remains robust and reliable for years to come.`,
  };
};

const computeMatchWithAI = async (opportunityId, organizationId) => {
  const [opp, org] = await Promise.all([
    Opportunity.findById(opportunityId),
    Organization.findById(organizationId),
  ]);
  if (!opp) throw new AppError('Opportunity not found', 404);
  if (!org) throw new AppError('Organization not found', 404);

  const result = await callOpenAI(
    `Score the fit between this organization and grant opportunity from 0 to 100. Organization: ${JSON.stringify(org)}. Opportunity: ${JSON.stringify(opp)}. Return JSON only: { "score": 75, "reasons": ["reason 1", "reason 2"] }`,
    true
  );

  return result ? { fitScore: result.score, reasons: result.reasons } : {
    fitScore: 55,
    reasons: ['AI scoring not available — using stub score', 'Organization profile partially matches opportunity criteria'],
  };
};

module.exports = { generateGrantSummary, generateOutreachEmail, generateApplication, computeMatchWithAI };
