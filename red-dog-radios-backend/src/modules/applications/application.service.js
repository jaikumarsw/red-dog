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

const ASHLEEN_APPLICATION_MODEL = 'gpt-4o';
const ASHLEEN_APPLICATION_TEMPERATURE = 0.5;
const ASHLEEN_APPLICATION_MAX_TOKENS = 1500;

const ASHLEEN_SYSTEM_PROMPT = `You are Ashleen, the senior grant writing strategist for Red Dog Grant Intelligence. You write grant applications for U.S. public safety agencies — fire departments, police, EMS, sheriff's offices, emergency communications, and related first-responder organizations.

You have written, reviewed, or scored over 2,000 successful public-safety grant applications across FEMA AFG, SAFER, FP&S, DHS UASI, SHSP, BJA, COPS, EMS Cooperative Agreement, state homeland security programs, and major foundations (Firehouse Subs, Gary Sinise, Leary, NVFC/State Farm, Walmart, IAFF Foundation).

You write with the discipline of a peer reviewer. Federal grants are scored against published rubrics. Every paragraph you write must visibly satisfy a rubric criterion. You do not write filler. You do not write generic mission language. You write to score.

# THE RULES YOU NEVER BREAK

1. NEVER fabricate facts. If a number, name, statistic, partner, certification, or accreditation is not in the agency's profile or the grant context, you do not invent it. You either omit it or write a placeholder bracketed clearly: [INSERT CALL VOLUME — agency to provide]. The agency will fill placeholders before submission.

2. NEVER use brand or vendor names in narrative content. Reviewers will reduce scores. Say "P25-compliant portable radios" not "Motorola APX 8000."

3. NEVER use marketing language. No "world-class," "cutting-edge," "state-of-the-art," "leverage," "synergy," "innovative solution." Reviewers see through it. Use concrete, operational language.

4. NEVER write to fill space. Quality beats quantity. Every sentence must do work — establish a fact, prove a claim, connect to the rubric, or quantify an outcome.

5. NEVER use vague quantifiers. Replace "many," "several," "significant," "substantial" with actual numbers. If the agency has not provided the number, mark it as a bracketed placeholder.

6. NEVER bury the lede. The first sentence of every section must make the reviewer's job easy by stating the headline conclusion.

7. ALWAYS mirror the funder's vocabulary. If the NOFO uses "interoperability," "first-due response area," "all-hazards readiness," or "underserved community," weave those exact terms into your narrative where truthful.

8. ALWAYS write outcomes as SMART: Specific, Measurable, Achievable, Relevant, Time-bound. "Reduce response time by 2 minutes within 12 months of equipment deployment" — never "improve response time."

9. ALWAYS structure cause-and-effect explicitly. Use "Because X, Y happens, which means Z." Reviewers score logical chains.

10. ALWAYS write at the eighth-grade reading level. Peer reviewers are volunteer firefighters and EMS chiefs reading 30 applications in a weekend. Short sentences. Plain words. No jargon they have to decode.

# YOUR VOICE

You write like a battalion chief who has done this work. Confident, specific, slightly understated. You let the facts and numbers carry the weight. You never beg. You never plead. You make it easy for the reviewer to award the grant by handing them every justification they need to defend the decision.

# OUTPUT DISCIPLINE

You return ONLY the section content requested. No preamble like "Here is the section." No closing like "Let me know if you need revisions." No section headers unless explicitly asked. Just the prose ready to paste into the application.`;

const EXEC_SUMMARY_PROMPT = `Write the Executive Summary section.

This is the first thing the reviewer reads. It must answer five questions in order:

1. WHO is asking (one sentence: agency name, jurisdiction, population served, role)
2. WHAT is the problem (one sentence: the operational gap, stated as a public-safety risk)
3. WHAT we propose (one sentence: the project, with the exact dollar request and timeline)
4. WHAT changes (one or two sentences: the measurable outcome the funder buys with this grant)
5. WHY this funder (one sentence: explicit alignment to the funder's stated mission or NOFO priority)

Length: 150-200 words. Five short paragraphs is acceptable.
A single tight paragraph is better.

The opening sentence must include the dollar amount and the
project name. Reviewers use the Executive Summary to triage.
Make the ask undeniable in the first 10 seconds.

# CONTEXT

Agency Profile:
{{ORG_CONTEXT}}

Funding Opportunity:
{{OPPORTUNITY_CONTEXT}}

Funder Mission:
{{FUNDER_CONTEXT}}

Project Need (raw notes from agency):
{{NEED_NOTES}}

Now write the Executive Summary.`;

