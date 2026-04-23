const Application = require('./application.schema');
const Organization = require('../organizations/organization.schema');
const Opportunity = require('../opportunities/opportunity.schema');
const Funder = require('../funders/funder.schema');
const Win = require('../wins/win.schema');
const User = require('../auth/user.schema');
const FollowUp = require('../followups/followup.schema');
const followupService = require('../followups/followup.service');
const openai = require('../../config/openai.config');
const logger = require('../../utils/logger');
const { AppError } = require('../../middlewares/error.middleware');
const { sendApplicationStatusEmail } = require('../../config/email.config');

const AI_FALLBACK_CONTENT = {
  problemStatement: "Our agency faces critical communications infrastructure challenges that directly impact emergency response capabilities. Outdated radio equipment creates dangerous dead zones throughout our coverage area, delaying response times and putting both officers and the public at risk. Without reliable communications, our ability to coordinate effectively during major incidents is severely compromised.",
  communityImpact: "Our community depends on our agency for immediate emergency response. Improved communications will reduce average response times by an estimated 20-30%, potentially saving lives during critical incidents. The entire coverage area will benefit from seamless radio communications that ensure no call goes unanswered.",
  proposedSolution: "We propose to replace our aging radio fleet with modern P25-compatible digital radios and install repeater infrastructure to eliminate dead zones. This solution will provide interoperability with neighboring agencies and state emergency management systems. The upgrade includes portable radios, mobile units, and a dispatch console upgrade.",
  measurableOutcomes: "Within 12 months we will eliminate identified dead zones, achieve 99.9% radio coverage across our jurisdiction, and reduce communications-related response delays by 25%. We will track and report quarterly on coverage maps, response time data, and inter-agency coordination incidents.",
  urgency: "Our current equipment is beyond its service life and replacement parts are no longer available. Three critical radio failures in the past year have highlighted the immediate danger this poses to officer safety. Continued delay increases the risk of a communications failure during a major incident.",
  budgetSummary: "Total project budget: Amount requested. Funds will cover hardware procurement, installation, programming, and 12 months of technical support. All equipment meets APCO P25 standards for public safety interoperability. A detailed line-item budget is available upon request.",
};

const pickOrgForPrompt = (org) => ({
  name: org.name,
  location: org.location,
  agencyTypes: org.agencyTypes,
  populationServed: org.populationServed,
  coverageArea: org.coverageArea,
  numberOfStaff: org.numberOfStaff,
  currentEquipment: org.currentEquipment,
  mainProblems: org.mainProblems,
  fundingPriorities: org.fundingPriorities,
  programAreas: org.programAreas,
  focusAreas: org.focusAreas,
  missionStatement: org.missionStatement,
  budgetRange: org.budgetRange,
  timeline: org.timeline,
  goals: org.goals,
  canMeetLocalMatch: org.canMeetLocalMatch,
});

const deriveWinFactorsFromApp = (app) => {
  const factors = [];
  const ps = app.problemStatement || app.projectSummary || '';
  if (ps.length > 180) factors.push('Detailed problem statement');
  if ((app.communityImpact || '').length > 180) factors.push('Strong community impact narrative');
  if ((app.measurableOutcomes || '').length > 120) factors.push('Clear measurable outcomes');
  if ((app.budgetSummary || '').length > 80) factors.push('Concrete budget summary');
  if ((app.proposedSolution || '').length > 120) factors.push('Clear proposed solution');
  if ((app.urgency || '').length > 60) factors.push('Documented urgency');
  return factors.length ? factors : ['Complete structured application'];
};

const pickFunderForPrompt = (funder) =>
  funder && {
    name: funder.name,
    missionStatement: funder.missionStatement,
    locationFocus: funder.locationFocus,
    fundingCategories: funder.fundingCategories,
    agencyTypesFunded: funder.agencyTypesFunded,
    avgGrantMin: funder.avgGrantMin,
    avgGrantMax: funder.avgGrantMax,
    deadline: funder.deadline,
    cyclesPerYear: funder.cyclesPerYear,
    pastGrantsAwarded: funder.pastGrantsAwarded,
    notes: funder.notes,
    website: funder.website,
    localMatchRequired: funder.localMatchRequired,
    equipmentTags: funder.equipmentTags,
  };

