const User = require('../auth/user.schema');
const Organization = require('../organizations/organization.schema');
const Opportunity = require('../opportunities/opportunity.schema');
const Application = require('../applications/application.schema');
const Funder = require('../funders/funder.schema');
const Match = require('../matches/match.schema');
const appService = require('../applications/application.service');
const oppService = require('../opportunities/opportunity.service');
const funderService = require('../funders/funder.service');
const matchService = require('../matches/match.service');
const activityLogService = require('../activityLogs/activityLog.service');
const { AppError } = require('../../middlewares/error.middleware');
const { parsePagination } = require('../../utils/parsePagination');

const HIGH_MATCH = 75;
const TIER_HIGH = 80;
const TIER_MID = 65;

const matchTier = (score) => {
  if (score >= TIER_HIGH) return 'high';
  if (score >= TIER_MID) return 'medium';
  return 'low';
};

const dashboard = async () => {
  const [
    totalAgencies,
    totalOpportunities,
    totalApplications,
    totalFunders,
    appsByStatus,
    recentSignups,
    topOpps,
    awardsWon,
    appsSubmitted,
  ] = await Promise.all([
    Organization.countDocuments({ status: 'active' }),
    Opportunity.countDocuments(),
    Application.countDocuments(),
    Funder.countDocuments({ status: 'active' }),
    Application.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Organization.find({ status: 'active' })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('name agencyTypes location createdAt'),
    Match.aggregate([
      { $match: { fitScore: { $gte: HIGH_MATCH } } },
      { $group: { _id: '$opportunity', matchCount: { $sum: 1 }, maxScore: { $max: '$fitScore' } } },
      { $sort: { matchCount: -1, maxScore: -1 } },
      { $limit: 5 },
    ]),
    Application.countDocuments({ status: 'awarded' }),
    Application.countDocuments({ status: { $in: ['submitted', 'in_review'] } }),
  ]);

  const oppIds = topOpps.map((t) => t._id);
  const oppsPop = await Opportunity.find({ _id: { $in: oppIds } }).select('title funder deadline status');
  const oppMap = Object.fromEntries(oppsPop.map((o) => [String(o._id), o]));

  const topMatchedOpportunities = topOpps.map((row) => {
    const o = oppMap[String(row._id)];
    return {
      opportunityId: row._id,
      title: o?.title,
      funder: o?.funder,
      highMatchCount: row.matchCount,
      highestScore: row.maxScore,
    };
  });

  const recentActivityNorm = await Application.find()
    .sort({ updatedAt: -1 })
    .limit(25)
    .populate('organization', 'name')
    .populate('funder', 'name')
    .populate('opportunity', 'title funder')
    .lean();

  const activityRows = [];
  for (const a of recentActivityNorm) {
    const histList = a.statusHistory || [];
    for (let i = histList.length - 1; i >= 0 && activityRows.length < 10; i--) {
      const h = histList[i];
      activityRows.push({
        applicationId: a._id,
        agencyName: a.organization?.name,
        status: h.status,
        previousStatus: h.previousStatus,
        changedAt: h.changedAt,
        funderName: a.funder?.name || a.opportunity?.funder,
      });
    }
  }
  activityRows.sort((x, y) => new Date(y.changedAt) - new Date(x.changedAt));
  const activity = activityRows.slice(0, 10);

  return {
    totalAgencies,
    totalOpportunities,
    totalApplications,
    totalFunders,
    awardsWon,
    applicationsSubmitted: appsSubmitted,
    applicationsByStatus: appsByStatus.reduce((acc, r) => ({ ...acc, [r._id]: r.count }), {}),
    recentSignups: recentSignups.map((o) => ({
      id: o._id,
      name: o.name,
      agencyTypes: o.agencyTypes,
      location: o.location,
      signupDate: o.createdAt,
    })),
    topMatchedOpportunities,
    recentActivity: activity,
    recentApplications: recentActivityNorm.slice(0, 10).map((a) => ({
      id: a._id,
      agencyName: a.organization?.name,
      funderName: a.funder?.name || a.opportunity?.funder,
      status: a.status,
      updatedAt: a.updatedAt,
    })),
  };
};

