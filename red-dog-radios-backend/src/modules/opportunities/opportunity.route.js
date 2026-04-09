const express = require('express');
const { getAll, getOne, create, update, remove } = require('./opportunity.controller');
const { protect, restrictTo } = require('../../middlewares/auth.middleware');

const router = express.Router();

/**
 * @swagger
 * /api/opportunities:
 *   get:
 *     summary: Get all opportunities (paginated)
 *     tags: [Opportunities]
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
 *         schema: { type: string, enum: [open, closing, closed] }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *     responses:
 *       200: { description: Paginated list of opportunities }
 *   post:
 *     summary: Create a new opportunity
 *     tags: [Opportunities]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, funder]
 *             properties:
 *               title: { type: string }
 *               funder: { type: string }
 *               deadline: { type: string, format: date }
 *               maxAmount: { type: number }
 *               category: { type: string }
 *     responses:
 *       201: { description: Opportunity created }
 */
router.route('/').get(protect, getAll).post(protect, create);

/**
 * @swagger
 * /api/opportunities/{id}:
 *   get:
 *     summary: Get a single opportunity
 *     tags: [Opportunities]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Opportunity data }
 *       404: { description: Opportunity not found }
 *   put:
 *     summary: Update an opportunity
 *     tags: [Opportunities]
 *     security: [{ bearerAuth: [] }]
 *   delete:
 *     summary: Delete an opportunity (admin only)
 *     tags: [Opportunities]
 *     security: [{ bearerAuth: [] }]
 */
router.route('/:id').get(protect, getOne).put(protect, update).delete(protect, restrictTo('admin'), remove);

module.exports = router;
