const User = require('../auth/user.schema');
const Organization = require('../organizations/organization.schema');
const { AppError } = require('../../middlewares/error.middleware');

const getSettings = async (userId) => {
  const user = await User.findById(userId).populate('organizationId', 'name location canMeetLocalMatch');
  if (!user) throw new AppError('User not found', 404);
  return user;
};

const updateSettings = async (userId, data) => {
  const {
    fullName, firstName, lastName, email,
    notifications, preferences, reportEmail, canMeetLocalMatch,
    currentPassword, newPassword,
  } = data;

  if (currentPassword && newPassword) {
    const u = await User.findById(userId).select('+password');
    if (!u) throw new AppError('User not found', 404);
    const cur = String(currentPassword).trim();
    const neu = String(newPassword).trim();
    if (neu.length < 8) throw new AppError('New password must be at least 8 characters', 400);
    if (!(await u.comparePassword(cur))) throw new AppError('Current password is incorrect', 401);
    u.password = neu;
    await u.save();
  }

  const update = {};
  if (fullName) update.fullName = fullName;
  if (firstName) update.firstName = firstName;
  if (lastName) update.lastName = lastName;
  if (email) update.email = email;
  if (reportEmail !== undefined) update['settings.reportEmail'] = reportEmail;

  const ALLOWED_NOTIFICATIONS = ['email', 'sms', 'newMatches', 'applicationUpdates', 'weeklyDigest', 'followUpReminders'];
  const ALLOWED_PREFERENCES = ['theme', 'language', 'timezone', 'dateFormat', 'compactView'];

  if (notifications && typeof notifications === 'object') {
    Object.entries(notifications).forEach(([key, val]) => {
      if (ALLOWED_NOTIFICATIONS.includes(key)) {
        update[`settings.notifications.${key}`] = val;
      }
    });
  }

  if (preferences && typeof preferences === 'object') {
    Object.entries(preferences).forEach(([key, val]) => {
      if (ALLOWED_PREFERENCES.includes(key)) {
        update[`settings.preferences.${key}`] = val;
      }
    });
  }

  if (canMeetLocalMatch !== undefined) {
    const u = await User.findById(userId).select('organizationId');
    if (u?.organizationId) {
      const raw = canMeetLocalMatch;
      const parsed =
        raw === null || raw === 'null' || raw === '' ? null : raw === true || raw === 'true';
      await Organization.findByIdAndUpdate(u.organizationId, { $set: { canMeetLocalMatch: parsed } });
    }
  }

  if (Object.keys(update).length > 0) {
    const user = await User.findByIdAndUpdate(userId, { $set: update }, { new: true });
    if (!user) throw new AppError('User not found', 404);
  } else {
    const exists = await User.findById(userId).select('_id');
    if (!exists) throw new AppError('User not found', 404);
  }

  return User.findById(userId).populate('organizationId', 'name location canMeetLocalMatch');
};

const deleteAccount = async (userId) => {
  const user = await User.findByIdAndUpdate(userId, { isActive: false }, { new: true });
  if (!user) throw new AppError('User not found', 404);
  return { deleted: true };
};

module.exports = { getSettings, updateSettings, deleteAccount };
