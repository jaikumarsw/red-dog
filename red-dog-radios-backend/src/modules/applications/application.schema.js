const mongoose = require('mongoose');
const mongoosePaginateV2 = require('mongoose-paginate-v2');

const applicationSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    opportunity: { type: mongoose.Schema.Types.ObjectId, ref: 'Opportunity' },
    status: {
      type: String,
      enum: ['draft', 'submitted', 'in_review', 'awarded', 'rejected', 'not_started', 'drafting', 'ready_to_submit', 'follow_up_needed', 'denied'],
      default: 'draft',
    },
    projectTitle: { type: String },
    projectSummary: { type: String },
    communityImpact: { type: String },
    amountRequested: { type: Number },
    timeline: { type: String },
    contactName: { type: String },
    contactEmail: { type: String, lowercase: true },
    submittedAt: { type: Date },

    // AI-generated structured sections
    problemStatement: { type: String },
    proposedSolution: { type: String },
    measurableOutcomes: { type: String },
    urgency: { type: String },
    budgetSummary: { type: String },

    // Funder-aligned version (AI rewrite)
    alignedVersion: {
      problemStatement: String,
      communityImpact: String,
      proposedSolution: String,
      measurableOutcomes: String,
      urgency: String,
      budgetSummary: String,
      generatedAt: Date,
    },

    // Submission tracker fields
    dateStarted: { type: Date, default: Date.now },
    dateSubmitted: { type: Date },
    followUpDate: { type: Date },
    notes: { type: String },

    statusHistory: [
      {
        status: { type: String },
        previousStatus: { type: String },
        changedAt: { type: Date, default: Date.now },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      },
    ],

    // Win database tagging
    isWinner: { type: Boolean, default: false },
    winTags: {
      fundingType: String,
      agencyType: String,
      projectType: String,
    },

    // Reference to the funder (new Funder model)
    funder: { type: mongoose.Schema.Types.ObjectId, ref: 'Funder' },
  },
  { timestamps: true }
);

applicationSchema.plugin(mongoosePaginateV2);

module.exports = mongoose.model('Application', applicationSchema);