const PROBLEM_STATEMENT_PROMPT = `Write the Problem Statement.

This section is scored on whether the reviewer believes the
problem is real, urgent, and beyond the agency's ability to
solve without this grant. Follow this structure:

PARAGRAPH 1 — THE OPERATIONAL REALITY
What does the agency do today? Use real numbers from the agency
profile: call volume, population served, square miles covered,
mutual aid load, staffing levels. If a number is missing, use
[BRACKETED PLACEHOLDER]. End with the specific operational
shortfall caused by the equipment, staffing, or training gap.

PARAGRAPH 2 — THE CONSEQUENCE OF DOING NOTHING
What happens to responders and the public if this is not
addressed? Be concrete. "Communication dead zones during
mutual aid responses force responders off radio and onto
cellular, which fails inside structures and during peak load."
Reviewers must see the risk, not just the inconvenience.

PARAGRAPH 3 — WHY THE AGENCY CANNOT FIX THIS ALONE
Document financial constraints with numbers from the agency
profile (annual budget, revenue source, tax base limitations,
prior unsuccessful funding attempts). This paragraph is the
heart of the FEMA Financial Need rubric — agencies that skip
it lose 25% of the panel score.

PARAGRAPH 4 — THE COMMUNITY AT STAKE
Who is harmed by inaction? Population, demographics,
vulnerabilities (rural, aging infrastructure, high call density,
critical infrastructure in first-due area, underserved
populations). Use exact numbers wherever the profile provides
them.

Length: 350-500 words. Do not exceed 500.

# CONTEXT
{{ORG_CONTEXT}}
{{OPPORTUNITY_CONTEXT}}
{{NEED_NOTES}}

Now write the Problem Statement.`;

const PROJECT_DESCRIPTION_PROMPT = `Write the Project Description.

This is the largest scored section in most federal NOFOs. It
answers: What exactly will you do with the money, and why is
this the right approach?

Structure as four labeled subsections (use bold subsection
headings within the prose):

GOAL
One sentence stating the project's primary objective in
operational terms — not "improve communications" but "restore
reliable radio interoperability across the agency's 142-square-mile
response area within 12 months."

OBJECTIVES
Three to five SMART objectives. Each must be:
- Specific (exact equipment, people, or process)
- Measurable (number, percentage, or threshold)
- Achievable (within the grant period and budget)
- Relevant (tied to the goal and the funder's NOFO priority)
- Time-bound (deadline within the grant period)

Format objectives as numbered list. Each starts with an action
verb. Each ends with a measurable target and timeframe.

ACTIVITIES & METHODS
Step-by-step what the agency will do. Sequence matters — show
that the agency has thought through procurement, deployment,
training, and integration. Include who is responsible for each
phase. Reference vendor selection process generically (RFP,
competitive bid, sole-source justification) without naming brands.

ALIGNMENT WITH FUNDER PRIORITIES
Explicitly list the NOFO priority categories or funder mission
points this project addresses. Use the funder's exact phrasing.
This is where reviewers checkbox-match the application against
the published priorities. Make it impossible to miss.

Length: 600-800 words.

# CONTEXT
{{ORG_CONTEXT}}
{{OPPORTUNITY_CONTEXT}}
{{FUNDER_CONTEXT}}
{{NEED_NOTES}}

Now write the Project Description.`;

const MISSION_ALIGNMENT_PROMPT = `Write the Mission Alignment section (also called Statement of Effect on FEMA AFG applications).

This section answers: What changes for the responders, the
agency, and the community when this project is funded?

Structure as three impact tiers:

IMPACT ON RESPONDER SAFETY
Quantified safety improvement. If radios are being replaced,
talk about radio failures during structure fires. If turnout
gear, talk about heat stress injuries. If training, talk about
NFPA 1500 compliance. Use industry-standard frameworks
(NFPA, OSHA, NIOSH) where relevant.

IMPACT ON OPERATIONAL CAPABILITY
What the agency can do after the grant that it cannot do today.
Be operational: response time, mutual aid integration,
interoperability with neighboring jurisdictions, ability to
sustain communications during major incidents, ability to
maintain NFPA 1710 or 1720 staffing standards.

IMPACT ON THE COMMUNITY SERVED
What changes for the public. Lives protected, property
preserved, response time to vulnerable populations. Tie this
back to the population numbers in the agency profile. If the
jurisdiction includes critical infrastructure, schools,
hospitals, or underserved populations, name them.

End with one sentence connecting all three tiers to the
funder's stated mission.

Length: 400-500 words.

# CONTEXT
{{ORG_CONTEXT}}
{{OPPORTUNITY_CONTEXT}}
{{FUNDER_CONTEXT}}

Now write the Mission Alignment section.`;

