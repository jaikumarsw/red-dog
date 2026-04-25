const couponService = require('./coupon.service');

// Public: validate a code (used during onboarding UI)
const validate = async (req, res, next) => {
  try {
    const { code } = req.query;
    const result = await couponService.validateCoupon(code);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

// Agency: redeem a code (called after org is created)
const redeem = async (req, res, next) => {
  try {
    const { code } = req.body;
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Organization not found' 
      });
    }
    const result = await couponService.redeemCoupon(code, organizationId);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

// Admin: create a coupon
const create = async (req, res, next) => {
  try {
    const coupon = await couponService.createCoupon(
      req.body, 
      req.user?._id
    );
    res.status(201).json({ success: true, data: coupon });
  } catch (err) { next(err); }
};

// Admin: list all coupons
const list = async (req, res, next) => {
  try {
    const coupons = await couponService.listCoupons();
    res.json({ success: true, data: coupons });
  } catch (err) { next(err); }
};

// Admin: deactivate a coupon
const deactivate = async (req, res, next) => {
  try {
    const coupon = await couponService.deactivateCoupon(req.params.id);
    res.json({ success: true, data: coupon });
  } catch (err) { next(err); }
};

module.exports = { validate, redeem, create, list, deactivate };
