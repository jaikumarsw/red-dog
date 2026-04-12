const ActivityLog = require('./activityLog.schema');
const logger = require('../../utils/logger');
const { AppError } = require('../../middlewares/error.middleware');

const log = async ({ category, action, summary, severity = 'info', actorId, meta }) => {
  try {
    await ActivityLog.create({
      category,
      action,
      summary,
      severity,
      actorId: actorId || undefined,
      meta: meta || undefined,
    });
  } catch (e) {
    logger.warn('[ActivityLog] write failed:', e.message);
  }
};

const listAdmin = async ({ page = 1, limit = 50, category } = {}) => {
  const q = {};
  if (category) q.category = category;
  return ActivityLog.paginate(q, {
    page: parseInt(page, 10),
    limit: Math.min(parseInt(limit, 10) || 50, 100),
    sort: { createdAt: -1 },
    populate: { path: 'actorId', select: 'email firstName lastName' },
  });
};

const getByIdAdmin = async (id) => {
  const doc = await ActivityLog.findById(id).populate({
    path: 'actorId',
    select: 'email firstName lastName',
  });
  if (!doc) throw new AppError('Log entry not found', 404);
  return doc;
};

module.exports = { log, listAdmin, getByIdAdmin };
