const mongoose = require('mongoose');

const communicationLogSchema = new mongoose.Schema(
  {
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      required: true,
      index: true,
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },

    // Type of log entry
    type: {
      type: String,
      enum: [
        'system',
        'email_sent',
        'email_received',
        'phone_call',
        'meeting',
        'note',
      ],
      default: 'note',
    },

    // Direction (only meaningful for email/phone)
    direction: {
      type: String,
      enum: ['inbound', 'outbound', 'internal'],
      default: 'internal',
    },

    // The actual content
    subject: { type: String },
    body: { type: String, required: true },
    fromAddress: { type: String },
    toAddress: { type: String },
    messageId: { type: String, index: true },
    outboxId: { type: mongoose.Schema.Types.ObjectId, ref: 'Outbox', index: true },
    ashleenAnalysis: { type: String, default: null },
    ashleenSuggestion: { type: String },
    ashleenFlags: { type: [String] },
    ashlynSuggestion: { type: String },
    ashlynFlags: { type: [String] },

    // Who and when
    funder: { type: mongoose.Schema.Types.ObjectId, ref: 'Funder', index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdByName: { type: String }, // denormalized for display
    createdByRole: { type: String, enum: ['admin', 'agency', 'system'] },

    // Optional: who the communication was with (funder contact)
    withParty: { type: String },

    // Visibility
    visibleToAgency: { type: Boolean, default: true },

    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

communicationLogSchema.index({ application: 1, createdAt: -1 });

module.exports = mongoose.model('CommunicationLog', communicationLogSchema);

