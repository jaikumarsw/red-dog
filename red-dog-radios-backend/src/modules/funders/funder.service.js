const Funder = require('./funder.schema');
const Organization = require('../organizations/organization.schema');
const Application = require('../applications/application.schema');
const { AppError } = require('../../middlewares/error.middleware');

const computeFunderScore = (org, funder) => {
  let score = 0;
  const reasons = [];
  const budgetMidpoints = { under_25k: 12500, '25k_150k': 87500, '150k_500k': 325000, '500k_plus': 750000 };

  // 1. Agency type match (35 pts)
  const funderTypes = funder.agencyTypesFunded || [];
  const orgTypes = org.agencyTypes || [];
  if (funderTypes.length === 0) {
    score += 20;
    reasons.push('No agency type restriction — open to all public safety agencies');
  } else if (orgTypes.length > 0) {
    const overlap = orgTypes.filter((t) => funderTypes.includes(t));
    if (overlap.length > 0) {
      score += 35;
      reasons.push(`Your agency type (${overlap[0].replace(/_/g, ' ')}) matches this funder's focus`);
    } else {
      reasons.push("Your agency type is not in this funder's target list");
    }
  } else {
    score += 10;
    reasons.push('Agency type unspecified — unable to fully verify fit');
  }

  // 2. Location match (25 pts)
  const orgLoc = (org.location || '').toLowerCase();
  const funderLocs = (funder.locationFocus || []).map((l) => l.toLowerCase());
  if (funderLocs.some((l) => ['national', 'nationwide', 'all states'].includes(l))) {
    score += 25;
    reasons.push('Funds agencies nationwide');
  } else if (orgLoc && funderLocs.length > 0) {
    const stateWords = orgLoc.split(',').map((s) => s.trim());
    const locationMatch = funderLocs.some((l) => stateWords.some((w) => l.includes(w) || w.includes(l)));
    if (locationMatch) {
      score += 25;
      reasons.push('Geographic match: funder covers your area');
    } else {
      reasons.push('Geographic area may not overlap — verify eligibility');
    }
  } else if (funderLocs.length === 0) {
    score += 15;
    reasons.push('No explicit location restrictions specified');
  }

  // 3. Funding category match (25 pts)
  const orgAreas = [
    ...(org.programAreas || []),
    ...(org.fundingPriorities || []),
    ...(org.focusAreas || []),
  ].map((p) => p.toLowerCase());
  const funderCats = (funder.fundingCategories || []).map((c) => c.toLowerCase());
  const catOverlap = orgAreas.filter((k) => funderCats.some((c) => c.includes(k) || k.includes(c)));
  if (catOverlap.length >= 2) {
    score += 25;
    reasons.push(`Strong category fit: ${catOverlap.slice(0, 2).join(', ')}`);
  } else if (catOverlap.length === 1) {
    score += 15;
    reasons.push(`Category match: ${catOverlap[0]}`);
  } else if (orgAreas.length === 0 || funderCats.length === 0) {
    score += 8;
    reasons.push('Category data incomplete — partial credit');
  } else {
    reasons.push('No direct category overlap identified');
  }

  // 4. Grant size fit (15 pts)
  const targetBudget = budgetMidpoints[org.budgetRange];
  if (targetBudget && funder.avgGrantMax) {
    if (targetBudget >= (funder.avgGrantMin || 0) && targetBudget <= funder.avgGrantMax) {
      score += 15;
      reasons.push("Your typical grant request fits within this funder's range");
    } else if (targetBudget <= funder.avgGrantMax * 1.5) {
      score += 10;
      reasons.push('Grant size approximately fits your needs');
    } else {
      score += 3;
      reasons.push("Grant amount may not align with your budget range");
    }
  } else {
    score += 7;
    reasons.push('Grant size data incomplete — estimate only');
  }

  if (funder.localMatchRequired === true) {
    if (org.canMeetLocalMatch === false) {
      reasons.push('Local match required — your profile says you cannot meet it (fit reduced)');
      score = Math.max(0, score - 25);
    } else if (org.canMeetLocalMatch === true) {
      reasons.push('You can meet this funder’s local match requirement (+5)');
      score += 5;
    } else {
      reasons.push('This funder may require local match — set preference in your agency profile');
    }
  }

  const finalScore = Math.min(100, Math.max(0, score));
  const tier = finalScore >= 75 ? 'high' : finalScore >= 50 ? 'medium' : 'low';
  return { score: finalScore, tier, reasons };
};

