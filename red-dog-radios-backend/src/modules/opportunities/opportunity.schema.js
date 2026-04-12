const mongoose = require('mongoose');
const mongoosePaginateV2 = require('mongoose-paginate-v2');

const opportunitySchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    funder: { type: String, required: true, trim: true },
    deadline: { type: Date },
    minAmount: { type: Number },
    maxAmount: { type: Number },
    sourceUrl: { type: String },
    keywords: [{ type: String }],
    agencyTypes: [{ type: String }],
    description: { type: String },
    category: { type: String },
    equipmentTags: [{ type: String }],
    localMatchRequired: { type: Boolean, default: false },
    status: { type: String, enum: ['open', 'closing', 'closed'], default: 'open' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

opportunitySchema.plugin(mongoosePaginateV2);

module.exports = mongoose.model('Opportunity', opportunitySchema);
