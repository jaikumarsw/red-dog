const cron = require('node-cron');
const matchService = require('../modules/matches/match.service');
const alertService = require('../modules/alerts/alert.service');
const outboxService = require('../modules/outbox/outbox.service');
const followupService = require('../modules/followups/followup.service');
const Organization = require('../modules/organizations/organization.schema');
const logger = require('./logger');
const { sendEmail, sendDeadlineAlertEmail } = require('../config/email.config');
const User = require('../modules/auth/user.schema');

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

logger.info(
  '✅ Cron jobs registered: match refresh (2am), deadline alerts (2:30am), high-fit alerts (2:45am), follow-up backfill (8am), outbox (hourly)'
);

module.exports = {};
