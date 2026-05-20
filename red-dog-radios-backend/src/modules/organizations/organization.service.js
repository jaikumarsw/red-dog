const Organization = require('./organization.schema');
const { AppError } = require('../../middlewares/error.middleware');
const matchService = require('../matches/match.service');
const logger = require('../../utils/logger');

const PROFILE_FIELDS_AFFECTING_MATCHES = new Set([
  'agencyTypes',
  'programAreas',
  'focusAreas',
  'location',
  'budgetRange',
  'timeline',
  'challenges',
  'mainProblems',
  'fundingPriorities',
  'missionStatement',
  'specificRequest',
  'projectTitle',
  'biggestChallenge',
  'urgencyStatement',
  'whobenefits',
  'eligibilityType',
  'serviceArea',
  'currentEquipment',
  'canMeetLocalMatch',
  'populationServed',
  'numberOfStaff',
]);

const getAll = async ({ page = 1, limit = 20, search, status, id }) => {
  const query = {};
  if (id) query._id = id;
  if (status) query.status = status;
  if (search) query.$or = [{ name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }];

  return Organization.paginate(query, {
    page: parseInt(page),
    limit: parseInt(limit),
    sort: { createdAt: -1 },
    populate: { path: 'createdBy', select: 'firstName lastName email' },
  });
};

const create = async (data, userId) => {
  if (!data.name) throw new AppError('Organization name is required', 400);
  return Organization.create({ ...data, createdBy: userId });
};

const getOne = async (id) => {
  const org = await Organization.findById(id).populate('createdBy', 'firstName lastName email');
  if (!org) throw new AppError('Organization not found', 404);
  return org;
};

const update = async (id, data) => {
  const org = await Organization.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!org) throw new AppError('Organization not found', 404);

  const shouldRecompute = Object.keys(data || {}).some((key) => PROFILE_FIELDS_AFFECTING_MATCHES.has(key));
  if (shouldRecompute) {
    setImmediate(() => {
      matchService
        .computeAllForOrganization(org._id)
        .then((stats) => {
          logger.info(`[Organization] Background match recompute finished for org ${org._id}`, stats);
        })
        .catch((err) => {
          logger.warn('[Organization] Background match recompute failed:', err?.message || err);
        });
    });
  }

  return org;
};

const remove = async (id) => {
  const org = await Organization.findByIdAndUpdate(id, { status: 'inactive' }, { new: true });
  if (!org) throw new AppError('Organization not found', 404);
  return org;
};

module.exports = { getAll, create, getOne, update, remove };