const getAll = async ({ page = 1, limit = 20, search, category, location, status = 'active', organizationId } = {}) => {
  const query = { status };

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { missionStatement: { $regex: search, $options: 'i' } },
    ];
  }
  if (category) query.fundingCategories = { $in: [category] };
  if (location) query.locationFocus = { $in: [location] };

  const result = await Funder.paginate(query, {
    page: parseInt(page),
    limit: parseInt(limit),
    sort: { name: 1 },
  });

  if (organizationId) {
    const org = await Organization.findById(organizationId);
    if (org) {
      result.docs = result.docs.map((f) => {
        const plain = f.toObject();
        const scored = computeFunderScore(org, plain);
        plain.matchScore = scored.score;
        plain.matchTier = scored.tier;
        plain.matchReasons = scored.reasons;
        return plain;
      });
      result.docs.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
    }
  }

  return result;
};

const getOne = async (id, organizationId) => {
  const funder = await Funder.findById(id);
  if (!funder) throw new AppError('Funder not found', 404);

  const plain = funder.toObject();

  if (organizationId) {
    const org = await Organization.findById(organizationId);
    if (org) {
      const scored = computeFunderScore(org, plain);
      plain.matchScore = scored.score;
      plain.matchTier = scored.tier;
      plain.matchReasons = scored.reasons;
    }
  }

  return plain;
};

const create = async (data, userId) => {
  const existing = await Funder.findOne({ name: data.name, status: 'active' });
  if (existing) throw new AppError('A funder with this name already exists', 409);

  const funder = await Funder.create({ ...data, addedBy: userId });
  return funder;
};

const update = async (id, data) => {
  const funder = await Funder.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!funder) throw new AppError('Funder not found', 404);
  return funder;
};

const deactivate = async (id) => {
  const funder = await Funder.findByIdAndUpdate(id, { status: 'inactive' }, { new: true });
  if (!funder) throw new AppError('Funder not found', 404);
  return funder;
};

const reactivate = async (id) => {
  const funder = await Funder.findByIdAndUpdate(id, { status: 'active' }, { new: true });
  if (!funder) throw new AppError('Funder not found', 404);
  return funder;
};

const saveFunder = async (funderId, organizationId) => {
  const Match = require('../matches/match.schema');
  const match = await Match.findOneAndUpdate(
    { opportunity: funderId, organization: organizationId },
    { status: 'saved' },
    { new: true, upsert: false }
  );
  return match;
};

/** Agency portal: only the `notes` field may be updated on the shared funder record. */
const updateAgencyNotesOnly = async (funderId, notes) => {
  const funder = await Funder.findByIdAndUpdate(funderId, { $set: { notes: String(notes ?? '') } }, { new: true, runValidators: true });
  if (!funder) throw new AppError('Funder not found', 404);
  return funder;
};

const ACTIVE_APP_STATUSES = new Set(['draft', 'drafting', 'not_started', 'ready_to_submit', 'submitted', 'in_review', 'follow_up_needed', 'awarded']);

const getQueueForAgency = async (funderId, organizationId) => {
  const Opportunity = require('../opportunities/opportunity.schema');
  const funder = await Funder.findById(funderId).lean();
  if (!funder) throw new AppError('Funder not found', 404);

  const opps = await Opportunity.find({ funder: funder.name, status: { $ne: 'closed' } }).sort({ deadline: 1 }).lean();

  const apps = await Application.find({ funder: funderId, status: { $in: [...ACTIVE_APP_STATUSES] } })
    .sort({ createdAt: 1 })
    .select('organization createdAt')
    .lean();

  const totalInQueue = apps.length;
  const idx = apps.findIndex((a) => String(a.organization) === String(organizationId));
  let position;
  let ahead;
  if (idx >= 0) {
    position = idx + 1;
    ahead = idx;
  } else {
    position = totalInQueue + 1;
    ahead = totalInQueue;
  }

  let maxApplicationsAllowed = 0;
  let currentApplicationCount = 0;
  let isLocked = false;
  if (opps.length === 1) {
    const o = opps[0];
    maxApplicationsAllowed = o.maxApplicationsAllowed ?? 0;
    currentApplicationCount = o.currentApplicationCount ?? 0;
    isLocked = !!o.isLocked;
  } else if (opps.length > 1) {
    isLocked = opps.every((o) => o.isLocked);
    maxApplicationsAllowed = 0;
    currentApplicationCount = 0;
  }

  let estimatedChance = 'moderate';
  if (isLocked) estimatedChance = 'closed — no new applications for this opportunity';
  else if (maxApplicationsAllowed > 0 && currentApplicationCount >= maxApplicationsAllowed - 1) {
    estimatedChance = 'limited — few spots remain';
  } else if (totalInQueue <= 2) estimatedChance = 'strong — early in the cycle';

  return {
    position,
    ahead,
    totalInQueue,
    estimatedChance,
    maxApplicationsAllowed,
    currentApplicationCount,
    isLocked,
    opportunityCount: opps.length,
  };
};

module.exports = {
  getAll,
  getOne,
  create,
  update,
  deactivate,
  reactivate,
  saveFunder,
  computeFunderScore,
  updateAgencyNotesOnly,
  getQueueForAgency,
};