const listAgencies = async (query) => {
  const { search } = query;
  const { page, limit } = parsePagination(query);
  const q = { status: 'active' };
  if (search) {
    const rx = new RegExp(search, 'i');
    q.$or = [{ name: rx }, { location: rx }, { agencyTypes: rx }];
  }
  const result = await Organization.paginate(q, {
    page,
    limit,
    sort: { createdAt: -1 },
  });

  const enriched = await Promise.all(
    result.docs.map(async (org) => {
      const o = org.toObject ? org.toObject() : org;
      const [matchCount, appCount, topMatch] = await Promise.all([
        Match.countDocuments({ organization: o._id }),
        Application.countDocuments({ organization: o._id }),
        Match.findOne({ organization: o._id }).sort({ fitScore: -1 }).populate('opportunity', 'title funder fitScore'),
      ]);
      let topOpp = null;
      if (topMatch?.opportunity) {
        topOpp = {
          title: topMatch.opportunity.title,
          funder: topMatch.opportunity.funder,
          score: topMatch.fitScore,
        };
      }
      return { ...o, matchCount, applicationCount: appCount, topMatchedOpportunity: topOpp };
    })
  );

  return { ...result, docs: enriched };
};

const getAgencyDetail = async (id) => {
  const org = await Organization.findById(id);
  if (!org) throw new AppError('Agency not found', 404);
  const matches = await Match.find({ organization: id })
    .sort({ fitScore: -1 })
    .populate('opportunity', '_id title funder deadline category status maxAmount');
  const applications = await Application.find({ organization: id })
    .sort({ createdAt: -1 })
    .populate('funder', 'name')
    .populate('opportunity', '_id title funder');
  const submissionHistory = applications
    .flatMap((a) =>
      (a.statusHistory || []).map((h) => ({
        applicationId: a._id,
        ...(h.toObject ? h.toObject() : h),
      }))
    )
    .sort((x, y) => new Date(y.changedAt) - new Date(x.changedAt));

  return {
    profile: org,
    matches: matches.map((m) => ({
      ...m.toObject(),
      tier: matchTier(m.fitScore),
      reasons: [...(m.reasons || []), ...(m.fitReasons || [])],
    })),
    applications,
    submissionHistory,
  };
};

const listOpportunitiesAdmin = async (query) => {
  const { status, category, deadlineFrom, deadlineTo, search } = query;
  const { page, limit } = parsePagination(query);
  const q = {};
  if (status) q.status = status;
  if (category) q.category = new RegExp(category, 'i');
  if (deadlineFrom || deadlineTo) {
    q.deadline = {};
    if (deadlineFrom) q.deadline.$gte = new Date(deadlineFrom);
    if (deadlineTo) q.deadline.$lte = new Date(deadlineTo);
  }
  if (search) {
    const rx = new RegExp(search, 'i');
    q.$or = [{ title: rx }, { funder: rx }];
  }
  const result = await Opportunity.paginate(q, {
    page,
    limit,
    sort: { deadline: 1 },
  });
  const oppIds = result.docs.map((d) => d._id);
  const appCountRows =
    oppIds.length === 0
      ? []
      : await Application.aggregate([
          { $match: { opportunity: { $in: oppIds } } },
          { $group: { _id: '$opportunity', count: { $sum: 1 } } },
        ]);
  const applicationCountMap = Object.fromEntries(
    appCountRows.map((r) => [String(r._id), r.count])
  );
  const docs = await Promise.all(
    result.docs.map(async (opp) => {
      const o = opp.toObject();
      const [matchAgencyCount, topScore] = await Promise.all([
        Match.distinct('organization', { opportunity: o._id }).then((a) => a.length),
        Match.findOne({ opportunity: o._id }).sort({ fitScore: -1 }).select('fitScore'),
      ]);
      return {
        ...o,
        agenciesMatchedCount: matchAgencyCount,
        highestMatchScore: topScore?.fitScore || 0,
        applicationCount: applicationCountMap[String(o._id)] || 0,
      };
    })
  );
  return { ...result, docs };
};

