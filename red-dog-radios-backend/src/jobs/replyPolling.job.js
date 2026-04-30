const cron = require('node-cron');
const logger = require('../utils/logger');
const { pollAllAgencies } = require('../modules/replies/reply.polling.service');

// Every 15 minutes
cron.schedule('*/15 * * * *', async () => {
  logger.info('[ReplyPoll] Cron starting');
  try {
    const result = await pollAllAgencies();
    logger.info(`[ReplyPoll] Cron done: ${JSON.stringify(result)}`);
  } catch (err) {
    logger.error(`[ReplyPoll] Cron failed: ${err.message}`);
  }
});

logger.info('[ReplyPoll] Cron registered (every 15 minutes)');
