const service = require('./communication-log.service');

const create = async (req, res, next) => {
  try {
    const log = await service.create(req.body, req.user);
    res.status(201).json({ success: true, data: log });
  } catch (err) {
    next(err);
  }
};

const listAdmin = async (req, res, next) => {
  try {
    const logs = await service.listForApplication(req.params.applicationId);
    res.json({ success: true, data: logs });
  } catch (err) {
    next(err);
  }
};

const listAgency = async (req, res, next) => {
  try {
    // Ensure agencies can only view their own application's log
    const Application = require('../applications/application.schema');
    const app = await Application.findById(req.params.applicationId).select('organization').lean();
    if (!app) return res.status(404).json({ success: false, message: 'Application not found' });
    if (req.user?.organizationId && String(app.organization) !== String(req.user.organizationId)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const logs = await service.listForApplication(req.params.applicationId, { agencyVisible: true });
    res.json({ success: true, data: logs });
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    const result = await service.remove(req.params.id, req.user);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

module.exports = { create, listAdmin, listAgency, remove };

