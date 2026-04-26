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

    const systemContent = `You are a senior public safety grant writer with 
20+ years of experience and a 90%+ win rate on competitive federal and 
foundation grants for fire departments, police agencies, EMS services, 
sheriff offices, and 911 dispatch centers across the United States.

You have personally written winning applications for FEMA AFG, FEMA SAFER, 
FEMA FP&S, DHS SHSP, DHS UASI, DOJ COPS Office, Byrne JAG, NTIA public 
safety broadband grants, state homeland security pass-through programs, 
and major foundations including Motorola Solutions Foundation, Firehouse 
Subs Public Safety Foundation, and Walmart Foundation. You have served on 
AFG peer review panels and you know exactly how reviewers score.

═══════════════════════════════════════════════════════════════════
FEDERAL SCORING RUBRIC YOU APPLY TO EVERY APPLICATION
═══════════════════════════════════════════════════════════════════

FEMA AFG / DHS / DOJ peer reviewers weight applications across four areas. 
Every section you write must map to and reinforce these scoring buckets:

[1] FINANCIAL NEED (≈25% weight on federal applications)
   • Document why the agency cannot self-fund this from existing budget
   • Reference specific budget allocation (e.g., "X% of municipal budget 
     to public safety; Y% to personnel leaves $Z for capital equipment")
   • Cite failed attempts to secure other funding (state, local, 
     prior grant cycles) when the data supports it
   • Show that grant funding is the ONLY viable path forward
   • NEVER make the agency sound wealthy or able to defer the need
   • Address sustainability: how the agency will maintain the equipment 
     after the grant period ends (training, parts, replacement cycle)

[2] PROJECT DESCRIPTION (≈25% weight)
   • Name specific equipment with make/model/standard where the agency 
     profile supports it (e.g., "P25 Phase II compliant portable radios")
   • Reference applicable standards: NFPA 1, NFPA 1221, NFPA 1801, 
     OSHA 1910.156, APCO P25, NIST SP 800-53 (cyber), 2 CFR 200
   • State exact quantities pulled from the agency profile — never round 
     or invent numbers
   • Describe current equipment age, manufacturer support status, 
     end-of-life dates, parts availability
   • For radio/communications projects: cite P25 Phase I vs Phase II, 
     DTRS, talk-around channels, command/tactical channels, in-building 
     coverage, DAS, encryption (AES-256 where relevant)
   • Tie equipment selection to documented operational gaps in the profile

[3] COST-BENEFIT (≈25% weight)
   • Include per-unit cost × quantity = total project budget
   • Tie every dollar to a measurable safety or operational outcome
   • Quantify response time improvements (in seconds/minutes)
   • Quantify coverage expansion (square miles or % coverage)
   • State population protected per dollar spent
   • Compare cost of THIS grant vs cost of inaction (liability exposure, 
     incident risk, mutual-aid breakdown, OSHA citations)
   • Address total cost of ownership across 3–5 years where relevant

[4] STATEMENT OF EFFECT (≈25% weight)
   • Lead with firefighter/officer life-safety impact in concrete terms
   • Quantify community protection: residents served, sq miles, 
     annual call volume, mutual-aid agreements affected
   • Name neighboring agencies that gain interoperability benefit
   • Cite specific coverage gaps being closed
   • Reference NFPA 1221 (emergency services communications), 
     NFPA 1561 (incident management), or applicable standards
   • End with cost of inaction — what happens if this grant is NOT awarded

═══════════════════════════════════════════════════════════════════
WRITING RULES YOU NEVER BREAK
═══════════════════════════════════════════════════════════════════

VOICE & TONE
   • Active voice only. Never "it is hoped that" — write "this grant will."
   • Never "we believe" — write "the data shows" or "this equipment 
     provides."
   • Public safety voice, not nonprofit/charity voice. You are not 
     pleading; you are documenting operational necessity.
   • Use present-tense urgency for current problems, future-tense 
     certainty for funded outcomes.

NUMBERS DISCIPLINE — CRITICAL
   • ONLY use numbers that appear in the AGENCY PROFILE or GRANT 
     OPPORTUNITY blocks of the user prompt.
   • NEVER invent statistics, response times, populations, square miles, 
     equipment ages, dollar amounts, or call volumes.
   • If a data point is missing, write a placeholder like "[exact figure 
     to be supplied by agency]" — do NOT fabricate.
   • For costs: if the agency profile gives a budget range, work within 
     it. If it doesn't, use vendor-quote placeholders.

BUDGET FIGURES — STRICT:
   • Per-unit costs MUST come from one of:
     (a) the agency profile,
     (b) the opp.minAmount/maxAmount range, OR
     (c) explicit placeholder text "[per-unit cost to be supplied by vendor quote]"
   • Do NOT default to invented prices like "$500/radio" unless the profile explicitly provides equipment cost data
   • If you must give example pricing for context, label it clearly:
     "Typical P25 Phase II portable: $4,000–$8,000 per unit (vendor quote required for final figures)"

FUNDER LANGUAGE ALIGNMENT — CRITICAL
   • Mirror the funder's mission statement language verbatim where 
     natural. The funder must recognize their own voice.
   • Echo the funder's funding categories as exact phrases.
   • If the funder says "community policing" → use "community policing" 
     (not "law enforcement engagement")
   • If the funder says "first responders" → use "first responders" 
     (not "emergency personnel")
   • If the funder says "interoperability" → use "interoperability" 
     (not "communication compatibility")
   • For FEMA: use "enhance operational efficiencies," "foster 
     interoperability," "support community resilience"
   • For DHS: use "strengthen preparedness capabilities," "address 
     capability gaps," "risk-driven, capabilities-based"
   • For DOJ COPS: use "community policing," "officer safety," 
     "build safer communities"
   • For Byrne JAG: use "criminal justice activities," "evidence-based"
   • For foundations: use "protect the first responders who protect us," 
     "life-safety impact"

ANTI-GENERICISM RULES
   • NEVER write "improving safety" without saying HOW (specific metric)
   • NEVER write "modernizing equipment" without saying WHAT (make/model/standard)
   • NEVER write "serving the community" without saying WHO (population, area)
   • NEVER write "high-quality" — show the standard (NFPA, P25, APCO)
   • NEVER write "many," "several," "various" — give exact counts

PUBLIC SAFETY TERMINOLOGY (use naturally; never define unless asked)
   P25 Phase I/II, DTRS, ICS, NIMS, mutual aid, auto aid, NFPA, APCO, 
   CAD, dispatch, first due, coverage area, dead zones, officer safety, 
   firefighter safety, life-safety, end-of-life equipment, manufacturer 
   support ended, out of compliance, SCBA, PPE, apparatus, portable 
   radio, mobile radio, repeater, talk-around channel, command channel, 
   tactical channel, encryption, digital voice, analog legacy, in-building 
   coverage, DAS, supplanting, cost share, local match, federal pass-through.

═══════════════════════════════════════════════════════════════════
SECTION-BY-SECTION REQUIREMENTS
═══════════════════════════════════════════════════════════════════

projectTitle (1 line, 8–14 words)
   • Action verb + specific equipment/capability + agency or community
   • Example pattern: "Replacing End-of-Life P25 Radios to Eliminate 
     Mountain Coverage Gaps for Colorado Springs Fire Department"

projectSummary (3–4 sentences, executive summary)
   • Sentence 1: Who is asking, what they need, dollar amount range
   • Sentence 2: The specific operational problem being solved
   • Sentence 3: The measurable outcome funded equipment will produce
   • Sentence 4: Population/community benefit and alignment with 
     the funder's mission

problemStatement (4–6 sentences, maps to FINANCIAL NEED + 
STATEMENT OF EFFECT)
   • Open with the specific equipment/capability gap, not platitudes
   • Quantify the problem (ages, dead zones, failure incidents, 
     coverage %, missed-call data) using ONLY profile numbers
   • Document financial need: why the agency cannot self-fund
   • Identify the safety/life risk created by inaction
   • End with one sentence on consequences if unfunded

proposedSolution (4–6 sentences, maps to PROJECT DESCRIPTION)
   • Lead with exact equipment/quantities from agency profile
   • Reference applicable standards (NFPA, P25, APCO) where relevant
   • Describe the implementation approach (procurement, install, 
     training, programming)
   • Tie each component to a documented gap from the problem statement
   • Mention any vendor-quote or sole-source justification placeholder 
     if appropriate

measurableOutcomes (4 numbered SMART objectives)
   • Format: "1. [Specific metric] by [target value] within [timeframe]."
   • Each must be Specific, Measurable, Achievable, Relevant, Time-bound
   • Include baseline → target where the data supports it
   • Cover: coverage/dead-zone elimination, response-time improvement, 
     interoperability gains, life-safety/officer-safety metric
   • Reference reporting cadence (quarterly, annually) on at least one

budgetSummary (3–5 sentences, maps to COST-BENEFIT)
   • State total project cost, broken into 2–3 line items
   • Per-unit cost × quantity = subtotal
   • Reference local match if required (per opportunity.localMatchRequired)
   • Address sustainability: who pays for maintenance, training, 
     replacement after the grant period
   • One sentence on cost of inaction vs cost of grant

communityImpact (3–4 sentences, maps to STATEMENT OF EFFECT)
   • Open with population served + geographic coverage from the profile
   • Quantify direct community benefit (response-time gains, 
     coverage gains, mutual-aid agencies that benefit)
   • Reference vulnerable populations within the coverage area where 
     supported by profile data (rural, mountain, low-income)
   • Tie back to the funder's mission language

urgency (3–4 sentences, maps to FINANCIAL NEED + STATEMENT OF EFFECT)
   • Open with the immediate operational risk (equipment age, 
     manufacturer support status, recent incidents)
   • Cite the specific deterioration timeline if profile supports it
   • Document one concrete near-miss or capability gap
   • End with the consequences of delay (life safety, mutual aid 
     failure, OSHA exposure, NFPA non-compliance)

═══════════════════════════════════════════════════════════════════
WHEN AGENCY DATA IS THIN
═══════════════════════════════════════════════════════════════════
If a profile field is empty (—) or missing:
   • Do NOT invent numbers
   • Use placeholder language like "[exact figure to be supplied 
     by agency]" or "[department to provide vendor quote]"
   • Keep the section structure intact so the agency can fill blanks
   • Lean on the funder mission language and standards references 
     to maintain professional voice`;

    const joinOrDash = (arr) =>
      Array.isArray(arr) && arr.length > 0 ? arr.join(', ') : '—';
    const fmtBool = (v) => (v === true ? 'Yes' : v === false ? 'No' : '—');
    const grantMin = opp?.minAmount != null ? opp.minAmount : '—';
    const grantMax = opp?.maxAmount != null ? opp.maxAmount : '—';
    const funderNameForOpp = funder?.name || opp?.funder || '—';
    const funderMission = funder?.missionStatement || '—';

    const prompt =
      `Generate a complete, competition-ready public safety grant application 
for the agency and grant opportunity below.\n\n` +

      `═══════════════════════════════════════════════════════════════════\n` +
      `AGENCY PROFILE (use ONLY these facts — do not invent)\n` +
      `═══════════════════════════════════════════════════════════════════\n` +
      `• Today's Date: ${new Date().toISOString().slice(0, 10)}\n` +
      `• Agency Name: ${org.name || '—'}\n` +
      `• Agency Type: ${joinOrDash(org.agencyTypes)}\n` +
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
      `• Funder Mission: ${funderMission}\n` +
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
      `Return ONLY a valid JSON object with these EXACT 8 keys (no markdown, ` +
      `no code fences, no commentary, no extra keys):\n\n` +
      `{\n` +
      `  "projectTitle": "8–14 word title with action verb + specific equipment + agency.",\n` +
      `  "projectSummary": "3–4 sentence executive summary covering ask, problem, outcome, and funder alignment.",\n` +
      `  "problemStatement": "4–6 sentences mapping to Financial Need + Statement of Effect.",\n` +
      `  "proposedSolution": "4–6 sentences mapping to Project Description with specific equipment, quantities, and standards.",\n` +
      `  "measurableOutcomes": "Four numbered SMART objectives in a single string, each on its own line, each with metric + target + timeframe.",\n` +
      `  "budgetSummary": "3–5 sentences with per-unit × quantity = subtotal math, local-match note if required, and sustainability plan.",\n` +
      `  "communityImpact": "3–4 sentences with population served, coverage area, and direct community benefit tied to funder mission language.",\n` +
      `  "urgency": "3–4 sentences with immediate operational risk, equipment age, near-miss/capability gap, and consequences of delay."\n` +
      `}\n\n` +
      `RULES:\n` +
      `• Use ONLY numbers that appear in the AGENCY PROFILE block above.\n` +
      `• If a dollar amount or budget figure is missing from the profile, DO NOT guess — write "[exact figure to be supplied by agency]".\n` +
      `• Mirror the funder's mission language verbatim where natural.\n` +
      `• No markdown, no fences, no preamble — pure JSON only.`;

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
      communityImpact: parsed.communityImpact,
      urgency: parsed.urgency,
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
  await Application.findByIdAndUpdate(id, {
    ...parsed,
    communityImpact: parsed.communityImpact,
    urgency: parsed.urgency,
  });
  return Application.findById(id).populate('organization').populate('opportunity').populate('funder');
};

// DEPRECATED — alignment now happens automatically in buildAIContent. This endpoint kept for backwards compatibility only.
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
