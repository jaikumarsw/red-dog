const Application = require('./application.schema');
const Organization = require('../organizations/organization.schema');
const Opportunity = require('../opportunities/opportunity.schema');
const Funder = require('../funders/funder.schema');
const Win = require('../wins/win.schema');
const openai = require('../../config/openai.config');
const logger = require('../../utils/logger');
const { AppError } = require('../../middlewares/error.middleware');

const AI_FALLBACK_CONTENT = {
  problemStatement: "Our agency faces critical communications infrastructure challenges that directly impact emergency response capabilities. Outdated radio equipment creates dangerous dead zones throughout our coverage area, delaying response times and putting both officers and the public at risk. Without reliable communications, our ability to coordinate effectively during major incidents is severely compromised.",
  communityImpact: "Our community depends on our agency for immediate emergency response. Improved communications will reduce average response times by an estimated 20-30%, potentially saving lives during critical incidents. The entire coverage area will benefit from seamless radio communications that ensure no call goes unanswered.",
  proposedSolution: "We propose to replace our aging radio fleet with modern P25-compatible digital radios and install repeater infrastructure to eliminate dead zones. This solution will provide interoperability with neighboring agencies and state emergency management systems. The upgrade includes portable radios, mobile units, and a dispatch console upgrade.",
  measurableOutcomes: "Within 12 months we will eliminate identified dead zones, achieve 99.9% radio coverage across our jurisdiction, and reduce communications-related response delays by 25%. We will track and report quarterly on coverage maps, response time data, and inter-agency coordination incidents.",
  urgency: "Our current equipment is beyond its service life and replacement parts are no longer available. Three critical radio failures in the past year have highlighted the immediate danger this poses to officer safety. Continued delay increases the risk of a communications failure during a major incident.",
  budgetSummary: "Total project budget: Amount requested. Funds will cover hardware procurement, installation, programming, and 12 months of technical support. All equipment meets APCO P25 standards for public safety interoperability. A detailed line-item budget is available upon request.",
};

const buildAIContent = async (org, funder, opp) => {
  if (!openai) return AI_FALLBACK_CONTENT;
  try {
    const prompt = `Generate a professional grant application with exactly these 6 labeled sections.
Return ONLY a JSON object with keys: problemStatement, communityImpact, proposedSolution, measurableOutcomes, urgency, budgetSummary.

Agency: ${org.name}, ${org.agencyTypes?.[0] || 'public safety'}, ${org.location || 'our area'}
Population served: ${org.populationServed || 'the community'}
Coverage area: ${org.coverageArea || 'our coverage area'}
Number of staff: ${org.numberOfStaff || 'our staff'}
Current equipment: ${org.currentEquipment || 'existing equipment'}
Main problems: ${org.mainProblems?.join(', ') || 'communications challenges'}
Funding priorities: ${org.fundingPriorities?.join(', ') || org.programAreas?.join(', ') || 'infrastructure improvements'}

Funder: ${funder?.name || opp?.funder || 'the funder'}
Funder mission: ${funder?.missionStatement || 'public safety and community resilience'}
Funder categories: ${funder?.fundingCategories?.join(', ') || opp?.keywords?.join(', ') || 'public safety'}
Typical grant: ${funder ? '$' + (funder.avgGrantMin || 0).toLocaleString() + ' - $' + (funder.avgGrantMax || 0).toLocaleString() : (opp?.maxAmount ? 'up to $' + opp.maxAmount.toLocaleString() : 'amount requested')}

Write each section in the first person as the agency. Be specific, outcome-focused, compelling. 3-5 sentences each.`;

    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are an expert grant writer specializing in public safety and communications for police, fire, and EMS agencies. Always return valid JSON only.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 1200,
    });
    const raw = res.choices[0]?.message?.content?.trim() || '';
    const cleaned = raw.replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    logger.warn('[Application] AI generation failed, using fallback:', e.message);
    return AI_FALLBACK_CONTENT;
  }
};

