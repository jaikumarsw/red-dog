const mongoose = require('mongoose');
const mongoosePaginateV2 = require('mongoose-paginate-v2');

const digestSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    weekStart: { type: Date, required: true },
    weekEnd: { type: Date, required: true },
    matches: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Match' }],
    aiIntro: { type: String },
    status: { type: String, enum: ['draft', 'sent'], default: 'draft' },
    sentAt: { type: Date },
    itemCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

digestSchema.plugin(mongoosePaginateV2);

module.exports = mongoose.model('Digest', digestSchema);
