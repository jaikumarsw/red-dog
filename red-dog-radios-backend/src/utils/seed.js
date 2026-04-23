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
const { computeMatchScore } = require('../modules/matches/match.service');
const logger = require('./logger');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/reddog_db';

async function seedRealFunders() {
  const realFunders = [
    {
      name: 'COPS Office',
      website: 'https://cops.usdoj.gov',
      missionStatement:
        'The COPS Office advances the practice of community policing as the primary strategy for building safer communities. Funds equipment, radios, and officer safety initiatives for law enforcement agencies.',
      fundingCategories: ['law_enforcement', 'equipment', 'communications'],
      agencyTypesFunded: ['police', 'sheriff'],
      locationFocus: [],
      avgGrantMin: 50000,
      avgGrantMax: 500000,
      cyclesPerYear: 1,
      localMatchRequired: true,
      maxApplicationsAllowed: 3,
      status: 'active',
    },
    {
      name: 'Bureau of Justice Assistance (Byrne JAG)',
      website: 'https://bja.ojp.gov',
      missionStatement:
        'The Byrne JAG program provides flexible funding to support a range of criminal justice activities including law enforcement, prosecution, courts, corrections, drug treatment, and crime prevention.',
      fundingCategories: ['law_enforcement', 'equipment', 'training'],
      agencyTypesFunded: ['police', 'sheriff', 'corrections'],
      locationFocus: [],
      avgGrantMin: 25000,
      avgGrantMax: 1000000,
      cyclesPerYear: 1,
      localMatchRequired: false,
      maxApplicationsAllowed: 3,
      status: 'active',
    },
    {
      name: 'FEMA — Assistance to Firefighters Grant (AFG)',
      website: 'https://www.fema.gov/grants/preparedness/firefighters',
      missionStatement:
        'AFG helps firefighters and other first responders obtain critically needed equipment, protective gear, emergency vehicles, training, and other resources to protect the public and emergency personnel from fire and related hazards.',
      fundingCategories: ['fire', 'equipment', 'communications'],
      agencyTypesFunded: ['fire', 'ems'],
      locationFocus: [],
      avgGrantMin: 5000,
      avgGrantMax: 500000,
      cyclesPerYear: 1,
      localMatchRequired: true,
      maxApplicationsAllowed: 3,
      status: 'active',
    },
    {
      name: 'FEMA — SAFER Grant',
      website: 'https://www.fema.gov/grants/preparedness/safer',
      missionStatement:
        'The SAFER grant program assists local fire departments in increasing the number of trained front-line firefighters available in their communities, supporting staffing and infrastructure needs.',
      fundingCategories: ['fire', 'staffing', 'infrastructure'],
      agencyTypesFunded: ['fire'],
      locationFocus: [],
      avgGrantMin: 100000,
      avgGrantMax: 2000000,
      cyclesPerYear: 1,
      localMatchRequired: false,
      maxApplicationsAllowed: 3,
      status: 'active',
    },
    {
      name: 'DHS — State Homeland Security Program (SHSP)',
      website: 'https://www.fema.gov/grants/preparedness/state-homeland-security',
      missionStatement:
        'SHSP supports the implementation of risk-driven, capabilities-based state homeland security strategies. Funds interoperability and communications upgrades for public safety agencies.',
      fundingCategories: ['communications', 'interoperability', 'preparedness'],
      agencyTypesFunded: ['police', 'fire', 'ems', 'emergency_management'],
      locationFocus: [],
      avgGrantMin: 50000,
      avgGrantMax: 500000,
      cyclesPerYear: 1,
      localMatchRequired: false,
      maxApplicationsAllowed: 3,
      status: 'active',
    },
    {
      name: 'DHS — Urban Area Security Initiative (UASI)',
      website: 'https://www.fema.gov/grants/preparedness/urban-areas-security',
      missionStatement:
        'UASI funds address the unique planning, organization, equipment, training, and exercise needs of high-threat, high-density urban areas. Supports interoperability and communications infrastructure for public safety agencies.',
      fundingCategories: ['communications', 'interoperability', 'equipment'],
      agencyTypesFunded: ['police', 'fire', 'ems'],
      locationFocus: [],
      avgGrantMin: 100000,
      avgGrantMax: 2000000,
      cyclesPerYear: 1,
      localMatchRequired: false,
      maxApplicationsAllowed: 3,
      status: 'active',
    },
    {
      name: 'NTIA — Broadband and Communications Infrastructure',
      website: 'https://www.ntia.gov',
      missionStatement:
        'NTIA promotes broadband access and communications infrastructure development across the United States, including funding for public safety communications networks and interoperability improvements.',
      fundingCategories: ['communications', 'broadband', 'infrastructure'],
      agencyTypesFunded: ['police', 'fire', 'ems', 'emergency_management'],
      locationFocus: [],
      avgGrantMin: 500000,
      avgGrantMax: 10000000,
      cyclesPerYear: 1,
      localMatchRequired: true,
      maxApplicationsAllowed: 3,
      status: 'active',
    },
    {
      name: "U.S. Department of Transportation — Highway Safety",
      website: 'https://www.transportation.gov',
      missionStatement:
        "DOT highway safety grants fund fleet communications, infrastructure improvements, and safety technology to reduce crashes and improve emergency response along the nation's highways.",
      fundingCategories: ['transportation', 'communications', 'infrastructure'],
      agencyTypesFunded: ['police', 'dot'],
      locationFocus: [],
      avgGrantMin: 50000,
      avgGrantMax: 1000000,
      cyclesPerYear: 1,
      localMatchRequired: true,
      maxApplicationsAllowed: 3,
      status: 'active',
    },
    {
      name: 'Colorado Division of Homeland Security and Emergency Management (DHSEM)',
      website: 'https://dhsem.colorado.gov',
      missionStatement:
        'Colorado DHSEM administers pass-through federal funds for radios, DTRS interoperability, and emergency communications upgrades for public safety agencies across Colorado.',
      fundingCategories: ['communications', 'interoperability', 'equipment'],
      agencyTypesFunded: ['police', 'fire', 'ems', 'emergency_management'],
      locationFocus: ['Colorado'],
      avgGrantMin: 10000,
      avgGrantMax: 250000,
      cyclesPerYear: 2,
      localMatchRequired: false,
      maxApplicationsAllowed: 3,
      status: 'active',
    },
    {
      name: 'Colorado Department of Public Safety',
      website: 'https://cdps.colorado.gov',
      missionStatement:
        'Colorado DPS provides grants for equipment and communication upgrades to support law enforcement, fire, and EMS agencies in delivering effective public safety services across Colorado.',
      fundingCategories: ['equipment', 'communications', 'public_safety'],
      agencyTypesFunded: ['police', 'fire', 'ems'],
      locationFocus: ['Colorado'],
      avgGrantMin: 5000,
      avgGrantMax: 150000,
      cyclesPerYear: 2,
      localMatchRequired: false,
      maxApplicationsAllowed: 3,
      status: 'active',
    },
    {
      name: 'Motorola Solutions Foundation',
      website: 'https://www.motorolasolutions.com/foundation',
      missionStatement:
        'The Motorola Solutions Foundation supports public safety technology and communications by funding programs that help first responders access the tools they need to protect their communities.',
      fundingCategories: ['communications', 'equipment', 'technology'],
      agencyTypesFunded: ['police', 'fire', 'ems'],
      locationFocus: [],
      avgGrantMin: 5000,
      avgGrantMax: 50000,
      cyclesPerYear: 2,
      localMatchRequired: false,
      maxApplicationsAllowed: 3,
      status: 'active',
    },
    {
      name: 'Firehouse Subs Public Safety Foundation',
      website: 'https://firehousesubs.com/foundation',
      missionStatement:
        'The Firehouse Subs Public Safety Foundation funds life-saving equipment for first responders including fire departments, EMS, and law enforcement agencies across the United States.',
      fundingCategories: ['equipment', 'fire', 'public_safety'],
      agencyTypesFunded: ['fire', 'ems', 'police'],
      locationFocus: [],
      avgGrantMin: 500,
      avgGrantMax: 20000,
      cyclesPerYear: 4,
      localMatchRequired: false,
      maxApplicationsAllowed: 3,
      status: 'active',
    },
    {
      name: 'Gary Sinise Foundation',
      website: 'https://www.garysinisefoundation.org',
      missionStatement:
        'The Gary Sinise Foundation serves defenders, veterans, first responders, and their families by providing support, equipment, and resources to those who protect and serve our communities.',
      fundingCategories: ['public_safety', 'equipment', 'support'],
      agencyTypesFunded: ['police', 'fire', 'ems'],
      locationFocus: [],
      avgGrantMin: 1000,
      avgGrantMax: 25000,
      cyclesPerYear: 2,
      localMatchRequired: false,
      maxApplicationsAllowed: 3,
      status: 'active',
    },
    {
      name: 'Walmart Foundation',
      website: 'https://walmart.org',
      missionStatement:
        'The Walmart Foundation funds community safety, emergency response, and disaster preparedness initiatives that strengthen local communities and support first responders.',
      fundingCategories: ['community', 'emergency_response', 'equipment'],
      agencyTypesFunded: ['fire', 'ems', 'police'],
      locationFocus: [],
      avgGrantMin: 5000,
      avgGrantMax: 250000,
      cyclesPerYear: 2,
      localMatchRequired: false,
      maxApplicationsAllowed: 3,
      status: 'active',
    },
  ];

  let seeded = 0;
  for (const funder of realFunders) {
    try {
      await Funder.findOneAndUpdate(
        { name: funder.name },
        { $set: funder },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      seeded += 1;
    } catch (err) {
      console.error(`❌ Failed to upsert funder "${funder.name}":`, err);
    }
  }
  return seeded;
}

async function seedRealOpportunities() {
  const admin = await User.findOne({ email: 'admin@reddogradios.com' });
  if (!admin) {
    console.error('❌ Admin user not found (admin@reddogradios.com) for seedRealOpportunities');
    return 0;
  }

  const items = [
    {
      funderName: 'COPS Office',
      opportunity: {
        title: 'COPS Office — Community Policing Development Grant',
        funder: 'COPS Office',
        description:
          'Funding for law enforcement agencies to purchase radios, communications equipment, and officer safety technology to advance community policing strategies.',
        keywords: ['law enforcement', 'radios', 'communications', 'officer safety', 'equipment', 'police', 'sheriff'],
        agencyTypes: ['police', 'sheriff', 'law_enforcement'],
        category: 'Law Enforcement',
        minAmount: 50000,
        maxAmount: 500000,
        sourceUrl: 'https://cops.usdoj.gov',
        localMatchRequired: true,
        status: 'open',
        deadline: null,
        maxApplicationsAllowed: 3,
      },
    },
    {
      funderName: 'Bureau of Justice Assistance (Byrne JAG)',
      opportunity: {
        title: 'Byrne JAG — Justice Assistance Grant Program',
        funder: 'Bureau of Justice Assistance (Byrne JAG)',
        description:
          'Flexible federal funding for law enforcement equipment, communications technology, training, and crime prevention programs for police and sheriff departments.',
        keywords: ['law enforcement', 'equipment', 'training', 'communications', 'radios', 'police', 'criminal justice'],
        agencyTypes: ['police', 'sheriff', 'law_enforcement', 'corrections'],
        category: 'Law Enforcement',
        minAmount: 25000,
        maxAmount: 1000000,
        sourceUrl: 'https://bja.ojp.gov',
        localMatchRequired: false,
        status: 'open',
        deadline: null,
        maxApplicationsAllowed: 3,
      },
    },
    {
      funderName: 'FEMA — Assistance to Firefighters Grant (AFG)',
      opportunity: {
        title: 'FEMA AFG — Assistance to Firefighters Grant',
        funder: 'FEMA — Assistance to Firefighters Grant (AFG)',
        description:
          'Critical funding for fire departments and EMS agencies to purchase radios, protective gear, emergency communications equipment, and other life-safety resources.',
        keywords: ['fire', 'ems', 'radios', 'communications', 'equipment', 'protective gear', 'first responders', 'interoperability'],
        agencyTypes: ['fire', 'ems', 'fire_services'],
        category: 'Fire Services',
        minAmount: 5000,
        maxAmount: 500000,
        sourceUrl: 'https://www.fema.gov/grants/preparedness/firefighters',
        localMatchRequired: true,
        status: 'open',
        deadline: null,
        maxApplicationsAllowed: 3,
      },
    },
    {
      funderName: 'FEMA — SAFER Grant',
      opportunity: {
        title: 'FEMA SAFER — Staffing for Adequate Fire and Emergency Response',
        funder: 'FEMA — SAFER Grant',
        description:
          'Federal funding to help fire departments hire and retain front-line firefighters, supporting staffing levels and infrastructure needs for adequate emergency response.',
        keywords: ['fire', 'staffing', 'firefighters', 'infrastructure', 'emergency response', 'hiring'],
        agencyTypes: ['fire', 'fire_services'],
        category: 'Fire Services',
        minAmount: 100000,
        maxAmount: 2000000,
        sourceUrl: 'https://www.fema.gov/grants/preparedness/safer',
        localMatchRequired: false,
        status: 'open',
        deadline: null,
        maxApplicationsAllowed: 3,
      },
    },
    {
      funderName: 'DHS — State Homeland Security Program (SHSP)',
      opportunity: {
        title: 'DHS SHSP — State Homeland Security Program',
        funder: 'DHS — State Homeland Security Program (SHSP)',
        description:
          'Federal funding passed through states for interoperable communications, radio systems, and emergency preparedness equipment for public safety agencies.',
        keywords: ['interoperability', 'communications', 'radios', 'homeland security', 'preparedness', 'public safety', 'emergency management'],
        agencyTypes: ['police', 'fire', 'ems', 'emergency_management'],
        category: 'Homeland Security',
        minAmount: 50000,
        maxAmount: 500000,
        sourceUrl: 'https://www.fema.gov/grants/preparedness/state-homeland-security',
        localMatchRequired: false,
        status: 'open',
        deadline: null,
        maxApplicationsAllowed: 3,
      },
    },
    {
      funderName: 'DHS — Urban Area Security Initiative (UASI)',
      opportunity: {
        title: 'DHS UASI — Urban Area Security Initiative',
        funder: 'DHS — Urban Area Security Initiative (UASI)',
        description:
          'Federal funding for high-threat urban areas to strengthen interoperable communications infrastructure, radio systems, and equipment for public safety agencies.',
        keywords: ['urban', 'interoperability', 'communications', 'radios', 'equipment', 'public safety', 'homeland security'],
        agencyTypes: ['police', 'fire', 'ems'],
        category: 'Homeland Security',
        minAmount: 100000,
        maxAmount: 2000000,
        sourceUrl: 'https://www.fema.gov/grants/preparedness/urban-areas-security',
        localMatchRequired: false,
        status: 'open',
        deadline: null,
        maxApplicationsAllowed: 3,
      },
    },
    {
      funderName: 'NTIA — Broadband and Communications Infrastructure',
      opportunity: {
        title: 'NTIA — Public Safety Broadband and Communications Infrastructure',
        funder: 'NTIA — Broadband and Communications Infrastructure',
        description:
          'Federal funding for broadband and communications infrastructure development including public safety communications networks, LTE, and interoperability improvements.',
        keywords: ['broadband', 'communications', 'infrastructure', 'LTE', 'interoperability', 'public safety', 'network'],
        agencyTypes: ['police', 'fire', 'ems', 'emergency_management'],
        category: 'Communications',
        minAmount: 500000,
        maxAmount: 10000000,
        sourceUrl: 'https://www.ntia.gov',
        localMatchRequired: true,
        status: 'open',
        deadline: null,
        maxApplicationsAllowed: 3,
      },
    },
    {
      funderName: 'U.S. Department of Transportation — Highway Safety',
      opportunity: {
        title: 'DOT — Highway Safety Fleet Communications Grant',
        funder: 'U.S. Department of Transportation — Highway Safety',
        description:
          'Federal funding for fleet communications upgrades, safety technology, and infrastructure improvements to reduce highway crashes and improve emergency response.',
        keywords: ['transportation', 'fleet', 'communications', 'highway safety', 'infrastructure', 'radios', 'police'],
        agencyTypes: ['police', 'dot', 'law_enforcement'],
        category: 'Transportation',
        minAmount: 50000,
        maxAmount: 1000000,
        sourceUrl: 'https://www.transportation.gov',
        localMatchRequired: true,
        status: 'open',
        deadline: null,
        maxApplicationsAllowed: 3,
      },
    },
    {
      funderName: 'Colorado Division of Homeland Security and Emergency Management (DHSEM)',
      opportunity: {
        title: 'Colorado DHSEM — Interoperable Communications Equipment Grant',
        funder: 'Colorado Division of Homeland Security and Emergency Management (DHSEM)',
        description:
          'Colorado pass-through funding for radios, DTRS interoperability equipment, and emergency communications upgrades for public safety agencies across Colorado.',
        keywords: ['Colorado', 'DTRS', 'interoperability', 'radios', 'communications', 'equipment', 'public safety'],
        agencyTypes: ['police', 'fire', 'ems', 'emergency_management'],
        category: 'Communications',
        minAmount: 10000,
        maxAmount: 250000,
        sourceUrl: 'https://dhsem.colorado.gov',
        localMatchRequired: false,
        status: 'open',
        deadline: null,
        maxApplicationsAllowed: 3,
      },
    },
    {
      funderName: 'Colorado Department of Public Safety',
      opportunity: {
        title: 'Colorado DPS — Public Safety Equipment and Communications Grant',
        funder: 'Colorado Department of Public Safety',
        description:
          'Colorado state funding for equipment and communications upgrades supporting law enforcement, fire, and EMS agencies in delivering effective public safety services.',
        keywords: ['Colorado', 'equipment', 'communications', 'radios', 'public safety', 'fire', 'police', 'ems'],
        agencyTypes: ['police', 'fire', 'ems'],
        category: 'Public Safety',
        minAmount: 5000,
        maxAmount: 150000,
        sourceUrl: 'https://cdps.colorado.gov',
        localMatchRequired: false,
        status: 'open',
        deadline: null,
        maxApplicationsAllowed: 3,
      },
    },
    {
      funderName: 'Motorola Solutions Foundation',
      opportunity: {
        title: 'Motorola Solutions Foundation — Public Safety Technology Grant',
        funder: 'Motorola Solutions Foundation',
        description:
          'Foundation grants for public safety agencies to access communications technology, radio equipment, and tools that improve first responder safety and effectiveness.',
        keywords: ['technology', 'communications', 'radios', 'equipment', 'public safety', 'first responders', 'innovation'],
        agencyTypes: ['police', 'fire', 'ems'],
        category: 'Foundation',
        minAmount: 5000,
        maxAmount: 50000,
        sourceUrl: 'https://www.motorolasolutions.com/foundation',
        localMatchRequired: false,
        status: 'open',
        deadline: null,
        maxApplicationsAllowed: 3,
      },
    },
    {
      funderName: 'Firehouse Subs Public Safety Foundation',
      opportunity: {
        title: 'Firehouse Subs Foundation — Life-Saving Equipment Grant',
        funder: 'Firehouse Subs Public Safety Foundation',
        description:
          'Foundation grants providing life-saving equipment for first responders including fire departments, EMS agencies, and law enforcement across the United States.',
        keywords: ['equipment', 'fire', 'ems', 'police', 'life-saving', 'first responders', 'public safety'],
        agencyTypes: ['fire', 'ems', 'police', 'fire_services'],
        category: 'Foundation',
        minAmount: 500,
        maxAmount: 20000,
        sourceUrl: 'https://firehousesubs.com/foundation',
        localMatchRequired: false,
        status: 'open',
        deadline: null,
        maxApplicationsAllowed: 3,
      },
    },
    {
      funderName: 'Gary Sinise Foundation',
      opportunity: {
        title: 'Gary Sinise Foundation — First Responder Support Grant',
        funder: 'Gary Sinise Foundation',
        description:
          'Foundation support for first responders including police, fire, and EMS agencies providing equipment, resources, and support for those who protect and serve communities.',
        keywords: ['first responders', 'equipment', 'support', 'public safety', 'police', 'fire', 'ems'],
        agencyTypes: ['police', 'fire', 'ems'],
        category: 'Foundation',
        minAmount: 1000,
        maxAmount: 25000,
        sourceUrl: 'https://www.garysinisefoundation.org',
        localMatchRequired: false,
        status: 'open',
        deadline: null,
        maxApplicationsAllowed: 3,
      },
    },
    {
      funderName: 'Walmart Foundation',
      opportunity: {
        title: 'Walmart Foundation — Community Safety and Emergency Response Grant',
        funder: 'Walmart Foundation',
        description:
          'Foundation funding for community safety, emergency response equipment, and disaster preparedness initiatives that strengthen local communities and support first responders.',
        keywords: ['community safety', 'emergency response', 'equipment', 'disaster preparedness', 'fire', 'ems', 'police'],
        agencyTypes: ['fire', 'ems', 'police', 'fire_services'],
        category: 'Foundation',
        minAmount: 5000,
        maxAmount: 250000,
        sourceUrl: 'https://walmart.org',
        localMatchRequired: false,
        status: 'open',
        deadline: null,
        maxApplicationsAllowed: 3,
      },
    },
  ];

  let successCount = 0;
  for (const { funderName, opportunity: opp } of items) {
    try {
      const funderDoc = await Funder.findOne({ name: funderName });
      if (!funderDoc) {
        console.error(`❌ Funder not found for opportunity "${opp.title}" (name: "${funderName}")`);
        continue;
      }
      const payload = { ...opp, createdBy: admin._id };
      await Opportunity.findOneAndUpdate(
        { title: opp.title },
        { $set: payload },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      successCount += 1;
    } catch (err) {
      console.error(`❌ Failed to upsert opportunity "${opp.title}":`, err);
    }
  }

  if (successCount === 14) {
    console.log('✅ Seeded 14 opportunities successfully.');
  } else {
    console.log(`✅ Seeded ${successCount} opportunities successfully.`);
  }
  return successCount;
}

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

  const fundersSeeded = await seedRealFunders();
  const opportunitiesSeeded = await seedRealOpportunities();
  const matchesComputed = await seedTestAgency();

  console.log('===================================');
  console.log('✅ SEED COMPLETE');
  console.log('Admin:    admin@reddogradios.com / Admin1234!');
  console.log('Agency:   chief@coloradofire.com / Test1234!');
  console.log('          → Colorado Springs Fire Department');
  console.log(`Funders seeded:       ${fundersSeeded}`);
  console.log(`Opportunities seeded: ${opportunitiesSeeded}`);
  console.log(`Matches computed:     ${matchesComputed}`);
  console.log('===================================');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  logger.error('Seed failed:', err.message);
  process.exit(1);
});
