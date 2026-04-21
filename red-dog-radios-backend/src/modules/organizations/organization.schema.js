/**
 * Organization = Agency profile.
 *
 * Despite the collection name "organizations", every document here represents a
 * PUBLIC SAFETY AGENCY (fire dept, law enforcement, EMS, 911 center, etc.) that
 * has signed up for Red Dog Radios. The model is called "Organization" for
 * historical reasons. There is a separate thin `Agency` schema that is NOT used
 * in production — ignore it. All agency-related data lives here.
 *
 * One document per user account (createdBy → User._id).
 */
// Updated organization schema based on Requirements Audit gap analysis
// Added: specificRequest, challenges, urgencyStatement, whobenefits, eligibilityType, annualVolume, serviceArea, staffSizeRange
// Updated enums for budgetRange and timeline
const mongoose = require('mongoose');
const mongoosePaginateV2 = require('mongoose-paginate-v2');

const organizationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true },
    location: { type: String },
    websiteUrl: { type: String },
    missionStatement: { type: String },
    focusAreas: [{ type: String }],
    agencyTypes: [
      {
        type: String,
        trim: true,
      },
    ],
    programAreas: [{ type: String }],
    budgetRange: {
      type: String,
      enum: [
        'under_25k', 
        '25k_50k', 
        '50k_100k', 
        '100k_plus', 
        '25k_150k', 
        '150k_500k', 
        '500k_plus'
      ],
    },
    timeline: { 
      type: String, 
      enum: ['urgent', 'planned', 'asap', '3_6_months', '6_12_months'] 
    },
    goals: [{ type: String }],
    // Extended agency profile fields
    populationServed: { type: Number },
    coverageArea: { type: String },
    numberOfStaff: { type: Number },
    currentEquipment: { type: String },
    mainProblems: [{ type: String }],
    fundingPriorities: [{ type: String }],
    
    // New fields from 4-step intake analysis
    specificRequest: { type: String },
    challenges: [{
      type: String,
      enum: ['outdated_equipment', 'safety_concerns', 'slow_response_times', 'coverage_gaps', 'communication_issues', 'staffing_shortages']
    }],
    urgencyStatement: { type: String },
    whobenefits: { type: String },
    eligibilityType: {
      type: String,
      enum: ['nonprofit_501c3', 'government_agency']
    },
    annualVolume: { type: String },
    serviceArea: {
      type: String,
      enum: ['local', 'county', 'regional', 'statewide']
    },
    staffSizeRange: {
      type: String,
      enum: ['1-10', '11-25', '26-50', '50+']
    },

    /** Whether the agency can meet a local match requirement when applying. */
    canMeetLocalMatch: { type: Boolean },

    matchCount: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    lastMatchRecomputedAt: { type: Date },
  },
  { timestamps: true }
);

organizationSchema.plugin(mongoosePaginateV2);

module.exports = mongoose.model('Organization', organizationSchema);