const buildAIContent = async (org, funder, opp, { adminPortal = false } = {}) => {
  if (!openai) return AI_FALLBACK_CONTENT;
  try {
    const recentWins = await Win.find().sort({ createdAt: -1 }).limit(10).lean();
    const winPatternsBlock =
      recentWins.length > 0
        ? `\n\nPAST_WINNING_APPLICATIONS_THEMES (emphasize similar ideas only when accurate for this agency):\n${recentWins
            .map(
              (w) =>
                `- ${w.funderName || 'Funder'} (${w.agencyType || 'agency type'}): ${(w.winFactors || []).join('; ') || 'n/a'}`
            )
            .join('\n')}`
        : '';

    const systemContent =
      "You are a senior public safety grant writer with 20 years of " +
      "experience winning competitive federal and foundation grants for " +
      "fire departments, police agencies, EMS services, sheriff offices, " +
      "and 911 dispatch centers across the United States.\n\n" +
      "You have written hundreds of winning applications for:\n" +
      "- FEMA AFG (Assistance to Firefighters Grant)\n" +
      "- FEMA SAFER (Staffing for Adequate Fire and Emergency Response)\n" +
      "- DHS SHSP (State Homeland Security Program)\n" +
      "- DHS UASI (Urban Area Security Initiative)\n" +
      "- DOJ COPS Office grants\n" +
      "- Byrne JAG (Justice Assistance Grant)\n" +
      "- NTIA communications infrastructure grants\n" +
      "- State homeland security pass-through grants\n" +
      "- Private foundations including Motorola Solutions, " +
      "Firehouse Subs, and community foundations\n\n" +
      "You know exactly what peer reviewers score and what gets " +
      "applications funded vs rejected. You write with the precision " +
      "of someone who has sat on AFG peer review panels.\n\n" +
      "CRITICAL SCORING KNOWLEDGE YOU APPLY TO EVERY APPLICATION:\n\n" +
      "1. FINANCIAL NEED (25% of federal scores):\n" +
      "   - Always explain why the agency cannot self-fund this purchase\n" +
      "   - Reference the department budget going to personnel, operations\n" +
      "   - Mention failed attempts to secure other funding if relevant\n" +
      "   - Never make the agency sound wealthy or able to defer this need\n" +
      "   - Show that grant funding is the ONLY viable path forward\n\n" +
      "2. PROJECT DESCRIPTION (25% of federal scores):\n" +
      "   - Name specific equipment with make/model where known\n" +
      "   - Reference compliance with NFPA, OSHA, P25, or APCO standards\n" +
      "   - State exact quantities (e.g., '280 portable radios')\n" +
      "   - Describe current equipment age, manufacturer support status\n" +
      "   - Reference end-of-life status, lack of parts, safety failures\n" +
      "   - For radios: reference P25 Phase I/II, DTRS, interoperability\n\n" +
      "3. COST/BENEFIT (25% of federal scores):\n" +
      "   - Include per-unit costs with total project budget\n" +
      "   - Tie every dollar to a specific safety or operational outcome\n" +
      "   - Reference response time improvements in minutes/seconds\n" +
      "   - Show coverage expansion in square miles or percentage\n" +
      "   - Reference population protected per dollar spent\n" +
      "   - Compare cost of grant vs cost of NOT acting (liability, " +
      "     incident risk, mutual aid breakdown)\n\n" +
      "4. STATEMENT OF EFFECT (25% of federal scores):\n" +
      "   - Lead with firefighter/officer life-safety impact\n" +
      "   - Reference NFPA 1, NFPA 72, NFPA 1221 where applicable\n" +
      "   - Include mutual aid and interoperability benefits\n" +
      "   - Reference specific geographic coverage gaps being closed\n" +
      "   - Name neighboring agencies that will benefit from " +
      "     improved interoperability\n" +
      "   - Quantify community protection: population, square miles, " +
      "     response calls per year\n\n" +
      "WRITING RULES YOU NEVER BREAK:\n" +
      "- Always use active voice\n" +
      "- Never use nonprofit/charity language — this is public safety\n" +
      "- Never write 'we hope to' or 'we believe' — write 'this grant " +
      "will' and 'this equipment provides'\n" +
      "- Always include specific numbers: ages, quantities, " +
      "response times, populations, square miles, call volumes\n" +
      "- Reference the funder's mission language directly back to them\n" +
      "- For FEMA grants: use 'enhance operational efficiencies', " +
      "'foster interoperability', 'support community resilience'\n" +
      "- For DHS grants: use 'strengthen preparedness capabilities', " +
      "'enhance interoperable communications', 'address capability gaps'\n" +
      "- For DOJ grants: use 'enhance officer safety', " +
      "'improve community policing outcomes', 'reduce response times'\n" +
      "- For foundations: use 'protect the first responders who protect us', " +
      "'life-safety impact', 'community resilience'\n" +
      "- Always end with the cost of inaction — what happens if " +
      "this grant is NOT awarded\n\n" +
      "PUBLIC SAFETY TERMINOLOGY YOU USE NATURALLY:\n" +
      "P25, DTRS, interoperability, ICS, NIMS, mutual aid, auto aid,\n" +
      "NFPA, APCO, CAD, dispatch, first due, coverage area, dead zones,\n" +
      "officer safety, firefighter safety, life-safety, " +
      "end-of-life equipment, manufacturer support ended, " +
      "out of compliance, SCBA, PPE, apparatus, portable radio,\n" +
      "mobile radio, repeater, talk-around channel, command channel,\n" +
      "tactical channel, encryption, P25 Phase I, P25 Phase II,\n" +
      "digital voice, analog legacy, coverage reliability,\n" +
      "in-building coverage, DAS (Distributed Antenna System)";

    const joinOrDash = (arr) =>
      Array.isArray(arr) && arr.length > 0 ? arr.join(', ') : '—';
    const fmtBool = (v) => (v === true ? 'Yes' : v === false ? 'No' : '—');
    const grantMin = opp?.minAmount != null ? opp.minAmount : '—';
    const grantMax = opp?.maxAmount != null ? opp.maxAmount : '—';
    const funderNameForOpp = funder?.name || opp?.funder || '—';
    const funderMission = funder?.missionStatement || '—';

    const prompt =
      `Generate a complete, competition-ready public safety grant application for the following agency and grant opportunity.\n\n` +
      `AGENCY PROFILE:\n` +
      `- Agency Name: ${org.name || '—'}\n` +
      `- Agency Type: ${joinOrDash(org.agencyTypes)}\n` +
      `- Location: ${org.location || '—'}\n` +
      `- Population Served: ${org.populationServed != null ? org.populationServed : '—'}\n` +
      `- Coverage Area: ${org.coverageArea || '—'}\n` +
      `- Number of Staff: ${org.numberOfStaff != null ? org.numberOfStaff : '—'}\n` +
      `- Annual Call Volume: ${org.annualVolume != null ? org.annualVolume : '—'}\n` +
      `- Current Equipment: ${org.currentEquipment || '—'}\n` +
      `- Main Problems: ${joinOrDash(org.mainProblems)}\n` +
      `- Funding Priorities: ${joinOrDash(org.fundingPriorities)}\n` +
      `- Specific Request: ${org.specificRequest || '—'}\n` +
      `- Challenges: ${joinOrDash(org.challenges)}\n` +
      `- Urgency Statement: ${org.urgencyStatement || '—'}\n` +
      `- Who Benefits: ${org.whobenefits || '—'}\n` +
      `- Budget Range: ${org.budgetRange || '—'}\n` +
      `- Timeline: ${org.timeline || '—'}\n` +
      `- Can Meet Local Match: ${fmtBool(org.canMeetLocalMatch)}\n` +
      `- Eligibility Type: ${org.eligibilityType || '—'}\n` +
      `- Mission Statement: ${org.missionStatement || '—'}\n` +
      `- Service Area: ${org.serviceArea || '—'}\n` +
      `- Staff Size Range: ${org.staffSizeRange || '—'}\n\n` +
      `GRANT OPPORTUNITY:\n` +
      `- Grant Program: ${opp?.title || '—'}\n` +
      `- Funder: ${funderNameForOpp}\n` +
      `- Funder Mission: ${funderMission}\n` +
      `- Grant Range: $${grantMin} - $${grantMax}\n` +
      `- Category: ${opp?.category || '—'}\n` +
      `- Keywords: ${joinOrDash(opp?.keywords)}\n` +
      `- Local Match Required: ${fmtBool(opp?.localMatchRequired)}\n` +
      `- Description: ${opp?.description || '—'}\n` +
      `${winPatternsBlock}\n\n` +
      `Generate a complete grant application with these 8 sections.\n` +
      `Return ONLY valid JSON with these exact keys, no markdown, no extra text:\n\n` +
      `{\n` +
      `  "projectTitle": "A compelling, specific project title.",\n` +
      `  "projectSummary": "2-3 sentence executive summary.",\n` +
      `  "problemStatement": "The specific problem this agency faces.",\n` +
      `  "proposedSolution": "What they will do with the funding.",\n` +
      `  "measurableOutcomes": "3-4 specific measurable outcomes.",\n` +
      `  "budgetSummary": "How funds will be spent.",\n` +
      `  "communityImpact": "2-3 sentences describing the direct impact on the community and residents served. Reference the population served and coverage area from the agency profile.",\n` +
      `  "urgency": "2-3 sentences explaining why this funding is needed NOW. Reference the agency's urgency statement, equipment age, and any safety risks mentioned in the agency profile."\n` +
      `}\n\n` +
      `CRITICAL: Return only the JSON object. No introduction, no explanation, no markdown code blocks. Pure JSON only.\n` +
      `The writing must sound like it was written by an experienced public safety professional, not a generic AI. Use the agency's specific data throughout — never leave generic placeholders.`;

    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemContent },
        { role: 'user', content: prompt },
      ],
      max_tokens: adminPortal ? 2000 : 1200,
    });
    const raw = res.choices[0]?.message?.content?.trim() || '';
    const cleaned = raw.replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    logger.warn('[Application] AI generation failed, using fallback:', e.message);
    return AI_FALLBACK_CONTENT;
  }
};

