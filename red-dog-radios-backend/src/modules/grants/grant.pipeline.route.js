const express = require('express');
const { protect, restrictTo } = require('../../middlewares/auth.middleware');
const { getPipeline, setPipelineStage, adminBoard } = require('./grant.pipeline.controller');

const router = express.Router();

router.get('/pipeline/board', protect, restrictTo('admin'), adminBoard);
router.get('/:id/pipeline', protect, getPipeline);
router.patch('/:id/pipeline', protect, setPipelineStage);

module.exports = router;

