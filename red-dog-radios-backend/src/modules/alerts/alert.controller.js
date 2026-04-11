const asyncHandler = require('../../utils/asyncHandler');
const { success, paginate } = require('../../utils/apiResponse');
const alertService = require('./alert.service');
const { resolveAgencyOrganizationId } = require('../../utils/resolveAgencyOrg');
const { AppError } = require('../../middlewares/error.middleware');
const Alert = require('./alert.schema');

const getAll = asyncHandler(async (req, res) => {
  const organizationId = await resolveAgencyOrganizationId(req.user);
  if (!organizationId) throw new AppError('No organization linked to your account', 400);
  const result = await alertService.getAll({ ...req.query, organizationId });
  return paginate(res, result.docs, result, 'Alerts retrieved');
});

const markRead = asyncHandler(async (req, res) => {
  const organizationId = await resolveAgencyOrganizationId(req.user);
  const alert = await Alert.findById(req.params.id);
  if (!alert || String(alert.organization) !== String(organizationId)) {
    return res.status(404).json({ success: false, message: 'Alert not found' });
  }
  const updated = await alertService.markRead(req.params.id);
  return success(res, updated, 'Alert marked as read');
});

const markAllRead = asyncHandler(async (req, res) => {
  const organizationId = await resolveAgencyOrganizationId(req.user);
  await Alert.updateMany({ organization: organizationId }, { isRead: true });
  return success(res, null, 'All alerts marked as read');
});

const remove = asyncHandler(async (req, res) => {
  const organizationId = await resolveAgencyOrganizationId(req.user);
  const alert = await Alert.findById(req.params.id);
  if (!alert || String(alert.organization) !== String(organizationId)) {
    return res.status(404).json({ success: false, message: 'Alert not found' });
  }
  await alertService.remove(req.params.id);
  return success(res, null, 'Alert deleted');
});

module.exports = { getAll, markRead, markAllRead, remove };