const { parsePagination } = require('../../utils/parsePagination');

const getAll = async ({ page = 1, limit = 20, status, organizationId } = {}) => {
  const pg = parsePagination({ page, limit });
  const query = {};
  if (status) query.status = status;
  if (organizationId) query.organization = organizationId;
  return Application.paginate(query, {
    page: pg.page,
    limit: pg.limit,
    sort: { createdAt: -1 },
    populate: [
      { path: 'organization', select: 'name location' },
      { path: 'opportunity', select: 'title funder minAmount maxAmount deadline' },
      { path: 'funder', select: 'name avgGrantMax deadline' },
    ],
  });
};

const resolveOpportunityForFunder = async (funderDoc) => {
  if (!funderDoc) return null;
  const opps = await Opportunity.find({ funder: funderDoc.name, status: { $ne: 'closed' } }).sort({ deadline: 1 });
  if (opps.length === 1) return opps[0];
  return null;
};

const resolveOpportunityForAI = async ({ opportunityId, funderId, adminPortal }) => {
  if (opportunityId) {
    const opp = await Opportunity.findById(opportunityId);
    if (!opp) throw new AppError('Opportunity not found', 404);
    return opp;
  }
  if (!funderId) return null;
  const funder = await Funder.findById(funderId);
  if (!funder) throw new AppError('Funder not found', 404);
  const opps = await Opportunity.find({ funder: funder.name, status: { $ne: 'closed' } }).sort({ deadline: 1 });
  if (opps.length === 1) return opps[0];
  if (opps.length === 0) return null;
  if (!adminPortal) {
    throw new AppError(
      'This funder has multiple grant opportunities. Open the grant from Matches or Opportunities to start your application.',
      400
    );
  }
  return null;
};

