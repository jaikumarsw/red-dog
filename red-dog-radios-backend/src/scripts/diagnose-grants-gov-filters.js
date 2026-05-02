/**
 * Diagnostic script — probes Simpler.Grants.gov API filter syntax.
 * Run: node src/scripts/diagnose-grants-gov-filters.js
 * No DB writes. No normalizer. No scorer.
 */

require('dotenv').config();
const { searchOpportunities } = require('../modules/scraping/grants-gov/client');

if (!process.env.SIMPLER_GRANTS_API_KEY) {
  console.error('❌  SIMPLER_GRANTS_API_KEY not set in .env — aborting.');
  process.exit(1);
}

const BASE_PAGINATION = {
  page_offset: 1,
  page_size: 5,
  sort_order: [{ order_by: 'post_date', sort_direction: 'descending' }],
};

function printRecord(rec, includeDescription = false) {
  const summary = rec.summary || {};
  console.log(`  title:             ${rec.opportunity_title || summary.opportunity_title || '(none)'}`);
  console.log(`  agency_name:       ${rec.agency_name || summary.agency_name || '(none)'}`);
  console.log(`  opportunity_status:${rec.opportunity_status || '(none)'}`);
  console.log(`  post_date:         ${rec.post_date || summary.post_date || '(none)'}`);
  console.log(`  close_date:        ${rec.close_date || summary.close_date || '(none)'}`);
  if (includeDescription) {
    const desc = summary.summary_description || rec.summary_description || '(none)';
    console.log(`  summary_description (first 200): ${String(desc).slice(0, 200)}`);
  }
}

function printDivider(label) {
  console.log('\n' + '═'.repeat(70));
  console.log(`  ${label}`);
  console.log('═'.repeat(70));
}

function printSubDivider() {
  console.log('  ' + '─'.repeat(50));
}

