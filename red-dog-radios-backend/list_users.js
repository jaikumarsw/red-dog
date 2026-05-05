
const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./src/modules/auth/user.schema');

async function listUsers() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const users = await User.find({}).select('email role').lean();
    console.log('\n--- All Users ---');
    console.log(JSON.stringify(users, null, 2));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

listUsers();
