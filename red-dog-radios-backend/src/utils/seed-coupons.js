require('dotenv').config();
const mongoose = require('mongoose');
const Coupon = require('../modules/coupons/coupon.schema');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/reddog_db';

(async () => {
  try {
    await mongoose.connect(MONGO_URI);
    await Coupon.findOneAndUpdate(
      { code: 'BETA2026' },
      {
        $set: {
          code: 'BETA2026',
          description: 'Beta tester access — bypasses paywall for fire chiefs',
          grantFullAccess: true,
          maxUses: 50,
          isActive: true,
          expiresAt: new Date('2026-12-31T23:59:59.000Z'),
        },
        $setOnInsert: { currentUses: 0 },
      },
      { upsert: true, new: true }
    );
    console.log('✅ BETA2026 coupon upserted');
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
  process.exit(0);
})();