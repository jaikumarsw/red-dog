const mongoose = require('mongoose');
const { loadEnv } = require('./loadEnv');

async function main() {
  loadEnv();

  const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/reddog_db';
  // eslint-disable-next-line no-console
  console.log('[e2e:teardown] Connecting to MongoDB:', MONGO_URI);

  await mongoose.connect(MONGO_URI);
  // eslint-disable-next-line no-console
  console.log('[e2e:teardown] Connected. Deleting data…');

  // Keep teardown aligned with src/utils/seed.js clear list.
  // eslint-disable-next-line global-require
  const User = require('../../src/modules/auth/user.schema');
  // eslint-disable-next-line global-require
  const Organization = require('../../src/modules/organizations/organization.schema');
  // eslint-disable-next-line global-require
  const Opportunity = require('../../src/modules/opportunities/opportunity.schema');
  // eslint-disable-next-line global-require
  const Match = require('../../src/modules/matches/match.schema');
  // eslint-disable-next-line global-require
  const Agency = require('../../src/modules/agencies/agency.schema');
  // eslint-disable-next-line global-require
  const Alert = require('../../src/modules/alerts/alert.schema');
  // eslint-disable-next-line global-require
  const Application = require('../../src/modules/applications/application.schema');
  // eslint-disable-next-line global-require
  const Outbox = require('../../src/modules/outbox/outbox.schema');
  // eslint-disable-next-line global-require
  const Digest = require('../../src/modules/digests/digest.schema');
  // eslint-disable-next-line global-require
  const Funder = require('../../src/modules/funders/funder.schema');
  // eslint-disable-next-line global-require
  const Win = require('../../src/modules/wins/win.schema');
  // eslint-disable-next-line global-require
  const Coupon = require('../../src/modules/coupons/coupon.schema');
  // eslint-disable-next-line global-require
  const Reply = require('../../src/modules/replies/reply.schema');
  // eslint-disable-next-line global-require
  const FollowUp = require('../../src/modules/followups/followup.schema');

  const results = await Promise.all([
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
    Coupon.deleteMany({}),
    Reply.deleteMany({}),
    FollowUp.deleteMany({}),
  ]);

  const names = [
    'User',
    'Organization',
    'Opportunity',
    'Match',
    'Agency',
    'Alert',
    'Application',
    'Outbox',
    'Digest',
    'Funder',
    'Win',
    'Coupon',
    'Reply',
    'FollowUp',
  ];

  // eslint-disable-next-line no-console
  console.log(
    '[e2e:teardown] Deleted:',
    names.map((n, i) => `${n}=${results[i]?.deletedCount ?? '—'}`).join(' ')
  );

  await mongoose.disconnect();
  // eslint-disable-next-line no-console
  console.log('[e2e:teardown] Done');
  process.exit(0);
}

main().catch(async (err) => {
  // eslint-disable-next-line no-console
  console.error('[e2e:teardown] Failed:', err?.message || err);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});

