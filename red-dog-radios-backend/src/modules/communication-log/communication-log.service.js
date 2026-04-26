const CommunicationLog = require('./communication-log.schema');
const Application = require('../applications/application.schema');
const { AppError } = require('../../middlewares/error.middleware');

const create = async (data, user) => {
  const app = await Application.findById(data.application);
  if (!app) throw new AppError('Application not found', 404);

  const createdByName =
    user?.fullName ||
    `${user?.firstName || ''} ${user?.lastName || ''}`.trim() ||
    'Unknown';

  return CommunicationLog.create({
    ...data,
    organization: app.organization,
    createdBy: user?._id,
    createdByName,
    createdByRole: user?.role || 'admin',
  });
};

// Used by other services to log system events
const logSystemEvent = async ({ application, organization, body, subject }) => {
  return CommunicationLog.create({
    application,
    organization,
    type: 'system',
    direction: 'internal',
    subject,
    body,
    createdByName: 'System',
    createdByRole: 'system',
    visibleToAgency: true,
  });
};

const listForApplication = async (applicationId, { agencyVisible = false } = {}) => {
  const query = { application: applicationId };
  if (agencyVisible) query.visibleToAgency = true;
  return CommunicationLog.find(query).sort({ createdAt: -1 }).lean();
};

const remove = async (id, user) => {
  const log = await CommunicationLog.findById(id);
  if (!log) throw new AppError('Log entry not found', 404);

  // Only admins or the creator can delete
  if (user?.role !== 'admin' && String(log.createdBy) !== String(user?._id)) {
    throw new AppError('Not authorized to delete this entry', 403);
  }

  await CommunicationLog.findByIdAndDelete(id);
  return { success: true };
};

module.exports = { create, logSystemEvent, listForApplication, remove };

