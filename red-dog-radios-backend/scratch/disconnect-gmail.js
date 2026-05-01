'use strict';
require('dotenv').config();
const mongoose = require('mongoose');
const Org = require('../src/modules/organizations/organization.schema');
(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const result = await Org.findOneAndUpdate(
    { name: /Austin Fire Department/ },
    { 
      $set: { 
        'gmailOAuth': { isConnected: false }
      } 
    },
    { new: true }
  );
  console.log('Disconnected:', result.name);
  await mongoose.disconnect();
})();
