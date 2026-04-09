const express = require('express');
const { generateSummary, generateEmail, generateApplication, computeMatch } = require('./ai.controller');
const { protect } = require('../../middlewares/auth.middleware');

const router = express.Router();

/**
 * @swagger
 * /api/ai/generate-summary:
 *   post:
 *     summary: Generate a plain-English summary of a grant opportunity
 *     tags: [AI]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [opportunityId]
 *             properties:
 *               opportunityId: { type: string }
 *     responses:
 *       200: { description: AI-generated summary }
 */
router.post('/generate-summary', protect, generateSummary);

/**
 * @swagger
 * /api/ai/generate-email:
 *   post:
 *     summary: Generate an outreach email for a grant opportunity
 *     tags: [AI]
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
 *               contactName: { type: string }
 *               senderName: { type: string }
 *               senderCompany: { type: string }
 */
router.post('/generate-email', protect, generateEmail);

/**
 * @swagger
 * /api/ai/generate-application:
 *   post:
 *     summary: Generate a grant application for an organization and opportunity
 *     tags: [AI]
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
 */
router.post('/generate-application', protect, generateApplication);

/**
 * @swagger
 * /api/ai/compute-match:
 *   post:
 *     summary: Use AI to compute a fit score between an organization and opportunity
 *     tags: [AI]
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
 */
router.post('/compute-match', protect, computeMatch);

module.exports = router;
