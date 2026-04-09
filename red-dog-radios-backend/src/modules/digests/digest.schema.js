const mongoose = require('mongoose');
const mongoosePaginateV2 = require('mongoose-paginate-v2');

const digestSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    orgName: { type: String },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    matches: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Match' }],
    opportunities: [
      {
        title: { type: String },
        fitScore: { type: Number },
        amount: { type: Number },
        deadline: { type: Date },
      },
    ],
    aiIntro: { type: String },
    htmlContent: { type: String },
    status: { type: String, enum: ['draft', 'sent'], default: 'draft' },
    sentAt: { type: Date },
    itemCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

digestSchema.plugin(mongoosePaginateV2);

module.exports = mongoose.model('Digest', digestSchema);
