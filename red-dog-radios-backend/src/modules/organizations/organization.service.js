const Organization = require('./organization.schema');
const { AppError } = require('../../middlewares/error.middleware');

const getAll = async ({ page = 1, limit = 20, search, status }) => {
  const query = {};
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
  return org;
};

const remove = async (id) => {
  const org = await Organization.findByIdAndUpdate(id, { status: 'inactive' }, { new: true });
  if (!org) throw new AppError('Organization not found', 404);
  return org;
};

module.exports = { getAll, create, getOne, update, remove };
