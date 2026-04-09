require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../modules/auth/user.schema');
const Organization = require('../modules/organizations/organization.schema');
const Opportunity = require('../modules/opportunities/opportunity.schema');
const Match = require('../modules/matches/match.schema');
const Agency = require('../modules/agencies/agency.schema');
const Alert = require('../modules/alerts/alert.schema');
const logger = require('./logger');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/reddog_db';

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
  ]);
  logger.info('Cleared existing data');

  // Admin user
  const admin = await User.create({
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@reddogradios.com',
    password: 'Admin1234!',
    role: 'admin',
  });

  // Organizations
  const [org1, org2, org3] = await Organization.insertMany([
    {
      name: 'Valley Fire Department',
      email: 'grants@valleyfire.org',
      location: 'California',
      missionStatement: 'Protecting lives and property through professional fire and emergency services.',
      focusAreas: ['emergency response', 'fire prevention', 'community education'],
      agencyTypes: ['fire_services', 'ems'],
      programAreas: ['communications', 'emergency response', 'equipment modernization'],
      budgetRange: '25k_150k',
      timeline: 'planned',
      goals: ['Upgrade radio communications', 'Train 50 new volunteers'],
      status: 'active',
      createdBy: admin._id,
    },
    {
      name: 'Metro 911 Communications Center',
      email: 'director@metro911.gov',
      location: 'Texas',
      missionStatement: 'Delivering fast, accurate emergency dispatch services 24/7.',
      focusAreas: ['dispatch technology', 'training', 'interoperability'],
      agencyTypes: ['911_centers', 'emergency_management'],
      programAreas: ['911 systems', 'communications', 'public safety technology'],
      budgetRange: '150k_500k',
      timeline: 'urgent',
      goals: ['Next-gen 911 platform', 'Statewide interoperability'],
      status: 'active',
      createdBy: admin._id,
    },
    {
      name: 'Riverside County Sheriff Department',
      email: 'grants@rcsd.gov',
      location: 'California',
      missionStatement: 'Serving and protecting Riverside County with professionalism and integrity.',
      focusAreas: ['law enforcement', 'public safety', 'community policing'],
      agencyTypes: ['law_enforcement', 'multi_agency'],
      programAreas: ['body cameras', 'records management', 'community outreach'],
      budgetRange: '500k_plus',
      timeline: 'planned',
      status: 'active',
      createdBy: admin._id,
    },
  ]);

  // Opportunities
  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const in10 = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);
  const in90 = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  const [opp1, opp2, opp3] = await Opportunity.insertMany([
    {
      title: 'First Responder Communications Grant',
      funder: 'DHS Communications Division',
      deadline: in30,
      maxAmount: 250000,
      sourceUrl: 'https://www.dhs.gov/grants',
      keywords: ['communications', 'emergency response', 'California', 'Texas'],
      agencyTypes: ['fire_services', '911_centers', 'emergency_management'],
      description: 'Funding for radio and communications technology upgrades for first responders.',
      category: 'Technology',
      status: 'open',
      createdBy: admin._id,
    },
    {
      title: 'Public Safety Technology Modernization Fund',
      funder: 'FEMA',
      deadline: in10,
      maxAmount: 500000,
      sourceUrl: 'https://www.fema.gov/grants',
      keywords: ['technology', 'public safety', '911 systems', 'Texas', 'California'],
      agencyTypes: ['911_centers', 'law_enforcement', 'emergency_management'],
      description: 'Competitive grant for agencies modernizing dispatch and command systems.',
      category: 'Technology',
      status: 'closing',
      createdBy: admin._id,
    },
    {
      title: 'Community Policing and Public Safety Initiative',
      funder: 'DOJ Community Relations',
      deadline: in90,
      maxAmount: 1000000,
      sourceUrl: 'https://www.justice.gov/grants',
      keywords: ['community policing', 'law enforcement', 'California', 'body cameras'],
      agencyTypes: ['law_enforcement', 'multi_agency'],
      description: 'Grants supporting community policing, accountability, and transparency programs.',
      category: 'Law Enforcement',
      status: 'open',
      createdBy: admin._id,
    },
  ]);

  // Matches
  const { computeMatchScore } = require('../modules/matches/match.service');
  const matchData = [
    { org: org1, opp: opp1 },
    { org: org2, opp: opp1 },
    { org: org2, opp: opp2 },
    { org: org3, opp: opp2 },
    { org: org3, opp: opp3 },
  ];

  for (const { org, opp } of matchData) {
    const scored = computeMatchScore(org, opp);
    await Match.create({
      organization: org._id,
      opportunity: opp._id,
      ...scored,
    });
  }

  // Agencies
  await Agency.insertMany([
    { name: 'Valley Fire Department', type: 'fire_services', location: 'California', grantContactEmail: 'grants@valleyfire.org', matchCount: 2 },
    { name: 'Metro 911 Center', type: '911_centers', location: 'Texas', grantContactEmail: 'director@metro911.gov', matchCount: 2 },
    { name: 'Riverside County Sheriff', type: 'law_enforcement', location: 'California', grantContactEmail: 'grants@rcsd.gov', matchCount: 2 },
    { name: 'Northeast EMS Consortium', type: 'ems', location: 'New York', grantContactEmail: 'admin@neems.org', matchCount: 0 },
  ]);

  // Alerts
  await Alert.insertMany([
    {
      organization: org2._id,
      opportunity: opp2._id,
      user: admin._id,
      type: 'deadline',
      priority: 'high',
      message: `Deadline alert: "Public Safety Technology Modernization Fund" closes in ~10 days. Your organization scored high for fit.`,
      isRead: false,
    },
    {
      organization: org1._id,
      opportunity: opp1._id,
      user: admin._id,
      type: 'high_fit',
      priority: 'medium',
      message: `High fit: Valley Fire Department scored well for "First Responder Communications Grant". Review and pursue.`,
      isRead: false,
    },
    {
      organization: org3._id,
      opportunity: opp3._id,
      user: admin._id,
      type: 'high_fit',
      priority: 'medium',
      message: `High fit: Riverside County Sheriff matches "Community Policing Initiative". Planned timeline aligns with 90-day deadline.`,
      isRead: true,
    },
  ]);

  logger.info('✅ Seed complete!');
  logger.info(`   Admin: admin@reddogradios.com / Admin1234!`);
  logger.info(`   Organizations: ${(await Organization.countDocuments())} | Opportunities: ${(await Opportunity.countDocuments())} | Matches: ${(await Match.countDocuments())} | Agencies: ${(await Agency.countDocuments())} | Alerts: ${(await Alert.countDocuments())}`);

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  logger.error('Seed failed:', err.message);
  process.exit(1);
});