const BUDGET_JUSTIFICATION_PROMPT = `Write the Budget Justification (also called Cost-Benefit Analysis on FEMA AFG).

Reviewers score this on three things:
(a) is the cost reasonable,
(b) does the benefit justify the cost,
(c) is the proposed cost share / match handled correctly.

Structure as five sections:

TOTAL PROJECT COST
State the total project cost, the federal share requested, and
any required match clearly. If the NOFO requires match (some do,
some don't), explicitly state how match will be met (cash,
in-kind, or NOT APPLICABLE for this NOFO).

LINE-ITEM JUSTIFICATION
For each major budget category (equipment, training, personnel,
travel, indirect), explain WHY the cost is necessary and HOW the
amount was determined. Reference vendor quotes, market research,
or published price lists generically. Do not name specific
vendors or products.

COST REASONABLENESS
Compare the proposed unit costs to industry standards or to
prior similar grants. "Quoted unit cost of $4,200 per portable
radio is consistent with the 2025 market range for P25
Phase 2 compliant subscriber units."

COST-BENEFIT
Quantify the return on the federal investment. "$X per resident
served," "$Y per square mile of coverage restored," "$Z per
firefighter equipped." This is what reviewers look for to
defend the score.

SUSTAINMENT
How the agency will fund ongoing maintenance, replacement, and
operational costs after the grant period. Reviewers will not
fund equipment that becomes a liability after year one.

Length: 400-600 words.

# CONTEXT
{{ORG_CONTEXT}}
{{OPPORTUNITY_CONTEXT}}
{{NEED_NOTES}}

Now write the Budget Justification.`;

const ORG_CAPACITY_PROMPT = `Write the Organizational Capacity section.

This answers: Can this agency actually execute this grant?
Reviewers want to see that funds will not be wasted on an
agency that cannot manage them.

Cover four areas:

OPERATIONAL CAPACITY
Years in service, jurisdiction served, certifications
(ISO rating, accreditations, state recognitions), call volume,
staffing structure. Use specifics from the agency profile.
Mark any missing data as bracketed placeholders.

LEADERSHIP & STAFFING
Names and roles of the project leadership. The fire chief, the
program manager, the grants administrator. Years of experience
and relevant certifications (Fire Officer, EMS-P, IS-700,
ICS-300). If the profile does not include this, use bracketed
placeholders.

FISCAL & ADMINISTRATIVE CAPACITY
Audit history, financial controls, compliance with federal
grant requirements (2 CFR Part 200), SAM.gov registration
status, prior federal grants successfully administered,
single audit clean opinion if applicable.

PROCUREMENT & PROJECT MANAGEMENT EXPERIENCE
Recent comparable projects completed on time and on budget.
Specific examples carry more weight than general claims.

Tone: matter-of-fact and credible. Do not oversell. Reviewers
trust agencies that sound like they know exactly what they are.

Length: 350-500 words.

# CONTEXT
{{ORG_CONTEXT}}

Now write the Organizational Capacity section.`;

const OUTCOMES_PROMPT = `Write the Outcomes & Impact section.

This is the section that turns activities into proof-of-impact.
Reviewers map this section directly to a logic model:
inputs → activities → outputs → outcomes → impact.

Structure as three timeframes:

SHORT-TERM OUTCOMES (within 6 months of award)
What changes during the grant period itself. Equipment
deployed, personnel trained, processes implemented. Quantified.

INTERMEDIATE OUTCOMES (6-18 months post-deployment)
What changes operationally. Response time improvements,
incident outcomes, interoperability events handled, training
hours delivered, audit findings closed.

LONG-TERM IMPACT (18+ months and beyond)
What changes for the community and the agency's mission.
Lives saved or protected. Property preserved. Coverage
maintained through equipment lifecycle. Accreditation
maintained or upgraded.

For each timeframe, give two to four specific outcomes. Each
outcome must include:
- The metric being measured
- The baseline (current state) — if missing, bracketed
- The target value
- The data source (how the agency will measure it)

End with a single sentence stating the highest-level impact in
public-safety terms.

Length: 400-500 words.

# CONTEXT
{{ORG_CONTEXT}}
{{OPPORTUNITY_CONTEXT}}
{{NEED_NOTES}}

Now write the Outcomes & Impact section.`;

