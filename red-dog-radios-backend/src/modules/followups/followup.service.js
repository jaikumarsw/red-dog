const FollowUp = require('./followup.schema');
const { AppError } = require('../../middlewares/error.middleware');

const getAll = async ({ page = 1, limit = 20, userId, status, dueToday } = {}) => {
  const query = {};
  if (userId) query.user = userId;
  if (status) query.status = status;
  if (dueToday === 'true' || dueToday === true) {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    query.scheduledFor = { $lte: today };
    query.status = 'pending';
  }

  return FollowUp.paginate(query, {
    page: parseInt(page),
    limit: parseInt(limit),
    sort: { scheduledFor: 1 },
    populate: [
      { path: 'application', select: 'projectTitle status' },
      { path: 'funder', select: 'name' },
      { path: 'opportunity', select: 'title funder' },
    ],
  });
};

const markSent = async (id) => {
  const fu = await FollowUp.findByIdAndUpdate(
    id,
    { status: 'sent', sentAt: new Date() },
    { new: true }
  );
  if (!fu) throw new AppError('Follow-up not found', 404);
  return fu;
};

const skip = async (id) => {
  const fu = await FollowUp.findByIdAndUpdate(id, { status: 'skipped' }, { new: true });
  if (!fu) throw new AppError('Follow-up not found', 404);
  return fu;
};

const scheduleForApplication = async (applicationId, userId, organizationId, funderId, opportunityId, baseDate) => {
  const day7 = new Date(baseDate);
  day7.setDate(day7.getDate() + 7);
  const day14 = new Date(baseDate);
  day14.setDate(day14.getDate() + 14);

  await FollowUp.insertMany([
    {
      application: applicationId,
      user: userId,
      organization: organizationId,
      funder: funderId || undefined,
      opportunity: opportunityId || undefined,
      followUpNumber: 1,
      scheduledFor: day7,
      emailSubject: 'Following up on our grant application — Day 7',
      emailBody: 'We wanted to follow up on our submitted grant application. Please let us know if you need any additional information.',
      status: 'pending',
    },
    {
      application: applicationId,
      user: userId,
      organization: organizationId,
      funder: funderId || undefined,
      opportunity: opportunityId || undefined,
      followUpNumber: 2,
      scheduledFor: day14,
      emailSubject: 'Second follow-up: grant application status — Day 14',
      emailBody: 'We are reaching out a second time to check on the status of our grant application. We remain enthusiastic about this opportunity.',
      status: 'pending',
    },
  ]);
};

module.exports = { getAll, markSent, skip, scheduleForApplication };
