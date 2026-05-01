'use strict';

require('dotenv').config();
const mongoose = require('mongoose');
const Organization = require('../src/modules/organizations/organization.schema');

// We need to mock things BEFORE requiring the service
const { google } = require('googleapis');
const gmailConfig = require('../src/config/gmail.config');

// Simple manual mocks
google.oauth2 = () => ({
  userinfo: {
    get: async () => ({ data: { email: 'test-fetched@gmail.com' } })
  }
});

gmailConfig.exchangeCodeForTokens = async () => ({
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expiry_date: Date.now() + 3600000
});

// Now require the service
const gmailService = require('../src/modules/gmail/gmail.service');

async function runTest() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    // Find or create test org
    let org = await Organization.findOne({ name: 'Test Org' });
    if (!org) {
      org = await Organization.create({ name: 'Test Org', email: 'original@test.com' });
    }
    
    console.log('Before callback, senderEmail:', org.gmailOAuth?.senderEmail);
    
    const result = await gmailService.handleOAuthCallback({
      organizationId: org._id,
      code: 'mock-code'
    });
    
    const updatedOrg = await Organization.findById(org._id);
    console.log('After callback, senderEmail:', updatedOrg.gmailOAuth.senderEmail);
    console.log('IsConnected:', updatedOrg.gmailOAuth.isConnected);
    
    if (updatedOrg.gmailOAuth.senderEmail === 'test-fetched@gmail.com') {
      console.log('SUCCESS: senderEmail was fetched and saved correctly!');
    } else {
      console.log('FAILURE: senderEmail was not updated correctly.');
      console.log('Got:', updatedOrg.gmailOAuth.senderEmail);
    }
    
    // Cleanup
    await Organization.deleteOne({ _id: org._id });
    await mongoose.disconnect();
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  }
}

runTest();