const bumpOpportunityCountAndMaybeLock = async (opp) => {
  if (!opp) return;
  const max = opp.maxApplicationsAllowed != null ? opp.maxApplicationsAllowed : 0;
  if (max <= 0) return;
  const updated = await Opportunity.findByIdAndUpdate(opp._id, { $inc: { currentApplicationCount: 1 } }, { new: true });
  if (updated && updated.currentApplicationCount >= max) {
    await Opportunity.findByIdAndUpdate(opp._id, { isLocked: true });
  }
};

const bumpFunderCountAndMaybeLock = async (funderId, maxApplicationsAllowed) => {
  if (!funderId) return;
  const max = maxApplicationsAllowed != null ? maxApplicationsAllowed : 0;
  if (max <= 0) return;
  const updated = await Funder.findByIdAndUpdate(funderId, { $inc: { currentApplicationCount: 1 } }, { new: true });
  if (updated && updated.currentApplicationCount >= max) {
    await Funder.findByIdAndUpdate(funderId, { $set: { isLocked: true } });
  }
};

const create = async (data) => {
  if (!data.funder) return Application.create(data);
  const funder = await Funder.findById(data.funder);
  if (!funder) throw new AppError('Funder not found', 404);

  let opp = null;
  if (data.opportunity) {
    opp = await Opportunity.findById(data.opportunity);
    if (!opp) throw new AppError('Opportunity not found', 404);
  } else {
    opp = await resolveOpportunityForFunder(funder);
  }

  if (opp && opp.isLocked) {
    throw new AppError('This opportunity has reached its application limit.', 423);
  }

  const dupQ = { organization: data.organization, funder: data.funder };
  if (opp) dupQ.opportunity = opp._id;
  const existingApp = await Application.findOne(dupQ);
  if (existingApp && !['denied', 'rejected'].includes(existingApp.status)) return existingApp;

  const payload = { ...data };
  if (opp && !payload.opportunity) payload.opportunity = opp._id;

  const app = await Application.create(payload);
  await bumpOpportunityCountAndMaybeLock(opp);
  await bumpFunderCountAndMaybeLock(data.funder, funder.maxApplicationsAllowed);
  return app;
};

