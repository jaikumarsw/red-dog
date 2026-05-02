require('dotenv').config();
const mongoose = require('mongoose');
const Application = require('../modules/applications/application.schema');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const duplicates = await Application.aggregate([
    {
      $match: {
        opportunity: { $exists: true, $ne: null },
        status: { $nin: ['denied', 'rejected'] },
      },
    },
    {
      $group: {
        _id: {
          organization: '$organization',
          opportunity: '$opportunity',
        },
        count: { $sum: 1 },
        ids: { $push: '$_id' },
        statuses: { $push: '$status' },
        dates: { $push: '$createdAt' },
      },
    },
    {
      $match: { count: { $gt: 1 } },
    },
  ]);

  if (duplicates.length === 0) {
    console.log('✅ No duplicates found');
  } else {
    console.log(`⚠️  Found ${duplicates.length} duplicate group(s):\n`);
    duplicates.forEach((d, i) => {
      console.log(`[${i + 1}]`, {
        organization: String(d._id.organization),
        opportunity: String(d._id.opportunity),
        count: d.count,
        applicationIds: d.ids.map(String),
        statuses: d.statuses,
        dates: d.dates,
      });
    });
  }

  await mongoose.disconnect();
  process.exit(0);
})();
