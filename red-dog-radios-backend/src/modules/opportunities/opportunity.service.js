const Opportunity = require('./opportunity.schema');
const mongoose = require('mongoose');
const { AppError } = require('../../middlewares/error.middleware');
const matchService = require('../matches/match.service');
const { DEFAULT_MIN_RELEVANCE_SCORE } = require('../../utils/agencyProfileTags');
const { refreshOppEmbedding } = require('../../utils/embedding.service');

const computeStatus = (deadline) => {
  if (!deadline) return 'open';
  const now = new Date();
  const in14Days = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  if (deadline < now) return 'closed';
  if (deadline <= in14Days) return 'closing';
  return 'open';
};

const getAll = async ({
  page = 1,
  limit = 20,
  search,
  status,
  category,
  organizationId,
  sortBy,
  matchedOnly,
  minFitScore,
}) => {
  const query = {};
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  if (status) query.status = status;
  if (category) query.category = { $regex: category, $options: 'i' };
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { funder: { $regex: search, $options: 'i' } },
    ];
  }

  const useMatchedOnly =
    organizationId &&
    matchedOnly !== false &&
    matchedOnly !== 'false';

  if (useMatchedOnly) {
    const Match = require('../matches/match.schema');
    const orgId =
      typeof organizationId === 'string'
        ? new mongoose.Types.ObjectId(organizationId)
        : organizationId;
    const minFit = parseInt(minFitScore || DEFAULT_MIN_RELEVANCE_SCORE, 10);

    const oppMatch = { ...query };
    if (!status) {
      oppMatch.status = { $in: ['open', 'closing'] };
    }

    const matchStage = {
      organization: orgId,
      isRelevant: true,
      fitScore: { $gte: minFit },
    };

    const buildOppFilter = () => {
      const clauses = [];
      if (oppMatch.status) {
        if (oppMatch.status.$in) {
          clauses.push({ 'oppDoc.status': { $in: oppMatch.status.$in } });
        } else {
          clauses.push({ 'oppDoc.status': oppMatch.status });
        }
      }
      if (oppMatch.category) {
        clauses.push({ 'oppDoc.category': oppMatch.category });
      }
      if (oppMatch.$or) {
        clauses.push({
          $or: oppMatch.$or.map((clause) => {
            const field = Object.keys(clause)[0];
            return { [`oppDoc.${field}`]: clause[field] };
          }),
        });
      }
      return clauses.length ? { $match: { $and: clauses } } : null;
    };

    const oppFilterStage = buildOppFilter();
    const basePipeline = [
      { $match: matchStage },
      {
        $lookup: {
          from: Opportunity.collection.name,
          localField: 'opportunity',
          foreignField: '_id',
          as: 'oppDoc',
        },
      },
      { $unwind: '$oppDoc' },
    ];
    if (oppFilterStage) basePipeline.push(oppFilterStage);

    const [countRows, docs] = await Promise.all([
      Match.aggregate([...basePipeline, { $count: 'total' }]),
      Match.aggregate([
        ...basePipeline,
        { $sort: { fitScore: -1, 'oppDoc.deadline': 1 } },
        { $skip: (pageNum - 1) * limitNum },
        { $limit: limitNum },
        {
          $project: {
            fitScore: 1,
            rubricTier: 1,
            status: 1,
            winProbability: 1,
            reasons: 1,
            fitReasons: 1,
            isRelevant: 1,
            oppDoc: 1,
          },
        },
      ]),
    ]);

    const totalDocs = countRows[0]?.total || 0;
    const mappedDocs = docs.map((row) => {
      const opp = row.oppDoc;
      return {
        ...opp,
        fitScore: row.fitScore,
        matchTier: row.rubricTier,
        matchStatus: row.status,
        winProbability: row.winProbability,
        matchReasons: [...(row.fitReasons || []), ...(row.reasons || [])],
        isRelevant: row.isRelevant,
      };
    });

    for (const opp of mappedDocs) {
      const computed = computeStatus(opp.deadline);
      if (computed !== opp.status) {
        await Opportunity.findByIdAndUpdate(opp._id, { status: computed });
        opp.status = computed;
      }
    }

    const totalPages = Math.ceil(totalDocs / limitNum) || 1;
    return {
      docs: mappedDocs,
      totalDocs,
      limit: limitNum,
      page: pageNum,
      totalPages,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1,
    };
  }

  if (organizationId && sortBy === 'fitScore') {
    const Match = require('../matches/match.schema');
    const orgId =
      typeof organizationId === 'string'
        ? new mongoose.Types.ObjectId(organizationId)
        : organizationId;

    const [docs, totalDocs] = await Promise.all([
      Opportunity.aggregate([
        { $match: query },
        {
          $lookup: {
            from: Match.collection.name,
            let: { oppId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$opportunity', '$$oppId'] },
                      { $eq: ['$organization', orgId] },
                    ],
                  },
                },
              },
              {
                $project: {
                  fitScore: 1,
                  rubricTier: 1,
                  status: 1,
                  winProbability: 1,
                  reasons: 1,
                  fitReasons: 1,
                },
              },
            ],
            as: 'matchRows',
          },
        },
        { $addFields: { match: { $arrayElemAt: ['$matchRows', 0] } } },
        {
          $addFields: {
            fitScore: '$match.fitScore',
            matchTier: '$match.rubricTier',
            matchStatus: '$match.status',
            winProbability: '$match.winProbability',
            matchReasons: {
              $concatArrays: [
                { $ifNull: ['$match.fitReasons', []] },
                { $ifNull: ['$match.reasons', []] },
              ],
            },
          },
        },
        { $project: { matchRows: 0, match: 0 } },
        { $sort: { fitScore: -1, deadline: 1 } },
        { $skip: (pageNum - 1) * limitNum },
        { $limit: limitNum },
      ]),
      Opportunity.countDocuments(query),
    ]);

    for (const opp of docs) {
      const computed = computeStatus(opp.deadline);
      if (computed !== opp.status) {
        await Opportunity.findByIdAndUpdate(opp._id, { status: computed });
        opp.status = computed;
      }
    }

    const totalPages = Math.ceil(totalDocs / limitNum) || 1;
    return {
      docs,
      totalDocs,
      limit: limitNum,
      page: pageNum,
      totalPages,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1,
    };
  }

  const result = await Opportunity.paginate(query, {
    page: pageNum,
    limit: limitNum,
    sort: { deadline: 1 },
    populate: [
      { path: 'createdBy', select: 'firstName lastName email' },
      { path: 'funderId' }
    ],
  });

  // Auto-update statuses for returned docs
  for (const opp of result.docs) {
    const computed = computeStatus(opp.deadline);
    if (computed !== opp.status) {
      await Opportunity.findByIdAndUpdate(opp._id, { status: computed });
      opp.status = computed;
    }
  }

  // Inject match scores for the specific organization if requested
  if (organizationId) {
    const Match = require('../matches/match.schema');
    const matches = await Match.find({
      organization: organizationId,
      opportunity: { $in: result.docs.map((d) => d._id) },
    }).lean();

    const matchMap = new Map(matches.map((m) => [String(m.opportunity), m]));

    result.docs = result.docs.map((doc) => {
      const plain = doc.toObject ? doc.toObject() : doc;
      const match = matchMap.get(String(doc._id));
      if (match) {
        plain.fitScore = match.fitScore;
        plain.matchTier = match.rubricTier;
        plain.matchStatus = match.status;
        plain.winProbability = match.winProbability;
        plain.matchReasons = [...(match.fitReasons || []), ...(match.reasons || [])];
      }
      return plain;
    });
  }

  return result;
};

