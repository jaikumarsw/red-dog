const express = require('express');
const { getAll, getOne, create, update, submit, remove } = require('./application.controller');
const { protect } = require('../../middlewares/auth.middleware');

const router = express.Router();

/**
 * @swagger
 * /api/applications:
 *   get:
 *     summary: Get all applications (paginated)
 *     tags: [Applications]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [draft, submitted, in_review, awarded, rejected] }
 *       - in: query
 *         name: organizationId
 *         schema: { type: string }
 *     responses:
 *       200: { description: Paginated applications }
 *   post:
 *     summary: Create a new application
 *     tags: [Applications]
 *     security: [{ bearerAuth: [] }]
 */
router.route('/').get(protect, getAll).post(protect, create);

/**
 * @swagger
 * /api/applications/{id}:
 *   get:
 *     summary: Get a single application
 *     tags: [Applications]
 *     security: [{ bearerAuth: [] }]
 *   put:
 *     summary: Update an application
 *     tags: [Applications]
 *     security: [{ bearerAuth: [] }]
 *   delete:
 *     summary: Delete an application
 *     tags: [Applications]
 *     security: [{ bearerAuth: [] }]
 */
router.route('/:id').get(protect, getOne).put(protect, update).delete(protect, remove);

/**
 * @swagger
 * /api/applications/{id}/submit:
 *   put:
 *     summary: Submit an application (changes status to submitted)
 *     tags: [Applications]
 *     security: [{ bearerAuth: [] }]
 */
router.put('/:id/submit', protect, submit);

module.exports = router;
