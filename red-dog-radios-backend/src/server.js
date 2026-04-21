require('dotenv').config();
const mongoose = require('mongoose');
const logger = require('./utils/logger');
const app = require('./app');

// Fail fast on missing critical environment variables
const REQUIRED_ENV = ['JWT_SECRET', 'MONGO_URI'];
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length > 0) {
  console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

const PORT = parseInt(process.env.PORT || '4000', 10);
const MONGO_URI = process.env.MONGO_URI;

mongoose
  .connect(MONGO_URI)
  .then(async () => {
    logger.info(`✅ MongoDB connected: ${MONGO_URI.replace(/\/\/.*@/, '//***@')}`);

    try {
      const User = require('./modules/auth/user.schema');
      await User.syncIndexes();
      logger.info('✅ User collection indexes synced with schema (drops stale indexes such as legacy username).');
    } catch (e) {
      logger.warn(`User.syncIndexes() skipped or failed: ${e.message}`);
    }

    app.listen(PORT, () => {
      logger.info(`🚀 Red Dog Backend running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
      logger.info(`📋 Health: http://localhost:${PORT}/health`);
      logger.info(`📖 Swagger: http://localhost:${PORT}/api-docs`);
    });

    // Start cron jobs after DB connects
    require('./utils/cron.jobs');
  })
  .catch((err) => {
    logger.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received — shutting down gracefully');
  await mongoose.connection.close();
  process.exit(0);
});
