const cron = require('node-cron');
const matchService = require('../modules/matches/match.service');
const alertService = require('../modules/alerts/alert.service');
const outboxService = require('../modules/outbox/outbox.service');
const followupService = require('../modules/followups/followup.service');
const Organization = require('../modules/organizations/organization.schema');
const logger = require('./logger');
const { sendEmail, sendDeadlineAlertEmail, sendPostAwardFollowUpEmail } = require('../config/email.config');
const User = require('../modules/auth/user.schema');
const Application = require('../modules/applications/application.schema');

const ADMIN_ALERT_EMAIL = process.env.ADMIN_EMAIL;

const notifyCronError = async (jobName, err) => {
  if (!ADMIN_ALERT_EMAIL) return;
  try {
    await sendEmail({
      to: ADMIN_ALERT_EMAIL,
      subject: `[Red Dog] Cron job failed: ${jobName}`,
      text: `The cron job "${jobName}" failed at ${new Date().toISOString()}.\n\nError: ${err.message}\n\n${err.stack || ''}`,
    });
  } catch (mailErr) {
    logger.error('Cron: Failed to send error notification email:', mailErr.message);
  }
};

// Nightly at 2:00 AM — refresh all active organization matches
cron.schedule('0 2 * * *', async () => {
  try {
    logger.info('Cron: Starting nightly match refresh');
    const orgs = await Organization.find({ status: 'active' });
    let totalProcessed = 0;
    for (const org of orgs) {
      const result = await matchService.computeAllForOrganization(org._id);
      totalProcessed += result.processed || 0;
    }
    logger.info(`Cron: Nightly match refresh complete. Processed ${totalProcessed} matches across ${orgs.length} organizations`);
  } catch (err) {
    logger.error('Cron: Nightly match refresh failed:', err.message);
    await notifyCronError('Nightly match refresh', err);
  }
});

// Nightly at 2:30 AM — generate deadline alerts
cron.schedule('30 2 * * *', async () => {
  try {
    logger.info('Cron: Generating deadline alerts');
    const result = await alertService.createDeadlineAlerts(30, 75);
    const created = result?.created || [];
    logger.info(`Cron: Deadline alerts generated: ${result?.count || 0}`);

    for (const item of created) {
      try {
        const users = await User.find({ organizationId: item.organizationId }).select('email firstName fullName');
        for (const u of users) {
          if (!u?.email) continue;
          await sendDeadlineAlertEmail({
            to: u.email,
            name: u.firstName || u.fullName,
            opportunityTitle: item.opportunityTitle,
            deadline: item.deadline,
            daysLeft: item.daysLeft,
          }).catch((err) => logger.warn('[Cron] Deadline email failed:', err.message));
        }
      } catch (err) {
        logger.warn('[Cron] Deadline email batch failed:', err.message);
      }
    }
  } catch (err) {
    logger.error('Cron: Deadline alert generation failed:', err.message);
    await notifyCronError('Deadline alert generation', err);
  }
});

// Nightly at 2:45 AM — generate high-fit alerts
cron.schedule('45 2 * * *', async () => {
  try {
    logger.info('Cron: Generating high-fit alerts');
    const count = await alertService.createHighFitAlerts(75);
    logger.info(`Cron: High-fit alerts generated: ${count}`);
  } catch (err) {
    logger.error('Cron: High-fit alert generation failed:', err.message);
    await notifyCronError('High-fit alert generation', err);
  }
});

// Daily 8:00 AM — ensure Day 7 / Day 14 follow-ups exist for submitted applications
cron.schedule('0 8 * * *', async () => {
  try {
    logger.info('Cron: Follow-up backfill (submitted applications)');
    const result = await followupService.backfillMissingFollowUps();
    logger.info(`Cron: Follow-up backfill complete. Scheduled: ${result.scheduled}`);
  } catch (err) {
    logger.error('Cron: Follow-up backfill failed:', err.message);
    await notifyCronError('Follow-up backfill', err);
  }
});

