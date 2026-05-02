require('dotenv').config();
const { searchOpportunities } = require('../modules/scraping/grants-gov/client');
const { normalize } = require('../modules/scraping/grants-gov/normalizer');

(async () => {
  try {
    if (!process.env.SIMPLER_GRANTS_API_KEY) {
      console.error('❌  SIMPLER_GRANTS_API_KEY not set in .env');
      process.exit(1);
    }

    const result = await searchOpportunities({
      page: 1,
      pageSize: 3,
      filters: { opportunity_status: { one_of: ['posted'] } },
      sortOrder: [{ order_by: 'post_date', sort_direction: 'descending' }],
    });

    const records = result?.data || [];
    console.log(`Fetched ${records.length} record(s)\n`);

    for (let i = 0; i < records.length; i++) {
      const rec = records[i];
      console.log(`${'─'.repeat(70)}`);
      console.log(`RECORD ${i + 1} of ${records.length}  (opportunity_id: ${rec.opportunity_id})`);
      console.log(`${'─'.repeat(70)}\n`);

      // RAW summary keys
      console.log('=== RAW summary keys ===');
      const summaryKeys = Object.keys(rec.summary || {}).sort();
      console.log(summaryKeys.length ? summaryKeys.join(', ') : '(no summary object)');

      // RAW summary.summary_description
      console.log('\n=== RAW summary.summary_description (first 400 chars) ===');
      console.log(rec.summary?.summary_description?.slice(0, 400) || '(empty)');

      // NORMALIZED
      console.log('\n=== NORMALIZED ===');
      try {
        const n = normalize(rec);
        console.log(`title:              ${n.title}`);
        console.log(`funder:             ${n.funder}`);
        console.log(`description:        ${n.description ? String(n.description).slice(0, 400) : '(empty)'}`);
        console.log(`keywords:           ${(n.keywords || []).join(', ') || '(none)'}`);
        console.log(`eligibleApplicants: ${(n.eligibleApplicants || []).slice(0, 5).join(', ') || '(none)'}`);
        console.log(`minAmount:          ${n.minAmount ?? '(null)'}`);
        console.log(`maxAmount:          ${n.maxAmount ?? '(null)'}`);
        console.log(`cfdaNumbers:        ${(n.cfdaNumbers || []).join(', ') || '(none)'}`);
      } catch (normErr) {
        console.error(`normalize() threw: ${normErr.message}`);
        console.error(normErr.stack);
      }

      console.log('');
    }

    console.log('─'.repeat(70));
    console.log('Done. No DB writes performed.');
    process.exit(0);
  } catch (err) {
    console.error('❌  Script failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
})();
