const express = require('express');
const { getAll, getOne, generate, preview, send } = require('./digest.controller');
const { protect } = require('../../middlewares/auth.middleware');

const router = express.Router();

/**
 * @swagger
 * /api/digests:
 *   get:
 *     summary: Get all digests (paginated)
 *     tags: [Digests]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [draft, sent] }
 *       - in: query
 *         name: organizationId
 *         schema: { type: string }
 *     responses:
 *       200: { description: Paginated digests }
 */
router.get('/', protect, getAll);

/**
 * @swagger
 * /api/digests/generate:
 *   post:
 *     summary: Generate a weekly digest for an organization (uses AI for intro)
 *     tags: [Digests]
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
 *               weekStart: { type: string, format: date }
 *               weekEnd: { type: string, format: date }
 */
router.post('/generate', protect, generate);

/**
 * @swagger
 * /api/digests/preview:
 *   post:
 *     summary: Preview a digest without saving to DB
 *     tags: [Digests]
 *     security: [{ bearerAuth: [] }]
 */
router.post('/preview', protect, preview);

/**
 * @swagger
 * /api/digests/{id}:
 *   get:
 *     summary: Get a single digest
 *     tags: [Digests]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/:id', protect, getOne);

/**
 * @swagger
 * /api/digests/{id}/send:
 *   post:
 *     summary: Queue and send a digest to a recipient
 *     tags: [Digests]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [recipientEmail]
 *             properties:
 *               recipientEmail: { type: string }
 *               recipientName: { type: string }
 */
router.post('/:id/send', protect, send);

module.exports = router;