const getAll = async ({ page = 1, limit = 20, status, organizationId } = {}) => {
  const query = {};
  if (status) query.status = status;
  if (organizationId) query.organization = organizationId;
  return Application.paginate(query, {
    page: parseInt(page),
    limit: parseInt(limit),
    sort: { createdAt: -1 },
    populate: [
      { path: 'organization', select: 'name location' },
      { path: 'opportunity', select: 'title funder maxAmount deadline' },
      { path: 'funder', select: 'name avgGrantMax deadline' },
    ],
  });
};

const create = async (data) => Application.create(data);

const createWithAI = async ({ opportunityId, funderId, organizationId, userId }) => {
  const org = await Organization.findById(organizationId);
  if (!org) throw new AppError('Organization not found', 404);

  let opp = null, funder = null;
  if (opportunityId) {
    opp = await Opportunity.findById(opportunityId);
    if (!opp) throw new AppError('Opportunity not found', 404);
  }
  if (funderId) {
    funder = await Funder.findById(funderId);
    if (!funder) throw new AppError('Funder not found', 404);
    if (funder.isLocked) throw new AppError('This funder has reached the maximum application limit', 423);
    const existingApp = await Application.findOne({ organization: organizationId, funder: funderId });
    if (existingApp && !['denied','rejected'].includes(existingApp.status)) return existingApp;
  }

  const aiContent = await buildAIContent(org, funder, opp);
  const app = await Application.create({
    organization: organizationId,
    opportunity: opportunityId || undefined,
    funder: funderId || undefined,
    status: 'drafting',
    projectTitle: funder ? org.name + ' — ' + funder.name + ' Grant Application' : (opp ? opp.title : 'Grant Application'),
    contactName: org.name,
    dateStarted: new Date(),
    ...aiContent,
  });

  if (funder) {
    funder.currentApplicationCount = (funder.currentApplicationCount || 0) + 1;
    if (funder.currentApplicationCount >= funder.maxApplicationsAllowed) funder.isLocked = true;
    await funder.save();
  }
  return app;
};

const getOne = async (id) => {
  const app = await Application.findById(id).populate('organization').populate('opportunity').populate('funder');
  if (!app) throw new AppError('Application not found', 404);
  return app;
};

const update = async (id, data) => {
  const app = await Application.findByIdAndUpdate(id, data, { new: true, runValidators: true })
    .populate('organization').populate('opportunity').populate('funder');
  if (!app) throw new AppError('Application not found', 404);
  return app;
};

const updateStatus = async (id, { status, dateSubmitted, followUpDate, notes }) => {
  const updateData = { status };
  if (['submitted','in_review'].includes(status)) {
    updateData.dateSubmitted = dateSubmitted || new Date();
    updateData.submittedAt = dateSubmitted || new Date();
  }
  if (followUpDate) updateData.followUpDate = followUpDate;
  if (notes !== undefined) updateData.notes = notes;

  const app = await Application.findByIdAndUpdate(id, updateData, { new: true })
    .populate('organization').populate('opportunity').populate('funder');
  if (!app) throw new AppError('Application not found', 404);

  if (status === 'awarded') {
    await Application.findByIdAndUpdate(id, { isWinner: true });
    try {
      await Win.create({
        applicationId: app._id,
        agencyType: app.organization?.agencyTypes?.[0] || 'unknown',
        fundingType: 'grant',
        projectType: app.opportunity?.category || 'public safety',
        funderName: app.funder?.name || app.opportunity?.funder,
        awardAmount: app.funder?.avgGrantMax || app.opportunity?.maxAmount || app.amountRequested,
        problemStatement: app.problemStatement || app.projectSummary,
        communityImpact: app.communityImpact,
        proposedSolution: app.proposedSolution,
        measurableOutcomes: app.measurableOutcomes,
        urgency: app.urgency,
        budgetSummary: app.budgetSummary,
      });
    } catch (e) { logger.warn('[Application] Failed to create win record:', e.message); }
  }
  return app;
};

const regenerate = async (id) => {
  const app = await Application.findById(id).populate('organization').populate('opportunity').populate('funder');
  if (!app) throw new AppError('Application not found', 404);
  const aiContent = await buildAIContent(app.organization, app.funder, app.opportunity);
  await Application.findByIdAndUpdate(id, aiContent);
  return Application.findById(id).populate('organization').populate('opportunity').populate('funder');
};