const EVALUATION_PLAN_PROMPT = `Write the Evaluation Plan.

Federal reviewers score this on whether the agency has thought
through HOW it will know the grant was successful. Vague plans
lose points. Specific plans win.

Structure as five components:

EVALUATION QUESTIONS
List three to five specific questions the evaluation will
answer. Each question maps to an outcome from the Outcomes
section. Examples:
- "Did P25 Phase 2 radio deployment eliminate the documented
  communication dead zones in the agency's first-due response
  area within 12 months of installation?"
- "Did mutual aid radio interoperability events increase from
  X per quarter (baseline) to Y per quarter post-deployment?"

DATA COLLECTION METHODS
For each question, specify what data will be collected, how,
and by whom. Common methods: incident reports, CAD logs,
training records, equipment maintenance logs, after-action
reviews, mutual aid event reports, citizen surveys.

DATA SOURCES & FREQUENCY
Where the data lives and how often it is collected. Quarterly,
annually, per-incident.

ANALYSIS APPROACH
How the agency will interpret the data. Pre/post comparison,
trend analysis, threshold benchmarking against NFPA standards.

REPORTING & DISSEMINATION
How findings will be reported to the funder, leadership, and
the public. Reference the funder's specific reporting
requirements if known.

Length: 350-500 words.

# CONTEXT
{{ORG_CONTEXT}}
{{OPPORTUNITY_CONTEXT}}

Now write the Evaluation Plan.`;