const create = async (data, userId) => {
  // Normalize externalSourceId: remove if empty string to avoid unique index conflict
  if (data.externalSourceId === '') {
    delete data.externalSourceId;
  }
  const status = computeStatus(data.deadline ? new Date(data.deadline) : null);
  const opp = await Opportunity.create({ ...data, status, createdBy: userId });

  // Generate semantic embedding then trigger agency scoring (both async, non-blocking)
  setImmediate(async () => {
    await refreshOppEmbedding(opp).catch(() => {});
    await matchService.computeAllForOpportunity(opp._id).catch((err) => {
      console.error(`[Opportunity Scoring Error] Failed for new opp ${opp._id}:`, err);
    });
  });

  return opp;
};

const getOne = async (id) => {
  const opp = await Opportunity.findById(id)
    .populate('createdBy', 'firstName lastName email')
    .populate('funderId');
  if (!opp) throw new AppError('Opportunity not found', 404);
  return opp;
};

const update = async (id, data) => {
  if (data.deadline) data.status = computeStatus(new Date(data.deadline));
  const opp = await Opportunity.findByIdAndUpdate(id, data, { new: true, runValidators: true }).populate('funderId');
  if (!opp) throw new AppError('Opportunity not found', 404);

  // Refresh embedding if content fields changed, then recalculate scores (both async, non-blocking)
  const contentFields = ['title', 'funder', 'description', 'keywords', 'equipmentTags', 'category'];
  const contentChanged = contentFields.some((f) => f in data);
  setImmediate(async () => {
    if (contentChanged) await refreshOppEmbedding(opp).catch(() => {});
    await matchService.computeAllForOpportunity(opp._id).catch((err) => {
      console.error(`[Opportunity Scoring Error] Failed for update of ${opp._id}:`, err);
    });
  });

  return opp;
};

const remove = async (id) => {
  const opp = await Opportunity.findByIdAndDelete(id);
  if (!opp) throw new AppError('Opportunity not found', 404);
  return opp;
};

module.exports = { getAll, create, getOne, update, remove };
