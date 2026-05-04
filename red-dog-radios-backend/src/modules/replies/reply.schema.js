const mongoose = require('mongoose');

const replySchema = new mongoose.Schema({
  // Link to the outbox record this reply is responding to
  outboxId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Outbox', 
    required: true 
  },
  // Scope (denormalized for fast queries)
  organizationId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Organization', 
    required: true 
  },
  // Reply contents
  from: { type: String, required: true },
  subject: { type: String },
  body: { type: String },
  htmlBody: { type: String },
  receivedAt: { type: Date, default: Date.now },
  // Gmail message ID for dedup (one reply = one record)
  gmailMessageId: { type: String, unique: true, sparse: true },
  // Admin tracking
  adminViewed: { type: Boolean, default: false },

  // Ashleen AI analysis — populated after reply is detected
  ashleenSuggestion: { type: String, default: null },
  ashleenSuggestedSubject: { type: String, default: null },
  ashleenAnalysis: { type: String, default: null },
  ashleenGeneratedAt: { type: Date, default: null },
  ashleenError: { type: String, default: null },

  // Agency tracking
  agencyViewed: { type: Boolean, default: false },
  agencyViewedAt: { type: Date, default: null }
}, { timestamps: true });

replySchema.index({ organizationId: 1, receivedAt: -1 });
replySchema.index({ outboxId: 1, receivedAt: -1 });

module.exports = mongoose.model('Reply', replySchema);
