const mongoose = require('mongoose');
const mongoosePaginateV2 = require('mongoose-paginate-v2');

const matchSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    opportunity: { type: mongoose.Schema.Types.ObjectId, ref: 'Opportunity', required: true },
    fitScore: { type: Number, min: 0, max: 100, default: 0 },
    // Original rule-based eligibility score (type match + geography + keywords + deadline etc.)
    // fitScore above is overwritten with rubricScores.normalizedScore for consistent display.
    rawFitScore: { type: Number, min: 0, max: 100, default: 0 },
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
    rubricScores: {
      needScore: { type: Number, min: 0, max: 25, default: 0 },
      projectDesignScore: { type: Number, min: 0, max: 25, default: 0 },
      budgetScore: { type: Number, min: 0, max: 15, default: 0 },
      capacityScore: { type: Number, min: 0, max: 15, default: 0 },
      impactScore: { type: Number, min: 0, max: 20, default: 0 },
      evaluationScore: { type: Number, min: 0, max: 10, default: 0 },
      sustainabilityScore: { type: Number, min: 0, max: 10, default: 0 },
      alignmentScore: { type: Number, min: 0, max: 15, default: 0 },
      totalScore: { type: Number, min: 0, max: 135, default: 0 },
      normalizedScore: { type: Number, min: 0, max: 100, default: 0 },
    },
    rubricTier: { type: String, enum: ['priority', 'strong', 'borderline', 'block'], default: 'block' },
    competitionLevel: { type: Number, min: 0, max: 1, default: 0.5 },
    competitionLabel: { type: String, default: 'Medium' },
    pastSuccessFactor: { type: Number, min: 0, max: 1, default: 0.5 },
    winProbability: { type: Number, min: 0, max: 100, default: 0 },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    /** True when the opportunity is relevant for this agency based on profile tags and fit score */
    isRelevant: { type: Boolean, default: false, index: true },
    scoreVersion: { type: String, default: 'v2' },
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

matchSchema.index({ organization: 1, opportunity: 1 }, { unique: true });
matchSchema.plugin(mongoosePaginateV2);

module.exports = mongoose.model('Match', matchSchema);
