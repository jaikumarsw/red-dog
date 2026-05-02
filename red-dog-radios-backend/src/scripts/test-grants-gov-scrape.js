/**
 * Smoke test for the Grants.gov ingestion pipeline.
 *
 * Run with:  node src/scripts/test-grants-gov-scrape.js
 *
 * What it does:
 *   1. Connects to MongoDB
 *   2. Fetches ONE page of 5 opportunities from Simpler.Grants.gov
 *   3. Normalizes each, scores them, prints results
 *   4. Does NOT write to DB
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { searchOpportunities } = require('../modules/scraping/grants-gov/client');
const { normalize } = require('../modules/scraping/grants-gov/normalizer');
const { scoreOpportunity, shouldIngest, MIN_SCORE_TO_INGEST } = require('../modules/scraping/grants-gov/public-safety-score');

(async () => {
  try {
    if (!process.env.SIMPLER_GRANTS_API_KEY) {
      console.error('❌ SIMPLER_GRANTS_API_KEY not set in .env');
      process.exit(1);
    }

    console.log(`Min public safety score to ingest: ${MIN_SCORE_TO_INGEST}\n`);
    console.log('Fetching 5 opportunities from Simpler.Grants.gov...\n');

    const result = await searchOpportunities({
      page: 1,
      pageSize: 5,
      filters: { opportunity_status: { one_of: ['posted'] } },
      sortOrder: [{ order_by: 'post_date', sort_direction: 'descending' }],
    });
    const records = result?.data || [];
    console.log(`Got ${records.length} records\n`);

    for (const rec of records) {
      console.log('─'.repeat(60));
      try {
        const normalized = normalize(rec);
        const { score, matched } = scoreOpportunity({
          title: normalized.title,
          funder: normalized.funder,
          description: normalized.description,
          fundingCategories: normalized.keywords,
          eligibleApplicants: normalized.eligibleApplicants,
        });
        console.log(`Title: ${normalized.title}`);
        console.log(`Funder: ${normalized.funder}`);
        console.log(`Status: ${normalized.status}`);
        console.log(`Deadline: ${normalized.deadline}`);
        console.log(`Award range: ${normalized.minAmount} - ${normalized.maxAmount}`);
        console.log(`Categories: ${(normalized.keywords || []).join(', ')}`);
        console.log(`Eligible: ${(normalized.eligibleApplicants || []).join(', ')}`);
        console.log(`PublicSafetyScore: ${score} (matched: ${matched.join(', ') || 'none'})`);
        console.log(`Would ingest: ${shouldIngest(score) ? '✅ YES' : '❌ NO (below threshold)'}`);
      } catch (err) {
        console.log(`❌ Normalization failed: ${err.message}`);
      }
    }

    console.log('\n' + '─'.repeat(60));
    console.log('✅ Smoke test complete. No DB writes performed.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Smoke test failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
})();
