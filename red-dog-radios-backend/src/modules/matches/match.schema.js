const mongoose = require('mongoose');
const mongoosePaginateV2 = require('mongoose-paginate-v2');

const matchSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    opportunity: { type: mongoose.Schema.Types.ObjectId, ref: 'Opportunity', required: true },
    fitScore: { type: Number, min: 0, max: 100, default: 0 },
    reasons: [{ type: String }],
    fitReasons: [{ type: String }],
    disqualifiers: [{ type: String }],
    recommendedAction: { type: String },
    state: { type: String },
    breakdown: {
      agencyType: { type: Number, default: 0 },
      geography: { type: Number, default: 0 },
      programKeyword: { type: Number, default: 0 },
      deadlineViability: { type: Number, default: 0 },
      awardSizeFit: { type: Number, default: 0 },
      timelineAlignment: { type: Number, default: 0 },
      dataCompleteness: { type: Number, default: 0 },
    },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    scoreVersion: { type: String, default: 'v2' },
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

matchSchema.index({ organization: 1, opportunity: 1 }, { unique: true });
matchSchema.plugin(mongoosePaginateV2);

module.exports = mongoose.model('Match', matchSchema);
