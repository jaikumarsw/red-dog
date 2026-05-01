'use strict';

/**
 * seed-opportunity-contacts.js
 *
 * Upserts contactEmail, contactName, and applicationUrl onto the 14 existing
 * seeded opportunities. Safe to run multiple times.
 *
 * Usage:
 *   node src/utils/seed-opportunity-contacts.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Opportunity = require('../modules/opportunities/opportunity.schema');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/reddog_db';

const contacts = [
  {
    match: /FEMA AFG|Assistance to Firefighters Grant/i,
    data: {
      contactEmail: 'firegrants@fema.dhs.gov',
      contactName: 'AFG Program Office',
      applicationUrl: 'https://www.grants.gov/search-grants?cfda=97.044',
    },
  },
  {
    match: /FEMA SAFER|Staffing for Adequate Fire/i,
    data: {
      contactEmail: 'firegrants@fema.dhs.gov',
      contactName: 'SAFER Program Office',
      applicationUrl: 'https://www.grants.gov/search-grants?cfda=97.083',
    },
  },
  {
    match: /COPS Office|Community Policing Development/i,
    data: {
      contactEmail: 'askCOPSRC@usdoj.gov',
      contactName: 'COPS Office',
      applicationUrl: 'https://cops.usdoj.gov/grants',
    },
  },
  {
    match: /Byrne JAG|Justice Assistance Grant/i,
    data: {
      contactEmail: 'askBJA@usdoj.gov',
      contactName: 'Bureau of Justice Assistance',
      applicationUrl: 'https://bja.ojp.gov/funding/opportunities',
    },
  },
  {
    match: /DHS SHSP|State Homeland Security Program/i,
    data: {
      contactEmail: 'askcsid@hq.dhs.gov',
      contactName: 'DHS Grants Program',
      applicationUrl: 'https://www.fema.gov/grants/preparedness/state-homeland-security',
    },
  },
  {
    match: /DHS UASI|Urban Area Security Initiative/i,
    data: {
      contactEmail: 'askcsid@hq.dhs.gov',
      contactName: 'DHS Grants Program',
      applicationUrl: 'https://www.fema.gov/grants/preparedness/urban-areas-security',
    },
  },
  {
    match: /NTIA|Public Safety Broadband/i,
    data: {
      contactEmail: 'ntia.bead@ntia.gov',
      contactName: 'NTIA Programs',
      applicationUrl: 'https://www.ntia.gov/funding-opportunities',
    },
  },
  {
    match: /DOT|Highway Safety Fleet/i,
    data: {
      contactEmail: 'nhtsa.grants@dot.gov',
      contactName: 'NHTSA Grants Division',
      applicationUrl: 'https://www.nhtsa.gov/highway-safety-grants',
    },
  },
  {
    match: /Motorola Solutions Foundation|Public Safety Technology Grant/i,
    data: {
      contactEmail: 'foundation@motorolasolutions.com',
      contactName: 'Foundation Team',
      applicationUrl: 'https://www.motorolasolutions.com/en_us/about/company-overview/corporate-responsibility/motorola-solutions-foundation.html',
    },
  },
  {
    match: /Firehouse Subs|Life-Saving Equipment Grant/i,
    data: {
      contactEmail: 'foundation@firehousesubs.com',
      contactName: 'Public Safety Foundation',
      applicationUrl: 'https://firehousesubsfoundation.org/apply',
    },
  },
  {
    match: /Gary Sinise|First Responder Support Grant/i,
    data: {
      contactEmail: 'info@garysinisefoundation.org',
      contactName: 'Programs Team',
      applicationUrl: 'https://www.garysinisefoundation.org/apply',
    },
  },
  {
    match: /Walmart Foundation|Community Safety and Emergency Response/i,
    data: {
      contactEmail: 'walmartfoundation@wal-mart.com',
      contactName: 'Walmart Foundation',
      applicationUrl: 'https://walmart.org/how-we-give/local-community-grants',
    },
  },
  {
    // Matches both Colorado DHSEM and Colorado DPS opportunities
    match: /Colorado DHSEM|Interoperable Communications Equipment/i,
    data: {
      contactEmail: 'dhsem_grants@state.co.us',
      contactName: 'Colorado DHSEM Grants',
      applicationUrl: 'https://dhsem.colorado.gov/grants-management',
    },
  },
  {
    match: /Colorado DPS|Public Safety Equipment and Communications/i,
    data: {
      contactEmail: 'dhsem_grants@state.co.us',
      contactName: 'Colorado DHSEM Grants',
      applicationUrl: 'https://dhsem.colorado.gov/grants-management',
    },
  },
];

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');

  let updated = 0;
  let notFound = 0;

  for (const { match, data } of contacts) {
    const result = await Opportunity.updateOne(
      { title: { $regex: match } },
      { $set: data }
    );

    if (result.matchedCount === 0) {
      console.warn(`⚠️  No opportunity matched: ${match}`);
      notFound += 1;
    } else {
      const opp = await Opportunity.findOne({ title: { $regex: match } }).select('title contactEmail');
      console.log(`✅ Updated: "${opp?.title}" → ${data.contactEmail}`);
      updated += 1;
    }
  }

  console.log('');
  console.log(`===================================`);
  console.log(`Updated:   ${updated} opportunities`);
  console.log(`Not found: ${notFound} opportunities`);
  console.log(`===================================`);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
