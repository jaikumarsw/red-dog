const Match = require('./match.schema');
const Organization = require('../organizations/organization.schema');
const Opportunity = require('../opportunities/opportunity.schema');
const { AppError } = require('../../middlewares/error.middleware');

const buildRecommendedAction = (fitScore, disqualifiers) => {
  if (fitScore >= 80 && disqualifiers.length === 0) return 'High-priority. Recommend immediate review and pursuit.';
  if (fitScore >= 65) return 'Promising. Recommend validation and review.';
  if (fitScore >= 45) return 'Moderate fit. Light review recommended.';
  return 'Low fit. Keep on file.';
};

const computeMatchScore = (organization, opportunity) => {
  let score = 0;
  const reasons = [];
  const disqualifiers = [];
  const breakdown = {
    agencyType: 0,
    geography: 0,
    programKeyword: 0,
    deadlineViability: 0,
    awardSizeFit: 0,
    timelineAlignment: 0,
    dataCompleteness: 0,
  };

  // 1. Agency type match (20 pts)
  if (!opportunity.agencyTypes || opportunity.agencyTypes.length === 0) {
    breakdown.agencyType = 10;
    score += 10;
    reasons.push('No agency type restriction — partial credit (+10 pts)');
  } else {
    const orgTypes = organization.agencyTypes || [];
    const hasOverlap = orgTypes.some((t) => opportunity.agencyTypes.includes(t));
    if (hasOverlap) {
      breakdown.agencyType = 20;
      score += 20;
      reasons.push('Agency type matches opportunity requirements (+20 pts)');
    } else {
      breakdown.agencyType = 0;
      disqualifiers.push('Agency type mismatch — organization type not listed in opportunity requirements');
    }
  }

  // 2. Geography match (20 pts)
  const orgLocation = (organization.location || '').toLowerCase();
  const stateFromLocation = orgLocation.split(',').map((s) => s.trim()).find((s) => s.length > 0) || orgLocation;
  const oppKeywordsLower = (opportunity.keywords || []).map((k) => k.toLowerCase());

  if (!opportunity.keywords || opportunity.keywords.length === 0) {
    breakdown.geography = 20;
    score += 20;
    reasons.push('No geographic restriction (+20 pts)');
  } else {
    const stateMatch = oppKeywordsLower.some((kw) => orgLocation.includes(kw) || kw.includes(stateFromLocation));
    if (stateMatch) {
      breakdown.geography = 20;
      score += 20;
      reasons.push('Organization location matches opportunity geography (+20 pts)');
    } else if (!orgLocation) {
      breakdown.geography = 10;
      score += 10;
      reasons.push('Organization location not specified — partial credit (+10 pts)');
    } else {
      breakdown.geography = 0;
      disqualifiers.push('Geographic mismatch — organization location not in opportunity coverage area');
    }
  }

  // 3. Program/keyword match (25 pts)
  const programAreas = (organization.programAreas || []).map((p) => p.toLowerCase());
  const oppKeywords = (opportunity.keywords || []).map((k) => k.toLowerCase());
  const programOverlap = programAreas.filter((p) => oppKeywords.some((k) => k.includes(p) || p.includes(k))).length;

  if (programOverlap >= 3) {
    breakdown.programKeyword = 25;
    score += 25;
    reasons.push(`Strong program/keyword fit — ${programOverlap} matching areas (+25 pts)`);
  } else if (programOverlap === 2) {
    breakdown.programKeyword = 20;
    score += 20;
    reasons.push(`Good program/keyword alignment — ${programOverlap} matching areas (+20 pts)`);
  } else if (programOverlap === 1) {
    breakdown.programKeyword = 12;
    score += 12;
    reasons.push('Some program/keyword overlap (+12 pts)');
  } else if (programAreas.length === 0 || oppKeywords.length === 0) {
    breakdown.programKeyword = 8;
    score += 8;
    reasons.push('Insufficient data for program match — partial credit (+8 pts)');
  } else {
    breakdown.programKeyword = 0;
    disqualifiers.push('No program/keyword overlap between organization and opportunity');
  }

  // 4. Deadline viability (10 pts)
  const now = new Date();
  if (!opportunity.deadline) {
    breakdown.deadlineViability = 4;
    score += 4;
    reasons.push('No deadline set (+4 pts)');
  } else {
    const daysUntil = Math.ceil((new Date(opportunity.deadline) - now) / (1000 * 60 * 60 * 24));
    if (daysUntil < 0) {
      breakdown.deadlineViability = 0;
      disqualifiers.push('Deadline has already passed');
    } else if (daysUntil < 7) {
      breakdown.deadlineViability = 1;
      score += 1;
      reasons.push(`Deadline very soon (${daysUntil} days) — limited time (+1 pt)`);
    } else if (daysUntil <= 14) {
      breakdown.deadlineViability = 3;
      score += 3;
      reasons.push(`Deadline within 2 weeks (${daysUntil} days) (+3 pts)`);
    } else if (daysUntil <= 30) {
      breakdown.deadlineViability = 7;
      score += 7;
      reasons.push(`Deadline within 30 days (${daysUntil} days) (+7 pts)`);
    } else {
      breakdown.deadlineViability = 10;
      score += 10;
      reasons.push(`Deadline is ${daysUntil} days away (+10 pts)`);
    }
  }

  // 5. Award size fit (10 pts)
  const budgetMidpoints = {
    under_25k: 12500,
    '25k_150k': 87500,
    '150k_500k': 325000,
    '500k_plus': 750000,
  };
  const targetBudget = budgetMidpoints[organization.budgetRange];
  if (!targetBudget || !opportunity.maxAmount) {
    breakdown.awardSizeFit = 5;
    score += 5;
    reasons.push('Budget data incomplete — partial credit (+5 pts)');
  } else if (targetBudget <= opportunity.maxAmount) {
    breakdown.awardSizeFit = 10;
    score += 10;
    reasons.push(`Budget range fits within max award ($${opportunity.maxAmount.toLocaleString()}) (+10 pts)`);
  } else if (targetBudget <= opportunity.maxAmount * 1.5) {
    breakdown.awardSizeFit = 7;
    score += 7;
    reasons.push('Budget slightly above award range — still viable (+7 pts)');
  } else {
    breakdown.awardSizeFit = 3;
    score += 3;
    reasons.push('Budget range exceeds award amount (+3 pts)');
  }

  // 6. Timeline alignment (10 pts)
  if (!opportunity.deadline || !organization.timeline || organization.timeline === 'any') {
    breakdown.timelineAlignment = 10;
    score += 10;
    reasons.push('No timeline conflict (+10 pts)');
  } else {
    const daysUntil = Math.ceil((new Date(opportunity.deadline) - now) / (1000 * 60 * 60 * 24));
    const isUrgent = daysUntil <= 30;
    if (organization.timeline === 'urgent' && isUrgent) {
      breakdown.timelineAlignment = 10;
      score += 10;
      reasons.push('Urgent timeline aligns with approaching deadline (+10 pts)');
    } else if (organization.timeline === 'planned' && !isUrgent) {
      breakdown.timelineAlignment = 10;
      score += 10;
      reasons.push('Planned timeline aligns with future deadline (+10 pts)');
    } else {
      breakdown.timelineAlignment = 5;
      score += 5;
      reasons.push('Timeline partially aligned (+5 pts)');
    }
  }

  // 7. Data completeness (5 pts)
  const fields = ['title', 'funder', 'deadline', 'keywords', 'description', 'maxAmount'];
  const presentFields = fields.filter((f) => {
    const val = opportunity[f];
    return val !== undefined && val !== null && val !== '' && !(Array.isArray(val) && val.length === 0);
  }).length;
  if (presentFields >= 5) {
    breakdown.dataCompleteness = 5;
    score += 5;
    reasons.push(`High data completeness (${presentFields}/6 fields) (+5 pts)`);
  } else if (presentFields >= 3) {
    breakdown.dataCompleteness = 3;
    score += 3;
    reasons.push(`Moderate data completeness (${presentFields}/6 fields) (+3 pts)`);
  } else {
    breakdown.dataCompleteness = 1;
    score += 1;
    reasons.push(`Low data completeness (${presentFields}/6 fields) (+1 pt)`);
  }

  const fitScore = Math.min(100, Math.max(0, score));
  const recommendedAction = buildRecommendedAction(fitScore, disqualifiers);
  const state = organization.location ? organization.location.split(',').map((s) => s.trim()).pop() : '';

  return { fitScore, reasons, fitReasons: reasons, disqualifiers, recommendedAction, breakdown, state };
};

