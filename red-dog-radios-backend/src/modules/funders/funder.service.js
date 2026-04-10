const Funder = require('./funder.schema');
const Match = require('../matches/match.schema');
const Organization = require('../organizations/organization.schema');
const { AppError } = require('../../middlewares/error.middleware');

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

  // If we have an org, enrich with match scores
  if (organizationId) {
    const matches = await Match.find({ organization: organizationId });
    const matchMap = {};
    for (const m of matches) {
      matchMap[String(m.opportunity)] = m;
    }
    result.docs = result.docs.map((f) => {
      const plain = f.toObject();
      const m = matchMap[String(f._id)];
      plain.matchScore = m?.fitScore ?? null;
      plain.matchTier = m?.tier ?? null;
      plain.matchReasons = m?.reasons ?? [];
      return plain;
    });
  }

  return result;
};

const getOne = async (id, organizationId) => {
  const funder = await Funder.findById(id);
  if (!funder) throw new AppError('Funder not found', 404);

  const plain = funder.toObject();

  if (organizationId) {
    const match = await Match.findOne({ organization: organizationId, opportunity: id });
    plain.matchScore = match?.fitScore ?? null;
    plain.matchTier = match?.tier ?? null;
    plain.matchReasons = match?.reasons ?? [];
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

const saveFunder = async (funderId, organizationId) => {
  // Set match status to 'saved' — uses opportunity field as funder proxy
  const match = await Match.findOneAndUpdate(
    { opportunity: funderId, organization: organizationId },
    { status: 'saved' },
    { new: true, upsert: false }
  );
  return match;
};

module.exports = { getAll, getOne, create, update, deactivate, saveFunder };
