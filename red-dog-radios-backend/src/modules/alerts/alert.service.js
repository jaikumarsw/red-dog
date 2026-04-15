const Alert = require('./alert.schema');
const Match = require('../matches/match.schema');
const { AppError } = require('../../middlewares/error.middleware');

const getAll = async ({ page = 1, limit = 50, isRead, priority, userId, organizationId }) => {
  const query = {};
  if (organizationId) query.organization = organizationId;
  else if (userId) query.user = userId;
  if (priority) query.priority = priority;
  if (isRead !== undefined) query.isRead = isRead === 'true' || isRead === true;

  return Alert.paginate(query, {
    page: parseInt(page),
    limit: parseInt(limit),
    sort: { createdAt: -1 },
    populate: [
      { path: 'organization', select: 'name' },
      { path: 'opportunity', select: 'title funder deadline' },
    ],
  });
};

const markRead = async (id) => {
  const alert = await Alert.findByIdAndUpdate(id, { isRead: true }, { new: true });
  if (!alert) throw new AppError('Alert not found', 404);
  return alert;
};

const markAllRead = async (userId) => {
  const query = userId ? { user: userId } : {};
  await Alert.updateMany(query, { isRead: true });
};

const remove = async (id) => {
  const alert = await Alert.findByIdAndDelete(id);
  if (!alert) throw new AppError('Alert not found', 404);
};

const createDeadlineAlerts = async (daysAhead = 30, minFitScore = 75) => {
  const cutoff = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);

  const matches = await Match.find({ fitScore: { $gte: minFitScore } })
    .populate({ path: 'opportunity', match: { status: { $in: ['open', 'closing'] }, deadline: { $lte: cutoff, $gte: new Date() } } })
    .populate('organization');

  const validMatches = matches.filter((m) => m.opportunity && m.organization);
  let count = 0;
  const created = [];

  for (const match of validMatches) {
    const daysLeft = Math.ceil((new Date(match.opportunity.deadline) - new Date()) / (1000 * 60 * 60 * 24));
    const alertKey = `deadline-${match._id}-${daysLeft}`;
    try {
      const alert = await Alert.create({
        organization: match.organization._id,
        opportunity: match.opportunity._id,
        orgName: match.organization.name,
        grantName: match.opportunity.title,
        type: 'deadline',
        priority: daysLeft <= 7 ? 'high' : 'medium',
        message: `Deadline alert: "${match.opportunity.title}" from ${match.opportunity.funder} — ${daysLeft} day(s) remaining. Fit score: ${match.fitScore}.`,
        alertKey,
      });
      count++;
      created.push({
        alertId: alert._id,
        organizationId: match.organization._id,
        opportunityTitle: match.opportunity.title,
        deadline: match.opportunity.deadline,
        daysLeft,
      });
    } catch (e) {
      // Ignore duplicate alertKey
    }
  }

  return { count, created };
};

const createHighFitAlerts = async (minFitScore = 75) => {
  const matches = await Match.find({ fitScore: { $gte: minFitScore } })
    .populate({ path: 'opportunity', match: { status: { $in: ['open', 'closing'] } } })
    .populate('organization');

  const validMatches = matches.filter((m) => m.opportunity && m.organization);
  let count = 0;

  for (const match of validMatches) {
    const alertKey = `high-fit-${match._id}-${Math.floor(match.fitScore)}`;
    try {
      await Alert.create({
        organization: match.organization._id,
        opportunity: match.opportunity._id,
        orgName: match.organization.name,
        grantName: match.opportunity.title,
        type: 'high_fit',
        priority: match.fitScore >= 85 ? 'high' : 'medium',
        message: `High fit alert: "${match.opportunity.title}" scored ${match.fitScore}/100 for ${match.organization.name}. ${match.recommendedAction}`,
        alertKey,
      });
      count++;
    } catch (e) {
      // Ignore duplicate
    }
  }

  return count;
};

module.exports = { getAll, markRead, markAllRead, remove, createDeadlineAlerts, createHighFitAlerts };
