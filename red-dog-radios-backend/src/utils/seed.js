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

  // Organizations (5 total)
  const [org1, org2, org3, org4, org5] = await Organization.insertMany([
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
      populationServed: 250000,
      coverageArea: '180 square miles across Fresno County',
      numberOfStaff: 85,
      currentEquipment: 'Aging Motorola APX 4000 portables (2011, out of warranty), partial P25 Phase I infrastructure with dead zones in eastern coverage area',
      mainProblems: ['Radio dead zones in 30% of coverage area', 'Equipment beyond end-of-life', 'No interoperability with neighboring agencies', 'Communications failures during major incidents'],
      fundingPriorities: ['P25 Phase II radio upgrade', 'Repeater infrastructure', 'Interoperability with county agencies'],
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
      populationServed: 1200000,
      coverageArea: 'Austin metro area and Travis County, 712 square miles',
      numberOfStaff: 145,
      currentEquipment: 'Legacy PSAP Positron system (2009), analog-only radio console, no NG911 capability, text-to-911 not supported',
      mainProblems: ['Legacy PSAP system cannot handle NG911 calls', 'No text-to-911 capability', 'Poor interoperability with surrounding counties', 'Critical system reaching end of manufacturer support'],
      fundingPriorities: ['NG911 platform migration', 'CAD system upgrade', 'Multi-agency interoperability', 'Text-to-911 and video-to-911'],
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
      populationServed: 2400000,
      coverageArea: '7,303 square miles, largest county in the contiguous US',
      numberOfStaff: 3200,
      currentEquipment: 'Partial body camera deployment (30% of deputies), 2015-era Axon cameras, limited cloud storage, no real-time data sharing',
      mainProblems: ['Incomplete body camera deployment', 'Outdated evidence management system', 'Community trust and accountability gap', 'Storage costs limiting footage retention'],
      fundingPriorities: ['Full body camera deployment for all 3,200 deputies', 'Evidence management platform', 'Community policing initiative expansion'],
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
      populationServed: 800000,
      coverageArea: '6-county region in upstate New York, rural and semi-urban mix',
      numberOfStaff: 240,
      currentEquipment: 'Aging ALS ambulance fleet (average vehicle age: 9 years), limited Lucas device inventory, outdated cardiac monitors (2013 Zoll E Series)',
      mainProblems: ['Aging ambulance fleet with mechanical reliability issues', 'Insufficient advanced life support equipment', 'Cardiac monitor technology outdated', 'Long transport times in rural areas requiring better equipment'],
      fundingPriorities: ['Lucas device CPR automation systems', 'Cardiac monitor replacement', 'Advanced trauma equipment', 'Fleet replacement'],
      matchCount: 1,
      status: 'active',
      createdBy: admin._id,
    },
    {
      name: 'Austin Police Department',
      email: 'grants@austinpd.gov',
      location: 'Austin, Texas',
      website: 'https://austinpd.gov',
      websiteUrl: 'https://austinpd.gov',
      missionStatement: 'Building a safer community through professional, constitutional policing.',
      focusAreas: ['community policing', 'technology', 'training'],
      agencyTypes: ['law_enforcement'],
      programAreas: ['body cameras', 'training', 'community outreach'],
      budgetRange: '150k_500k',
      timeline: 'urgent',
      populationServed: 978908,
      coverageArea: 'City of Austin, 327 square miles',
      numberOfStaff: 1800,
      currentEquipment: 'Partial body camera deployment (Axon Body 2, 2016), legacy radio system with interoperability gaps, aging CAD system',
      mainProblems: ['Incomplete and outdated body camera program', 'Radio interoperability issues with Travis County', 'Community policing program needs expansion', 'Officer training capacity constraints'],
      fundingPriorities: ['Body camera system upgrade and full deployment', 'Radio interoperability improvement', 'Community policing officer training'],
      matchCount: 3,
      status: 'active',
      createdBy: admin._id,
    },
  ]);

  // Update user with org references
  await User.findByIdAndUpdate(regularUser._id, { organizationId: org1._id });
  await User.findByIdAndUpdate(admin._id, { organizationId: org2._id });

  // Opportunities (8 total — some within 14 days)
  const now = new Date();
  const in5  = new Date(now.getTime() +   5 * 24 * 60 * 60 * 1000);
  const in8  = new Date(now.getTime() +   8 * 24 * 60 * 60 * 1000);
  const in12 = new Date(now.getTime() +  12 * 24 * 60 * 60 * 1000);
  const in25 = new Date(now.getTime() +  25 * 24 * 60 * 60 * 1000);
  const in45 = new Date(now.getTime() +  45 * 24 * 60 * 60 * 1000);
  const in90 = new Date(now.getTime() +  90 * 24 * 60 * 60 * 1000);
  const in120 = new Date(now.getTime() + 120 * 24 * 60 * 60 * 1000);
  const in180 = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);

  const [opp1, opp2, opp3, opp4, opp5, opp6, opp7, opp8] = await Opportunity.insertMany([
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
    {
      title: 'Law Enforcement Body Camera Program',
      funder: 'BJA Justice Programs',
      deadline: in12,
      maxAmount: 200000,
      sourceUrl: 'https://bja.ojp.gov/grants/body-camera',
      keywords: ['body cameras', 'law enforcement', 'accountability', 'Texas', 'California'],
      agencyTypes: ['law_enforcement'],
      description: 'Funding for body-worn camera systems, data storage, and policy implementation for law enforcement agencies.',
      category: 'Law Enforcement',
      status: 'closing',
      createdBy: admin._id,
    },
    {
      title: 'Firefighter Safety and Health Grant',
      funder: 'FEMA SAFER Program',
      deadline: in5,
      maxAmount: 400000,
      sourceUrl: 'https://www.fema.gov/grants/safer',
      keywords: ['firefighter', 'safety', 'staffing', 'PPE', 'California'],
      agencyTypes: ['fire_services'],
      description: 'Grants to help fire departments increase their capacity to respond to emergencies and enhance safety of firefighters.',
      category: 'Fire Services',
      status: 'closing',
      createdBy: admin._id,
    },
    {
      title: 'Emergency Management Resilience Grant',
      funder: 'FEMA BRIC Program',
      deadline: in180,
      maxAmount: 600000,
      sourceUrl: 'https://www.fema.gov/grants/bric',
      keywords: ['resilience', 'emergency management', 'hazard mitigation', 'multi_agency'],
      agencyTypes: ['emergency_management', 'multi_agency'],
      description: 'Building Resilient Infrastructure and Communities — grants for hazard mitigation and emergency management capacity building.',
      category: 'Emergency Management',
      status: 'open',
      createdBy: admin._id,
    },
  ]);

  // Matches with scoring (~15 total)
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
    { org: org5, opp: opp3 },
    { org: org5, opp: opp6 },
    { org: org1, opp: opp7 },
    { org: org2, opp: opp8 },
    { org: org3, opp: opp6 },
    { org: org4, opp: opp8 },
    { org: org5, opp: opp1 },
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

  // Applications (4 total — draft/submitted/in_review/awarded)
  await Application.insertMany([
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
    {
      organization: org4._id,
      opportunity: opp4._id,
      status: 'awarded',
      projectTitle: 'Northeast EMS Trauma Equipment Upgrade',
      projectSummary: 'Replacement of aging ambulance equipment and advanced trauma kits across the Northeast EMS Alliance fleet.',
      communityImpact: 'Improved survival rates for trauma patients across a 6-county region serving 800,000 residents.',
      amountRequested: 120000,
      contactName: 'Director Michael Torres',
      contactEmail: 'mtorres@neems.org',
      timeline: '9 months',
      submittedAt: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000),
    },
  ]);

  // Win records (for the awarded application and historical wins)
  await Win.insertMany([
    {
      agencyType: 'ems',
      fundingType: 'federal',
      projectType: 'equipment',
      funderName: 'HRSA Rural Health Programs',
      awardAmount: 120000,
      problemStatement: 'Northeast EMS Alliance was operating aging ambulance equipment past its service life, with frequent mechanical failures threatening patient care and response reliability across a 6-county rural region.',
      communityImpact: 'Upgraded trauma equipment directly improved survival rates for 800,000 residents across 6 upstate New York counties, reducing critical-incident response times by 22%.',
      proposedSolution: 'Replacement of aging ambulance fleet equipment including Lucas CPR devices, cardiac monitors, and advanced trauma kits across all 12 ambulance units.',
      measurableOutcomes: 'Within 12 months: 100% of ambulances equipped with ALS gear, cardiac monitor replacement complete, average response time reduced from 9.2 to 7.1 minutes.',
      urgency: 'Three ambulance mechanical failures in the prior year resulted in delayed responses. Continued operation of aging equipment posed immediate risk to patient outcomes.',
      budgetSummary: '$120,000 covering 8 Lucas devices, 12 Zoll X Series cardiac monitors, advanced trauma kit replenishment, and installation/training costs.',
      winFactors: ['Clear problem documentation', 'Specific measurable outcomes', 'Rural underserved area', 'Cost-effective per-patient impact', 'Strong prior relationship with HRSA'],
      lessonsLearned: 'Quantifying patient impact per dollar invested significantly strengthened our application. Rural designation was a major differentiator.',
    },
    {
      agencyType: 'fire_services',
      fundingType: 'federal',
      projectType: 'communications',
      funderName: 'DHS Communications Division',
      awardAmount: 215000,
      problemStatement: 'Valley Fire Department\'s aging P25 Phase I radio infrastructure created dangerous dead zones covering 30% of our response area, compromising officer safety and emergency coordination.',
      communityImpact: 'Elimination of radio dead zones improved emergency coordination across 180 square miles serving 250,000 Fresno County residents, with estimated 15% response time improvement.',
      proposedSolution: 'P25 Phase II radio system upgrade including 45 portable radios, 12 mobile units, 3 repeater sites, and interoperability gateway with neighboring agencies.',
      measurableOutcomes: 'Zero dead zones within 12 months, 99.9% coverage across jurisdiction, interoperability established with Fresno PD and County Fire, 15% response time improvement.',
      urgency: 'Two near-miss officer safety incidents due to radio failures in the prior 18 months demonstrated the immediate life-safety risk of delayed action.',
      budgetSummary: '$215,000 covering P25 Phase II portable and mobile radios, repeater infrastructure, interoperability gateway, programming, and 24-month technical support.',
      winFactors: ['Officer safety framing', 'Specific dead zone documentation', 'Interoperability emphasis', 'Regional coordination letters', 'P25 compliance'],
      lessonsLearned: 'Including letters of support from neighboring agencies demonstrating the interoperability commitment was critical. Concrete incident data made the urgency undeniable.',
    },
    {
      agencyType: '911_centers',
      fundingType: 'federal',
      projectType: 'technology',
      funderName: 'FirstNet / AT&T',
      awardAmount: 380000,
      problemStatement: 'Metro 911 Communications Center operated a 2009 legacy PSAP system that could not support NG911 calls, text-to-911, or video calls — leaving 1.2 million Austin metro residents without modern emergency communications.',
      communityImpact: 'NG911 migration enabled text-to-911 for 120,000+ hearing-impaired residents and reduced average call-processing time from 47 to 28 seconds for 1.2M metro residents.',
      proposedSolution: 'Full migration from legacy Positron PSAP to NG911-compliant Motorola PremierOne platform with integrated CAD, text-to-911, video capability, and multi-agency data sharing.',
      measurableOutcomes: 'NG911 migration complete in 18 months, text-to-911 live, call processing time reduced 40%, interoperability with 4 neighboring county PSAPs established.',
      urgency: 'Legacy system manufacturer ended support in 2024. System failure risk was high with no parts or patches available, threatening 24/7 911 service for 1.2 million people.',
      budgetSummary: '$380,000 covering Motorola PremierOne licensing, hardware, installation, data migration, staff training, and 24-month maintenance.',
      winFactors: ['Critical infrastructure framing', 'System-failure risk documentation', 'Accessibility impact (text-to-911)', 'Regional coordination approach', 'Multi-agency letter of support'],
      lessonsLearned: 'End-of-manufacturer-support documentation created unambiguous urgency. The accessibility angle for hearing-impaired community members resonated strongly with reviewers.',
    },
  ]);

  // Agencies
  await Agency.insertMany([
    { name: 'Valley Fire Department', type: 'fire_services', location: 'Fresno, California', grantContactEmail: 'grants@valleyfire.org', matchCount: 3, status: 'active' },
    { name: 'Metro 911 Communications Center', type: '911_centers', location: 'Austin, Texas', grantContactEmail: 'director@metro911.gov', matchCount: 4, status: 'active' },
    { name: 'Riverside County Sheriff Department', type: 'law_enforcement', location: 'Riverside, California', grantContactEmail: 'grants@rcsd.gov', matchCount: 2, status: 'active' },
    { name: 'Northeast EMS Alliance', type: 'ems', location: 'Albany, New York', grantContactEmail: 'admin@neems.org', matchCount: 1, status: 'active' },
    { name: 'Austin Police Department', type: 'law_enforcement', location: 'Austin, Texas', grantContactEmail: 'grants@austinpd.gov', matchCount: 3, status: 'active' },
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
      opportunity: opp7._id,
      user: admin._id,
      orgName: org1.name,
      grantName: opp7.title,
      type: 'deadline',
      priority: 'high',
      message: `URGENT: "Firefighter Safety and Health Grant" closes in 5 days — Valley Fire Department is a strong match.`,
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
      organization: org5._id,
      opportunity: opp6._id,
      user: admin._id,
      orgName: org5.name,
      grantName: opp6.title,
      type: 'deadline',
      priority: 'high',
      message: `Deadline alert: "Law Enforcement Body Camera Program" closes in 12 days — Austin PD is a strong match.`,
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
    {
      recipient: 'grants@austinpd.gov',
      recipientName: 'Austin Police Department',
      subject: 'New Grant Match: Law Enforcement Body Camera Program',
      htmlBody: '<p>Alert email placeholder</p>',
      emailType: 'alert_digest',
      status: 'sent',
      sentAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      relatedOrganization: org5._id,
    },
  ]);

  // Digests (2 total — sent/draft)
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weekEnd = new Date(now);
  const prevWeekStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const prevWeekEnd = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  await Digest.insertMany([
    {
      organization: org2._id,
      user: admin._id,
      orgName: org2.name,
      periodStart: weekStart,
      periodEnd: weekEnd,
      matches: matchDocs.slice(0, 3).map((m) => m._id),
      opportunities: [
        { title: opp2.title, fitScore: 91, amount: opp2.maxAmount, deadline: opp2.deadline },
        { title: opp5.title, fitScore: 88, amount: opp5.maxAmount, deadline: opp5.deadline },
        { title: opp1.title, fitScore: 75, amount: opp1.maxAmount, deadline: opp1.deadline },
      ],
      aiIntro: `Metro 911 Communications Center had a strong week — 3 high-fit grant matches identified. The "Public Safety Technology Modernization Fund" is closing in 8 days and should be your top priority. Your NG911 migration project is an excellent fit for two of this week's top opportunities.`,
      htmlContent: `<h1>Weekly Grant Intelligence — Metro 911</h1><p>3 new high-fit matches this week.</p>`,
      status: 'sent',
      sentAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      itemCount: 3,
    },
    {
      organization: org1._id,
      user: admin._id,
      orgName: org1.name,
      periodStart: prevWeekStart,
      periodEnd: prevWeekEnd,
      matches: matchDocs.slice(3, 6).map((m) => m._id),
      opportunities: [
        { title: opp1.title, fitScore: 83, amount: opp1.maxAmount, deadline: opp1.deadline },
        { title: opp7.title, fitScore: 79, amount: opp7.maxAmount, deadline: opp7.deadline },
      ],
      aiIntro: `Valley Fire Department has 2 strong grant matches this week. The FEMA SAFER Program grant (closes in 5 days!) is an urgent opportunity for your organization. Your staffing and equipment needs align perfectly with the grant criteria.`,
      htmlContent: `<h1>Weekly Grant Intelligence — Valley Fire</h1><p>2 new high-fit matches this week.</p>`,
      status: 'draft',
      itemCount: 2,
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
    Digest.countDocuments(),
    Funder.countDocuments(),
    Win.countDocuments(),
  ]);
  logger.info(`   Orgs: ${counts[0]} | Opps: ${counts[1]} | Matches: ${counts[2]} | Agencies: ${counts[3]} | Alerts: ${counts[4]} | Apps: ${counts[5]} | Outbox: ${counts[6]} | Digests: ${counts[7]} | Funders: ${counts[8]} | Wins: ${counts[9]}`);

  // ─── Seed Funders ───────────────────────────────────────────────────────────
  logger.info('Seeding funders...');
  const adminUser = await User.findOne({ email: 'admin@reddogradios.com' });
  const funders = await Funder.insertMany([
    {
      name: 'FEMA Hazard Mitigation Grant Program',
      website: 'https://www.fema.gov/grants/mitigation',
      contactName: 'Program Manager',
      contactEmail: 'hmgp@fema.dhs.gov',
      missionStatement: 'Reduce loss of life and property by lessening the impact of disasters through hazard mitigation planning and projects.',
      locationFocus: ['National', 'Nationwide'],
      fundingCategories: ['public safety', 'hazard mitigation', 'infrastructure', 'emergency management'],
      agencyTypesFunded: ['law_enforcement', 'fire_services', 'ems', 'emergency_management', '911_centers'],
      avgGrantMin: 50000,
      avgGrantMax: 500000,
      deadline: new Date('2025-09-30'),
      cyclesPerYear: 1,
      pastGrantsAwarded: ['Harris County Emergency Management', 'Seattle Fire Department', 'Chicago OEM'],
      notes: 'Federal program — requires cost-share. Strong fit for communications infrastructure.',
      maxApplicationsAllowed: 5,
      addedBy: adminUser?._id,
      status: 'active',
    },
    {
      name: 'DOJ COPS Technology Program',
      website: 'https://cops.usdoj.gov',
      contactName: 'COPS Office',
      contactEmail: 'askCOPSRC@usdoj.gov',
      missionStatement: 'Advance community policing practices and support law enforcement with technology resources.',
      locationFocus: ['National', 'Nationwide'],
      fundingCategories: ['law enforcement', 'technology', 'communications', 'public safety'],
      agencyTypesFunded: ['law_enforcement', 'sheriff'],
      avgGrantMin: 100000,
      avgGrantMax: 1000000,
      deadline: new Date('2025-11-15'),
      cyclesPerYear: 1,
      pastGrantsAwarded: ['Dallas Police Department', 'LAPD', 'Phoenix PD'],
      notes: 'Best for police agencies seeking technology upgrades including radios and dispatch.',
      maxApplicationsAllowed: 5,
      addedBy: adminUser?._id,
      status: 'active',
    },
    {
      name: 'DHS/FEMA BSIR Grant',
      website: 'https://www.fema.gov/grants',
      contactName: 'Grant Programs Directorate',
      contactEmail: 'askGMD@fema.dhs.gov',
      missionStatement: 'Enhance interoperability and communications capabilities for public safety across the nation.',
      locationFocus: ['National', 'Nationwide'],
      fundingCategories: ['public safety', 'communications', 'interoperability', 'technology'],
      agencyTypesFunded: ['law_enforcement', 'fire_services', 'ems', '911_centers', 'emergency_management'],
      avgGrantMin: 250000,
      avgGrantMax: 2000000,
      deadline: new Date('2025-10-01'),
      cyclesPerYear: 1,
      pastGrantsAwarded: ['Texas DPS', 'California OES', 'New York State Police'],
      notes: 'Largest communications-specific federal grant. Highly competitive but excellent for comms upgrades.',
      maxApplicationsAllowed: 5,
      addedBy: adminUser?._id,
      status: 'active',
    },
    {
      name: 'Motorola Solutions Foundation',
      website: 'https://www.motorolasolutions.com/foundation',
      contactName: 'Foundation Team',
      contactEmail: 'foundation@motorolasolutions.com',
      missionStatement: 'Support public safety technology innovation and community resilience through technology grants.',
      locationFocus: ['National', 'Regional'],
      fundingCategories: ['technology', 'public safety', 'communications', 'innovation'],
      agencyTypesFunded: ['law_enforcement', 'fire_services', 'ems', '911_centers'],
      avgGrantMin: 25000,
      avgGrantMax: 100000,
      deadline: new Date('2025-08-31'),
      cyclesPerYear: 2,
      pastGrantsAwarded: ['Austin Fire Department', 'Tampa PD', 'Denver EMS'],
      notes: 'Private foundation. Strong relationship builder. Apply 6 weeks before deadline.',
      maxApplicationsAllowed: 5,
      addedBy: adminUser?._id,
      status: 'active',
    },
    {
      name: 'Texas Governor\'s Division of Emergency Management',
      website: 'https://tdem.texas.gov',
      contactName: 'TDEM Grants',
      contactEmail: 'grants@tdem.texas.gov',
      missionStatement: 'Strengthen emergency preparedness and communications across Texas communities.',
      locationFocus: ['Texas'],
      fundingCategories: ['emergency management', 'public safety', 'communications', 'infrastructure'],
      agencyTypesFunded: ['law_enforcement', 'fire_services', 'ems', 'emergency_management', '911_centers'],
      avgGrantMin: 50000,
      avgGrantMax: 500000,
      deadline: new Date('2025-12-01'),
      cyclesPerYear: 1,
      pastGrantsAwarded: ['Houston OEM', 'Bexar County SO', 'Fort Worth FD'],
      notes: 'Texas-only. Excellent for Texas agencies. Requires matching funds.',
      maxApplicationsAllowed: 5,
      addedBy: adminUser?._id,
      status: 'active',
    },
    {
      name: 'AT&T Foundation FirstNet Grant',
      website: 'https://about.att.com/pages/foundation',
      contactName: 'FirstNet Team',
      contactEmail: 'firstnet@att.com',
      missionStatement: 'Support first responder communications and connectivity across the United States.',
      locationFocus: ['National', 'Nationwide'],
      fundingCategories: ['communications', 'technology', 'public safety', 'connectivity'],
      agencyTypesFunded: ['law_enforcement', 'fire_services', 'ems', '911_centers', 'emergency_management'],
      avgGrantMin: 25000,
      avgGrantMax: 150000,
      deadline: null,
      cyclesPerYear: 2,
      pastGrantsAwarded: ['Montgomery County 911', 'Miami-Dade Fire', 'Seattle PD'],
      notes: 'Rolling deadline. First responder focused. Great for broadband and radio projects.',
      maxApplicationsAllowed: 5,
      addedBy: adminUser?._id,
      status: 'active',
    },
    {
      name: 'Walmart Foundation Community Safety Grant',
      website: 'https://walmart.org',
      contactName: 'Community Programs',
      contactEmail: 'foundation@walmart.com',
      missionStatement: 'Build stronger, safer communities through local safety initiatives and partnerships.',
      locationFocus: ['Regional', 'Texas', 'California', 'National'],
      fundingCategories: ['community', 'public safety', 'community resilience'],
      agencyTypesFunded: ['law_enforcement', 'fire_services', 'ems'],
      avgGrantMin: 10000,
      avgGrantMax: 50000,
      deadline: new Date('2025-07-31'),
      cyclesPerYear: 2,
      pastGrantsAwarded: ['Bentonville PD', 'Rogers Fire Department'],
      notes: 'Smaller grant but less competitive. Good for equipment needs under $50k.',
      maxApplicationsAllowed: 5,
      addedBy: adminUser?._id,
      status: 'active',
    },
    {
      name: 'Community Foundation Safety Initiative',
      website: 'https://communityfoundation.org',
      contactName: 'Safety Programs Director',
      contactEmail: 'safety@cfoundation.org',
      missionStatement: 'Partner with local agencies to create resilient and safe communities across Texas.',
      locationFocus: ['Texas'],
      fundingCategories: ['community', 'public safety', 'community resilience', 'local government'],
      agencyTypesFunded: ['law_enforcement', 'fire_services', 'ems', 'emergency_management'],
      avgGrantMin: 5000,
      avgGrantMax: 25000,
      deadline: new Date('2025-09-15'),
      cyclesPerYear: 3,
      pastGrantsAwarded: ['Pflugerville PD', 'Kyle Fire Department'],
      notes: 'Smaller grants but easy to apply and quick turnaround. Great for smaller Texas agencies.',
      maxApplicationsAllowed: 5,
      addedBy: adminUser?._id,
      status: 'active',
    },
  ]);
  logger.info(`   Created ${funders.length} funders`);

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  logger.error('Seed failed:', err.message);
  process.exit(1);
});