// Daily 8:00 AM MT — update priority flags for long-term agencies without wins
cron.schedule(
  '0 8 * * *',
  async () => {
    try {
      const orgs = await Organization.find({}).select('_id createdAt priorityFlags.flaggedAt').lean();
      const now = Date.now();

      for (const org of orgs) {
        const submittedCount = await Application.countDocuments({
          organization: org._id,
          status: { $in: ['submitted', 'in_review', 'approved', 'awarded', 'rejected'] },
        });
        const awardedCount = await Application.countDocuments({
          organization: org._id,
          status: 'awarded',
        });
        const lastWin = await Application.findOne({
          organization: org._id,
          status: 'awarded',
        })
          .sort({ updatedAt: -1 })
          .select('updatedAt')
          .lean();

        const daysSinceSignup = Math.floor((now - new Date(org.createdAt).getTime()) / (24 * 60 * 60 * 1000));
        const isLongTermNoWin = daysSinceSignup >= 60 && awardedCount === 0 && submittedCount >= 3;

        const update = {
          'priorityFlags.daysSinceSignup': daysSinceSignup,
          'priorityFlags.applicationsSubmittedCount': submittedCount,
          'priorityFlags.awardsWonCount': awardedCount,
          'priorityFlags.lastWinAt': lastWin?.updatedAt || null,
          'priorityFlags.isLongTermNoWin': isLongTermNoWin,
        };

        if (isLongTermNoWin && !org?.priorityFlags?.flaggedAt) {
          update['priorityFlags.flaggedAt'] = new Date();
        }

        await Organization.findByIdAndUpdate(org._id, { $set: update });
      }

      logger.info('[PriorityFlags] Updated for all orgs');
    } catch (e) {
      logger.warn('[PriorityFlags Cron] Failed:', e.message);
      await notifyCronError('Priority flags updater', e);
    }
  },
  { timezone: 'America/Denver' }
);

// Every hour — process outbox email queue
cron.schedule('0 * * * *', async () => {
  try {
    logger.info('Cron: Processing outbox queue');
    const result = await outboxService.processQueue(50);
    logger.info(`Cron: Outbox processed. Sent: ${result.sent}, Failed: ${result.failed}`);
  } catch (err) {
    logger.error('Cron: Outbox processing failed:', err.message);
    await notifyCronError('Outbox processing', err);
  }
});

// Daily 9:00 AM MT — post-award follow-up sender (equipment recommendations)
cron.schedule(
  '0 9 * * *',
  async () => {
    try {
      const now = new Date();
      const apps = await Application.find({
        'postAwardSequence.followUpScheduledFor': { $lte: now },
        'postAwardSequence.followUpSentAt': null,
        status: 'awarded',
      })
        .populate('organization')
        .populate('funder')
        .populate('opportunity')
        .lean();

      for (const app of apps) {
        try {
          const users = await User.find({ organizationId: app.organization?._id })
            .select('email firstName fullName')
            .lean();
          const funderName = app.funder?.name || app.opportunity?.funder || 'the funder';

          for (const u of users) {
            if (!u?.email) continue;
            await sendPostAwardFollowUpEmail({
              to: u.email,
              name: u.firstName || u.fullName,
              agencyName: app.organization?.name,
              funderName,
              agencyResponse: app.postAwardSequence?.agencyResponse,
              applicationId: app._id,
            });
          }

          await Application.findByIdAndUpdate(app._id, {
            $set: { 'postAwardSequence.followUpSentAt': new Date() },
          });

          try {
            const commService = require('../modules/communication-log/communication-log.service');
            await commService.logSystemEvent({
              application: app._id,
              organization: app.organization?._id,
              subject: 'Post-award follow-up sent',
              body: 'Equipment recommendations email sent to agency.',
            });
          } catch (e) {}

          logger.info(`[PostAward] Follow-up sent for app ${app._id}`);
        } catch (e) {
          logger.warn(`[PostAward] Failed for app ${app._id}:`, e.message);
        }
      }
    } catch (e) {
      logger.warn('[PostAward Cron] Failed:', e.message);
      await notifyCronError('Post-award follow-up sender', e);
    }
  },
  { timezone: 'America/Denver' }
);
logger.info('[PostAward] Cron scheduled: daily 9 AM MT');

logger.info(
  '✅ Cron jobs registered: match refresh (2am), deadline alerts (2:30am), high-fit alerts (2:45am), follow-up backfill (8am), priority flags (8am), outbox (hourly), post-award follow-up (9am MT)'
);

module.exports = {};
