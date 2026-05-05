
const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./src/modules/auth/user.schema');
const CommunicationLog = require('./src/modules/communication-log/communication-log.schema');

async function checkEmails() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const users = await User.find({ email: /sootharjai/i }).lean();
    console.log('\n--- Users matching "sootharjai" ---');
    console.log(JSON.stringify(users, null, 2));

    const logs = await CommunicationLog.find({ 
      $or: [
        { fromAddress: /sootharjai/i },
        { toAddress: /sootharjai/i }
      ]
    }).limit(10).lean();
    console.log('\n--- Communication Logs matching "sootharjai" ---');
    console.log(JSON.stringify(logs, null, 2));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkEmails();
