const FollowUp = require('./followup.schema');
const User = require('../auth/user.schema');
const Organization = require('../organizations/organization.schema');
const Application = require('../applications/application.schema');
const outboxService = require('../outbox/outbox.service');
const logger = require('../../utils/logger');
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

const scheduleForApplication = async (
  applicationId,
  userId,
  organizationId,
  funderId,
  opportunityId,
  baseDate
) => {
  const existing = await FollowUp.countDocuments({ application: applicationId });
  if (existing > 0) return { skipped: true, reason: 'already_scheduled' };

  const day7 = new Date(baseDate);
  day7.setDate(day7.getDate() + 7);
  const day14 = new Date(baseDate);
  day14.setDate(day14.getDate() + 14);

  const user = await User.findById(userId).select('email firstName fullName');
  const org = await Organization.findById(organizationId).select('name email');
  const recipient = user?.email || org?.email;
  const recipientName = user?.firstName || user?.fullName || org?.name || 'Team';

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
      emailBody:
        'We wanted to follow up on our submitted grant application. Please let us know if you need any additional information.',
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
      emailBody:
        'We are reaching out a second time to check on the status of our grant application. We remain enthusiastic about this opportunity.',
      status: 'pending',
    },
  ]);

  if (recipient) {
    const appLabel = org?.name ? `${org.name} — application follow-up` : 'Grant application follow-up';
    const html = (body) =>
      `<div style="font-family:Arial,sans-serif;max-width:560px;line-height:1.5"><p>${body}</p><p style="color:#666;font-size:12px">Sent by Red Dog Radio Grant Intelligence</p></div>`;

    try {
      await outboxService.queueEmail({
        recipient,
        recipientName,
        subject: `Reminder: Day 7 follow-up — ${appLabel}`,
        htmlBody: html(
          `This is your scheduled Day 7 follow-up reminder for a submitted grant application. Suggested message: "${'We wanted to follow up on our submitted grant application. Please let us know if you need any additional information.'}"`
        ),
        emailType: 'followup_reminder',
        emailKey: `followup-${applicationId}-7-email`,
        scheduledFor: day7,
        relatedOrganization: organizationId,
        relatedUser: userId,
      });
      await outboxService.queueEmail({
        recipient,
        recipientName,
        subject: `Reminder: Day 14 follow-up — ${appLabel}`,
        htmlBody: html(
          `This is your scheduled Day 14 follow-up reminder. Suggested message: "${'We are reaching out a second time to check on the status of our grant application. We remain enthusiastic about this opportunity.'}"`
        ),
        emailType: 'followup_reminder',
        emailKey: `followup-${applicationId}-14-email`,
        scheduledFor: day14,
        relatedOrganization: organizationId,
        relatedUser: userId,
      });
    } catch (e) {
      logger.warn('[FollowUp] Failed to queue reminder emails:', e.message);
    }
  } else {
    logger.info('[FollowUp] No email on file — follow-up tasks created without outbox reminders');
  }

  return { skipped: false, day7, day14 };
};

/** Daily safety net: submitted applications missing any follow-up rows get scheduled. */
const backfillMissingFollowUps = async () => {
  const apps = await Application.find({
    status: { $in: ['submitted', 'in_review'] },
    $or: [{ dateSubmitted: { $exists: true, $ne: null } }, { submittedAt: { $exists: true, $ne: null } }],
  })
    .limit(400)
    .select('_id organization funder opportunity dateSubmitted submittedAt');

  let scheduled = 0;
  for (const row of apps) {
    const n = await FollowUp.countDocuments({ application: row._id });
    if (n > 0) continue;
    const u2 = await User.findOne({ organizationId: row.organization }).sort({ createdAt: 1 }).select('_id');
    if (!u2) continue;
    const baseDate = row.dateSubmitted || row.submittedAt || new Date();
    await scheduleForApplication(
      row._id,
      u2._id,
      row.organization,
      row.funder || undefined,
      row.opportunity || undefined,
      baseDate
    );
    scheduled += 1;
  }
  return { scheduled };
};

module.exports = { getAll, markSent, skip, scheduleForApplication, backfillMissingFollowUps };