const ensureFollowUpsScheduled = async (before, after, actorUserId) => {
  const submittedNow = ['submitted', 'in_review'].includes(after.status);
  const wasSubmitted = ['submitted', 'in_review'].includes(before.status);
  if (!submittedNow || wasSubmitted) return;

  const existing = await FollowUp.countDocuments({ application: after._id });
  if (existing > 0) return;

  let uid = actorUserId;
  if (uid) {
    const u = await User.findById(uid).select('_id');
    if (!u) uid = null;
  }
  if (!uid) {
    const u2 = await User.findOne({ organizationId: after.organization }).sort({ createdAt: 1 }).select('_id');
    uid = u2?._id;
  }
  if (!uid) {
    logger.warn('[Application] follow-up: no user for org', String(after.organization));
    return;
  }

  const baseDate = after.dateSubmitted || after.submittedAt || new Date();
  await followupService.scheduleForApplication(
    after._id,
    uid,
    after.organization,
    after.funder || undefined,
    after.opportunity || undefined,
    baseDate
  );
};

const createWithAI = async ({ opportunityId, funderId, organizationId, userId, adminPortal = false }) => {
  const org = await Organization.findById(organizationId);
  if (!org) throw new AppError('Organization not found', 404);

  let funder = null;
  if (funderId) {
    funder = await Funder.findById(funderId);
    if (!funder) throw new AppError('Funder not found', 404);
  }

  const opp = await resolveOpportunityForAI({ opportunityId, funderId, adminPortal });

  if (opp && opp.isLocked) {
    throw new AppError('This opportunity has reached its application limit.', 423);
  }

  if (!adminPortal) {
    const dupQ = { organization: organizationId };
    if (opp) dupQ.opportunity = opp._id;
    else if (funderId) dupQ.funder = funderId;
    if (dupQ.opportunity || dupQ.funder) {
      const existingApp = await Application.findOne(dupQ);
      if (existingApp && !['denied', 'rejected'].includes(existingApp.status)) return existingApp;
    }
  }

  const parsed = await buildAIContent(org, funder, opp, { adminPortal });
  const resolvedOppId = opp ? opp._id : opportunityId || undefined;

  const app = await Application.create({
    organization: organizationId,
    opportunity: resolvedOppId,
    funder: funderId || undefined,
    submittedBy: userId || undefined,
    status: 'drafting',
    projectTitle: funder
      ? `${org.name} — ${funder.name} Grant Application`
      : opp
        ? opp.title
        : 'Grant Application',
    contactName: org.name,
    dateStarted: new Date(),
    ...parsed,
    communityImpact: parsed.communityImpact,
    urgency: parsed.urgency,
  });

  await bumpOpportunityCountAndMaybeLock(opp);
  await bumpFunderCountAndMaybeLock(funderId, funder?.maxApplicationsAllowed);
  return app;
};

const getOne = async (id) => {
  const app = await Application.findById(id)
    .populate('organization')
    .populate('opportunity')
    .populate('funder')
    .populate('submittedBy', 'firstName lastName email role createdAt');
  if (!app) throw new AppError('Application not found', 404);
  return app;
};

