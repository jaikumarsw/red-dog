require('dotenv').config();
const mongoose = require('mongoose');
const outboxService = require('./src/modules/outbox/outbox.service');

(async () => {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Processing outbox queue...');
    const result = await outboxService.processQueue(10);
    console.log('Result:', result);
    await mongoose.disconnect();
    process.exit(0);
})();