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
    Application.deleteMany({}),
    Outbox.deleteMany({}),
  ]);
  logger.info('Cleared existing data');

  // Admin user
  const admin = await User.create({
    fullName: 'Admin User',
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@reddogradios.com',
    password: 'Admin1234!',
    role: 'admin',
    onboardingCompleted: true,
  });

  // Regular user
  const regularUser = await User.create({
    fullName: 'Jane Smith',
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane@valleyfire.org',
    password: 'Password1234!',
    role: 'user',
    onboardingCompleted: true,
  });

  // Organizations
  const [org1, org2, org3, org4] = await Organization.insertMany([
    {
      name: 'Valley Fire Department',
      email: 'grants@valleyfire.org',
      location: 'Fresno, California',
      website: 'https://valleyfire.org',
      websiteUrl: 'https://valleyfire.org',
      missionStatement: 'Protecting lives and property through professional fire and emergency services.',
      focusAreas: ['emergency response', 'fire prevention', 'community education'],
      agencyTypes: ['fire_services', 'ems'],
      programAreas: ['communications', 'emergency response', 'equipment modernization'],
      budgetRange: '25k_150k',
      timeline: 'planned',
      goals: ['Upgrade radio communications', 'Train 50 new volunteers'],
      matchCount: 3,
      status: 'active',
      createdBy: admin._id,
    },
    {
      name: 'Metro 911 Communications Center',
      email: 'director@metro911.gov',
      location: 'Austin, Texas',
      website: 'https://metro911.gov',
      websiteUrl: 'https://metro911.gov',
      missionStatement: 'Delivering fast, accurate emergency dispatch services 24/7.',
      focusAreas: ['dispatch technology', 'training', 'interoperability'],
      agencyTypes: ['911_centers', 'emergency_management'],
      programAreas: ['911 systems', 'communications', 'public safety technology'],
      budgetRange: '150k_500k',
      timeline: 'urgent',
      goals: ['Next-gen 911 platform', 'Statewide interoperability'],
      matchCount: 4,
      status: 'active',
      createdBy: admin._id,
    },
    {
      name: 'Riverside County Sheriff Department',
      email: 'grants@rcsd.gov',
      location: 'Riverside, California',
      website: 'https://rcsd.gov',
      websiteUrl: 'https://rcsd.gov',
      missionStatement: 'Serving and protecting Riverside County with professionalism and integrity.',
      focusAreas: ['law enforcement', 'public safety', 'community policing'],
      agencyTypes: ['law_enforcement', 'multi_agency'],
      programAreas: ['body cameras', 'records management', 'community outreach'],
      budgetRange: '500k_plus',
      timeline: 'planned',
      matchCount: 2,
      status: 'active',
      createdBy: admin._id,
    },
    {
      name: 'Northeast EMS Alliance',
      email: 'admin@neems.org',
      location: 'Albany, New York',
      website: 'https://neems.org',
      websiteUrl: 'https://neems.org',
      missionStatement: 'Providing quality emergency medical services across the northeast region.',
      focusAreas: ['emergency medical services', 'trauma response', 'ambulance operations'],
      agencyTypes: ['ems', 'hospitals'],
      programAreas: ['ambulance equipment', 'paramedic training', 'trauma response'],
      budgetRange: '25k_150k',
      timeline: 'planned',
      matchCount: 1,
      status: 'active',
      createdBy: admin._id,
    },
  ]);

  // Update user with org references
  await User.findByIdAndUpdate(regularUser._id, { organizationId: org1._id });
  await User.findByIdAndUpdate(admin._id, { organizationId: org2._id });

  // Opportunities
  const now = new Date();
  const in8 = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000);
  const in25 = new Date(now.getTime() + 25 * 24 * 60 * 60 * 1000);
  const in45 = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000);
  const in90 = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  const in120 = new Date(now.getTime() + 120 * 24 * 60 * 60 * 1000);

  const [opp1, opp2, opp3, opp4, opp5] = await Opportunity.insertMany([
    {
      title: 'First Responder Communications Grant',
      funder: 'DHS Communications Division',
      deadline: in25,
      maxAmount: 250000,
      sourceUrl: 'https://www.dhs.gov/grants/communications',
      keywords: ['communications', 'emergency response', 'California', 'Texas', 'radio'],
      agencyTypes: ['fire_services', '911_centers', 'emergency_management'],
      description: 'Funding for radio and communications technology upgrades for first responders. Competitive grants for agencies modernizing their communications infrastructure.',
      category: 'Technology',
      status: 'open',
      createdBy: admin._id,
    },
    {
      title: 'Public Safety Technology Modernization Fund',
      funder: 'FEMA',
      deadline: in8,
      maxAmount: 500000,
      sourceUrl: 'https://www.fema.gov/grants/technology',
      keywords: ['technology', 'public safety', '911 systems', 'Texas', 'California', 'dispatch'],
      agencyTypes: ['911_centers', 'law_enforcement', 'emergency_management'],
      description: 'Competitive grant for agencies modernizing dispatch, command systems, and public safety communications infrastructure.',
      category: 'Technology',
      status: 'closing',
      createdBy: admin._id,
    },
    {
      title: 'Community Policing and Public Safety Initiative',
      funder: 'DOJ Community Relations',
      deadline: in90,
      maxAmount: 1000000,
      sourceUrl: 'https://www.justice.gov/grants/community-policing',
      keywords: ['community policing', 'law enforcement', 'California', 'body cameras', 'accountability'],
      agencyTypes: ['law_enforcement', 'multi_agency'],
      description: 'Grants supporting community policing, accountability, and transparency programs including body camera programs and community outreach.',
      category: 'Law Enforcement',
      status: 'open',
      createdBy: admin._id,
    },
    {
      title: 'Emergency Medical Services Equipment Grant',
      funder: 'HRSA Rural Health Programs',
      deadline: in45,
      maxAmount: 150000,
      sourceUrl: 'https://www.hrsa.gov/grants/ems',
      keywords: ['emergency medical services', 'ambulance', 'trauma', 'New York', 'rural'],
      agencyTypes: ['ems', 'hospitals'],
      description: 'Grants to improve EMS equipment, training, and response capabilities in rural and underserved areas.',
      category: 'Emergency Medical',
      status: 'open',
      createdBy: admin._id,
    },
    {
      title: 'Interoperability and Next-Gen 911 Infrastructure',
      funder: 'FirstNet / AT&T',
      deadline: in120,
      maxAmount: 750000,
      sourceUrl: 'https://www.firstnet.gov/grants',
      keywords: ['interoperability', 'next-gen 911', '911 systems', 'Texas', 'communications', 'public safety'],
      agencyTypes: ['911_centers', 'emergency_management', 'fire_services'],
      description: 'Funding for Next Generation 911 infrastructure, broadband public safety networks, and interoperability initiatives.',
      category: 'Technology',
      status: 'open',
      createdBy: admin._id,
    },
  ]);

  // Matches with scoring
  const { computeMatchScore } = require('../modules/matches/match.service');
  const matchPairs = [
    { org: org1, opp: opp1 },
    { org: org2, opp: opp1 },
    { org: org2, opp: opp2 },
    { org: org2, opp: opp5 },
    { org: org3, opp: opp2 },
    { org: org3, opp: opp3 },
    { org: org4, opp: opp4 },
    { org: org1, opp: opp2 },
  ];

  const matchDocs = [];
  for (const { org, opp } of matchPairs) {
    const scored = computeMatchScore(org, opp);
    const match = await Match.create({
      organization: org._id,
      opportunity: opp._id,
      ...scored,
    });
    matchDocs.push(match);
  }

  // Applications
  const [app1, app2, app3] = await Application.insertMany([
    {
      organization: org1._id,
      opportunity: opp1._id,
      status: 'submitted',
      projectTitle: 'Radio Upgrade Initiative FY2026',
      projectSummary: 'Upgrading Valley Fire Department communications infrastructure with modern P25 radio systems to improve interoperability across regional agencies.',
      communityImpact: 'Improved emergency response times and better coordination with partner agencies will directly benefit 250,000 residents in Fresno County.',
      amountRequested: 185000,
      contactName: 'Chief Robert Martinez',
      contactEmail: 'rmartinez@valleyfire.org',
      timeline: '12 months',
      submittedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
    },
    {
      organization: org2._id,
      opportunity: opp2._id,
      status: 'in_review',
      projectTitle: 'Metro 911 NextGen Platform Migration',
      projectSummary: 'Complete migration from legacy PSAP systems to NG911-compliant infrastructure serving 1.2 million Austin metro residents.',
      communityImpact: 'Reduced call processing times by 40% and support for text-to-911, video calling, and real-time data sharing with field units.',
      amountRequested: 450000,
      contactName: 'Director Sarah Chen',
      contactEmail: 'schen@metro911.gov',
      timeline: '18 months',
      submittedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      organization: org3._id,
      opportunity: opp3._id,
      status: 'draft',
      projectTitle: 'Community Accountability Program',
      projectSummary: 'Body camera deployment and community liaison program for Riverside County Sheriff.',
      communityImpact: 'Increased transparency and trust between law enforcement and the 2.4 million residents of Riverside County.',
      amountRequested: 750000,
      contactName: 'Sheriff Deputy Director',
      contactEmail: 'grants@rcsd.gov',
      timeline: '24 months',
    },
  ]);

  // Agencies
  await Agency.insertMany([
    { name: 'Valley Fire Department', type: 'fire_services', location: 'Fresno, California', grantContactEmail: 'grants@valleyfire.org', matchCount: 3, status: 'active' },
    { name: 'Metro 911 Communications Center', type: '911_centers', location: 'Austin, Texas', grantContactEmail: 'director@metro911.gov', matchCount: 4, status: 'active' },
    { name: 'Riverside County Sheriff Department', type: 'law_enforcement', location: 'Riverside, California', grantContactEmail: 'grants@rcsd.gov', matchCount: 2, status: 'active' },
    { name: 'Northeast EMS Alliance', type: 'ems', location: 'Albany, New York', grantContactEmail: 'admin@neems.org', matchCount: 1, status: 'active' },
    { name: 'Austin Police Department', type: 'law_enforcement', location: 'Austin, Texas', grantContactEmail: 'grants@austinpd.gov', matchCount: 0, status: 'active' },
  ]);

  // Alerts
  await Alert.insertMany([
    {
      organization: org2._id,
      opportunity: opp2._id,
      user: admin._id,
      orgName: org2.name,
      grantName: opp2.title,
      type: 'deadline',
      priority: 'high',
      message: `Deadline alert: "Public Safety Technology Modernization Fund" closes in 8 days. Your organization scored high for fit.`,
      isRead: false,
    },
    {
      organization: org1._id,
      opportunity: opp1._id,
      user: admin._id,
      orgName: org1.name,
      grantName: opp1.title,
      type: 'high_fit',
      priority: 'medium',
      message: `High fit: Valley Fire Department scored well for "First Responder Communications Grant". Review and pursue.`,
      isRead: false,
    },
    {
      organization: org3._id,
      opportunity: opp3._id,
      user: admin._id,
      orgName: org3.name,
      grantName: opp3.title,
      type: 'high_fit',
      priority: 'medium',
      message: `High fit: Riverside County Sheriff matches "Community Policing Initiative". Planned timeline aligns with 90-day deadline.`,
      isRead: false,
    },
    {
      organization: org2._id,
      opportunity: opp5._id,
      user: admin._id,
      orgName: org2.name,
      grantName: opp5.title,
      type: 'high_fit',
      priority: 'high',
      message: `High fit: Metro 911 is an excellent match for "Interoperability and Next-Gen 911 Infrastructure" grant. Score: 92/100.`,
      isRead: false,
    },
    {
      organization: org1._id,
      opportunity: opp2._id,
      user: admin._id,
      orgName: org1.name,
      grantName: opp2.title,
      type: 'deadline',
      priority: 'high',
      message: `Deadline alert: "Public Safety Technology Modernization Fund" closes in 8 days — Valley Fire may be eligible.`,
      isRead: true,
    },
  ]);

  // Outbox emails
  await Outbox.insertMany([
    {
      recipient: 'director@metro911.gov',
      recipientName: 'Director Sarah Chen',
      subject: 'Grant Intelligence Weekly Digest — Metro 911 Communications Center',
      htmlBody: '<p>Weekly digest placeholder</p>',
      emailType: 'weekly_digest',
      status: 'sent',
      sentAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      relatedOrganization: org2._id,
    },
    {
      recipient: 'grants@valleyfire.org',
      recipientName: 'Valley Fire Department',
      subject: 'High-Fit Alert: First Responder Communications Grant',
      htmlBody: '<p>Alert email placeholder</p>',
      emailType: 'alert_digest',
      status: 'pending',
      relatedOrganization: org1._id,
    },
    {
      recipient: 'grants@rcsd.gov',
      recipientName: 'Riverside County Sheriff',
      subject: 'Grant Intelligence Weekly Digest — Riverside County Sheriff Department',
      htmlBody: '<p>Weekly digest placeholder</p>',
      emailType: 'weekly_digest',
      status: 'failed',
      retryCount: 2,
      errorMessage: 'SMTP connection timeout',
      relatedOrganization: org3._id,
    },
  ]);

  logger.info('✅ Seed complete!');
  logger.info(`   Admin: admin@reddogradios.com / Admin1234!`);
  logger.info(`   Regular: jane@valleyfire.org / Password1234!`);
  const counts = await Promise.all([
    Organization.countDocuments(),
    Opportunity.countDocuments(),
    Match.countDocuments(),
    Agency.countDocuments(),
    Alert.countDocuments(),
    Application.countDocuments(),
    Outbox.countDocuments(),
  ]);
  logger.info(`   Orgs: ${counts[0]} | Opps: ${counts[1]} | Matches: ${counts[2]} | Agencies: ${counts[3]} | Alerts: ${counts[4]} | Apps: ${counts[5]} | Outbox: ${counts[6]}`);

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  logger.error('Seed failed:', err.message);
  process.exit(1);
});