const getAll = async ({ page = 1, limit = 20, organizationId, oppId, status, minScore, maxScore, search }) => {
  const query = {};
  if (organizationId) query.organization = organizationId;
  if (oppId) query.opportunity = oppId;
  if (status) query.status = status;
  if (minScore !== undefined) query.fitScore = { ...query.fitScore, $gte: Number(minScore) };
  if (maxScore !== undefined) query.fitScore = { ...query.fitScore, $lte: Number(maxScore) };

  return Match.paginate(query, {
    page: parseInt(page),
    limit: parseInt(limit),
    sort: { fitScore: -1 },
    populate: [
      { path: 'organization', select: 'name location status agencyTypes' },
      { path: 'opportunity', select: 'title funder maxAmount deadline status category' },
    ],
  });
};

const getOne = async (id) => {
  const match = await Match.findById(id).populate('organization').populate('opportunity');
  if (!match) throw new AppError('Match not found', 404);
  return match;
};

const create = async (data) => Match.create(data);

const computeAndSave = async (opportunityId, organizationId) => {
  const [org, opp] = await Promise.all([
    Organization.findById(organizationId),
    Opportunity.findById(opportunityId),
  ]);
  if (!org) throw new AppError('Organization not found', 404);
  if (!opp) throw new AppError('Opportunity not found', 404);

  const scored = computeMatchScore(org, opp);

  const match = await Match.findOneAndUpdate(
    { organization: organizationId, opportunity: opportunityId },
    { ...scored, lastUpdated: new Date(), status: 'pending' },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).populate(['organization', 'opportunity']);

  return match;
};

