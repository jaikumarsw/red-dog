const express = require('express');
const { getAll, markRead, markAllRead, remove, generateDeadlineAlerts, generateHighFitAlerts } = require('./alert.controller');
const { protect, restrictTo } = require('../../middlewares/auth.middleware');

const router = express.Router();

/**
 * @swagger
 * /api/alerts:
 *   get:
 *     summary: Get all alerts for the current user (paginated)
 *     tags: [Alerts]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: isRead
 *         schema: { type: boolean }
 *       - in: query
 *         name: priority
 *         schema: { type: string, enum: [high, medium, low] }
 *     responses:
 *       200: { description: Paginated alerts }
 */
router.get('/', protect, getAll);

/**
 * @swagger
 * /api/alerts/read-all:
 *   put:
 *     summary: Mark all alerts as read for the current user
 *     tags: [Alerts]
 *     security: [{ bearerAuth: [] }]
 */
router.put('/read-all', protect, markAllRead);

/**
 * @swagger
 * /api/alerts/generate-deadline:
 *   post:
 *     summary: Generate deadline alerts for high-fit matches (admin only)
 *     tags: [Alerts]
 *     security: [{ bearerAuth: [] }]
 */
router.post('/generate-deadline', protect, restrictTo('admin'), generateDeadlineAlerts);

/**
 * @swagger
 * /api/alerts/generate-high-fit:
 *   post:
 *     summary: Generate high-fit alerts (admin only)
 *     tags: [Alerts]
 *     security: [{ bearerAuth: [] }]
 */
router.post('/generate-high-fit', protect, restrictTo('admin'), generateHighFitAlerts);

/**
 * @swagger
 * /api/alerts/{id}/read:
 *   put:
 *     summary: Mark a single alert as read
 *     tags: [Alerts]
 *     security: [{ bearerAuth: [] }]
 */
router.put('/:id/read', protect, markRead);

/**
 * @swagger
 * /api/alerts/{id}:
 *   delete:
 *     summary: Delete an alert
 *     tags: [Alerts]
 *     security: [{ bearerAuth: [] }]
 */
router.delete('/:id', protect, remove);

module.exports = router;
