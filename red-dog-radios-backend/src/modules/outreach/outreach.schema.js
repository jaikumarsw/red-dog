const mongoose = require('mongoose');
const mongoosePaginateV2 = require('mongoose-paginate-v2');

const outreachSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    funder: { type: mongoose.Schema.Types.ObjectId, ref: 'Funder' },
    opportunity: { type: mongoose.Schema.Types.ObjectId, ref: 'Opportunity' },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    subject: { type: String, required: true },
    contactName: { type: String },
    body: { type: String, required: true },

    status: { type: String, enum: ['draft', 'sent'], default: 'draft' },
    sentAt: { type: Date },
  },
  { timestamps: true }
);

outreachSchema.plugin(mongoosePaginateV2);

module.exports = mongoose.model('Outreach', outreachSchema);
