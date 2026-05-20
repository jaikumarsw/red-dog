require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../modules/auth/user.schema');
const Organization = require('../modules/organizations/organization.schema');
const Opportunity = require('../modules/opportunities/opportunity.schema');
const Match = require('../modules/matches/match.schema');
const Agency = require('../modules/agencies/agency.schema');
const Alert = require('../modules/alerts/alert.schema');
const Application = require('../modules/applications/application.schema');
const Outbox = require('../modules/outbox/outbox.schema');
const Digest = require('../modules/digests/digest.schema');
const Funder = require('../modules/funders/funder.schema');
const Win = require('../modules/wins/win.schema');
const Coupon = require('../modules/coupons/coupon.schema');
const { computeMatchScore } = require('../modules/matches/match.service');
const logger = require('./logger');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/reddog_db';

async function seedTestAgency() {
  const admin = await User.findOne({ email: 'admin@reddogradios.com' });
  if (!admin) {
    console.error('❌ Admin user not found (admin@reddogradios.com) for seedTestAgency');
    return 0;
  }

  const agencyUser = await User.create({
    fullName: 'Chief Tom Bradley',
    firstName: 'Tom',
    lastName: 'Bradley',
    email: 'chief@coloradofire.com',
    password: 'Test1234!',
    role: 'agency',
    isVerified: true,
    onboardingCompleted: true,
  });

  const org = await Organization.create({
    name: 'Colorado Springs Fire Department',
    email: 'chief@coloradofire.com',
    location: 'Colorado Springs, Colorado',
    websiteUrl: 'https://coloradosprings.gov/fire',
    missionStatement:
      'Protecting lives and property in Colorado Springs through professional fire suppression, emergency medical services, and community risk reduction.',
    focusAreas: ['fire suppression', 'emergency medical', 'communications', 'interoperability'],
    agencyTypes: ['fire_services', 'ems'],
    programAreas: ['communications', 'equipment', 'interoperability', 'radios'],
    budgetRange: '25k_150k',
    timeline: 'urgent',
    goals: [
      'Replace aging radio fleet',
      'Improve interoperability with Colorado DTRS',
      'Expand coverage in mountain zones',
    ],
    populationServed: 478961,
    coverageArea: 'Colorado Springs city limits, 195 square miles',
    numberOfStaff: 320,
    currentEquipment:
      'Aging Motorola portables, partial P25 Phase I coverage, interoperability gaps with El Paso County Sheriff',
    mainProblems: [
      'Dead zones in mountain areas',
      'End-of-life radio fleet',
      'Interoperability gaps with county agencies',
    ],
    fundingPriorities: [
      'P25 Phase II radio replacement',
      'DTRS interoperability',
      'Mountain zone repeaters',
    ],
    specificRequest:
      'Replace 280 end-of-life portable radios with P25 Phase II compliant units and install 4 new repeaters to eliminate mountain dead zones.',
    challenges: ['outdated_equipment', 'communication_issues', 'coverage_gaps'],
    urgencyStatement:
      'Our current radio fleet is 15 years old and no longer supported by the manufacturer. Firefighters are operating in mountain zones with zero radio coverage, creating life-safety risks.',
    whobenefits:
      'Colorado Springs firefighters and the 478,000 residents they protect across 195 square miles including high-risk mountain communities.',
    eligibilityType: 'government_agency',
    annualVolume: '42000',
    serviceArea: 'regional',
    staffSizeRange: '50+',
    canMeetLocalMatch: true,
    status: 'active',
    createdBy: admin._id,
  });

  await User.findByIdAndUpdate(agencyUser._id, { organizationId: org._id });

  const opportunities = await Opportunity.find({});
  const orgDoc = await Organization.findById(org._id);
  if (!orgDoc) {
    console.error('❌ Organization missing after create for seedTestAgency');
    return 0;
  }

  const matchRows = [];
  for (const opp of opportunities) {
    const scored = computeMatchScore(orgDoc, opp);
    matchRows.push({
      organization: org._id,
      opportunity: opp._id,
      ...scored,
    });
  }

  if (matchRows.length > 0) {
    await Match.insertMany(matchRows);
  }

  await Organization.findByIdAndUpdate(org._id, {
    matchCount: matchRows.length,
    lastMatchRecomputedAt: new Date(),
  });

  console.log('✅ Test agency seeded: chief@coloradofire.com / Test1234!');
  console.log(
    `✅ Matches computed: ${matchRows.length} matches for Colorado Springs Fire Department`
  );

  return matchRows.length;
}

