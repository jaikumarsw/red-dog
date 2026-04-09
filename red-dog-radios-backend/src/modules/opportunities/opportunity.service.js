const Opportunity = require('./opportunity.schema');
const { AppError } = require('../../middlewares/error.middleware');

const computeStatus = (deadline) => {
  if (!deadline) return 'open';
  const now = new Date();
  const in14Days = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  if (deadline < now) return 'closed';
  if (deadline <= in14Days) return 'closing';
  return 'open';
};

const getAll = async ({ page = 1, limit = 20, search, status, category }) => {
  const query = {};
  if (status) query.status = status;
  if (category) query.category = { $regex: category, $options: 'i' };
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { funder: { $regex: search, $options: 'i' } },
    ];
  }

  const result = await Opportunity.paginate(query, {
    page: parseInt(page),
    limit: parseInt(limit),
    sort: { deadline: 1 },
    populate: { path: 'createdBy', select: 'firstName lastName email' },
  });

  // Auto-update statuses for returned docs
  for (const opp of result.docs) {
    const computed = computeStatus(opp.deadline);
    if (computed !== opp.status) {
      await Opportunity.findByIdAndUpdate(opp._id, { status: computed });
      opp.status = computed;
    }
  }

  return result;
};

const create = async (data, userId) => {
  const status = computeStatus(data.deadline ? new Date(data.deadline) : null);
  return Opportunity.create({ ...data, status, createdBy: userId });
};

const getOne = async (id) => {
  const opp = await Opportunity.findById(id).populate('createdBy', 'firstName lastName email');
  if (!opp) throw new AppError('Opportunity not found', 404);
  return opp;
};

const update = async (id, data) => {
  if (data.deadline) data.status = computeStatus(new Date(data.deadline));
  const opp = await Opportunity.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!opp) throw new AppError('Opportunity not found', 404);
  return opp;
};

const remove = async (id) => {
  const opp = await Opportunity.findByIdAndDelete(id);
  if (!opp) throw new AppError('Opportunity not found', 404);
  return opp;
};

module.exports = { getAll, create, getOne, update, remove };
