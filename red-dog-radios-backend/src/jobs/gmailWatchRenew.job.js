const cron = require('node-cron');
const logger = require('../utils/logger');
const { renewAllWatches } = require('../modules/gmail/gmail.watch');

// Runs 00:00 UTC daily
cron.schedule('0 0 * * *', async () => {
  try {
    logger.info('[GmailWatch] Daily renew job starting');
    const result = await renewAllWatches();
    logger.info('[GmailWatch] Daily renew job finished:', JSON.stringify(result));
  } catch (err) {
    logger.error('[GmailWatch] Daily renew job failed:', err.message);
  }
});

logger.info('[GmailWatch] Cron scheduled: daily 00:00 UTC');

module.exports = {};

