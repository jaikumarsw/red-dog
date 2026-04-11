const Win = require('./win.schema');

const Application = require('../applications/application.schema');

const getAll = async ({ page = 1, limit = 20, agencyType, fundingType, projectType, organizationId } = {}) => {
  const query = {};
  if (agencyType) query.agencyType = agencyType;
  if (fundingType) query.fundingType = fundingType;
  if (projectType) query.projectType = projectType;
  if (organizationId) {
    const appIds = await Application.find({ organization: organizationId }).distinct('_id');
    query.applicationId = { $in: appIds };
  }

  return Win.paginate(query, {
    page: parseInt(page),
    limit: parseInt(limit),
    sort: { createdAt: -1 },
    populate: { path: 'applicationId', select: 'projectTitle status' },
  });
};

const getInsights = async (organizationId) => {
  const q = {};
  if (organizationId) {
    const appIds = await Application.find({ organization: organizationId }).distinct('_id');
    q.applicationId = { $in: appIds };
  }
  const wins = await Win.find(q);
  const totalWins = wins.length;
  const totalAwarded = wins.reduce((sum, w) => sum + (w.awardAmount || 0), 0);

  const winsByAgencyType = {};
  const winsByFundingType = {};
  const funderCounts = {};
  const factorCounts = {};

  for (const w of wins) {
    if (w.agencyType) winsByAgencyType[w.agencyType] = (winsByAgencyType[w.agencyType] || 0) + 1;
    if (w.fundingType) winsByFundingType[w.fundingType] = (winsByFundingType[w.fundingType] || 0) + 1;
    if (w.funderName) funderCounts[w.funderName] = (funderCounts[w.funderName] || 0) + 1;
    for (const f of (w.winFactors || [])) {
      factorCounts[f] = (factorCounts[f] || 0) + 1;
    }
  }

  const topFunders = Object.entries(funderCounts)
    .map(([name, winCount]) => ({ name, winCount }))
    .sort((a, b) => b.winCount - a.winCount)
    .slice(0, 5);

  const commonWinFactors = Object.entries(factorCounts)
    .map(([factor, count]) => ({ factor, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return { totalWins, totalAwarded, winsByAgencyType, winsByFundingType, topFunders, commonWinFactors };
};

const create = async (data) => Win.create(data);

module.exports = { getAll, getInsights, create };
