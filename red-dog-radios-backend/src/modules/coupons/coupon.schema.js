const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: { 
    type: String, 
    required: true, 
    unique: true, 
    uppercase: true,
    trim: true
  },
  description: { type: String },
  
  // Access control
  grantFullAccess: { type: Boolean, default: true },
  
  // Usage limits
  maxUses: { type: Number, default: null }, // null = unlimited
  currentUses: { type: Number, default: 0 },
  
  // Validity
  isActive: { type: Boolean, default: true },
  expiresAt: { type: Date, default: null }, // null = never expires
  
  // Audit
  usedBy: [{ 
    organizationId: { type: mongoose.Schema.Types.ObjectId },
    usedAt: { type: Date, default: Date.now }
  }],
  
  createdAt: { type: Date, default: Date.now },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Index for fast lookup
couponSchema.index({ code: 1 });

module.exports = mongoose.model('Coupon', couponSchema);