const approveMatch = async (id) => {
  const match = await Match.findByIdAndUpdate(id, { status: 'approved' }, { new: true });
  if (!match) throw new AppError('Match not found', 404);
  return match;
};

const rejectMatch = async (id) => {
  const match = await Match.findByIdAndUpdate(id, { status: 'rejected' }, { new: true });
  if (!match) throw new AppError('Match not found', 404);
  return match;
};

const computeAllForOrganization = async (organizationId) => {
  const org = await Organization.findById(organizationId);
  if (!org) throw new AppError('Organization not found', 404);

  const opportunities = await Opportunity.find({ status: { $in: ['open', 'closing'] } });
  let processed = 0, upserted = 0, errors = 0;

  for (const opp of opportunities) {
    try {
      const scored = computeMatchScore(org, opp);
      await Match.findOneAndUpdate(
        { organization: organizationId, opportunity: opp._id },
        { ...scored, lastUpdated: new Date() },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      processed++;
      upserted++;
    } catch (err) {
      errors++;
    }
  }

  await Organization.findByIdAndUpdate(organizationId, {
    lastMatchRecomputedAt: new Date(),
    matchCount: await Match.countDocuments({ organization: organizationId }),
  });

  return { processed, upserted, errors, total: opportunities.length };
};

module.exports = {
  computeMatchScore,
  getAll,
  getOne,
  create,
  computeAndSave,
  approveMatch,
  rejectMatch,
  computeAllForOrganization,
};
