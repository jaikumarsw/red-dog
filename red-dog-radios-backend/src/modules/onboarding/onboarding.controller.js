// Updated to compute and return matches upon onboarding completion
const asyncHandler = require('../../utils/asyncHandler');
const onboardingService = require('./onboarding.service');
const matchService = require('../matches/match.service');
const Match = require('../matches/match.schema');
const logger = require('../../utils/logger');

const complete = asyncHandler(async (req, res) => {
  const result = await onboardingService.complete(req.user._id, req.body);
  const orgId = result.organization._id;

  // `computeAllForOrganization` walks every open opportunity and does multiple DB
  // calls per row. On production that can exceed reverse-proxy / client timeouts,
  // which shows up in PM2 as: POST /api/onboarding/complete - - ms - -
  // (no status — connection closed before the handler finished). Run scoring in
  // the background so this route always returns quickly; matches populate within
  // a few seconds and the dashboard / opportunities views load them normally.
  setImmediate(() => {
    matchService
      .computeAllForOrganization(orgId)
      .then((stats) => {
        logger.info(`[Onboarding] Background match compute finished for org ${orgId}`, stats);
      })
      .catch((err) => {
        logger.warn('[Onboarding] Background match compute failed:', err?.message || err);
      });
  });

  let matches = [];
  let totalMatchCount = 0;
  try {
    const topMatches = await Match.find({ organization: orgId, isRelevant: true })
      .sort({ fitScore: -1 })
      .limit(3)
      .populate({
        path: 'opportunity',
        select: 'title minAmount maxAmount funder',
      });

    matches = topMatches.map((m) => {
      const opp = m.opportunity || {};
      return {
        fitScore: m.fitScore,
        opportunityTitle: opp.title || 'Unknown Opportunity',
        funderName: opp.funder || 'Unknown Funder',
        awardAmount: opp.maxAmount || opp.minAmount || 'TBD',
      };
    });

    totalMatchCount = await Match.countDocuments({ organization: orgId });
  } catch (err) {
    logger.warn('[Onboarding] Could not load preview matches after complete.', err);
  }

  return res.status(200).json({
    success: true,
    message: 'Onboarding complete',
    organization: result.organization,
    matches,
    matchCount: totalMatchCount,
    /** True while background `computeAllForOrganization` may still be running */
    matchesRecomputing: true,
  });
});

module.exports = { complete };
