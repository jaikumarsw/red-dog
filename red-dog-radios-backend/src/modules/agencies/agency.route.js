const express = require('express');
const { getAll, getOne, create, update, remove } = require('./agency.controller');
const { protect, restrictTo } = require('../../middlewares/auth.middleware');

const router = express.Router();

/**
 * @swagger
 * /api/agencies:
 *   get:
 *     summary: Get all agencies (paginated)
 *     tags: [Agencies]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: type
 *         schema: { type: string }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [active, inactive] }
 *     responses:
 *       200: { description: Paginated list of agencies }
 *   post:
 *     summary: Create a new agency
 *     tags: [Agencies]
 *     security: [{ bearerAuth: [] }]
 */
router.route('/').get(protect, getAll).post(protect, create);

/**
 * @swagger
 * /api/agencies/{id}:
 *   get:
 *     summary: Get a single agency
 *     tags: [Agencies]
 *     security: [{ bearerAuth: [] }]
 *   put:
 *     summary: Update an agency
 *     tags: [Agencies]
 *     security: [{ bearerAuth: [] }]
 *   delete:
 *     summary: Deactivate an agency (admin only)
 *     tags: [Agencies]
 *     security: [{ bearerAuth: [] }]
 */
router.route('/:id').get(protect, getOne).put(protect, update).delete(protect, restrictTo('admin'), remove);

module.exports = router;
