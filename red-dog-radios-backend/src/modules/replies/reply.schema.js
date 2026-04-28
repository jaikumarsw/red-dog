'use strict';

const mongoose = require('mongoose');
const mongoosePaginateV2 = require('mongoose-paginate-v2');

const replySchema = new mongoose.Schema(
  {
    outboxId: { type: mongoose.Schema.Types.ObjectId, ref: 'Outbox', required: true },
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    from: { type: String },
    subject: { type: String },
    body: { type: String },
    htmlBody: { type: String },
    receivedAt: { type: Date, default: Date.now },
    gmailMessageId: { type: String },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

replySchema.index({ gmailMessageId: 1 }, { unique: true, sparse: true });
replySchema.index({ userId: 1, isRead: 1, receivedAt: -1 });
replySchema.index({ organizationId: 1, receivedAt: -1 });
replySchema.index({ outboxId: 1, receivedAt: -1 });

replySchema.plugin(mongoosePaginateV2);

module.exports = mongoose.model('Reply', replySchema);

