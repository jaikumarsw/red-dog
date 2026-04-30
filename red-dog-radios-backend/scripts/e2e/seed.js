const path = require('path');
const { loadEnv } = require('./loadEnv');

async function main() {
  loadEnv();

  // eslint-disable-next-line no-console
  console.log('[e2e:seed] Starting seed');

  // Reuse the canonical seed logic (clears collections, seeds funders/opps, creates admin + test agency, upserts coupon)
  const seedPath = path.resolve(__dirname, '..', '..', 'src', 'utils', 'seed.js');
  // eslint-disable-next-line global-require, import/no-dynamic-require
  require(seedPath);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[e2e:seed] Failed:', err?.message || err);
  process.exit(1);
});

