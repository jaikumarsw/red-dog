
const mongoose = require('mongoose');
require('dotenv').config();

const Outbox = require('./src/modules/outbox/outbox.schema');

async function checkOutbox() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const records = await Outbox.find({ 
      $or: [
        { recipient: /sootharjai/i },
        { replyTo: /sootharjai/i }
      ]
    }).limit(10).lean();
    console.log('\n--- Outbox Records matching "sootharjai" ---');
    console.log(JSON.stringify(records, null, 2));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkOutbox();
