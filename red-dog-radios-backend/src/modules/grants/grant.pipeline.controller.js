const asyncHandler = require('../../utils/asyncHandler');
const { success } = require('../../utils/apiResponse');
const { AppError } = require('../../middlewares/error.middleware');
const { resolveAgencyOrganizationId } = require('../../utils/resolveOrganizationId');
const { advanceStage, STAGE_ORDER } = require('./grant.pipeline.service');
const Application = require('../applications/application.schema');

const MANUAL_ALLOWED = ['applying', 'submitted', 'won', 'lost', 'archived'];
const SYSTEM_ONLY = ['discovered', 'researching', 'outreach_sent', 'reply_received'];

const assertGrantInOrg = async (grantId, organizationId) => {
  const row = await Application.findById(grantId).select('organization');
  if (!row || !organizationId || String(row.organization) !== String(organizationId)) {
    throw new AppError('Grant not found', 404);
  }
};

const getPipeline = asyncHandler(async (req, res) => {
  const organizationId = await resolveAgencyOrganizationId(req.user);
  await assertGrantInOrg(req.params.id, organizationId);
  const grant = await Application.findById(req.params.id).select('pipelineStage pipelineHistory updatedAt');
  if (!grant) throw new AppError('Grant not found', 404);
  return success(
    res,
    { pipelineStage: grant.pipelineStage, pipelineHistory: grant.pipelineHistory || [], updatedAt: grant.updatedAt },
    'Pipeline retrieved'
  );
});

const setPipelineStage = asyncHandler(async (req, res) => {
  const organizationId = await resolveAgencyOrganizationId(req.user);
  await assertGrantInOrg(req.params.id, organizationId);

  const stage = String(req.body?.stage || '').trim();
  const note = req.body?.note != null ? String(req.body.note) : '';

  if (!stage) throw new AppError('stage is required', 400);
  if (SYSTEM_ONLY.includes(stage)) {
    throw new AppError('This stage cannot be set manually', 400);
  }
  if (!MANUAL_ALLOWED.includes(stage)) {
    throw new AppError(`Invalid manual stage. Allowed: ${MANUAL_ALLOWED.join(', ')}`, 400);
  }

  const updated = await advanceStage(req.params.id, stage, { changedBy: 'user', note });
  return success(
    res,
    { pipelineStage: updated.pipelineStage, pipelineHistory: updated.pipelineHistory || [], updatedAt: updated.updatedAt },
    'Pipeline updated'
  );
});

const adminBoard = asyncHandler(async (req, res) => {
  const rows = await Application.find({})
    .select('projectTitle organization pipelineStage pipelineHistory updatedAt')
    .populate({ path: 'organization', select: 'name' })
    .lean();

  const board = {};
  for (const s of STAGE_ORDER) board[s] = [];

  for (const g of rows) {
    const stage = g.pipelineStage && STAGE_ORDER.includes(g.pipelineStage) ? g.pipelineStage : 'discovered';
    board[stage].push({
      _id: g._id,
      title: g.projectTitle || 'Application',
      organization: g.organization,
      pipelineStage: stage,
      updatedAt: g.updatedAt,
      pipelineHistory: g.pipelineHistory || [],
    });
  }

  return success(res, board, 'Pipeline board retrieved');
});

module.exports = { getPipeline, setPipelineStage, adminBoard };