const createOpportunityAdmin = (body, userId) => oppService.create(body, userId);
const getOpportunityAdmin = async (id) => {
  const opp = await oppService.getOne(id);
  const applications = await Application.find({ opportunity: id })
    .sort({ updatedAt: -1 })
    .populate('organization', 'name location agencyTypes')
    .populate('funder', 'name')
    .lean();
  const plain = opp.toObject ? opp.toObject() : opp;
  return { ...plain, applications };
};
const updateOpportunityAdmin = (id, body) => oppService.update(id, body);
const deleteOpportunityAdmin = async (id, actorId) => {
  const o = await Opportunity.findById(id).select('title');
  await oppService.remove(id);
  await activityLogService.log({
    category: 'opportunity',
    action: 'deleted',
    summary: `Deleted opportunity "${o?.title || id}"`,
    actorId,
    meta: { opportunityId: id },
  });
};

const listFundersAdmin = (query) => funderService.getAll({ ...query, status: query.status || 'active' });
const normalizeFunderPayload = (body) => {
  const b = { ...body };
  if (typeof b.pastGrantsAwarded === 'string') {
    b.pastGrantsAwarded = b.pastGrantsAwarded
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (typeof b.equipmentTags === 'string') {
    b.equipmentTags = b.equipmentTags
      .split(/,|\n/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (b.localMatchRequired === true || b.localMatchRequired === 'true') b.localMatchRequired = true;
  else if (b.localMatchRequired === false || b.localMatchRequired === 'false') b.localMatchRequired = false;
  return b;
};

const createFunderAdmin = (body, userId) => funderService.create(normalizeFunderPayload(body), userId);
const updateFunderAdmin = (id, body) => funderService.update(id, normalizeFunderPayload(body));
const deleteFunderAdmin = async (id, actorId) => {
  const f = await Funder.findById(id).select('name');
  await Funder.findByIdAndDelete(id);
  await activityLogService.log({
    category: 'funder',
    action: 'deleted',
    summary: `Deleted funder "${f?.name || id}"`,
    actorId,
    meta: { funderId: id },
  });
};

const listApplicationsAdmin = async (query) => {
  const { status, agencyId, funderId, dateFrom, dateTo } = query;
  const { page, limit } = parsePagination(query);
  const q = {};
  if (status === 'pending_review') {
    q.status = { $in: ['submitted', 'in_review'] };
  } else if (status) {
    q.status = status;
  }
  if (agencyId) q.organization = agencyId;
  if (funderId) q.funder = funderId;
  if (dateFrom || dateTo) {
    q.createdAt = {};
    if (dateFrom) q.createdAt.$gte = new Date(dateFrom);
    if (dateTo) q.createdAt.$lte = new Date(dateTo);
  }
  const result = await Application.paginate(q, {
    page,
    limit,
    sort: { updatedAt: -1 },
    populate: [
      { path: 'organization', select: 'name location agencyTypes' },
      { path: 'funder', select: 'name' },
      { path: 'opportunity', select: 'title funder' },
    ],
  });
  const docs = await Promise.all(
    result.docs.map(async (doc) => {
      const o = doc.toObject ? doc.toObject() : doc;
      const orgId = o.organization?._id ?? o.organization;
      const oppId = o.opportunity?._id ?? o.opportunity;
      let fitScore = null;
      if (orgId && oppId) {
        const m = await Match.findOne({ organization: orgId, opportunity: oppId }).select('fitScore').lean();
        fitScore = m?.fitScore ?? null;
      }
      return { ...o, fitScore };
    })
  );
  return { ...result, docs };
};

const getApplicationAdmin = async (id) => {
  const app = await appService.getOne(id);
  const plain = app.toObject ? app.toObject() : app;
  const orgId = plain.organization?._id ?? plain.organization;
  const oppId = plain.opportunity?._id ?? plain.opportunity;
  let fitScore = null;
  let matchBreakdown = null;
  let matchReasons = [];
  if (orgId && oppId) {
    const m = await Match.findOne({ organization: orgId, opportunity: oppId })
      .select('fitScore breakdown reasons fitReasons')
      .lean();
    if (m) {
      fitScore = m.fitScore;
      matchBreakdown = m.breakdown;
      matchReasons = [...(m.reasons || []), ...(m.fitReasons || [])];
    }
  }
  return { ...plain, fitScore, matchBreakdown, matchReasons };
};

const deleteApplicationAdmin = (id) => appService.remove(id);

const updateApplicationAdmin = (id, body) => appService.update(id, body);

const updateApplicationStatusAdmin = (id, body, actorId) => appService.updateStatus(id, body, { actorId });

const generateApplicationAIAdmin = (id) => appService.adminRegenerateAI(id);

const createApplicationForAgency = (body) =>
  appService.createWithAI({
    organizationId: body.agencyId,
    funderId: body.funderId,
    opportunityId: body.opportunityId,
    userId: body.adminUserId,
    adminPortal: true,
  });

const listMatchesAdmin = async (query) => {
  const { tier, minScore, maxScore, agencyId, funder } = query;
  const { page, limit } = parsePagination(query);
  const q = {};
  if (agencyId) q.organization = agencyId;
  if (minScore !== undefined) q.fitScore = { ...q.fitScore, $gte: parseInt(minScore, 10) };
  if (maxScore !== undefined) q.fitScore = { ...q.fitScore, $lte: parseInt(maxScore, 10) };
  if (tier) {
    if (tier === 'high') q.fitScore = { $gte: TIER_HIGH };
    else if (tier === 'medium') q.fitScore = { $gte: TIER_MID, $lt: TIER_HIGH };
    else if (tier === 'low') q.fitScore = { $lt: TIER_MID };
  }
  if (funder) {
    const opIds = await Opportunity.find({ funder: new RegExp(funder, 'i') }).distinct('_id');
    q.opportunity = { $in: opIds };
  }
  const result = await Match.paginate(q, {
    page,
    limit,
    sort: { fitScore: -1 },
    populate: [
      { path: 'organization', select: 'name location agencyTypes' },
      { path: 'opportunity', select: 'title funder category keywords' },
    ],
  });

  const pairConditions = result.docs
    .map((m) => {
      const o = m.toObject ? m.toObject() : m;
      const orgId = o.organization?._id ?? o.organization;
      const oppId = o.opportunity?._id ?? o.opportunity;
      return { organization: orgId, opportunity: oppId };
    })
    .filter((p) => p.organization && p.opportunity);
  let appByPair = {};
  if (pairConditions.length > 0) {
    const apps = await Application.find({ $or: pairConditions }).select('_id organization opportunity status').lean();
    appByPair = Object.fromEntries(
      apps.map((a) => [`${String(a.organization)}:${String(a.opportunity)}`, a])
    );
  }

  const docs = result.docs.map((m) => {
    const o = m.toObject ? m.toObject() : m;
    const orgId = o.organization?._id ?? o.organization;
    const oppId = o.opportunity?._id ?? o.opportunity;
    const appRow = appByPair[`${String(orgId)}:${String(oppId)}`];
    return {
      ...o,
      tier: matchTier(o.fitScore),
      agencyName: o.organization?.name,
      funderName: o.opportunity?.funder,
      locationMatch: (o.breakdown?.geography || 0) > 0,
      categoryMatch: (o.breakdown?.programKeyword || 0) > 0,
      matchReasons: [...(o.reasons || []), ...(o.fitReasons || [])],
      linkedApplication: appRow ? { _id: appRow._id, status: appRow.status } : null,
    };
  });
  return { ...result, docs };
};

const recomputeAllMatches = async () => {
  const orgs = await Organization.find({ status: 'active' });
  const opps = await Opportunity.find({});
  let processed = 0;
  const { computeMatchScore } = matchService;
  for (const org of orgs) {
    for (const opp of opps) {
      const scored = computeMatchScore(org, opp);
      await Match.findOneAndUpdate(
        { organization: org._id, opportunity: opp._id },
        { ...scored, lastUpdated: new Date() },
        { upsert: true, new: true }
      );
      processed += 1;
    }
    await Organization.findByIdAndUpdate(org._id, {
      lastMatchRecomputedAt: new Date(),
      matchCount: await Match.countDocuments({ organization: org._id }),
    });
  }
  return { organizations: orgs.length, opportunities: opps.length, processed };
};

const getUserAdmin = async (userId) => {
  const u = await User.findById(userId).select('-password');
  if (!u) throw new AppError('User not found', 404);
  const o = u.toObject();
  const appCount = o.organizationId
    ? await Application.countDocuments({ organization: o.organizationId })
    : 0;
  let agencyName = null;
  if (o.organizationId) {
    const org = await Organization.findById(o.organizationId).select('name location agencyTypes');
    agencyName = org?.name;
    return { ...o, applicationCount: appCount, agencyName, organization: org };
  }
  return { ...o, applicationCount: appCount, agencyName };
};

const getFunderAdmin = async (id) => {
  const funder = await funderService.getOne(id, null);
  const applicantOrgs = await Application.find({ funder: id })
    .populate('organization', 'name location')
    .select('organization status createdAt projectTitle')
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
  return { ...funder, applicantOrgs };
};

const unlockFunderAdmin = async (id) => {
  const f = await Funder.findByIdAndUpdate(
    id,
    { $set: { isLocked: false, currentApplicationCount: 0 } },
    { new: true }
  );
  if (!f) throw new AppError('Funder not found', 404);
  return f;
};

const setFunderLimitAdmin = async (id, body) => {
  const max = parseInt(body.maxApplicationsAllowed, 10);
  if (Number.isNaN(max) || max < 1) throw new AppError('maxApplicationsAllowed must be a positive number', 400);
  const f = await Funder.findByIdAndUpdate(id, { $set: { maxApplicationsAllowed: max } }, { new: true });
  if (!f) throw new AppError('Funder not found', 404);
  return f;
};

const getActivityLogAdmin = (id) => activityLogService.getByIdAdmin(id);

const listUsersAdmin = async (query) => {
  const { page, limit } = parsePagination(query);
  const result = await User.paginate(
    {},
    {
      page,
      limit,
      sort: { createdAt: -1 },
    }
  );
  // do not expose password
  const docs = await Promise.all(
    result.docs.map(async (u) => {
      const o = u.toObject();
      delete o.password;
      const appCount = o.organizationId
        ? await Application.countDocuments({ organization: o.organizationId })
        : 0;
      let agencyName = null;
      if (o.organizationId) {
        const org = await Organization.findById(o.organizationId).select('name');
        agencyName = org?.name;
      }
      return { ...o, applicationCount: appCount, agencyName };
    })
  );
  return { ...result, docs };
};

const updateUserRole = async (userId, { role }) => {
  if (!['agency', 'admin'].includes(role)) throw new AppError('Invalid role', 400);
  const u = await User.findByIdAndUpdate(userId, { role }, { new: true }).select('-password');
  if (!u) throw new AppError('User not found', 404);
  return u;
};

const listActivityLogsAdmin = (query) => activityLogService.listAdmin(query);

const approveMatchAdmin = (matchId) => matchService.approveMatch(matchId);

const rejectMatchAdmin = (matchId) => matchService.rejectMatch(matchId);

module.exports = {
  dashboard,
  listAgencies,
  getAgencyDetail,
  listOpportunitiesAdmin,
  createOpportunityAdmin,
  getOpportunityAdmin,
  updateOpportunityAdmin,
  deleteOpportunityAdmin,
  listFundersAdmin,
  createFunderAdmin,
  updateFunderAdmin,
  deleteFunderAdmin,
  listApplicationsAdmin,
  getApplicationAdmin,
  deleteApplicationAdmin,
  updateApplicationAdmin,
  updateApplicationStatusAdmin,
  generateApplicationAIAdmin,
  createApplicationForAgency,
  listMatchesAdmin,
  recomputeAllMatches,
  getUserAdmin,
  getFunderAdmin,
  unlockFunderAdmin,
  setFunderLimitAdmin,
  getActivityLogAdmin,
  listUsersAdmin,
  updateUserRole,
  listActivityLogsAdmin,
  approveMatchAdmin,
  rejectMatchAdmin,
};
