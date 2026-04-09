require('dotenv').config();
const mongoose = require('mongoose');
const logger = require('./utils/logger');
const app = require('./app');

const PORT = parseInt(process.env.PORT || '4000', 10);
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/reddog_db';

mongoose
  .connect(MONGO_URI)
  .then(() => {
    logger.info(`✅ MongoDB connected: ${MONGO_URI.replace(/\/\/.*@/, '//***@')}`);

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
