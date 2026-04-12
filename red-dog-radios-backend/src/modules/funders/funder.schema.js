const mongoose = require('mongoose');
const mongoosePaginateV2 = require('mongoose-paginate-v2');

const funderSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    website: { type: String },
    contactName: { type: String },
    contactEmail: { type: String },
    contactPhone: { type: String },

    missionStatement: { type: String },
    locationFocus: [{ type: String }],
    fundingCategories: [{ type: String }],
    agencyTypesFunded: [{ type: String }],
    /** Equipment / program tags for matching (e.g. radios, repeaters, dispatch). */
    equipmentTags: [{ type: String }],
    /** When true, grant typically requires a local funding match. */
    localMatchRequired: { type: Boolean, default: false },

    avgGrantMin: { type: Number },
    avgGrantMax: { type: Number },
    deadline: { type: Date },
    cyclesPerYear: { type: Number },

    pastGrantsAwarded: [{ type: String }],
    notes: { type: String },

    maxApplicationsAllowed: { type: Number, default: 5 },
    currentApplicationCount: { type: Number, default: 0 },
    isLocked: { type: Boolean, default: false },

    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

funderSchema.plugin(mongoosePaginateV2);

module.exports = mongoose.model('Funder', funderSchema);
