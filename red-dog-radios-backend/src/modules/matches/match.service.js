const Match = require('./match.schema');
const Organization = require('../organizations/organization.schema');
const Opportunity = require('../opportunities/opportunity.schema');
const Application = require('../applications/application.schema');
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
    localMatch: 0,
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

  // 1b Local match requirement (opportunity)
  if (opportunity.localMatchRequired === true) {
    if (organization.canMeetLocalMatch === false) {
      breakdown.localMatch = 0;
      disqualifiers.push('Local match required — agency profile indicates no local match capacity');
      reasons.push('Local match requirement not met for this opportunity');
    } else if (organization.canMeetLocalMatch === true) {
      breakdown.localMatch = 5;
      score += 5;
      reasons.push('Agency can satisfy local match requirement (+5 pts)');
    } else {
      reasons.push('This opportunity may require local match — set capability in your agency profile');
    }
  }

  // 2. Geography match (20 pts) — uses opportunity.locationFocus (national = empty / absent)
  const orgLocation = (organization.location || '').toLowerCase();
  const rawLocationFocus = opportunity.locationFocus;
  const isNationalProgram =
    rawLocationFocus == null || (Array.isArray(rawLocationFocus) && rawLocationFocus.length === 0);

  if (isNationalProgram) {
    breakdown.geography = 20;
    score += 20;
    reasons.push('National program — open to all states (+20 pts)');
  } else {
    const focusList = Array.isArray(rawLocationFocus)
      ? rawLocationFocus.map((s) => String(s).trim().toLowerCase()).filter((s) => s.length > 0)
      : [];
    const locationMatchesFocus = focusList.some((focus) => orgLocation.includes(focus));
    if (locationMatchesFocus) {
      breakdown.geography = 20;
      score += 20;
      reasons.push('Organization location matches opportunity geography (+20 pts)');
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
    '25k_50k': 37500,
    '50k_100k': 75000,
    '100k_plus': 150000,
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

  const result = { fitScore, reasons, fitReasons: reasons, disqualifiers, recommendedAction, breakdown, state };

  // Priority boost for long-term non-winning agencies
  if (organization?.priorityFlags?.isLongTermNoWin) {
    const PRIORITY_BOOST = 5;
    result.fitScore = Math.min(100, (result.fitScore || 0) + PRIORITY_BOOST);
    result.reasons = result.reasons || [];
    result.reasons.push(`Priority boost (+${PRIORITY_BOOST}) — long-term agency, no recent wins`);
  }

  return result;
};

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

const rubricTierFrom = (normalizedScore) => {
  if (normalizedScore >= 90) return 'priority';
  if (normalizedScore >= 80) return 'strong';
  if (normalizedScore >= 70) return 'borderline';
  return 'block';
};

const competitionFromCount = (highFitCount) => {
  if (highFitCount <= 0) return { level: 0.2, label: 'Low' };
  if (highFitCount === 1) return { level: 0.5, label: 'Medium' };
  if (highFitCount === 2) return { level: 0.75, label: 'High' };
  return { level: 1.0, label: 'Saturated' };
};

const computeRubricScores = ({ organization, opportunity, breakdown, pastSuccessFactor = 0.5 }) => {
  const orgChallenges = Array.isArray(organization?.challenges) ? organization.challenges.map(String) : [];
  const orgPriorities = Array.isArray(organization?.fundingPriorities) ? organization.fundingPriorities.map(String) : [];
  const orgPrograms = Array.isArray(organization?.programAreas) ? organization.programAreas.map(String).map((s) => s.toLowerCase()) : [];
  const oppKeywords = Array.isArray(opportunity?.keywords) ? opportunity.keywords.map(String).map((s) => s.toLowerCase()) : [];

  const overlap = (a, b) => {
    const setB = new Set(b);
    return a.filter((x) => setB.has(x)).length;
  };

  const priorityOverlap = overlap(orgPriorities.map((s) => s.toLowerCase()), oppKeywords);
  const programOverlap = orgPrograms.filter((p) => oppKeywords.some((k) => k.includes(p) || p.includes(k))).length;

  const needBase = clamp(orgChallenges.length * 5, 0, 15);
  const needScore = clamp(needBase + clamp(priorityOverlap * 2, 0, 10), 0, 25);

  const designFields = [
    opportunity?.description,
    opportunity?.deadline,
    opportunity?.maxAmount,
    opportunity?.minAmount,
    Array.isArray(opportunity?.keywords) && opportunity.keywords.length ? true : null,
    Array.isArray(opportunity?.agencyTypes) && opportunity.agencyTypes.length ? true : null,
    opportunity?.locationFocus,
  ];
  const designPresent = designFields.filter((v) => v !== undefined && v !== null && v !== '' && v !== false).length;
  const projectDesignScore = clamp(Math.round((designPresent / designFields.length) * 25), 0, 25);

  const budgetScore = clamp(Math.round((breakdown?.awardSizeFit || 0) * 1.5), 0, 15);

  const staff = Number(organization?.numberOfStaff || 0);
  const staffBase = staff >= 50 ? 10 : staff >= 25 ? 8 : staff >= 10 ? 6 : staff > 0 ? 4 : 3;
  const capacityScore = clamp(Math.round(staffBase + pastSuccessFactor * 5), 0, 15);

  const pop = Number(organization?.populationServed || 0);
  const popBase = pop >= 50000 ? 10 : pop >= 20000 ? 8 : pop >= 5000 ? 6 : pop > 0 ? 4 : 2;
  const impactScore = clamp(popBase + clamp(programOverlap * 2, 0, 10), 0, 20);

  const evaluationScore = clamp(Math.round((breakdown?.dataCompleteness || 0) * 2), 0, 10);

  const sustainabilityScore = clamp(
    (organization?.canMeetLocalMatch === true ? 3 : 0) +
      (organization?.budgetRange ? 3 : 0) +
      (organization?.currentEquipment ? 2 : 0) +
      (organization?.numberOfStaff != null ? 2 : 0),
    0,
    10
  );

  const alignmentRaw = (breakdown?.agencyType || 0) + (breakdown?.geography || 0) + (breakdown?.programKeyword || 0);
  const alignmentScore = clamp(Math.round((alignmentRaw / 65) * 15), 0, 15);

  const totalScore =
    needScore +
    projectDesignScore +
    budgetScore +
    capacityScore +
    impactScore +
    evaluationScore +
    sustainabilityScore +
    alignmentScore;
  const normalizedScore = clamp(Math.round((totalScore / 135) * 100), 0, 100);

  return {
    needScore,
    projectDesignScore,
    budgetScore,
    capacityScore,
    impactScore,
    evaluationScore,
    sustainabilityScore,
    alignmentScore,
    totalScore,
    normalizedScore,
  };
};

const computePastSuccessFactor = async (organizationId) => {
  const submittedStatuses = ['submitted', 'in_review', 'approved', 'awarded', 'rejected', 'denied'];
  const [submittedCount, winCount] = await Promise.all([
    Application.countDocuments({ organization: organizationId, status: { $in: submittedStatuses } }),
    Application.countDocuments({ organization: organizationId, status: 'awarded' }),
  ]);
  if (!submittedCount) return { submittedCount: 0, winCount, pastSuccessFactor: 0.5 };
  return {
    submittedCount,
    winCount,
    pastSuccessFactor: clamp(winCount / submittedCount, 0, 1),
  };
};

const computeCompetition = async (opportunityId) => {
  const highFitCount = await Match.countDocuments({ opportunity: opportunityId, fitScore: { $gte: 90 } });
  const { level, label } = competitionFromCount(highFitCount);
  return { highFitCount, competitionLevel: level, competitionLabel: label };
};

const computeWinProbability = ({ fitScore, competitionLevel, pastSuccessFactor }) => {
  const win =
    (fitScore || 0) * 0.5 +
    (1 - (competitionLevel ?? 0.5)) * 100 * 0.3 +
    (pastSuccessFactor ?? 0.5) * 100 * 0.2;
  return clamp(Math.round(win), 0, 100);
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
      {
        path: 'opportunity',
        select:
          'title funder minAmount maxAmount deadline status category description keywords agencyTypes sourceUrl equipmentTags localMatchRequired createdAt updatedAt',
      },
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

  const { pastSuccessFactor } = await computePastSuccessFactor(organizationId);
  const rubricScores = computeRubricScores({
    organization: org,
    opportunity: opp,
    breakdown: scored.breakdown,
    pastSuccessFactor,
  });
  const rubricTier = rubricTierFrom(rubricScores.normalizedScore);

  const { competitionLevel, competitionLabel } = await computeCompetition(opportunityId);
  const winProbability = computeWinProbability({ fitScore: scored.fitScore, competitionLevel, pastSuccessFactor });

  const match = await Match.findOneAndUpdate(
    { organization: organizationId, opportunity: opportunityId },
    {
      ...scored,
      rubricScores,
      rubricTier,
      competitionLevel,
      competitionLabel,
      pastSuccessFactor,
      winProbability,
      lastUpdated: new Date(),
      status: 'pending',
      scoreVersion: 'v3',
    },
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

  const { pastSuccessFactor } = await computePastSuccessFactor(organizationId);

  for (const opp of opportunities) {
    try {
      const scored = computeMatchScore(org, opp);
      const rubricScores = computeRubricScores({
        organization: org,
        opportunity: opp,
        breakdown: scored.breakdown,
        pastSuccessFactor,
      });
      const rubricTier = rubricTierFrom(rubricScores.normalizedScore);
      const { competitionLevel, competitionLabel } = await computeCompetition(opp._id);
      const winProbability = computeWinProbability({ fitScore: scored.fitScore, competitionLevel, pastSuccessFactor });

      await Match.findOneAndUpdate(
        { organization: organizationId, opportunity: opp._id },
        {
          ...scored,
          rubricScores,
          rubricTier,
          competitionLevel,
          competitionLabel,
          pastSuccessFactor,
          winProbability,
          lastUpdated: new Date(),
          scoreVersion: 'v3',
        },
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

const computeAllForOpportunity = async (opportunityId) => {
  const opp = await Opportunity.findById(opportunityId);
  if (!opp) throw new AppError('Opportunity not found', 404);

  const organizations = await Organization.find({ status: 'active' });
  let processed = 0, errors = 0;

  // Step 1: Initial pass to create/update match records with base scores
  for (const org of organizations) {
    try {
      const scored = computeMatchScore(org, opp);
      await Match.findOneAndUpdate(
        { organization: org._id, opportunity: opp._id },
        {
          ...scored,
          lastUpdated: new Date(),
          scoreVersion: 'v3',
          status: 'pending',
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      processed++;
    } catch (err) {
      console.error(`[Scoring] Initial pass failed for org ${org._id}:`, err);
      errors++;
    }
  }

  // Step 2: Calculate competition level based on all newly created matches
  const { competitionLevel, competitionLabel } = await computeCompetition(opp._id);

  // Step 3: Second pass to calculate win probability and rubric scores
  for (const org of organizations) {
    try {
      const { pastSuccessFactor } = await computePastSuccessFactor(org._id);
      const match = await Match.findOne({ organization: org._id, opportunity: opp._id });
      if (!match) continue;

      const rubricScores = computeRubricScores({
        organization: org,
        opportunity: opp,
        breakdown: match.breakdown,
        pastSuccessFactor,
      });
      const rubricTier = rubricTierFrom(rubricScores.normalizedScore);
      const winProbability = computeWinProbability({ 
        fitScore: match.fitScore, 
        competitionLevel, 
        pastSuccessFactor 
      });

      await Match.findByIdAndUpdate(match._id, {
        rubricScores,
        rubricTier,
        competitionLevel,
        competitionLabel,
        pastSuccessFactor,
        winProbability,
      });
    } catch (err) {
      console.error(`[Scoring] Second pass failed for org ${org._id}:`, err);
    }
  }

  return { processed, errors, total: organizations.length };
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
  computeAllForOpportunity,
};
