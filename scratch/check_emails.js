
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../red-dog-radios-backend/.env') });

const User = require('../../red-dog-radios-backend/src/modules/auth/user.schema');
const Organization = require('../../red-dog-radios-backend/src/modules/organizations/organization.schema');
const CommunicationLog = require('../../red-dog-radios-backend/src/modules/communication-log/communication-log.schema');

async function checkEmails() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const users = await User.find({ email: /sootharjai/i }).lean();
    console.log('\n--- Users matching "sootharjai" ---');
    console.log(JSON.stringify(users, null, 2));

    const logs = await CommunicationLog.find({ 
      $or: [
        { from: /sootharjai/i },
        { to: /sootharjai/i }
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
