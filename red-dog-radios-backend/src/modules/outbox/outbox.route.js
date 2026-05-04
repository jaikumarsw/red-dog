const express = require('express');
const {
  getAll,
  getOne,
  getGrantHistory,
  adminGetAll,
  adminGetOne,
  adminRetryNow,
  adminDeleteOne,
  queueEmail,
  sendEmail,
  sendOrSchedule,
  retryFailed,
} = require('./outbox.controller');
const { protect, restrictTo } = require('../../middlewares/auth.middleware');

const router = express.Router();

/**
 * @swagger
 * /api/outbox:
 *   get:
 *     summary: Get all outbox records (paginated)
 *     tags: [Outbox]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [pending, sent, failed] }
 *       - in: query
 *         name: emailType
 *         schema: { type: string }
 *     responses:
 *       200: { description: Paginated outbox records }
 */
router.get('/', protect, getAll);

// Grant-level email history (agency-scoped)
router.get('/grant/:grantId', protect, getGrantHistory);

/**
 * @swagger
 * /api/outbox/queue:
 *   post:
 *     summary: Queue a new email for sending
 *     tags: [Outbox]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [recipient, subject, htmlBody]
 *             properties:
 *               recipient: { type: string }
 *               recipientName: { type: string }
 *               subject: { type: string }
 *               htmlBody: { type: string }
 *               emailType: { type: string }
 */
router.post('/queue', protect, queueEmail);
router.post('/send-or-schedule', protect, sendOrSchedule);

/**
 * @swagger
 * /api/outbox/process:
 *   post:
 *     summary: Process the pending email queue (admin only)
 *     tags: [Outbox]
 *     security: [{ bearerAuth: [] }]
 */
/**
 * @swagger
 * /api/outbox/{id}:
 *   get:
 *     summary: Get a single outbox record
 *     tags: [Outbox]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/:id', protect, getOne);

/**
 * @swagger
 * /api/outbox/{id}/send:
 *   post:
 *     summary: Send a specific outbox email
 *     tags: [Outbox]
 *     security: [{ bearerAuth: [] }]
 */
router.post('/:id/send', protect, sendEmail);

/**
 * @swagger
 * /api/outbox/{id}/retry:
 *   post:
 *     summary: Retry a failed email
 *     tags: [Outbox]
 *     security: [{ bearerAuth: [] }]
 */
router.post('/:id/retry', protect, retryFailed);

// ── Admin Outbox dashboard endpoints (do not break agency outbox) ────────────
router.get('/admin/all', protect, restrictTo('admin'), adminGetAll);
router.get('/admin/:id', protect, restrictTo('admin'), adminGetOne);
router.post('/admin/:id/retry', protect, restrictTo('admin'), adminRetryNow);
router.delete('/admin/:id', protect, restrictTo('admin'), adminDeleteOne);

module.exports = router;
