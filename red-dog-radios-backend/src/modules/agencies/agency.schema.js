const mongoose = require('mongoose');
const mongoosePaginateV2 = require('mongoose-paginate-v2');

const agencySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      required: true,
      enum: [
        'law_enforcement', 'fire_services', 'ems', 'emergency_management',
        '911_centers', 'hospitals', 'public_safety_comms', 'multi_agency',
      ],
    },
    location: { type: String },
    grantContactEmail: { type: String, lowercase: true },
    matchCount: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true }
);

agencySchema.plugin(mongoosePaginateV2);

module.exports = mongoose.model('Agency', agencySchema);
