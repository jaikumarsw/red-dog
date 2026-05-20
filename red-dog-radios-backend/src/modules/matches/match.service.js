const Match = require('./match.schema');
const Organization = require('../organizations/organization.schema');
const Opportunity = require('../opportunities/opportunity.schema');
const Application = require('../applications/application.schema');
const { AppError } = require('../../middlewares/error.middleware');
const {
  buildAgencyProfile,
  buildOpportunityCorpus,
  countTermOverlap,
  isAgencyRelevant,
  isNationalLocationFocus,
  isOffDomainOpportunity,
  DEFAULT_MIN_RELEVANCE_SCORE,
} = require('../../utils/agencyProfileTags');
const { cosineSimilarity } = require('../../utils/embedding.service');

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

  const profile = buildAgencyProfile(organization);
  const corpus = buildOpportunityCorpus(opportunity);

  // 1. Agency type match (20 pts) — also checks eligibility text when Grants.gov omits agencyTypes
  const oppAgencyTypes = opportunity.agencyTypes || [];
  const eligibleText = (opportunity.eligibleApplicants || []).map(String).join(' ').toLowerCase();
  const orgTypes = profile.agencyTypes;

  if (oppAgencyTypes.length === 0) {
    const typeKeywordOverlap = countTermOverlap(
      orgTypes.flatMap((t) => [t, t.replace(/_/g, ' ')]),
      [...corpus.allTerms, eligibleText]
    );
    if (orgTypes.length === 0) {
      breakdown.agencyType = 8;
      score += 8;
      reasons.push('Agency type not specified in profile — partial credit (+8 pts)');
    } else if (typeKeywordOverlap.count > 0) {
      breakdown.agencyType = 18;
      score += 18;
      reasons.push(
        `Agency type aligns with opportunity eligibility (${typeKeywordOverlap.matched.slice(0, 3).join(', ')}) (+18 pts)`
      );
    } else {
      breakdown.agencyType = 6;
      score += 6;
      reasons.push('No explicit agency type on opportunity — partial credit (+6 pts)');
    }
  } else {
    const hasOverlap = orgTypes.some((t) => oppAgencyTypes.includes(t));
    if (hasOverlap) {
      breakdown.agencyType = 20;
      score += 20;
      reasons.push('Agency type matches opportunity requirements (+20 pts)');
    } else if (orgTypes.length === 0) {
      breakdown.agencyType = 5;
      score += 5;
      reasons.push('Agency type not set in profile — partial credit (+5 pts)');
    } else {
      breakdown.agencyType = 0;
      disqualifiers.push('Agency type mismatch — organization type not listed in opportunity requirements');
    }
  }

  // 1a. Eligibility type (nonprofit vs government)
  if (profile.eligibilityType && eligibleText) {
    const eligibilityTerms =
      profile.eligibilityType === 'nonprofit_501c3'
        ? ['nonprofit', '501', '501c3', 'non-profit']
        : ['government', 'state', 'local', 'tribal', 'municipal', 'public agency'];
    const eligibilityHit = eligibilityTerms.some((term) => eligibleText.includes(term));
    if (eligibilityHit) {
      score += 5;
      reasons.push('Eligibility type aligns with opportunity applicant requirements (+5 pts)');
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

  // 2. Geography match (20 pts)
  const orgLocation = (organization.location || '').toLowerCase();
  const rawLocationFocus = opportunity.locationFocus;

  if (isNationalLocationFocus(rawLocationFocus)) {
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

  // 2b. Off-domain check for public safety agencies vs health/education/research grants
  if (isOffDomainOpportunity(profile, opportunity, corpus)) {
    disqualifiers.push('Off-domain opportunity — grant focus does not align with agency mission');
  }

  // 3. Thematic / semantic match (25 pts)
  // Uses OpenAI cosine similarity when both embeddings are stored; falls back to keyword overlap.
  // Agency-type keywords are intentionally excluded from the keyword path — they inflate scores
  // identically for every agency of the same type regardless of actual stated needs.
  let keywordOverlap = 0;
  let semanticSimilarity = null;

  const orgEmbedding = Array.isArray(organization.profileEmbedding) && organization.profileEmbedding.length > 0
    ? organization.profileEmbedding : null;
  const oppEmbedding = Array.isArray(opportunity.descriptionEmbedding) && opportunity.descriptionEmbedding.length > 0
    ? opportunity.descriptionEmbedding : null;

  if (orgEmbedding && oppEmbedding) {
    // Semantic path: cosine similarity drives the score
    semanticSimilarity = cosineSimilarity(orgEmbedding, oppEmbedding);
    const sim = semanticSimilarity ?? 0;

    if (sim >= 0.55) {
      breakdown.programKeyword = 25;
      score += 25;
      keywordOverlap = 4;
      reasons.push(`Strong semantic match (${(sim * 100).toFixed(0)}% relevance score) (+25 pts)`);
    } else if (sim >= 0.40) {
      breakdown.programKeyword = 18;
      score += 18;
      keywordOverlap = 2;
      reasons.push(`Good semantic alignment (${(sim * 100).toFixed(0)}% relevance score) (+18 pts)`);
    } else if (sim >= 0.25) {
      breakdown.programKeyword = 8;
      score += 8;
      keywordOverlap = 1;
      reasons.push(`Moderate semantic overlap (${(sim * 100).toFixed(0)}% relevance score) (+8 pts)`);
    } else {
      breakdown.programKeyword = 0;
      keywordOverlap = 0;
      disqualifiers.push('Low semantic relevance — agency profile does not align with this opportunity');
    }
  } else {
    // Keyword fallback path (used when embeddings haven't been generated yet)
    const thematicKeywords = profile.thematicKeywords || profile.keywords || [];
    const { count, matched: matchedKeywords } = countTermOverlap(
      thematicKeywords,
      corpus.thematicTerms || corpus.allTerms
    );
    keywordOverlap = count;

    if (count >= 4) {
      breakdown.programKeyword = 25;
      score += 25;
      reasons.push(
        `Strong thematic match — ${count} overlapping themes (${matchedKeywords.slice(0, 4).join(', ')}) (+25 pts)`
      );
    } else if (count >= 2) {
      breakdown.programKeyword = 18;
      score += 18;
      reasons.push(`Good thematic alignment — ${matchedKeywords.slice(0, 3).join(', ')} (+18 pts)`);
    } else if (count === 1) {
      breakdown.programKeyword = 8;
      score += 8;
      reasons.push(`Limited thematic overlap — ${matchedKeywords[0]} (+8 pts)`);
    } else if (thematicKeywords.length === 0) {
      breakdown.programKeyword = 0;
      reasons.push('Complete your agency profile to improve grant matching');
    } else {
      breakdown.programKeyword = 0;
      disqualifiers.push('No thematic overlap between agency profile and opportunity');
    }
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

  // Use distinct arrays to avoid duplication in UI
  const result = {
    fitScore,
    reasons,
    fitReasons: [...reasons],
    disqualifiers,
    recommendedAction,
    breakdown,
    state,
    thematicOverlap: keywordOverlap,
    isRelevant: false,
    ...(semanticSimilarity !== null && { semanticSimilarity }),
  };

  // Priority boost for long-term non-winning agencies
  if (organization?.priorityFlags?.isLongTermNoWin) {
    const PRIORITY_BOOST = 5;
    result.fitScore = Math.min(100, (result.fitScore || 0) + PRIORITY_BOOST);
    result.reasons.push(`Priority boost (+${PRIORITY_BOOST}) — long-term agency, no recent wins`);
    result.fitReasons.push(`Priority boost (+${PRIORITY_BOOST}) — long-term agency, no recent wins`);
  }

  result.isRelevant = isAgencyRelevant(result, profile, opportunity, corpus);

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
  const profile = buildAgencyProfile(organization);
  const orgChallenges = Array.isArray(organization?.challenges) ? organization.challenges.map(String) : [];
  const orgPriorities = Array.isArray(organization?.fundingPriorities) ? organization.fundingPriorities.map(String) : [];
  const orgPrograms = profile.programAreas.map((s) => String(s).toLowerCase());
  const corpus = buildOpportunityCorpus(opportunity);
  const oppKeywords = corpus.allTerms;

  const overlap = (a, b) => {
    const setB = new Set(b);
    return a.filter((x) => setB.has(x)).length;
  };

  const priorityOverlap = overlap(orgPriorities.map((s) => s.toLowerCase()), oppKeywords);
  const programOverlap = orgPrograms.filter((p) => oppKeywords.some((k) => k.includes(p) || p.includes(k))).length;

  // Need Score (max 25)
  const needBase = clamp(orgChallenges.length * 5, 5, 15); // Baseline of 5 even if no challenges listed
  const needScore = clamp(needBase + clamp(priorityOverlap * 2, 0, 10), 0, 25);

  // Project Design (max 25)
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
  const projectDesignScore = clamp(Math.round((designPresent / designFields.length) * 25), 5, 25); // Baseline 5

  // Budget (max 15)
  const budgetScore = clamp(Math.round((breakdown?.awardSizeFit || 5) * 1.5), 0, 15);

  // Capacity (max 15)
  const staff = Number(organization?.numberOfStaff || 0);
  const staffBase = staff >= 50 ? 10 : staff >= 25 ? 8 : staff >= 10 ? 6 : staff > 0 ? 4 : 5; // Baseline 5
  const capacityScore = clamp(Math.round(staffBase + pastSuccessFactor * 5), 0, 15);

  // Impact (max 20)
  const pop = Number(organization?.populationServed || 0);
  const popBase = pop >= 50000 ? 10 : pop >= 20000 ? 8 : pop >= 5000 ? 6 : pop > 0 ? 4 : 5; // Baseline 5
  const impactScore = clamp(popBase + clamp(programOverlap * 2, 0, 10), 0, 20);

  // Evaluation (max 10)
  const evaluationScore = clamp(Math.round((breakdown?.dataCompleteness || 3) * 2), 0, 10);

  // Sustainability (max 10)
  const sustainabilityScore = clamp(
    (organization?.canMeetLocalMatch === true ? 3 : 1) +
      (organization?.budgetRange ? 3 : 1) +
      (organization?.currentEquipment ? 2 : 1) +
      (organization?.numberOfStaff != null ? 2 : 1),
    2,
    10
  );

  // Alignment (max 15)
  const alignmentRaw = (breakdown?.agencyType || 10) + (breakdown?.geography || 10) + (breakdown?.programKeyword || 5);
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
    
  const normalizedScore = clamp(Math.round((totalScore / 135) * 100), 5, 100); // Minimum 5% normalized

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

const getAll = async ({
  page = 1,
  limit = 20,
  organizationId,
  oppId,
  status,
  minScore,
  maxScore,
  search,
  relevantOnly,
}) => {
  const query = {};
  if (organizationId) query.organization = organizationId;
  if (oppId) query.opportunity = oppId;
  if (status) query.status = status;
  if (relevantOnly === true || relevantOnly === 'true') query.isRelevant = true;
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

// Override fitScore with a conservatively-discounted rubric score so agencies don't see
// inflated numbers that create false confidence. The displayed score is 82% of the actual
// rubric normalizedScore (roughly 15-20% lower). Relevance filtering still uses the
// undiscounted rubric score so borderline matches aren't hidden. rawFitScore preserves
// the original rule-based eligibility score for internal reference.
const DISPLAY_DISCOUNT = 0.82;
const buildDisplayOverrides = (scored, rubricScores) => {
  const normalizedScore = rubricScores.normalizedScore;
  const displayFitScore = Math.round(normalizedScore * DISPLAY_DISCOUNT);
  return {
    fitScore: displayFitScore,
    rawFitScore: scored.fitScore,
    isRelevant: scored.isRelevant && normalizedScore >= DEFAULT_MIN_RELEVANCE_SCORE,
  };
};

const computeAndSave = async (opportunityId, organizationId) => {
  const [org, opp] = await Promise.all([
    Organization.findById(organizationId).select('+profileEmbedding'),
    Opportunity.findById(opportunityId).select('+descriptionEmbedding'),
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
      ...buildDisplayOverrides(scored, rubricScores),
      rubricScores,
      rubricTier,
      competitionLevel,
      competitionLabel,
      pastSuccessFactor,
      winProbability,
      lastUpdated: new Date(),
      status: 'pending',
      scoreVersion: 'v5',
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
  const org = await Organization.findById(organizationId).select('+profileEmbedding');
  if (!org) throw new AppError('Organization not found', 404);

  const opportunities = await Opportunity.find({ status: { $in: ['open', 'closing'] } }).select('+descriptionEmbedding');
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
          ...buildDisplayOverrides(scored, rubricScores),
          rubricScores,
          rubricTier,
          competitionLevel,
          competitionLabel,
          pastSuccessFactor,
          winProbability,
          lastUpdated: new Date(),
          scoreVersion: 'v5',
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
  const opp = await Opportunity.findById(opportunityId).select('+descriptionEmbedding');
  if (!opp) throw new AppError('Opportunity not found', 404);

  const organizations = await Organization.find({ status: 'active' }).select('+profileEmbedding');
  let processed = 0, errors = 0;

  // Step 1: Initial pass — compute base eligibility scores and persist them
  for (const org of organizations) {
    try {
      const scored = computeMatchScore(org, opp);
      await Match.findOneAndUpdate(
        { organization: org._id, opportunity: opp._id },
        {
          ...scored,
          rawFitScore: scored.fitScore,  // preserve raw eligibility score; fitScore overridden in pass 2
          lastUpdated: new Date(),
          scoreVersion: 'v5',
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

  // Step 3: Second pass — compute rubric scores and override fitScore with normalizedScore
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
        fitScore: match.rawFitScore ?? match.fitScore,
        competitionLevel,
        pastSuccessFactor,
      });

      const displayFitScore = rubricScores.normalizedScore;
      await Match.findByIdAndUpdate(match._id, {
        fitScore: displayFitScore,
        isRelevant: match.isRelevant && displayFitScore >= DEFAULT_MIN_RELEVANCE_SCORE,
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
