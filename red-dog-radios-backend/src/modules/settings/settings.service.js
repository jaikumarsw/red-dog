const User = require('../auth/user.schema');
const { AppError } = require('../../middlewares/error.middleware');

const getSettings = async (userId) => {
  const user = await User.findById(userId).populate('organizationId', 'name location');
  if (!user) throw new AppError('User not found', 404);
  return user;
};

const updateSettings = async (userId, data) => {
  const {
    fullName, firstName, lastName, email,
    notifications, preferences, reportEmail,
  } = data;

  const update = {};
  if (fullName) update.fullName = fullName;
  if (firstName) update.firstName = firstName;
  if (lastName) update.lastName = lastName;
  if (email) update.email = email;
  if (reportEmail !== undefined) update['settings.reportEmail'] = reportEmail;

  if (notifications) {
    Object.entries(notifications).forEach(([key, val]) => {
      update[`settings.notifications.${key}`] = val;
    });
  }

  if (preferences) {
    Object.entries(preferences).forEach(([key, val]) => {
      update[`settings.preferences.${key}`] = val;
    });
  }

  const user = await User.findByIdAndUpdate(userId, { $set: update }, { new: true });
  if (!user) throw new AppError('User not found', 404);
  return user;
};

const deleteAccount = async (userId) => {
  const user = await User.findByIdAndUpdate(userId, { isActive: false }, { new: true });
  if (!user) throw new AppError('User not found', 404);
  return { deleted: true };
};

module.exports = { getSettings, updateSettings, deleteAccount };
