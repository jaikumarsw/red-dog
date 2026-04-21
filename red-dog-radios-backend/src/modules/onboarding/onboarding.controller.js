// Updated to compute and return matches upon onboarding completion
const asyncHandler = require('../../utils/asyncHandler');
const { success } = require('../../utils/apiResponse');
const onboardingService = require('./onboarding.service');
const matchService = require('../matches/match.service');
const Match = require('../matches/match.schema');
const logger = require('../../utils/logger');

const complete = asyncHandler(async (req, res) => {
  const result = await onboardingService.complete(req.user._id, req.body);
  
  let matches = [];
  let totalMatchCount = 0;
  try {
    await matchService.computeAllForOrganization(result.organization._id);
    
    // Get top 3 matches from the DB
    const topMatches = await Match.find({ organization: result.organization._id })
      .sort({ fitScore: -1 })
      .limit(3)
      .populate({
        path: 'opportunity',
        select: 'title minAmount maxAmount funder'
      });
      
    matches = topMatches.map(m => {
      const opp = m.opportunity || {};
      return {
        fitScore: m.fitScore,
        opportunityTitle: opp.title || 'Unknown Opportunity',
        funderName: opp.funder || 'Unknown Funder',
        awardAmount: opp.maxAmount || opp.minAmount || 'TBD'
      };
    });

    totalMatchCount = await Match.countDocuments({ organization: result.organization._id });
  } catch (err) {
    logger.warn('[Onboarding] Match computation failed but continuing onboarding.', err);
  }

  return res.status(200).json({
    success: true,
    message: "Onboarding complete",
    organization: result.organization,
    matches: matches,
    matchCount: totalMatchCount
  });
});

module.exports = { complete };
