const mongoose = require('mongoose');
const mongoosePaginateV2 = require('mongoose-paginate-v2');

const applicationSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    opportunity: { type: mongoose.Schema.Types.ObjectId, ref: 'Opportunity', required: true },
    status: {
      type: String,
      enum: ['draft', 'submitted', 'in_review', 'awarded', 'rejected'],
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
  },
  { timestamps: true }
);

applicationSchema.plugin(mongoosePaginateV2);

module.exports = mongoose.model('Application', applicationSchema);
