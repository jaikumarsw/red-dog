const mongoose = require('mongoose');
const mongoosePaginateV2 = require('mongoose-paginate-v2');

const outboxSchema = new mongoose.Schema(
  {
    recipient: { type: String, required: true },
    recipientName: { type: String },
    subject: { type: String, required: true },
    htmlBody: { type: String, required: true },
    emailType: {
      type: String,
      enum: ['weekly_digest', 'alert_digest', 'outreach', 'manual', 'followup_reminder'],
      default: 'manual',
    },
    /** When set, processQueue will not send until this datetime (UTC). */
    scheduledFor: { type: Date },
    status: { type: String, enum: ['pending', 'sent', 'failed'], default: 'pending' },
    retryCount: { type: Number, default: 0 },
    providerMessageId: { type: String },
    errorMessage: { type: String },
    sentAt: { type: Date },
    isTest: { type: Boolean, default: false },
    emailKey: { type: String },
    relatedOrganization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    relatedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

outboxSchema.index({ emailKey: 1 }, { unique: true, sparse: true });
outboxSchema.index({ status: 1, scheduledFor: 1 });
outboxSchema.plugin(mongoosePaginateV2);

module.exports = mongoose.model('Outbox', outboxSchema);
