const mongoose = require('mongoose');
const mongoosePaginateV2 = require('mongoose-paginate-v2');

const activityLogSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      enum: ['opportunity', 'funder', 'application', 'match', 'ai', 'user', 'system'],
      required: true,
    },
    action: { type: String, required: true },
    summary: { type: String, required: true },
    severity: { type: String, enum: ['info', 'warning', 'error'], default: 'info' },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    meta: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

activityLogSchema.index({ createdAt: -1 });
activityLogSchema.plugin(mongoosePaginateV2);

module.exports = mongoose.model('ActivityLog', activityLogSchema);
