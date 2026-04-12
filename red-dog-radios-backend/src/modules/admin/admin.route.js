const express = require('express');
const { protectAdmin } = require('../../middlewares/adminAuth.middleware');
const ctrl = require('./admin.controller');

const router = express.Router();

router.post('/auth/login', ctrl.adminLogin);
router.get('/auth/me', protectAdmin, ctrl.adminMe);

router.get('/dashboard', protectAdmin, ctrl.dashboard);
router.get('/activity-logs', protectAdmin, ctrl.listActivityLogs);
router.get('/activity-logs/:id', protectAdmin, ctrl.getActivityLog);

router.get('/agencies', protectAdmin, ctrl.listAgencies);
router.get('/agencies/:id', protectAdmin, ctrl.getAgency);

router.get('/opportunities', protectAdmin, ctrl.listOpportunities);
router.post('/opportunities', protectAdmin, ctrl.createOpportunity);
router.get('/opportunities/:id', protectAdmin, ctrl.getOpportunity);
router.put('/opportunities/:id', protectAdmin, ctrl.updateOpportunity);
router.delete('/opportunities/:id', protectAdmin, ctrl.deleteOpportunity);

router.get('/funders', protectAdmin, ctrl.listFunders);
router.post('/funders', protectAdmin, ctrl.createFunder);
router.put('/funders/:id/unlock', protectAdmin, ctrl.unlockFunder);
router.put('/funders/:id/set-limit', protectAdmin, ctrl.setFunderLimit);
router.get('/funders/:id', protectAdmin, ctrl.getFunder);
router.put('/funders/:id', protectAdmin, ctrl.updateFunder);
router.delete('/funders/:id', protectAdmin, ctrl.deleteFunder);

router.get('/applications', protectAdmin, ctrl.listApplications);
router.post('/applications/create-for-agency', protectAdmin, ctrl.createApplicationForAgency);
router.get('/applications/:id', protectAdmin, ctrl.getApplication);
router.put('/applications/:id', protectAdmin, ctrl.updateApplication);
router.put('/applications/:id/status', protectAdmin, ctrl.updateApplicationStatus);
router.post('/applications/:id/generate-ai', protectAdmin, ctrl.generateApplicationAI);
router.delete('/applications/:id', protectAdmin, ctrl.deleteApplication);

router.get('/matches', protectAdmin, ctrl.listMatches);
router.post('/matches/recompute-all', protectAdmin, ctrl.recomputeMatches);
// Deprecated: match approve/reject — staff review applications via PUT /applications/:id/status instead.
router.put('/matches/:id/approve', protectAdmin, ctrl.approveMatch);
router.put('/matches/:id/reject', protectAdmin, ctrl.rejectMatch);

router.get('/users', protectAdmin, ctrl.listUsers);
router.get('/users/:id', protectAdmin, ctrl.getUser);
router.put('/users/:id/role', protectAdmin, ctrl.updateUserRole);

module.exports = router;
