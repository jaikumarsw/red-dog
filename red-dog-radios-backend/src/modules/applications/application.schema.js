const mongoose = require('mongoose');
const mongoosePaginateV2 = require('mongoose-paginate-v2');

const applicationSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    opportunity: { type: mongoose.Schema.Types.ObjectId, ref: 'Opportunity' },
    status: {
      type: String,
      enum: [
        'draft',
        'submitted',
        'in_review',
        'waiting_on_information',
        'approved',
        'awarded',
        'rejected',
        'not_started',
        'drafting',
        'ready_to_submit',
        'follow_up_needed',
        'denied',
      ],
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
    infoRequestedAt: { type: Date },
    infoRequestedNote: { type: String },

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

    // Post-award email sequence tracking
    postAwardSequence: {
      congratsSentAt: { type: Date, default: null },
      followUpScheduledFor: { type: Date, default: null },
      followUpSentAt: { type: Date, default: null },
      agencyResponse: { type: String, default: null },
      agencyResponseAt: { type: Date, default: null },
    },

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

    // User who created/submitted this application (best-effort; may be null for legacy records)
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

applicationSchema.plugin(mongoosePaginateV2);

applicationSchema.index({ organization: 1, status: 1 });
applicationSchema.index({ organization: 1, createdAt: -1 });
applicationSchema.index({ funder: 1 });

// Statuses included in partial unique indexes: all enum values except terminal denied/rejected.
// MongoDB partial indexes cannot use $ne/$nin on the filter path; keep this list in sync with `status.enum` above.
const NON_TERMINAL_APPLICATION_STATUSES = [
  'draft',
  'submitted',
  'in_review',
  'waiting_on_information',
  'approved',
  'awarded',
  'not_started',
  'drafting',
  'ready_to_submit',
  'follow_up_needed',
];

// Prevent duplicate active applications for the same org + opportunity.
// Only enforces uniqueness for non-terminal statuses; agencies can
// re-apply if a previous attempt was denied or rejected.
applicationSchema.index(
  { organization: 1, opportunity: 1 },
  {
    unique: true,
    partialFilterExpression: {
      opportunity: { $exists: true, $type: 'objectId' },
      status: { $in: NON_TERMINAL_APPLICATION_STATUSES },
    },
    name: 'unique_active_org_opportunity',
  }
);

// Same for org + funder when no opportunity is linked.
// Use `opportunity: null` (not $exists: false) — MongoDB partial indexes reject $exists: false.
applicationSchema.index(
  { organization: 1, funder: 1 },
  {
    unique: true,
    partialFilterExpression: {
      funder: { $exists: true, $type: 'objectId' },
      opportunity: null,
      status: { $in: NON_TERMINAL_APPLICATION_STATUSES },
    },
    name: 'unique_active_org_funder',
  }
);

module.exports = mongoose.model('Application', applicationSchema);