async function seed() {
  await mongoose.connect(MONGO_URI);
  logger.info('Connected to MongoDB for seeding');

  await Promise.all([
    User.deleteMany({}),
    Organization.deleteMany({}),
    Opportunity.deleteMany({}),
    Match.deleteMany({}),
    Agency.deleteMany({}),
    Alert.deleteMany({}),
    Application.deleteMany({}),
    Outbox.deleteMany({}),
    Digest.deleteMany({}),
    Funder.deleteMany({}),
    Win.deleteMany({}),
  ]);
  logger.info('Cleared existing data');

  await User.create({
    fullName: 'Red Dog Admin',
    firstName: 'Red',
    lastName: 'Dog',
    email: 'admin@reddogradios.com',
    password: 'Admin1234!',
    role: 'admin',
    isVerified: true,
    onboardingCompleted: true,
    organizationId: null,
  });

  const matchesComputed = await seedTestAgency();

  // Upsert beta access coupon (currentUses only on insert — do not wipe redemptions on re-seed)
  await Coupon.findOneAndUpdate(
    { code: 'BETA2026' },
    {
      $set: {
        code: 'BETA2026',
        description: 'Beta tester access — bypasses paywall for fire chiefs',
        grantFullAccess: true,
        maxUses: 50,
        isActive: true,
        expiresAt: new Date('2026-12-31T23:59:59.000Z'),
      },
      $setOnInsert: { currentUses: 0 },
    },
    { upsert: true, new: true }
  );
  console.log('✅ Beta coupon seeded: BETA2026 (50 uses, expires Dec 2026)');

  console.log('===================================');
  console.log('✅ SEED COMPLETE');
  console.log('Admin:    admin@reddogradios.com / Admin1234!');
  console.log('Agency:   chief@coloradofire.com / Test1234!');
  console.log('          → Colorado Springs Fire Department');
  console.log(`Matches computed:     ${matchesComputed}`);
  console.log('===================================');

  await mongoose.disconnect();
  process.exit(0);
}

async function testDeadlineAlerts() {
  const { createDeadlineAlerts } = require('../modules/alerts/alert.service.js');
  const deadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const opp = await Opportunity.findOneAndUpdate({}, { $set: { deadline } }, { new: true });
  if (!opp) {
    console.error('❌ No opportunities in database — add at least one to test deadline alerts.');
    return;
  }
  console.log(`Updated "${opp.title}" deadline to ${deadline.toISOString()}`);

  const { count, created } = await createDeadlineAlerts();
  console.log(`✅ Deadline alerts created: ${count}`);
  if (created && created.length > 0) {
    console.log(JSON.stringify(created, null, 2));
  }
}

async function testEmailSend() {
  const { sendEmail } = require('../config/emailProvider.config.js');
  try {
    const result = await sendEmail({
      to: 'admin@reddogradios.com',
      subject: 'Red Dog Radios — SMTP Test Email',
      html: `
       <h2>✅ SMTP is working</h2>
       <p>This is a test email from the Red Dog Radios 
       backend to confirm email sending is configured 
       correctly.</p>
       <p>Sent at: ${new Date().toISOString()}</p>
     `,
    });
    if (result && result.success) {
      console.log('✅ Test email sent successfully');
    } else {
      console.log(`❌ Email failed: ${result && result.error != null ? result.error : JSON.stringify(result)}`);
    }
  } catch (err) {
    console.log(`❌ Email failed: ${err && err.stack ? err.stack : err}`);
  }
}

if (process.argv[2] !== '--test-email' && process.argv[2] !== '--test-alerts') {
  seed().catch((err) => {
    logger.error('Seed failed:', err.message);
    process.exit(1);
  });
}

if (process.argv[2] === '--test-email') {
  mongoose.connect(MONGO_URI).then(async () => {
    await testEmailSend();
    await mongoose.disconnect();
    process.exit(0);
  });
}

if (process.argv[2] === '--test-alerts') {
  mongoose.connect(MONGO_URI).then(async () => {
    await testDeadlineAlerts();
    await mongoose.disconnect();
    process.exit(0);
  });
}