(async () => {
  // ─────────────────────────────────────────────────────────────────────────
  // TEST A — No filters, sorted by post_date desc, page 1, size 5
  // ─────────────────────────────────────────────────────────────────────────
  printDivider('TEST A — No filters, sort by post_date desc, size 5');
  console.log('  Purpose: confirm API is reachable and pagination shape\n');

  try {
    const resultA = await searchOpportunities({
      page: 1,
      pageSize: 5,
      filters: {},
    });

    const recordsA = resultA?.data || [];
    const paginationA = resultA?.pagination_info || resultA?.pagination || {};

    console.log(`  HTTP OK. Records returned: ${recordsA.length}`);
    console.log(`  Pagination info: ${JSON.stringify(paginationA)}\n`);

    recordsA.forEach((rec, i) => {
      console.log(`  [${i + 1}]`);
      printRecord(rec);
      printSubDivider();
    });

    if (recordsA.length > 0) {
      console.log('\n  Full shape of record[0] (first 1500 chars):');
      console.log(JSON.stringify(recordsA[0], null, 2).slice(0, 1500));
    }
  } catch (err) {
    console.error(`  ❌ TEST A FAILED: ${err.message}`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TEST B — Filter by opportunity_status = posted
  // ─────────────────────────────────────────────────────────────────────────
  printDivider('TEST B — Filter: opportunity_status = posted');
  console.log('  Purpose: confirm { opportunity_status: { one_of: ["posted"] } } is valid\n');

  try {
    const resultB = await searchOpportunities({
      page: 1,
      pageSize: 5,
      filters: {
        opportunity_status: { one_of: ['posted'] },
      },
    });

    const recordsB = resultB?.data || [];
    const paginationB = resultB?.pagination_info || resultB?.pagination || {};

    console.log(`  HTTP OK. Records returned: ${recordsB.length}`);
    console.log(`  Pagination info: ${JSON.stringify(paginationB)}\n`);

    recordsB.forEach((rec, i) => {
      const status = rec.opportunity_status || '(none)';
      const statusOk = status.toLowerCase() === 'posted' ? '✅' : '⚠️ ';
      console.log(`  [${i + 1}] ${statusOk}`);
      printRecord(rec);
      printSubDivider();
    });

    const allPosted = recordsB.every(
      (r) => (r.opportunity_status || '').toLowerCase() === 'posted'
    );
    console.log(`\n  All records status=posted? ${allPosted ? '✅ YES' : '❌ NO — check filter syntax'}`);

    if (recordsB.length > 0) {
      console.log('\n  Full shape of record[0] (first 1500 chars):');
      console.log(JSON.stringify(recordsB[0], null, 2).slice(0, 1500));
    }
  } catch (err) {
    console.error(`  ❌ TEST B FAILED: ${err.message}`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TEST C — Filter by funding_categories (disaster_prevention_and_relief)
  //          combined with opportunity_status = posted
  // ─────────────────────────────────────────────────────────────────────────
  printDivider('TEST C — Filter: funding_categories = disaster_prevention_and_relief + posted');
  console.log('  Purpose: confirm funding_categories filter works; check category values\n');

  try {
    const resultC = await searchOpportunities({
      page: 1,
      pageSize: 5,
      filters: {
        opportunity_status: { one_of: ['posted'] },
        funding_categories: { one_of: ['disaster_prevention_and_relief'] },
      },
    });

    const recordsC = resultC?.data || [];
    const paginationC = resultC?.pagination_info || resultC?.pagination || {};

    console.log(`  HTTP OK. Records returned: ${recordsC.length}`);
    console.log(`  Pagination info: ${JSON.stringify(paginationC)}\n`);

    if (recordsC.length === 0) {
      console.log('  ⚠️  Zero results — category value may be wrong or no current matches.');
      console.log('  Try rerunning with different category values (see full record shape from TEST A).');
    }

    recordsC.forEach((rec, i) => {
      const cats = (rec.funding_categories || rec.summary?.funding_categories || []).join(', ') || '(none)';
      console.log(`  [${i + 1}] funding_categories: ${cats}`);
      printRecord(rec);
      printSubDivider();
    });

    if (recordsC.length > 0) {
      console.log('\n  Full shape of record[0] (first 1500 chars):');
      console.log(JSON.stringify(recordsC[0], null, 2).slice(0, 1500));
    }
  } catch (err) {
    console.error(`  ❌ TEST C FAILED: ${err.message}`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TEST D — Keyword search via top-level `query` field
  // ─────────────────────────────────────────────────────────────────────────
  printDivider('TEST D — Keyword search: query="firefighter" + posted');
  console.log('  Purpose: determine whether the API supports free-text search\n');

  try {
    // searchOpportunities passes our body directly to the /search endpoint.
    // We call the client's underlying request function by constructing the
    // same shape manually — but searchOpportunities only exposes filters.
    // Instead, call it with a filter approach that adds `query` at top-level.
    // The client sends: { pagination, filters } — we need to inject `query`.
    // Workaround: pass `query` inside filters and note whether it errors.

    // First attempt: query as a top-level field via a direct fetch call
    // (bypassing searchOpportunities so we can control the full body shape).
    const apiKey = process.env.SIMPLER_GRANTS_API_KEY;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    let resultD;

    try {
      const res = await fetch('https://api.simpler.grants.gov/v1/opportunities/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
          'User-Agent': 'RedDogGrantIntelligence/1.0',
        },
        body: JSON.stringify({
          pagination: {
            page_offset: 1,
            page_size: 5,
            sort_order: [{ order_by: 'post_date', sort_direction: 'descending' }],
          },
          query: 'firefighter',
          filters: {
            opportunity_status: { one_of: ['posted'] },
          },
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      resultD = await res.json();
      console.log(`  HTTP status: ${res.status}`);
    } catch (fetchErr) {
      clearTimeout(timeout);
      throw fetchErr;
    }

    const recordsD = resultD?.data || [];
    const paginationD = resultD?.pagination_info || resultD?.pagination || {};

    if (resultD?.errors || resultD?.error) {
      console.log(`  ⚠️  API returned an error object — query field may not be supported`);
      console.log(`  Error: ${JSON.stringify(resultD.errors || resultD.error)}`);
    } else {
      console.log(`  Records returned: ${recordsD.length}`);
      console.log(`  Pagination info: ${JSON.stringify(paginationD)}\n`);
    }

    recordsD.forEach((rec, i) => {
      console.log(`  [${i + 1}]`);
      printRecord(rec, true);
      printSubDivider();
    });

    if (recordsD.length > 0) {
      console.log('\n  Full shape of record[0] (first 1500 chars):');
      console.log(JSON.stringify(recordsD[0], null, 2).slice(0, 1500));
    }
  } catch (err) {
    console.error(`  ❌ TEST D FAILED: ${err.message}`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  printDivider('DIAGNOSTICS COMPLETE');
  console.log('  No DB writes were performed.\n');
  process.exit(0);
})();
