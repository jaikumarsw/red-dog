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
const Match = require('../matches/match.schema');

const AI_FALLBACK_CONTENT = {
  executiveSummary:
    "This project addresses a documented operational gap that impacts safety and service delivery. The applicant requests funding to implement a targeted solution that improves reliability, reduces risk, and strengthens day-to-day readiness. The result will be measurable improvements for the community served and direct alignment with funder priorities.",
  problemStatement:
    "Our agency faces a critical capability gap that impacts emergency response and day-to-day operations. Existing resources and aging equipment create avoidable delays, safety risks, and service interruptions across our coverage area. Without investment, these risks will increase and the agency’s ability to meet community needs will degrade. [DATA NEEDED] should be added for call volume, service area, and current equipment age to quantify the gap.",
  projectDescription:
    "We will purchase and implement the specific equipment or services needed to close the documented gap. The project includes procurement, installation/configuration, staff training, and a clear implementation timeline with milestones. The solution directly maps to the problem and will be delivered with appropriate oversight and controls. [DATA NEEDED] should be added for quantities, timeline, and staffing assignments.",
  missionAlignment:
    "This project advances the funder’s priorities by improving outcomes that align with the stated mission and eligible categories. It strengthens operational readiness, service delivery, and measurable community benefit in a way reviewers can verify. [DATA NEEDED] should be added for the exact funder priority phrases to mirror.",
  budgetJustification:
    "Major costs are directly tied to operational outcomes and represent reasonable, necessary, and allowable expenses. Each line item supports a specific capability improvement and will be procured competitively where required. [DATA NEEDED] should be added for quotes, unit costs, and any match requirements.",
  organizationalCapacity:
    "The applicant has the leadership, staffing, and administrative controls to manage this project successfully. Financial controls, procurement processes, and reporting capacity are in place, and partners will support delivery as needed. [DATA NEEDED] should be added for prior grants, partnerships, and internal controls.",
  outcomesAndImpact:
    "This project will produce measurable improvements in performance and safety, with clearly defined targets and timelines. Benefits will accrue to the people served through improved reliability, reduced delays, and stronger service coverage. [DATA NEEDED] should be added for baseline metrics and target outcomes.",
  evaluationPlan:
    "Progress will be tracked through defined milestones, data collection, and regular reporting. We will measure outputs (items delivered, staff trained) and outcomes (service improvements) and share results with the funder as required. [DATA NEEDED] should be added for reporting cadence and data sources.",
  sustainabilityPlan:
    "After the grant period, the applicant will sustain the improvements through maintenance plans, training refreshers, and long-term replacement planning. Ongoing operating costs will be budgeted and future funding sources will be pursued where needed. [DATA NEEDED] should be added for maintenance schedules and long-term funding strategy.",
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

const industryTypeFrom = (org) => {
  const raw = (org?.agencyTypes || []).map((t) => String(t || '').toLowerCase());
  const primary = raw[0] || '';
  if (primary.includes('fire')) return 'fire services';
  if (primary.includes('police') || primary.includes('sheriff') || primary.includes('law')) return 'law_enforcement';
  if (primary.includes('ems')) return 'ems';
  if (primary.includes('school') || primary.includes('university') || primary.includes('education')) return 'education';
  if (primary.includes('nonprofit')) return 'nonprofit';
  return primary || 'public safety';
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

    const systemContent = `You are Ashleen, an expert grant writer for public safety agencies, 
nonprofits, schools, colleges, and local governments.

Your job is to create a high-scoring grant application using the 
applicant profile, funder mission, grant instructions, scoring 
rubric, and prior successful grant-writing patterns.

Write the application using this formula:

1. Executive Summary
   - Summarize the need, solution, funding request, and expected impact.

2. Problem Statement
   - Define the problem clearly.
   - Use data, statistics, service area facts, population served, 
     incident volume, equipment age, safety risks, or response delays.
   - Explain what happens if the problem is not solved.

3. Project Description
   - Explain exactly what will be purchased, built, improved, 
     implemented, or delivered.
   - Connect the project directly to the problem.
   - Include timeline, milestones, staffing, and implementation steps.

4. Mission Alignment
   - Mirror the funder's language.
   - Explain how this project advances the funder's stated priorities.
   - Avoid generic claims.

5. Budget Justification
   - Explain every major cost.
   - Tie each cost to a direct operational outcome.
   - Show that costs are reasonable, necessary, and allowable.

6. Organizational Capacity
   - Explain why the applicant can successfully manage the project.
   - Include leadership, staff experience, past grants, financial 
     controls, partnerships, and project readiness.

7. Outcomes and Impact
   - Create measurable outcomes.
   - Use numbers, percentages, timelines, and service improvements.
   - Include who benefits and how.

8. Evaluation Plan
   - Explain how progress will be measured.
   - Include reporting, data collection, milestones, and success 
     indicators.

9. Sustainability Plan
   - Explain how the project will continue after grant funding ends.
   - Include maintenance, future funding, staffing, replacement plans.

WRITING RULES:
- Be specific, measurable, and reviewer-friendly.
- Use short paragraphs and strong headings.
- Do not exaggerate. Do not invent facts.
- If data is missing, insert [DATA NEEDED] and explain what should 
  be added.
- Write in a professional, confident tone.

Add industry-specific focus based on agency type:
- Fire/EMS: responder safety, response time, communications 
  reliability, NFPA alignment, mutual aid, equipment age, coverage 
  gaps, call volume, population protected
- Police/Sheriff: officer safety, crime prevention, interoperability, 
  response time, evidence quality, community trust, compliance, 
  training, regional coordination
- Schools/Universities: student safety, workforce development, CTE 
  pathways, emergency preparedness, underserved students, 
  measurable learning outcomes, sustainability
- Nonprofits: mission alignment, population served, measurable 
  community impact, service gaps, partnerships, equity, 
  sustainability, reporting capacity

Output ONLY valid JSON with these 9 fields:
executiveSummary, problemStatement, projectDescription, 
missionAlignment, budgetJustification, organizationalCapacity, 
outcomesAndImpact, evaluationPlan, sustainabilityPlan`;

    const joinOrDash = (arr) =>
      Array.isArray(arr) && arr.length > 0 ? arr.join(', ') : '—';
    const fmtBool = (v) => (v === true ? 'Yes' : v === false ? 'No' : '—');
    const grantMin = opp?.minAmount != null ? opp.minAmount : '—';
    const grantMax = opp?.maxAmount != null ? opp.maxAmount : '—';
    const funderNameForOpp = funder?.name || opp?.funder || '—';
    const funderMission = funder?.missionStatement || '—';

    const prompt =
      `Generate a complete, competition-ready grant application using the applicant profile, grant opportunity, and funder mission/priorities below.\n\n` +

      `═══════════════════════════════════════════════════════════════════\n` +
      `APPLICANT PROFILE (use ONLY these facts — do not invent)\n` +
      `═══════════════════════════════════════════════════════════════════\n` +
      `• Today's Date: ${new Date().toISOString().slice(0, 10)}\n` +
      `• Agency Name: ${org.name || '—'}\n` +
      `• Agency Type: ${joinOrDash(org.agencyTypes)}\n` +
      `• Industry Type: ${industryTypeFrom(org)}\n` +
      `• Location: ${org.location || '—'}\n` +
      `• Population Served: ${org.populationServed != null ? org.populationServed : '—'}\n` +
      `• Coverage Area: ${org.coverageArea || '—'}\n` +
      `• Number of Staff: ${org.numberOfStaff != null ? org.numberOfStaff : '—'}\n` +
      `• Annual Call Volume: ${org.annualVolume != null ? org.annualVolume : '—'}\n` +
      `• Current Equipment: ${org.currentEquipment || '—'}\n` +
      `• Main Problems: ${joinOrDash(org.mainProblems)}\n` +
      `• Funding Priorities: ${joinOrDash(org.fundingPriorities)}\n` +
      `• Specific Request: ${org.specificRequest || '—'}\n` +
      `• Documented Challenges: ${joinOrDash(org.challenges)}\n` +
      `• Urgency Statement: ${org.urgencyStatement || '—'}\n` +
      `• Who Benefits: ${org.whobenefits || '—'}\n` +
      `• Budget Range: ${org.budgetRange || '—'}\n` +
      `• Timeline: ${org.timeline || '—'}\n` +
      `• Can Meet Local Match: ${fmtBool(org.canMeetLocalMatch)}\n` +
      `• Eligibility Type: ${org.eligibilityType || '—'}\n` +
      `• Mission Statement: ${org.missionStatement || '—'}\n` +
      `• Service Area: ${org.serviceArea || '—'}\n` +
      `• Staff Size Range: ${org.staffSizeRange || '—'}\n\n` +

      `═══════════════════════════════════════════════════════════════════\n` +
      `GRANT OPPORTUNITY\n` +
      `═══════════════════════════════════════════════════════════════════\n` +
      `• Grant Program: ${opp?.title || '—'}\n` +
      `• Funder: ${funderNameForOpp}\n` +
      `• Funder Mission / Priorities: ${funderMission}\n` +
      `• Grant Range: $${grantMin} – $${grantMax}\n` +
      `• Category: ${opp?.category || '—'}\n` +
      `• Keywords: ${joinOrDash(opp?.keywords)}\n` +
      `• Local Match Required: ${fmtBool(opp?.localMatchRequired)}\n` +
      `• Description: ${opp?.description || '—'}\n` +
      `${winPatternsBlock}\n\n` +

      `═══════════════════════════════════════════════════════════════════\n` +
      `FUNDER LANGUAGE TO MIRROR (use these phrases verbatim where natural)\n` +
      `═══════════════════════════════════════════════════════════════════\n` +
      `Funder Mission Statement:\n${funder?.missionStatement || funderMission}\n\n` +
      `Funder Priority Categories: ${(funder?.fundingCategories || opp?.keywords || []).join(', ') || '—'}\n` +
      `Opportunity Keywords: ${(opp?.keywords || []).join(', ') || '—'}\n\n` +

      `═══════════════════════════════════════════════════════════════════\n` +
      `OUTPUT INSTRUCTIONS\n` +
      `═══════════════════════════════════════════════════════════════════\n` +
      `Output ONLY valid JSON with these 9 fields (no markdown, no code fences, no extra keys):\n` +
      `executiveSummary, problemStatement, projectDescription, missionAlignment, budgetJustification, organizationalCapacity, outcomesAndImpact, evaluationPlan, sustainabilityPlan`;

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

const bumpOpportunityCountAndMaybeLock = async (opp, fitScore = null) => {
  if (!opp) return;
  const max = opp.maxApplicationsAllowed != null
    ? opp.maxApplicationsAllowed : 0;
  if (max <= 0) return;

  // Always increment total application count
  await Opportunity.findByIdAndUpdate(
    opp._id,
    { $inc: { currentApplicationCount: 1 } }
  );

  // Only count toward the lock threshold if fitScore >= 90
  const SCORE_THRESHOLD = 90;
  if (fitScore !== null && fitScore >= SCORE_THRESHOLD) {
    const updated = await Opportunity.findByIdAndUpdate(
      opp._id,
      { $inc: { highScoreApplicationCount: 1 } },
      { new: true }
    );
    // Lock only when high-score applications reach the cap
    if (updated && updated.highScoreApplicationCount >= max) {
      await Opportunity.findByIdAndUpdate(
        opp._id,
        { $set: { isLocked: true } }
      );
      logger.info(
        `[Opportunity] Locked ${opp.title || opp._id} — ` +
        `${updated.highScoreApplicationCount} high-score (≥90%) ` +
        `applications reached cap of ${max}`
      );
    }
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

  // Before calling bump, look up the match score
  let fitScore = null;
  if (opp && data.organization) {
    const matchDoc = await Match.findOne({
      organization: data.organization,
      opportunity: opp._id
    }).select('fitScore').lean();
    fitScore = matchDoc?.fitScore ?? null;
  }
  await bumpOpportunityCountAndMaybeLock(opp, fitScore);
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

  // After resolving the opportunity and before creating the app,
  // look up the match score
  const matchDoc = await Match.findOne({
    organization: organizationId,
    opportunity: opp?._id
  }).select('fitScore').lean();
  const agencyFitScore = matchDoc?.fitScore ?? null;

  const attachWarning = (doc) => {
    const response = doc.toObject ? doc.toObject() : doc;
    if (agencyFitScore !== null && agencyFitScore < 90) {
      response.warning = "Agencies with a match score below 90% can still apply, but do not count toward the application limit for this opportunity.";
    }
    return response;
  };

  let app;
  try {
    const legacyDerived = {
      projectSummary: parsed.executiveSummary,
      proposedSolution: parsed.projectDescription,
      budgetSummary: parsed.budgetJustification,
      communityImpact: parsed.outcomesAndImpact,
    };

    app = await Application.create({
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
      ...legacyDerived,
    });
  } catch (err) {
    const dupCode = err.code === 11000 || err.code === 11001;
    const dupMsg = typeof err.message === 'string' && err.message.includes('E11000');
    if (dupCode || dupMsg) {
      const dupQ = { organization: organizationId };
      if (opp) dupQ.opportunity = opp._id;
      else if (funderId) dupQ.funder = funderId;
      const existing = await Application.findOne(dupQ);
      if (existing) return attachWarning(existing);
    }
    throw err;
  }

  // Communication log: AI drafted application
  try {
    const commService = require('../communication-log/communication-log.service');
    await commService.logSystemEvent({
      application: app._id,
      organization: organizationId,
      subject: 'AI application drafted',
      body: `AI-generated grant application created for ${funder?.name || 'funder'}.`,
    });
  } catch (e) {}

  await bumpOpportunityCountAndMaybeLock(opp, agencyFitScore);
  await bumpFunderCountAndMaybeLock(funderId, funder?.maxApplicationsAllowed);

  return attachWarning(app);
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

const updateStatus = async (id, { status, dateSubmitted, followUpDate, notes, infoRequestedNote }, { actorId } = {}) => {
  const before = await Application.findById(id);
  if (!before) throw new AppError('Application not found', 404);

  const updateData = { status };
  if (['submitted', 'in_review'].includes(status)) {
    updateData.dateSubmitted = dateSubmitted || new Date();
    updateData.submittedAt = dateSubmitted || new Date();
    if (!before.submittedBy && actorId) updateData.submittedBy = actorId;
  }

  if (status === 'waiting_on_information') {
    updateData.infoRequestedAt = new Date();
    if (infoRequestedNote) updateData.infoRequestedNote = infoRequestedNote;
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

  // Communication log: status change system event (never blocks status updates)
  try {
    const commService = require('../communication-log/communication-log.service');
    let body = `Status changed from "${before.status}" to "${status}".`;
    if (status === 'waiting_on_information' && updateData.infoRequestedNote) {
      body += ` Information requested: "${updateData.infoRequestedNote}"`;
    }
    if (status === 'rejected' && notes) {
      body += ` Note: "${notes}"`;
    }
    await commService.logSystemEvent({
      application: id,
      organization: app.organization?._id || app.organization,
      subject: `Status: ${status}`,
      body,
    });
  } catch (e) {
    // never block status update on logging
  }

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

    // Post-award email sequence (congrats now, follow-up scheduled 3 days later, admin notified)
    try {
      const alreadySent = app?.postAwardSequence?.congratsSentAt;
      if (!alreadySent) {
        const orgId = app?.organization?._id;
        const users = orgId
          ? await User.find({ organizationId: orgId }).select('email firstName fullName')
          : [];
        const primaryUser = users[0];
        const funderName = app.funder?.name || app.opportunity?.funder || 'the funder';
        const awardAmount = app.funder?.avgGrantMax || app.opportunity?.maxAmount || app.amountRequested;

        const {
          sendPostAwardCongratsEmail,
          sendAdminAwardNotification,
        } = require('../../config/email.config');

        for (const u of users) {
          if (!u?.email) continue;
          await sendPostAwardCongratsEmail({
            to: u.email,
            name: u.firstName || u.fullName,
            agencyName: app.organization?.name,
            funderName,
            awardAmount,
            applicationId: id,
          });
        }

        await sendAdminAwardNotification({
          agencyName: app.organization?.name,
          funderName,
          awardAmount,
          agencyEmail: primaryUser?.email,
        });

        const followUpDate = new Date();
        followUpDate.setDate(followUpDate.getDate() + 3);

        await Application.findByIdAndUpdate(id, {
          $set: {
            'postAwardSequence.congratsSentAt': new Date(),
            'postAwardSequence.followUpScheduledFor': followUpDate,
          },
        });

        try {
          const commService = require('../communication-log/communication-log.service');
          await commService.logSystemEvent({
            application: id,
            organization: orgId,
            subject: 'Award congratulations sent',
            body: `Congratulations email sent to agency. Follow-up with equipment recommendations scheduled for ${followUpDate.toDateString()}.`,
          });
        } catch (e) {}
      }
    } catch (e) {
      logger.warn('[Application] Post-award sequence failed:', e.message);
    }
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
  const legacyDerived = {
    projectSummary: parsed.executiveSummary,
    proposedSolution: parsed.projectDescription,
    budgetSummary: parsed.budgetJustification,
    communityImpact: parsed.outcomesAndImpact,
  };
  await Application.findByIdAndUpdate(id, {
    ...parsed,
    ...legacyDerived,
  });
  return Application.findById(id).populate('organization').populate('opportunity').populate('funder');
};

// DEPRECATED — alignment now happens automatically in buildAIContent. This endpoint kept for backwards compatibility only.
const alignToFunder = async (id) => {
  const app = await Application.findById(id).populate('organization').populate('opportunity').populate('funder');
  if (!app) throw new AppError('Application not found', 404);
  const funder = app.funder;
  const fallback = {
    executiveSummary: app.executiveSummary || app.projectSummary || AI_FALLBACK_CONTENT.executiveSummary,
    problemStatement: app.problemStatement || AI_FALLBACK_CONTENT.problemStatement,
    projectDescription: app.projectDescription || app.proposedSolution || AI_FALLBACK_CONTENT.projectDescription,
    missionAlignment: app.missionAlignment || AI_FALLBACK_CONTENT.missionAlignment,
    budgetJustification: app.budgetJustification || app.budgetSummary || AI_FALLBACK_CONTENT.budgetJustification,
    organizationalCapacity: app.organizationalCapacity || AI_FALLBACK_CONTENT.organizationalCapacity,
    outcomesAndImpact: app.outcomesAndImpact || app.communityImpact || AI_FALLBACK_CONTENT.outcomesAndImpact,
    evaluationPlan: app.evaluationPlan || AI_FALLBACK_CONTENT.evaluationPlan,
    sustainabilityPlan: app.sustainabilityPlan || AI_FALLBACK_CONTENT.sustainabilityPlan,
    generatedAt: new Date(),
  };
  if (!openai) { app.alignedVersion = fallback; await app.save(); return fallback; }
  try {
    const prompt = `Rewrite these grant application sections to align with this funder's mission and tone. Match their vocabulary exactly.
Funder: ${funder?.name || 'the funder'}
Funder mission: ${funder?.missionStatement || 'public safety'}
Funder categories: ${funder?.fundingCategories?.join(', ') || 'public safety'}
Original sections: ${JSON.stringify({
  executiveSummary: app.executiveSummary || app.projectSummary,
  problemStatement: app.problemStatement,
  projectDescription: app.projectDescription || app.proposedSolution,
  missionAlignment: app.missionAlignment,
  budgetJustification: app.budgetJustification || app.budgetSummary,
  organizationalCapacity: app.organizationalCapacity,
  outcomesAndImpact: app.outcomesAndImpact || app.communityImpact,
  evaluationPlan: app.evaluationPlan,
  sustainabilityPlan: app.sustainabilityPlan,
})}
Return the same 9 keys rewritten to match funder's voice.`;
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
  return `GRANT APPLICATION\nAgency: ${orgName}\nFunder: ${funderName}\nProject: ${app.projectTitle || 'Grant Application'}\nDate: ${today}\n${'='.repeat(60)}\n\nEXECUTIVE SUMMARY:\n${app.executiveSummary || app.projectSummary || 'Not provided'}\n\n${'='.repeat(60)}\n\nPROBLEM STATEMENT:\n${app.problemStatement || 'Not provided'}\n\n${'='.repeat(60)}\n\nPROJECT DESCRIPTION:\n${app.projectDescription || app.proposedSolution || 'Not provided'}\n\n${'='.repeat(60)}\n\nMISSION ALIGNMENT:\n${app.missionAlignment || 'Not provided'}\n\n${'='.repeat(60)}\n\nBUDGET JUSTIFICATION:\n${app.budgetJustification || app.budgetSummary || 'Not provided'}\n\n${'='.repeat(60)}\n\nORGANIZATIONAL CAPACITY:\n${app.organizationalCapacity || 'Not provided'}\n\n${'='.repeat(60)}\n\nOUTCOMES AND IMPACT:\n${app.outcomesAndImpact || app.communityImpact || 'Not provided'}\n\n${'='.repeat(60)}\n\nEVALUATION PLAN:\n${app.evaluationPlan || 'Not provided'}\n\n${'='.repeat(60)}\n\nSUSTAINABILITY PLAN:\n${app.sustainabilityPlan || 'Not provided'}\n\n${'='.repeat(60)}\n\nNOTES:\n${app.notes || 'None'}\n`;
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

  // Communication log: agency submitted application
  try {
    const commService = require('../communication-log/communication-log.service');
    await commService.logSystemEvent({
      application: id,
      organization: afterLean.organization,
      subject: 'Application submitted',
      body: 'Application marked as submitted by the agency.',
    });
  } catch (e) {}

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
  const legacyDerived = {
    projectSummary: parsed.executiveSummary,
    proposedSolution: parsed.projectDescription,
    budgetSummary: parsed.budgetJustification,
    communityImpact: parsed.outcomesAndImpact,
  };
  await Application.findByIdAndUpdate(applicationId, {
    ...parsed,
    ...legacyDerived,
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
