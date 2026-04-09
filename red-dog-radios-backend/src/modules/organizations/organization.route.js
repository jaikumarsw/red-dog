const express = require('express');
const { getAll, getOne, create, update, remove } = require('./organization.controller');
const { protect, restrictTo } = require('../../middlewares/auth.middleware');

const router = express.Router();

/**
 * @swagger
 * /api/organizations:
 *   get:
 *     summary: Get all organizations (paginated)
 *     tags: [Organizations]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [active, inactive] }
 *     responses:
 *       200: { description: Paginated list of organizations }
 *   post:
 *     summary: Create a new organization
 *     tags: [Organizations]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               location: { type: string }
 *               missionStatement: { type: string }
 *               budgetRange: { type: string }
 *               timeline: { type: string }
 *     responses:
 *       201: { description: Organization created }
 */
router.route('/').get(protect, getAll).post(protect, create);

/**
 * @swagger
 * /api/organizations/{id}:
 *   get:
 *     summary: Get a single organization
 *     tags: [Organizations]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Organization data }
 *       404: { description: Organization not found }
 *   put:
 *     summary: Update an organization
 *     tags: [Organizations]
 *     security: [{ bearerAuth: [] }]
 *   delete:
 *     summary: Deactivate an organization (admin only)
 *     tags: [Organizations]
 *     security: [{ bearerAuth: [] }]
 */
router.route('/:id').get(protect, getOne).put(protect, update).delete(protect, restrictTo('admin'), remove);

module.exports = router;
