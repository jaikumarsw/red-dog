const mongoose = require('mongoose');
const mongoosePaginateV2 = require('mongoose-paginate-v2');

const opportunitySchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    funder: { type: String, required: true, trim: true },
    deadline: { type: Date },
    minAmount: { type: Number },
    maxAmount: { type: Number },
    awardAmount: { type: Number },
    sourceUrl: { type: String },
    keywords: [{ type: String }],
    agencyTypes: [{ type: String }],
    description: { type: String },
    category: { type: String },
    equipmentTags: [{ type: String }],
    localMatchRequired: { type: Boolean, default: false },
    status: { type: String, enum: ['open', 'closing', 'closed'], default: 'open' },
    /** @deprecated Use funderId.contactEmail */
    contactEmail: { type: String, default: null },
    /** @deprecated Use funderId.contactName */
    contactName: { type: String, default: null },
    /** @deprecated Use funderId.contactPhone */
    contactPhone: { type: String, default: null },
    applicationUrl: { type: String, default: null },
    /** 0 = unlimited applications for this opportunity */
    maxApplicationsAllowed: { type: Number, default: 0 },
    currentApplicationCount: { type: Number, default: 0 },
    highScoreApplicationCount: { type: Number, default: 0 },
    isLocked: { type: Boolean, default: false },
    funderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Funder' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // ----- Scraping / external source fields (added for Grants.gov pipeline) -----
    externalSource: {
      type: String,
      enum: ['manual', 'grants_gov', 'cause_iq', 'instrumentl', 'zeffy', 'state_portal'],
      default: 'manual',
      index: true,
    },
    externalSourceId: { type: String, index: true },
    externalSourceUrl: { type: String, default: null },
    externalFirstSeenAt: { type: Date, default: null },
    externalLastSeenAt: { type: Date, default: null },
    isForecast: { type: Boolean, default: false },
    rawSourceData: { type: mongoose.Schema.Types.Mixed, select: false },

    // CFDA/Assistance Listing numbers (e.g., "97.044" for FEMA AFG)
    cfdaNumbers: [{ type: String }],
    fundingInstrument: { type: String, default: null },
    eligibleApplicants: [{ type: String }],

    // Geography — was previously read by match engine but not defined on Opportunity.
    // Adding it here so scraped opportunities score on geography.
    locationFocus: [{ type: String }],

    // Public safety relevance — only opportunities with score >= threshold are saved
    publicSafetyScore: { type: Number, default: 0 },
    publicSafetyKeywordsMatched: [{ type: String }],
  },
  { timestamps: true }
);

opportunitySchema.plugin(mongoosePaginateV2);

opportunitySchema.index({ status: 1, deadline: 1 });

// Compound unique index for scraper dedup. Partial so manual entries
// without externalSourceId don't conflict.
opportunitySchema.index(
  { externalSource: 1, externalSourceId: 1 },
  { 
    unique: true, 
    partialFilterExpression: { externalSourceId: { $type: 'string' } }
  }
);

module.exports = mongoose.model('Opportunity', opportunitySchema);
