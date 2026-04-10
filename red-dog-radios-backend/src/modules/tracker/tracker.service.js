const Application = require('../applications/application.schema');
const Organization = require('../organizations/organization.schema');
const Match = require('../matches/match.schema');

const getTracker = async ({ page = 1, limit = 20, status, organizationId } = {}) => {
  const query = {};
  if (organizationId) query.organization = organizationId;
  if (status && status !== 'all') query.status = status;

  return Application.paginate(query, {
    page: parseInt(page),
    limit: parseInt(limit),
    sort: { updatedAt: -1 },
    populate: [
      { path: 'organization', select: 'name' },
      { path: 'opportunity', select: 'title funder maxAmount deadline' },
      { path: 'funder', select: 'name avgGrantMax deadline' },
    ],
  });
};

const getTrackerStats = async (organizationId) => {
  const query = organizationId ? { organization: organizationId } : {};

  const [apps, matchCount] = await Promise.all([
    Application.find(query).populate('opportunity', 'maxAmount').populate('funder', 'avgGrantMax'),
    organizationId
      ? Match.countDocuments({ organization: organizationId, fitScore: { $gte: 65 } })
      : Match.countDocuments({ fitScore: { $gte: 65 } }),
  ]);

  const statusCounts = {};
  let totalDollarsRequested = 0;
  let totalDollarsAwarded = 0;

  for (const app of apps) {
    statusCounts[app.status] = (statusCounts[app.status] || 0) + 1;

    const maxAmt = app.funder?.avgGrantMax || app.opportunity?.maxAmount || app.amountRequested || 0;
    if (['submitted', 'in_review', 'follow_up_needed'].includes(app.status)) {
      totalDollarsRequested += maxAmt;
    }
    if (app.status === 'awarded') {
      totalDollarsAwarded += maxAmt;
      totalDollarsRequested += maxAmt;
    }
  }

  return {
    totalMatchedFunders: matchCount,
    applicationsInProgress: (statusCounts['draft'] || 0) + (statusCounts['drafting'] || 0) + (statusCounts['ready_to_submit'] || 0),
    submittedApplications: (statusCounts['submitted'] || 0) + (statusCounts['in_review'] || 0),
    awardsWon: statusCounts['awarded'] || 0,
    totalDollarsRequested,
    totalDollarsAwarded,
    statusCounts,
  };
};

module.exports = { getTracker, getTrackerStats };
