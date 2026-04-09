const mongoose = require('mongoose');
const mongoosePaginateV2 = require('mongoose-paginate-v2');

const alertSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    opportunity: { type: mongoose.Schema.Types.ObjectId, ref: 'Opportunity' },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    orgName: { type: String },
    grantName: { type: String },
    type: {
      type: String,
      enum: ['deadline', 'high_fit', 'deadline_updated', 'no_match', 'application_update'],
      required: true,
    },
    priority: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    alertKey: { type: String },
  },
  { timestamps: true }
);

alertSchema.virtual('read').get(function () {
  return this.isRead;
});

alertSchema.virtual('userId').get(function () {
  return this.user;
});

alertSchema.set('toJSON', { virtuals: true });
alertSchema.set('toObject', { virtuals: true });

alertSchema.index({ alertKey: 1 }, { unique: true, sparse: true });
alertSchema.plugin(mongoosePaginateV2);

module.exports = mongoose.model('Alert', alertSchema);
