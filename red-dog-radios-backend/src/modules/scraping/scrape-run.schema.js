const mongoose = require('mongoose');
const mongoosePaginateV2 = require('mongoose-paginate-v2');

const scrapeRunSchema = new mongoose.Schema(
  {
    source: { type: String, required: true, index: true },
    startedAt: { type: Date, required: true },
    finishedAt: { type: Date, default: null },
    status: {
      type: String,
      enum: ['running', 'success', 'partial', 'failed'],
      default: 'running',
      index: true,
    },
    stats: {
      fetched: { type: Number, default: 0 },
      parsed: { type: Number, default: 0 },
      filtered_out: { type: Number, default: 0 },
      inserted: { type: Number, default: 0 },
      updated: { type: Number, default: 0 },
      unchanged: { type: Number, default: 0 },
      closed: { type: Number, default: 0 },
      errors: { type: Number, default: 0 },
    },
    errorSummary: [
      {
        recordId: String,
        message: String,
        _id: false,
      },
    ],
    durationMs: { type: Number, default: 0 },
    triggeredBy: {
      type: String,
      enum: ['cron', 'manual_admin', 'startup'],
      default: 'cron',
    },
  },
  { timestamps: true }
);

scrapeRunSchema.plugin(mongoosePaginateV2);
scrapeRunSchema.index({ startedAt: -1 });

module.exports = mongoose.model('ScrapeRun', scrapeRunSchema);