const alignToFunder = async (id) => {
  const app = await Application.findById(id).populate('organization').populate('opportunity').populate('funder');
  if (!app) throw new AppError('Application not found', 404);
  const funder = app.funder;
  const fallback = {
    problemStatement: app.problemStatement || AI_FALLBACK_CONTENT.problemStatement,
    communityImpact: app.communityImpact || AI_FALLBACK_CONTENT.communityImpact,
    proposedSolution: app.proposedSolution || AI_FALLBACK_CONTENT.proposedSolution,
    measurableOutcomes: app.measurableOutcomes || AI_FALLBACK_CONTENT.measurableOutcomes,
    urgency: app.urgency || AI_FALLBACK_CONTENT.urgency,
    budgetSummary: app.budgetSummary || AI_FALLBACK_CONTENT.budgetSummary,
    generatedAt: new Date(),
  };
  if (!openai) { app.alignedVersion = fallback; await app.save(); return fallback; }
  try {
    const prompt = `Rewrite these grant application sections to align with this funder's mission and tone. Match their vocabulary exactly.
Funder: ${funder?.name || 'the funder'}
Funder mission: ${funder?.missionStatement || 'public safety'}
Funder categories: ${funder?.fundingCategories?.join(', ') || 'public safety'}
Original sections: ${JSON.stringify({ problemStatement: app.problemStatement, communityImpact: app.communityImpact, proposedSolution: app.proposedSolution, measurableOutcomes: app.measurableOutcomes, urgency: app.urgency, budgetSummary: app.budgetSummary })}
Return same 6 keys rewritten to match funder's voice.`;
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are an expert grant writer. Rewrite to mirror funder language while keeping facts.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 1200,
    });
    const raw = res.choices[0]?.message?.content?.trim() || '';
    const aligned = { ...JSON.parse(raw.replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim()), generatedAt: new Date() };
    app.alignedVersion = aligned; await app.save(); return aligned;
  } catch (e) {
    logger.warn('[Application] Align failed:', e.message);
    app.alignedVersion = fallback; await app.save(); return fallback;
  }
};

const exportApplication = async (id) => {
  const app = await Application.findById(id).populate('organization').populate('opportunity').populate('funder');
  if (!app) throw new AppError('Application not found', 404);
  const funderName = app.funder?.name || app.opportunity?.funder || 'Unknown Funder';
  const orgName = app.organization?.name || 'Unknown Agency';
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  return `GRANT APPLICATION\nAgency: ${orgName}\nFunder: ${funderName}\nProject: ${app.projectTitle || 'Grant Application'}\nDate: ${today}\n${'='.repeat(60)}\n\nPROBLEM STATEMENT:\n${app.problemStatement || app.projectSummary || 'Not provided'}\n\n${'='.repeat(60)}\n\nCOMMUNITY IMPACT:\n${app.communityImpact || 'Not provided'}\n\n${'='.repeat(60)}\n\nPROPOSED SOLUTION:\n${app.proposedSolution || 'Not provided'}\n\n${'='.repeat(60)}\n\nMEASURABLE OUTCOMES:\n${app.measurableOutcomes || 'Not provided'}\n\n${'='.repeat(60)}\n\nURGENCY:\n${app.urgency || 'Not provided'}\n\n${'='.repeat(60)}\n\nBUDGET SUMMARY:\n${app.budgetSummary || 'Not provided'}\n\n${'='.repeat(60)}\n\nNOTES:\n${app.notes || 'None'}\n`;
};

const submit = async (id) => {
  const app = await Application.findByIdAndUpdate(id, { status: 'submitted', submittedAt: new Date(), dateSubmitted: new Date() }, { new: true });
  if (!app) throw new AppError('Application not found', 404);
  return app;
};

const remove = async (id) => {
  const app = await Application.findByIdAndDelete(id);
  if (!app) throw new AppError('Application not found', 404);
  return app;
};

module.exports = { getAll, create, createWithAI, getOne, update, updateStatus, regenerate, alignToFunder, exportApplication, submit, remove };
