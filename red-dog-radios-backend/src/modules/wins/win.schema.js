const mongoose = require('mongoose');
const mongoosePaginateV2 = require('mongoose-paginate-v2');

const winSchema = new mongoose.Schema(
  {
    applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Application' },
    agencyType: { type: String, required: true },
    fundingType: { type: String },
    projectType: { type: String },
    funderName: { type: String },
    awardAmount: { type: Number },

    problemStatement: { type: String },
    communityImpact: { type: String },
    proposedSolution: { type: String },
    measurableOutcomes: { type: String },
    urgency: { type: String },
    budgetSummary: { type: String },

    winFactors: [{ type: String }],
    lessonsLearned: { type: String },
  },
  { timestamps: true }
);

winSchema.plugin(mongoosePaginateV2);

module.exports = mongoose.model('Win', winSchema);
