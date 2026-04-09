const cron = require('node-cron');
const matchService = require('../modules/matches/match.service');
const alertService = require('../modules/alerts/alert.service');
const outboxService = require('../modules/outbox/outbox.service');
const Organization = require('../modules/organizations/organization.schema');
const logger = require('./logger');

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
  }
});

// Nightly at 2:30 AM — generate deadline alerts
cron.schedule('30 2 * * *', async () => {
  try {
    logger.info('Cron: Generating deadline alerts');
    const count = await alertService.createDeadlineAlerts(30, 75);
    logger.info(`Cron: Deadline alerts generated: ${count}`);
  } catch (err) {
    logger.error('Cron: Deadline alert generation failed:', err.message);
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
  }
});

logger.info('✅ Cron jobs registered: match refresh (2am), deadline alerts (2:30am), high-fit alerts (2:45am), outbox processing (hourly)');

module.exports = {};
