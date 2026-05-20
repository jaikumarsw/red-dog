/**
 * One-off script: recompute all match scores using the updated pipeline
 * (rubric scores, embedding similarity, display discount, win probability).
 *
 * Usage: node scripts/recompute-matches.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/reddog_db';

async function main() {
  console.log('[Recompute] Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('[Recompute] Connected.');

  const Organization = require('../src/modules/organizations/organization.schema');
  const matchService = require('../src/modules/matches/match.service');

  const orgs = await Organization.find({ status: 'active' }).lean();
  console.log(`[Recompute] Found ${orgs.length} active organizations.`);

  let success = 0;
  let failed = 0;

  for (const org of orgs) {
    process.stdout.write(`  → ${org.name || org._id} ... `);
    try {
      const result = await matchService.computeAllForOrganization(org._id);
      process.stdout.write(`done (${result.processed} matches)\n`);
      success++;
    } catch (err) {
      process.stdout.write(`FAILED: ${err.message}\n`);
      failed++;
    }
  }

  console.log(`\n[Recompute] Complete — ${success} orgs OK, ${failed} failed.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('[Recompute] Fatal error:', err);
  process.exit(1);
});
