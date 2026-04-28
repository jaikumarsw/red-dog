const Application = require('../applications/application.schema');
const logger = require('../../utils/logger');
const { AppError } = require('../../middlewares/error.middleware');

const STAGE_ORDER = [
  'discovered',
  'researching',
  'outreach_sent',
  'reply_received',
  'applying',
  'submitted',
  'won',
  'lost',
  'archived',
];

const TERMINAL_STAGES = ['won', 'lost', 'archived'];

const normalizeStage = (s) => (s ? String(s).trim() : '');

const stageIndex = (s) => STAGE_ORDER.indexOf(normalizeStage(s));

const canAdvance = ({ from, to, changedBy }) => {
  const next = normalizeStage(to);
  const cur = normalizeStage(from);

  if (!next) return { ok: false, reason: 'missing_stage' };
  if (stageIndex(next) === -1) return { ok: false, reason: 'invalid_stage' };

  if (next === cur) return { ok: true, skip: true };

  // System cannot set terminal stages
  if (changedBy === 'system' && TERMINAL_STAGES.includes(next)) {
    return { ok: false, reason: 'system_cannot_set_terminal' };
  }

  // Terminal stages can be set from anywhere (user only).
  if (TERMINAL_STAGES.includes(next)) return { ok: true };

  // Only advance forward.
  if (stageIndex(cur) !== -1 && stageIndex(next) < stageIndex(cur)) {
    return { ok: false, reason: 'cannot_move_backward' };
  }

  return { ok: true };
};

const advanceStage = async (grantId, newStage, { changedBy = 'system', note = '' } = {}) => {
  const stage = normalizeStage(newStage);
  const by = changedBy === 'user' ? 'user' : 'system';
  const n = note ? String(note) : '';

  const grant = await Application.findById(grantId);
  if (!grant) throw new AppError('Grant not found', 404);

  const decision = canAdvance({ from: grant.pipelineStage, to: stage, changedBy: by });
  if (!decision.ok) {
    throw new AppError(`Invalid stage transition: ${decision.reason}`, 400);
  }
  if (decision.skip) return grant;

  grant.pipelineStage = stage;
  grant.pipelineHistory = grant.pipelineHistory || [];
  grant.pipelineHistory.push({ stage, changedBy: by, note: n });
  await grant.save();

  logger.info(`Grant ${grantId} advanced to ${stage}`);
  return grant;
};

module.exports = { advanceStage, STAGE_ORDER, TERMINAL_STAGES };

