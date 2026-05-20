/**
 * Temporary verification script — run after applying scoring fixes.
 * Loads one fire dept and one EMS org, scores all opportunities, and
 * prints before/after-style counts so you can confirm the fixes work.
 * DELETE this file when verification is complete.
 *
 * Usage:
 *   node test-matching.js
 */

'use strict';

require('dotenv').config({ path: '.env' });

const mongoose = require('mongoose');
const Organization = require('./src/modules/organizations/organization.schema');
const Opportunity = require('./src/modules/opportunities/opportunity.schema');
const { computeMatchScore } = require('./src/modules/matches/match.service');

const OFF_DOMAIN_FUNDERS = ['nih', 'cdc', 'nsf', 'national science foundation',
  'national institutes of health', 'centers for disease control', 'department of education'];

async function run() {
  await mongoose.connect(process.env.MONGO_URI || process.env.DATABASE_URL);
  console.log('Connected to DB\n');

  // Load one fire dept and one EMS org
  const fireDept = await Organization.findOne({
    agencyTypes: { $in: ['fire_services', 'fire-services', 'fire'] },
    status: 'active',
  }).lean();

  const emsDept = await Organization.findOne({
    agencyTypes: { $in: ['ems'] },
    status: 'active',
  }).lean();

  if (!fireDept) { console.error('No active fire dept org found'); process.exit(1); }
  if (!emsDept)  { console.error('No active EMS org found');       process.exit(1); }

  const opportunities = await Opportunity.find({ status: { $in: ['open', 'closing'] } }).lean();
  console.log(`Total opportunities to score: ${opportunities.length}\n`);

  for (const [label, org] of [['FIRE DEPT', fireDept], ['EMS', emsDept]]) {
    console.log(`${'='.repeat(60)}`);
    console.log(`${label}: ${org.name}`);
    console.log(`${'='.repeat(60)}`);

    const results = opportunities.map((opp) => {
      const scored = computeMatchScore(org, opp);
      return { opp, scored };
    });

    const relevant = results.filter((r) => r.scored.isRelevant);
    console.log(`Total scored:   ${results.length}`);
    console.log(`isRelevant=true: ${relevant.length}`);

    const top10 = relevant
      .sort((a, b) => b.scored.fitScore - a.scored.fitScore)
      .slice(0, 10);

    console.log('\nTop 10 relevant grants:');
    top10.forEach(({ opp, scored }, i) => {
      console.log(
        `  ${i + 1}. [${scored.fitScore}pts, overlap=${scored.thematicOverlap}] ` +
        `${(opp.title || '').slice(0, 60)} — ${opp.funder || 'unknown'}`
      );
    });

    const offDomain = relevant.filter(({ opp }) => {
      const funder = String(opp.funder || '').toLowerCase();
      return OFF_DOMAIN_FUNDERS.some((f) => funder.includes(f));
    });
    console.log(`\nOff-domain (CDC/NIH/NSF/edu) grants marked relevant: ${offDomain.length} (should be 0 or near-0)`);
    if (offDomain.length > 0) {
      offDomain.forEach(({ opp, scored }) => {
        console.log(`  !! [${scored.fitScore}pts] ${opp.title} — ${opp.funder}`);
      });
    }
    console.log();
  }

  await mongoose.disconnect();
}

run().catch((err) => { console.error(err); process.exit(1); });