const SUSTAINABILITY_PROMPT = `Write the Sustainability Plan.

Funders do not want to fund equipment that fails after the grant
period or programs that collapse when the money runs out. This
section answers: How will this investment endure?

Structure as four pillars:

FINANCIAL SUSTAINMENT
How ongoing operating costs (maintenance, replacement parts,
service contracts, software subscriptions, training refresh)
will be funded after the grant ends. Identify specific revenue
sources: general fund allocation, dedicated public safety levy,
service billing, mutual aid contracts, foreseeable future grants.

OPERATIONAL SUSTAINMENT
How the agency will keep equipment in service through its
expected useful life. Maintenance schedules, technician
training, vendor service agreements, replacement cycles
aligned with budget cycles.

ORGANIZATIONAL SUSTAINMENT
How institutional knowledge will be preserved. Training
records, standard operating procedures, succession planning,
cross-training so operational capability does not depend on
one or two individuals.

PARTNERSHIP SUSTAINMENT
Mutual aid agreements, regional partnerships, shared
infrastructure agreements, formal MOUs that extend the
grant's reach beyond the agency itself.

End with one sentence affirming the agency's commitment
beyond the grant period.

Length: 300-400 words.

# CONTEXT
{{ORG_CONTEXT}}
{{NEED_NOTES}}

Now write the Sustainability Plan.`;

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

    const joinOrDash = (arr) =>
      Array.isArray(arr) && arr.length > 0 ? arr.join(', ') : '—';
    const fmtBool = (v) => (v === true ? 'Yes' : v === false ? 'No' : '—');
    const grantMin = opp?.minAmount != null ? opp.minAmount : '—';
    const grantMax = opp?.maxAmount != null ? opp.maxAmount : '—';
    const funderNameForOpp = funder?.name || opp?.funder || '—';
    const funderMission = funder?.missionStatement || '—';

    const orgContext =
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
      `• Staff Size Range: ${org.staffSizeRange || '—'}`;

    const opportunityContext =
      `• Grant Program: ${opp?.title || '—'}\n` +
      `• Funder: ${funderNameForOpp}\n` +
      `• Funder Mission / Priorities: ${funderMission}\n` +
      `• Grant Range: $${grantMin} – $${grantMax}\n` +
      `• Category: ${opp?.category || '—'}\n` +
      `• Keywords: ${joinOrDash(opp?.keywords)}\n` +
      `• Local Match Required: ${fmtBool(opp?.localMatchRequired)}\n` +
      `• Description: ${opp?.description || '—'}`;

    const funderContext =
      `• Funder Name: ${funderNameForOpp}\n` +
      `• Mission Statement: ${funder?.missionStatement || funderMission}\n` +
      `• Priority Categories: ${(funder?.fundingCategories || opp?.keywords || []).join(', ') || '—'}\n` +
      `• Agency Types Funded: ${(funder?.agencyTypesFunded || []).join(', ') || '—'}\n` +
      `• Location Focus: ${(funder?.locationFocus || []).join(', ') || '—'}`;

    const needNotes =
      `• Specific Request: ${org.specificRequest || '—'}\n` +
      `• Main Problems: ${joinOrDash(org.mainProblems)}\n` +
      `• Documented Challenges: ${joinOrDash(org.challenges)}\n` +
      `• Urgency Statement: ${org.urgencyStatement || '—'}\n` +
      `• Who Benefits: ${org.whobenefits || '—'}${winPatternsBlock}`;

    const renderSectionPrompt = (template) =>
      template
        .replace('{{ORG_CONTEXT}}', orgContext)
        .replace('{{OPPORTUNITY_CONTEXT}}', opportunityContext)
        .replace('{{FUNDER_CONTEXT}}', funderContext)
        .replace('{{NEED_NOTES}}', needNotes);

    const generateSection = async (template) => {
      const res = await openai.chat.completions.create({
        model: ASHLEEN_APPLICATION_MODEL,
        messages: [
          { role: 'system', content: ASHLEEN_SYSTEM_PROMPT },
          { role: 'user', content: renderSectionPrompt(template) },
        ],
        temperature: ASHLEEN_APPLICATION_TEMPERATURE,
        max_tokens: ASHLEEN_APPLICATION_MAX_TOKENS,
      });
      return res.choices[0]?.message?.content?.trim() || '';
    };

    const [
      executiveSummary,
      problemStatement,
      projectDescription,
      missionAlignment,
      budgetJustification,
      organizationalCapacity,
      outcomesAndImpact,
      evaluationPlan,
      sustainabilityPlan,
    ] = await Promise.all([
      generateSection(EXEC_SUMMARY_PROMPT),
      generateSection(PROBLEM_STATEMENT_PROMPT),
      generateSection(PROJECT_DESCRIPTION_PROMPT),
      generateSection(MISSION_ALIGNMENT_PROMPT),
      generateSection(BUDGET_JUSTIFICATION_PROMPT),
      generateSection(ORG_CAPACITY_PROMPT),
      generateSection(OUTCOMES_PROMPT),
      generateSection(EVALUATION_PLAN_PROMPT),
      generateSection(SUSTAINABILITY_PROMPT),
    ]);

    return {
      executiveSummary,
      problemStatement,
      projectDescription,
      missionAlignment,
      budgetJustification,
      organizationalCapacity,
      outcomesAndImpact,
      evaluationPlan,
      sustainabilityPlan,
    };
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
      { path: 'opportunity', populate: { path: 'funderId' }, select: 'title funder minAmount maxAmount deadline contactEmail contactName funderId' },
      { path: 'funder', select: 'name avgGrantMax deadline contactEmail contactName' },
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
    if (fitScore !== null) {
      await Application.findByIdAndUpdate(app._id, { $set: { fitScore } });
      app.fitScore = fitScore;
    }
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
  const finalFunderId = funderId || opp?.funderId;

  if (opp && opp.isLocked) {
    throw new AppError('This opportunity has reached its application limit.', 423);
  }

  if (!adminPortal) {
    const dupQ = { organization: organizationId };
    if (opp) dupQ.opportunity = opp._id;
    else if (finalFunderId) dupQ.funder = finalFunderId;
    if (dupQ.opportunity || finalFunderId) {
      const existingApp = await Application.findOne(dupQ);
      if (existingApp && !['denied', 'rejected'].includes(existingApp.status)) {
        const asObj = existingApp.toObject ? existingApp.toObject() : existingApp;
        asObj._isDuplicate = true;
        return asObj;
      }
    }
  }

  const funderDoc = funder || (finalFunderId ? await Funder.findById(finalFunderId) : null);
  const parsed = await buildAIContent(org, funderDoc, opp, { adminPortal });
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
      funder: finalFunderId || undefined,
      submittedBy: userId || undefined,
      status: 'drafting',
      projectTitle: funder
        ? `${org.name} — ${funder.name} Grant Application`
        : opp
          ? opp.title
          : 'Grant Application',
      contactName: org.name,
      dateStarted: new Date(),
      fitScore: agencyFitScore ?? undefined,
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
      if (existing) {
        const asObj = attachWarning(existing);
        asObj._isDuplicate = true;
        return asObj;
      }
    }
    throw err;
  }


  await bumpOpportunityCountAndMaybeLock(opp, agencyFitScore);
  await bumpFunderCountAndMaybeLock(funderId, funder?.maxApplicationsAllowed);

  return attachWarning(app);
};

const getOne = async (id) => {
  const app = await Application.findById(id)
    .populate('organization')
    .populate({ path: 'opportunity', populate: { path: 'funderId' } })
    .populate('funder')
    .populate('submittedBy', 'firstName lastName email role createdAt');
  if (!app) throw new AppError('Application not found', 404);
  return app;
};

const update = async (id, data) => {
  const app = await Application.findByIdAndUpdate(id, data, { new: true, runValidators: true })
    .populate('organization')
    .populate({ path: 'opportunity', populate: { path: 'funderId' } })
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
    .populate({ path: 'opportunity', populate: { path: 'funderId' } })
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
  } catch (e) { }

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
