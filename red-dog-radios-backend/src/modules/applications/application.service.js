const Application = require('./application.schema');
const { AppError } = require('../../middlewares/error.middleware');

const getAll = async ({ page = 1, limit = 20, status, organizationId }) => {
  const query = {};
  if (status) query.status = status;
  if (organizationId) query.organization = organizationId;

  return Application.paginate(query, {
    page: parseInt(page),
    limit: parseInt(limit),
    sort: { createdAt: -1 },
    populate: [
      { path: 'organization', select: 'name location' },
      { path: 'opportunity', select: 'title funder maxAmount deadline' },
    ],
  });
};

const create = async (data) => {
  return Application.create(data);
};

const getOne = async (id) => {
  const app = await Application.findById(id).populate('organization').populate('opportunity');
  if (!app) throw new AppError('Application not found', 404);
  return app;
};

const update = async (id, data) => {
  const app = await Application.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!app) throw new AppError('Application not found', 404);
  return app;
};

const submit = async (id) => {
  const app = await Application.findByIdAndUpdate(
    id,
    { status: 'submitted', submittedAt: new Date() },
    { new: true }
  );
  if (!app) throw new AppError('Application not found', 404);
  return app;
};

const remove = async (id) => {
  const app = await Application.findByIdAndDelete(id);
  if (!app) throw new AppError('Application not found', 404);
  return app;
};

module.exports = { getAll, create, getOne, update, submit, remove };
