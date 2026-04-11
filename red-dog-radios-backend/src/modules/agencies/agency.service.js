const Agency = require('./agency.schema');
const { AppError } = require('../../middlewares/error.middleware');

const getAll = async ({ page = 1, limit = 20, type, search, status, agencyName }) => {
  const query = {};
  if (type) query.type = type;
  if (status) query.status = status;
  if (agencyName) query.name = agencyName;
  else if (search) query.name = { $regex: search, $options: 'i' };

  return Agency.paginate(query, {
    page: parseInt(page),
    limit: parseInt(limit),
    sort: { name: 1 },
  });
};

const create = async (data) => Agency.create(data);

const getOne = async (id) => {
  const agency = await Agency.findById(id);
  if (!agency) throw new AppError('Agency not found', 404);
  return agency;
};

const update = async (id, data) => {
  const agency = await Agency.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!agency) throw new AppError('Agency not found', 404);
  return agency;
};

const remove = async (id) => {
  const agency = await Agency.findByIdAndUpdate(id, { status: 'inactive' }, { new: true });
  if (!agency) throw new AppError('Agency not found', 404);
  return agency;
};

module.exports = { getAll, create, getOne, update, remove };