const update = async (id, data) => {
  const app = await Application.findByIdAndUpdate(id, data, { new: true, runValidators: true })
    .populate('organization')
    .populate('opportunity')
    .populate('funder')
    .populate('submittedBy', 'firstName lastName email role createdAt');
  if (!app) throw new AppError('Application not found', 404);
  return app;
};

const updateStatus = async (id, { status, dateSubmitted, followUpDate, notes }, { actorId } = {}) => {
  const before = await Application.findById(id);
  if (!before) throw new AppError('Application not found', 404);

  const updateData = { status };
  if (['submitted','in_review'].includes(status)) {
    updateData.dateSubmitted = dateSubmitted || new Date();
    updateData.submittedAt = dateSubmitted || new Date();
    if (!before.submittedBy && actorId) updateData.submittedBy = actorId;
  }
  if (followUpDate) updateData.followUpDate = followUpDate;
  if (notes !== undefined) updateData.notes = notes;

  const historyEntry = {
    status,
    previousStatus: before.status,
    changedAt: new Date(),
    ...(actorId ? { changedBy: actorId } : {}),
  };

  const app = await Application.findByIdAndUpdate(
    id,
    { $set: updateData, $push: { statusHistory: historyEntry } },
    { new: true }
  )
    .populate('organization')
    .populate('opportunity')
    .populate('funder')
    .populate('submittedBy', 'firstName lastName email role createdAt');
  if (!app) throw new AppError('Application not found', 404);

  const afterLean = await Application.findById(id).lean();
  await ensureFollowUpsScheduled(before, afterLean, actorId);

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
        winFactors: deriveWinFactorsFromApp(app),
      });
    } catch (e) { logger.warn('[Application] Failed to create win record:', e.message); }
  }

  if (['approved', 'awarded', 'rejected'].includes(status)) {
    try {
      const orgId = app?.organization?._id;
      const users = orgId
        ? await User.find({ organizationId: orgId }).select('email firstName fullName')
        : [];

      for (const u of users) {
        if (!u?.email) continue;
        await sendApplicationStatusEmail({
          to: u.email,
          name: u.firstName || u.fullName,
          agencyName: app?.organization?.name,
          opportunityTitle: app?.opportunity?.title,
          status,
          note: notes || '',
        });
      }
    } catch (emailErr) {
      logger.warn('[Application] Status email failed:', emailErr.message);
    }
  }

  return app;
};

const regenerate = async (id) => {
  const app = await Application.findById(id).populate('organization').populate('opportunity').populate('funder');
  if (!app) throw new AppError('Application not found', 404);
  const parsed = await buildAIContent(app.organization, app.funder, app.opportunity);
  await Application.findByIdAndUpdate(id, {
    ...parsed,
    communityImpact: parsed.communityImpact,
    urgency: parsed.urgency,
  });
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

const submit = async (id, userId) => {
  const before = await Application.findById(id).lean();
  if (!before) throw new AppError('Application not found', 404);
  await Application.findByIdAndUpdate(id, {
    status: 'submitted',
    submittedAt: new Date(),
    dateSubmitted: new Date(),
    ...(userId ? { submittedBy: userId } : {}),
  });
  const afterLean = await Application.findById(id).lean();
  await ensureFollowUpsScheduled(before, afterLean, userId);
  return getOne(id);
};

const remove = async (id) => {
  const app = await Application.findByIdAndDelete(id);
  if (!app) throw new AppError('Application not found', 404);
  return app;
};

const adminRegenerateAI = async (applicationId) => {
  const app = await Application.findById(applicationId).populate('organization').populate('funder').populate('opportunity');
  if (!app) throw new AppError('Application not found', 404);
  if (!app.funder) throw new AppError('Application must be linked to a funder for AI generation', 400);
  const parsed = await buildAIContent(app.organization, app.funder, app.opportunity, { adminPortal: true });
  await Application.findByIdAndUpdate(applicationId, {
    ...parsed,
    communityImpact: parsed.communityImpact,
    urgency: parsed.urgency,
  });
  return Application.findById(applicationId).populate('organization').populate('opportunity').populate('funder');
};

module.exports = {
  getAll,
  create,
  createWithAI,
  getOne,
  update,
  updateStatus,
  regenerate,
  adminRegenerateAI,
  alignToFunder,
  exportApplication,
  submit,
  remove,
};
