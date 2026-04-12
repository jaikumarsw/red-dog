const mongoose = require('mongoose');
const mongoosePaginateV2 = require('mongoose-paginate-v2');

const organizationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true },
    location: { type: String },
    website: { type: String },
    websiteUrl: { type: String },
    missionStatement: { type: String },
    focusAreas: [{ type: String }],
    agencyTypes: [
      {
        type: String,
        enum: [
          'law_enforcement', 'fire_services', 'ems', 'emergency_management',
          '911_centers', 'hospitals', 'public_safety_comms', 'multi_agency', 'utilities',
        ],
      },
    ],
    programAreas: [{ type: String }],
    budgetRange: {
      type: String,
      enum: ['under_25k', '25k_150k', '150k_500k', '500k_plus'],
    },
    timeline: { type: String, enum: ['urgent', 'planned'] },
    goals: [{ type: String }],
    // Extended agency profile fields
    populationServed: { type: Number },
    coverageArea: { type: String },
    numberOfStaff: { type: Number },
    currentEquipment: { type: String },
    mainProblems: [{ type: String }],
    fundingPriorities: [{ type: String }],
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
