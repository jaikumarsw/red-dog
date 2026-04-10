const mongoose = require('mongoose');
const mongoosePaginateV2 = require('mongoose-paginate-v2');

const followUpSchema = new mongoose.Schema(
  {
    application: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    funder: { type: mongoose.Schema.Types.ObjectId, ref: 'Funder' },
    opportunity: { type: mongoose.Schema.Types.ObjectId, ref: 'Opportunity' },

    followUpNumber: { type: Number },
    scheduledFor: { type: Date, required: true },
    emailSubject: { type: String },
    emailBody: { type: String },
    status: { type: String, enum: ['pending', 'sent', 'skipped'], default: 'pending' },
    sentAt: { type: Date },
  },
  { timestamps: true }
);

followUpSchema.plugin(mongoosePaginateV2);

module.exports = mongoose.model('FollowUp', followUpSchema);
