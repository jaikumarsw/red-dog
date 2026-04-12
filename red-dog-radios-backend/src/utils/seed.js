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
const logger = require('./logger');
const { computeMatchScore } = require('../modules/matches/match.service');

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
    Digest.deleteMany({}),
    Funder.deleteMany({}),
    Win.deleteMany({}),
  ]);
  logger.info('Cleared existing data');

  const admin = await User.create({
    fullName: 'Red Dog Admin',
    firstName: 'Red',
    lastName: 'Dog',
    email: 'admin@reddogradios.com',
    password: 'Admin1234!',
    role: 'admin',
    onboardingCompleted: true,
    organizationId: null,
  });

  const [orgAustin, orgDallas, orgValley] = await Organization.insertMany([
    {
      name: 'Austin Fire Department',
      email: 'grants@austintexas.gov',
      location: 'Austin, Texas',
      website: 'https://www.austintexas.gov/fire',
      missionStatement: 'Protect life and property through professional fire suppression, rescue, and prevention.',
      focusAreas: ['fire suppression', 'emergency medical', 'hazmat'],
      agencyTypes: ['fire_services', 'ems'],
      programAreas: ['communications', 'equipment', 'training'],
      budgetRange: '150k_500k',
      timeline: 'urgent',
      goals: ['P25 radio modernization', 'Interoperability with Travis County'],
      populationServed: 978908,
      coverageArea: '272 square miles within Austin city limits',
      numberOfStaff: 1200,
      currentEquipment:
        'Mixed analog and P25 Phase I portables; aging repeaters in east Austin; interoperability gaps with EMS',
      mainProblems: ['Dead zones in high-rise district', 'End-of-life portable fleet', 'Mutual aid channel congestion'],
      fundingPriorities: ['P25 portable replacement', 'In-building coverage', 'Interoperability gateways'],
      status: 'active',
      createdBy: admin._id,
    },
    {
      name: 'Dallas Police Department',
      email: 'grants@dallaspolice.net',
      location: 'Dallas, Texas',
      website: 'https://dallaspolice.net',
      missionStatement: 'Reduce crime and enhance public safety through community partnerships and technology.',
      focusAreas: ['community policing', 'technology', 'training'],
      agencyTypes: ['law_enforcement'],
      programAreas: ['body cameras', 'communications', 'crime reduction'],
      budgetRange: '500k_plus',
      timeline: 'planned',
      goals: ['Full encrypted radio coverage', 'Body-worn camera refresh'],
      populationServed: 1300000,
      coverageArea: 'City of Dallas, 385 square miles',
      numberOfStaff: 3000,
      currentEquipment: 'Encrypted radio system with capacity limits; partial BWC deployment on legacy storage',
      mainProblems: ['Radio capacity during major events', 'Evidence storage costs', 'Real-time video backhaul'],
      fundingPriorities: ['Radio system hardening', 'BWC cloud migration', 'Real-time crime center comms'],
      status: 'active',
      createdBy: admin._id,
    },
    {
      name: 'Valley Fire Department',
      email: 'grants@valleyfire.org',
      location: 'Fresno, California',
      website: 'https://valleyfire.org',
      missionStatement: 'Protecting lives and property across Fresno County.',
      focusAreas: ['wildland urban interface', 'emergency medical', 'prevention'],
      agencyTypes: ['fire_services', 'ems'],
      programAreas: ['communications', 'wildland', 'equipment'],
      budgetRange: '25k_150k',
      timeline: 'planned',
      populationServed: 250000,
      coverageArea: '180 square miles, Fresno County',
      numberOfStaff: 85,
      currentEquipment: 'Motorola APX 4000 portables (2011); P25 Phase I with eastern dead zones',
      mainProblems: ['Dead zones', 'End-of-life radios', 'Interoperability'],
      fundingPriorities: ['P25 Phase II', 'Repeaters', 'Interoperability'],
      status: 'active',
      createdBy: admin._id,
    },
  ]);

  const chief = await User.create({
    fullName: 'Chief Maria Lopez',
    firstName: 'Maria',
    lastName: 'Lopez',
    email: 'chief@austinfire.com',
    password: 'Test1234',
    role: 'agency',
    onboardingCompleted: true,
    organizationId: orgAustin._id,
  });

  const captain = await User.create({
    fullName: 'Captain James Reed',
    firstName: 'James',
    lastName: 'Reed',
    email: 'captain@dallaspd.com',
    password: 'Test1234',
    role: 'agency',
    onboardingCompleted: true,
    organizationId: orgDallas._id,
  });

  await Organization.findByIdAndUpdate(orgAustin._id, { createdBy: chief._id });
  await Organization.findByIdAndUpdate(orgDallas._id, { createdBy: captain._id });

  const now = new Date();
  const in10 = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);
  const in20 = new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000);
  const in40 = new Date(now.getTime() + 40 * 24 * 60 * 60 * 1000);
  const in60 = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
  const in90 = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  const opps = await Opportunity.insertMany([
    {
      title: 'Texas First Responder Communications Grant',
      funder: 'Texas TDEM',
      deadline: in40,
      minAmount: 75000,
      maxAmount: 400000,
      sourceUrl: 'https://tdem.texas.gov',
      keywords: ['Texas', 'communications', 'radio', 'public safety', 'fire', 'police'],
      agencyTypes: ['fire_services', 'law_enforcement', 'ems', '911_centers'],
      description: 'State funding for interoperable communications and radio infrastructure for Texas agencies.',
      category: 'Technology',
      status: 'open',
      createdBy: admin._id,
    },
    {
      title: 'Urban Public Safety Technology Fund',
      funder: 'DOJ COPS Office',
      deadline: in60,
      minAmount: 100000,
      maxAmount: 750000,
      sourceUrl: 'https://cops.usdoj.gov',
      keywords: ['law enforcement', 'technology', 'communications', 'Texas', 'California'],
      agencyTypes: ['law_enforcement'],
      description: 'Technology modernization including radios, CAD, and mobile data for municipal police.',
      category: 'Law Enforcement',
      status: 'open',
      createdBy: admin._id,
    },
    {
      title: 'FEMA Communications and Equipment Grant',
      funder: 'FEMA / DHS',
      deadline: in20,
      minAmount: 50000,
      maxAmount: 350000,
      sourceUrl: 'https://www.fema.gov',
      keywords: ['communications', 'California', 'Texas', 'emergency management', 'radio'],
      agencyTypes: ['fire_services', 'law_enforcement', 'emergency_management'],
      description: 'Supports communications equipment and interoperability for response agencies.',
      category: 'Emergency Management',
      status: 'closing',
      createdBy: admin._id,
    },
    {
      title: 'Motorola Solutions Foundation Safety Grant',
      funder: 'Motorola Solutions Foundation',
      deadline: in90,
      minAmount: 25000,
      maxAmount: 100000,
      sourceUrl: 'https://www.motorolasolutions.com/foundation',
      keywords: ['technology', 'public safety', 'innovation', 'communications'],
      agencyTypes: ['fire_services', 'law_enforcement', 'ems'],
      description: 'Foundation grants for technology that improves responder safety and communications.',
      category: 'Foundation',
      status: 'open',
      createdBy: admin._id,
    },
    {
      title: 'Rural and Wildland Fire Communications Program',
      funder: 'USDA / FEMA partnership',
      deadline: in10,
      minAmount: 40000,
      maxAmount: 200000,
      sourceUrl: 'https://www.fs.usda.gov',
      keywords: ['wildland', 'California', 'fire', 'communications', 'rural'],
      agencyTypes: ['fire_services', 'emergency_management'],
      description: 'Communications upgrades for departments in wildland-urban interface regions.',
      category: 'Fire Services',
      status: 'closing',
      createdBy: admin._id,
    },
  ]);

  const funders = await Funder.insertMany([
    {
      name: 'Texas Division of Emergency Management Grants',
      website: 'https://tdem.texas.gov',
      contactName: 'TDEM Grants',
      contactEmail: 'grants@tdem.texas.gov',
      missionStatement: 'Strengthen Texas emergency preparedness and interoperable communications.',
      locationFocus: ['Texas'],
      fundingCategories: ['communications', 'public safety', 'emergency management'],
      agencyTypesFunded: ['fire_services', 'law_enforcement', 'ems', '911_centers'],
      avgGrantMin: 75000,
      avgGrantMax: 500000,
      deadline: in60,
      cyclesPerYear: 1,
      pastGrantsAwarded: ['Houston OEM', 'Austin Fire', 'San Antonio PD'],
      notes: 'Texas agencies only; strong fit for radio projects.',
      maxApplicationsAllowed: 5,
      addedBy: admin._id,
      status: 'active',
    },
    {
      name: 'DOJ COPS Technology Program',
      website: 'https://cops.usdoj.gov',
      contactName: 'COPS Office',
      contactEmail: 'askCOPSRC@usdoj.gov',
      missionStatement: 'Advance community policing through technology and training investments.',
      locationFocus: ['National', 'Nationwide'],
      fundingCategories: ['law enforcement', 'technology', 'communications'],
      agencyTypesFunded: ['law_enforcement'],
      avgGrantMin: 150000,
      avgGrantMax: 2000000,
      deadline: in90,
      cyclesPerYear: 1,
      pastGrantsAwarded: ['Dallas PD', 'Phoenix PD', 'Detroit PD'],
      notes: 'Large awards; competitive. Emphasize community outcomes.',
      maxApplicationsAllowed: 5,
      addedBy: admin._id,
      status: 'active',
    },
    {
      name: 'FEMA Hazard Mitigation — Communications',
      website: 'https://www.fema.gov',
      contactName: 'FEMA GPD',
      contactEmail: 'askGMD@fema.dhs.gov',
      missionStatement: 'Build resilient infrastructure including public safety communications.',
      locationFocus: ['National', 'Nationwide'],
      fundingCategories: ['hazard mitigation', 'communications', 'infrastructure'],
      agencyTypesFunded: ['fire_services', 'law_enforcement', 'emergency_management'],
      avgGrantMin: 100000,
      avgGrantMax: 1000000,
      deadline: in40,
      cyclesPerYear: 1,
      pastGrantsAwarded: ['California OES', 'Florida DEM'],
      notes: 'Cost-share required; document risk and benefit.',
      maxApplicationsAllowed: 5,
      addedBy: admin._id,
      status: 'active',
    },
    {
      name: 'Motorola Solutions Foundation',
      website: 'https://www.motorolasolutions.com/foundation',
      contactName: 'Foundation Team',
      contactEmail: 'foundation@motorolasolutions.com',
      missionStatement: 'Support innovation in public safety technology and responder safety.',
      locationFocus: ['National', 'Regional'],
      fundingCategories: ['technology', 'communications', 'public safety'],
      agencyTypesFunded: ['fire_services', 'law_enforcement', 'ems'],
      avgGrantMin: 25000,
      avgGrantMax: 100000,
      deadline: in90,
      cyclesPerYear: 2,
      pastGrantsAwarded: ['Tampa Fire', 'Aurora PD'],
      notes: 'Relationship-building grants; faster decisions.',
      maxApplicationsAllowed: 5,
      addedBy: admin._id,
      status: 'active',
    },
    {
      name: 'California Office of Emergency Services — Communications',
      website: 'https://www.caloes.ca.gov',
      contactName: 'Cal OES Grants',
      contactEmail: 'grants@caloes.ca.gov',
      missionStatement: 'Enhance California mutual aid and interoperable communications.',
      locationFocus: ['California'],
      fundingCategories: ['communications', 'interoperability', 'public safety'],
      agencyTypesFunded: ['fire_services', 'law_enforcement', 'ems', 'emergency_management'],
      avgGrantMin: 50000,
      avgGrantMax: 400000,
      deadline: in60,
      cyclesPerYear: 1,
      pastGrantsAwarded: ['Fresno County Fire', 'Valley agencies consortium'],
      notes: 'California agencies; emphasize mutual aid.',
      maxApplicationsAllowed: 5,
      addedBy: admin._id,
      status: 'active',
    },
  ]);

  const orgs = [orgAustin, orgDallas, orgValley];
  let matchTotal = 0;
  for (const org of orgs) {
    for (const opp of opps) {
      const scored = computeMatchScore(org, opp);
      await Match.create({
        organization: org._id,
        opportunity: opp._id,
        ...scored,
      });
      matchTotal += 1;
    }
    await Organization.findByIdAndUpdate(org._id, {
      matchCount: await Match.countDocuments({ organization: org._id }),
      lastMatchRecomputedAt: new Date(),
    });
  }

  const mcA = await Match.countDocuments({ organization: orgAustin._id });
  const mcD = await Match.countDocuments({ organization: orgDallas._id });
  const mcV = await Match.countDocuments({ organization: orgValley._id });
  await Agency.insertMany([
    {
      name: 'Austin Fire Department',
      type: 'fire_services',
      location: 'Austin, Texas',
      grantContactEmail: 'grants@austintexas.gov',
      matchCount: mcA,
      status: 'active',
    },
    {
      name: 'Dallas Police Department',
      type: 'law_enforcement',
      location: 'Dallas, Texas',
      grantContactEmail: 'grants@dallaspolice.net',
      matchCount: mcD,
      status: 'active',
    },
    {
      name: 'Valley Fire Department',
      type: 'fire_services',
      location: 'Fresno, California',
      grantContactEmail: 'grants@valleyfire.org',
      matchCount: mcV,
      status: 'active',
    },
  ]);

  logger.info('');
  logger.info('========== SEED COMPLETE ==========');
  logger.info('STAFF (admin role) — use /admin/login');
  logger.info(`  ${admin.email} / Admin1234!`);
  logger.info('');
  logger.info('AGENCY USERS (agency role) — use main /login');
  logger.info(`  ${chief.email} / Test1234  → Austin Fire Department`);
  logger.info(`  ${captain.email} / Test1234 → Dallas Police Department`);
  logger.info('');
  logger.info(`Organizations: ${orgs.length} | Funders: ${funders.length} | Opportunities: ${opps.length} | Matches: ${matchTotal}`);
  logger.info('Valley Fire Department has no login (admin demo data only).');
  logger.info('===================================');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  logger.error('Seed failed:', err.message);
  process.exit(1);
});
