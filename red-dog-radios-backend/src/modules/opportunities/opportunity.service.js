const Opportunity = require('./opportunity.schema');
const mongoose = require('mongoose');
const { AppError } = require('../../middlewares/error.middleware');
const matchService = require('../matches/match.service');

const computeStatus = (deadline) => {
  if (!deadline) return 'open';
  const now = new Date();
  const in14Days = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  if (deadline < now) return 'closed';
  if (deadline <= in14Days) return 'closing';
  return 'open';
};

const getAll = async ({ page = 1, limit = 20, search, status, category, organizationId, sortBy }) => {
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
  
  // Trigger scoring for all agencies
  try {
    await matchService.computeAllForOpportunity(opp._id);
  } catch (err) {
    console.error(`[Opportunity Scoring Error] Failed for new opp ${opp._id}:`, err);
  }
  
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
  
  // Recalculate scores
  try {
    await matchService.computeAllForOpportunity(opp._id);
  } catch (err) {
    console.error(`[Opportunity Scoring Error] Failed for update of ${opp._id}:`, err);
  }

  return opp;
};

const remove = async (id) => {
  const opp = await Opportunity.findByIdAndDelete(id);
  if (!opp) throw new AppError('Opportunity not found', 404);
  return opp;
};

module.exports = { getAll, create, getOne, update, remove };
