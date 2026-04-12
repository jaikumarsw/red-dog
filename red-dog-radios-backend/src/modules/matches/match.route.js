const express = require('express');
const { getAll, getOne, create, computeAndSave, computeAll, approve, reject } = require('./match.controller');
const { protect } = require('../../middlewares/auth.middleware');
const { protectAdmin } = require('../../middlewares/adminAuth.middleware');

const router = express.Router();

/**
 * @swagger
 * /api/matches:
 *   get:
 *     summary: Get all matches (paginated, filterable)
 *     tags: [Matches]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: organizationId
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [pending, approved, rejected] }
 *       - in: query
 *         name: minScore
 *         schema: { type: integer }
 *       - in: query
 *         name: maxScore
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Paginated list of matches }
 *   post:
 *     summary: Create a match record manually
 *     tags: [Matches]
 *     security: [{ bearerAuth: [] }]
 */
router.route('/').get(protect, getAll).post(protect, create);

/**
 * @swagger
 * /api/matches/compute:
 *   post:
 *     summary: Compute and save a fit score between an org and opportunity
 *     tags: [Matches]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [opportunityId, organizationId]
 *             properties:
 *               opportunityId: { type: string }
 *               organizationId: { type: string }
 *     responses:
 *       200: { description: Match scored and saved }
 */
router.post('/compute', protect, computeAndSave);

/**
 * @swagger
 * /api/matches/compute-all:
 *   post:
 *     summary: Compute matches for all open opportunities for one organization
 *     tags: [Matches]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [organizationId]
 *             properties:
 *               organizationId: { type: string }
 *     responses:
 *       200: { description: Bulk compute results }
 */
router.post('/compute-all', protect, protectAdmin, computeAll);

/**
 * @swagger
 * /api/matches/{id}:
 *   get:
 *     summary: Get a single match
 *     tags: [Matches]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/:id', protect, getOne);

/**
 * @swagger
 * /api/matches/{id}/approve:
 *   put:
 *     summary: Approve a match
 *     tags: [Matches]
 *     security: [{ bearerAuth: [] }]
 */
// Deprecated — kept for internal/API compatibility. Prefer application status (admin portal) for approve/reject workflow.
router.put('/:id/approve', protect, protectAdmin, approve);

/**
 * @swagger
 * /api/matches/{id}/reject:
 *   put:
 *     summary: Reject a match
 *     tags: [Matches]
 *     security: [{ bearerAuth: [] }]
 */
router.put('/:id/reject', protect, protectAdmin, reject);

module.exports = router;
