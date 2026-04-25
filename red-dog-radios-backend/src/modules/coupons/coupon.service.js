const Coupon = require('./coupon.schema');
const { AppError } = require('../../middlewares/error.middleware');

// Validate and redeem a coupon code
const redeemCoupon = async (code, organizationId) => {
  if (!code) throw new AppError('No coupon code provided', 400);
  
  const coupon = await Coupon.findOne({ 
    code: code.toUpperCase().trim() 
  });
  
  if (!coupon) throw new AppError('Invalid coupon code', 404);
  if (!coupon.isActive) throw new AppError('This coupon is no longer active', 400);
  if (coupon.expiresAt && new Date() > coupon.expiresAt) {
    throw new AppError('This coupon has expired', 400);
  }
  if (coupon.maxUses !== null && coupon.currentUses >= coupon.maxUses) {
    throw new AppError('This coupon has reached its usage limit', 400);
  }
  
  // Check if this org already used it
  const alreadyUsed = coupon.usedBy.some(
    u => String(u.organizationId) === String(organizationId)
  );
  if (alreadyUsed) throw new AppError('Coupon already used by this agency', 400);
  
  // Redeem it
  coupon.currentUses += 1;
  coupon.usedBy.push({ organizationId, usedAt: new Date() });
  await coupon.save();

  if (coupon.grantFullAccess) {
    const billingService = require('../billing/billing.service');
    await billingService.grantBetaAccessFromCoupon(
      organizationId, 
      coupon.code
    );
  }
  
  return { 
    success: true, 
    grantFullAccess: coupon.grantFullAccess,
    message: 'Coupon applied successfully'
  };
};

// Validate without redeeming (for UI validation)
const validateCoupon = async (code) => {
  if (!code) return { valid: false, reason: 'No code provided' };
  
  const coupon = await Coupon.findOne({ 
    code: code.toUpperCase().trim() 
  });
  
  if (!coupon) return { valid: false, reason: 'Invalid code' };
  if (!coupon.isActive) return { valid: false, reason: 'Code inactive' };
  if (coupon.expiresAt && new Date() > coupon.expiresAt) {
    return { valid: false, reason: 'Code expired' };
  }
  if (coupon.maxUses !== null && coupon.currentUses >= coupon.maxUses) {
    return { valid: false, reason: 'Code fully redeemed' };
  }
  
  return { valid: true, grantFullAccess: coupon.grantFullAccess };
};

// Admin: create a new coupon
const createCoupon = async (data, createdBy) => {
  const existing = await Coupon.findOne({ 
    code: data.code.toUpperCase().trim() 
  });
  if (existing) throw new AppError('A coupon with this code already exists', 400);
  
  return Coupon.create({
    ...data,
    code: data.code.toUpperCase().trim(),
    createdBy
  });
};

// Admin: list all coupons
const listCoupons = async () => {
  return Coupon.find().sort({ createdAt: -1 }).lean();
};

// Admin: deactivate a coupon
const deactivateCoupon = async (id) => {
  const coupon = await Coupon.findByIdAndUpdate(
    id, 
    { isActive: false }, 
    { new: true }
  );
  if (!coupon) throw new AppError('Coupon not found', 404);
  return coupon;
};

module.exports = { 
  redeemCoupon, 
  validateCoupon, 
  createCoupon, 
  listCoupons, 
  deactivateCoupon 
};
