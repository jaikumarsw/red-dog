const openai = require('../../config/openai.config');
const Opportunity = require('../opportunities/opportunity.schema');
const Organization = require('../organizations/organization.schema');
const { AppError } = require('../../middlewares/error.middleware');
const Funder = require('../funders/funder.schema');
const Application = require('../applications/application.schema');
const logger = require('../../utils/logger');

const callOpenAI = async (prompt, parseJson = false) => {
  if (!openai) {
    logger.info('[STUB] OpenAI not configured — returning stub response');
    return null;
  }
  let text = '';
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 800,
    });
    text = response.choices[0]?.message?.content?.trim() || '';
  } catch (err) {
    const e = err || {};
    const status = e.status || e.statusCode || e.response?.status;
    const code = e.code || e.error?.code || e.response?.data?.error?.code;
    const message = e.message || e.response?.data?.error?.message || '';

    // OpenAI quota / rate-limit should not surface as a 500.
    if (status === 429 || code === 'insufficient_quota') {
      throw new AppError('AI service temporarily unavailable. Please try again later.', 503);
    }

    logger.error('[OpenAI] request failed:', message || String(err));
    throw err;
  }
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

const generateOutreachEmail = async (opportunityId, organizationId, contactName, senderName, senderCompany, grantId) => {
  const [opp, org, app] = await Promise.all([
    Opportunity.findById(opportunityId),
    Organization.findById(organizationId),
    grantId ? Application.findById(grantId) : null,
  ]);
  if (!opp) throw new AppError('Opportunity not found', 404);
  if (!org) throw new AppError('Organization not found', 404);

  // Fetch funder record for additional context
  const funder = await Funder.findOne({ name: opp.funder });

  // Map agency/org fields to the logical names required by the prompt
  const agencyData = {
    organisation_name: org.name,
    jurisdiction: org.location,
    department_type: org.agencyTypes?.[0] || 'Public Safety Agency',
    department_size: org.staffSizeRange || org.numberOfStaff,
    current_equipment_status: org.currentEquipment,
    stated_needs: org.specificRequest,
    budget_constraints: org.budgetRange,
    operational_challenges: org.challenges && org.challenges.length > 0 ? org.challenges.join(', ') : null,
  };

  const funderData = {
    name: funder?.name || opp.funder,
    mission: funder?.missionStatement,
    focus_area: funder?.fundingCategories && funder.fundingCategories.length > 0 ? funder.fundingCategories.join(', ') : funder?.locationFocus?.join(', '),
    eligibility_criteria: funder?.agencyTypesFunded && funder.agencyTypesFunded.length > 0 ? funder.agencyTypesFunded.join(', ') : null,
  };

  const opportunityData = {
    title: opp.title,
    grant_amount: opp.minAmount && opp.maxAmount ? `$${opp.minAmount} - $${opp.maxAmount}` : (opp.maxAmount ? `Up to $${opp.maxAmount}` : null),
    tags: opp.keywords && opp.keywords.length > 0 ? opp.keywords.join(', ') : null,
    focus_area: opp.category,
  };

  const applicationData = {
    stated_use_of_funds: app?.projectSummary || app?.executiveSummary,
  };

  const systemPrompt = `You are Ashlyn, an expert grant outreach AI. 

Before writing, analyse the funder's mission statement, focus area, and eligibility criteria. Identify the language register they use (e.g. formal/policy-oriented, community-focused, technical/equipment-focused) and write the entire email in that register. Do not add a generic professional tone — match the funder's voice specifically. This alignment must happen automatically without any manual instruction from the agency.

Write a compelling, personalised outreach email from ${senderName} at ${senderCompany} to ${contactName}. 
Use exactly these six sections in this order:

Section 1 — Opening
Introduce the agency by name, jurisdiction (city, county, and state), department type (e.g. volunteer fire department, municipal fire department), and public safety role.
Pull from: agency.organisation_name, agency.jurisdiction, agency.department_type.

Section 2 — The Need
Describe the specific equipment or resource gap the department is currently facing. This must be concrete and specific — not a generic statement about needing funding.
Pull from: agency.current_equipment_status, agency.stated_needs.

Section 3 — The Challenge
Explain the budget or operational obstacles that prevent the department from addressing this need without external funding. This must feel real and grounded, not boilerplate.
Pull from: agency.budget_constraints, agency.operational_challenges.

Section 4 — The Ask
State precisely what the grant funding will be used for and what the measurable expected outcome is. Be specific about items, quantities, or outcomes where the data supports it.
Pull from: opportunity.grant_amount, application.stated_use_of_funds, agency.stated_needs.

Section 5 — The Match
Explain why this specific funder and grant aligns with the agency's eligibility, mission, and focus area. Reference the funder's own priorities back to them — this section should feel like it was written with knowledge of the funder, not copied from a template.
Pull from: funder.mission, funder.eligibility_criteria, opportunity.tags, opportunity.focus_area.

Section 6 — Call to Action
Close with a single, clear next step. Options: confirm receipt, schedule a brief call, or request a meeting. Do not use multiple CTAs. Keep it direct and easy to act on.

If any field is missing or null in the data below, skip that detail gracefully rather than hallucinating.

Return ONLY valid JSON format: { "subject": "...", "body": "..." }`;

  const dataContext = `
AGENCY DATA:
${JSON.stringify(agencyData, null, 2)}

FUNDER DATA:
${JSON.stringify(funderData, null, 2)}

OPPORTUNITY DATA:
${JSON.stringify(opportunityData, null, 2)}

APPLICATION DATA:
${JSON.stringify(applicationData, null, 2)}

CONTACT NAME: ${contactName}
SENDER NAME: ${senderName}
SENDER COMPANY: ${senderCompany}
`;

  const result = await callOpenAI(`${systemPrompt}\n\nCONTEXT DATA:\n${dataContext}`, true);

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
