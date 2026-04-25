const Organization = require('../organizations/organization.schema');
const Opportunity = require('../opportunities/opportunity.schema');
const Match = require('../matches/match.schema');
const Outbox = require('../outbox/outbox.schema');
const Application = require('../applications/application.schema');
const Alert = require('../alerts/alert.schema');
const Funder = require('../funders/funder.schema');

const getStats = async (organizationId) => {
  const orgFilter = { organization: organizationId };
  const orgMatchFilter = { organization: organizationId };

  const [
    orgDoc,
    activeOpportunities,
    matchedFunders, // count of high fit matches
    pendingOutbox,
    activeAlerts,
    // Application counts by status
    inProgress,
    submitted,
    waitingOnInformation,
    awarded,
    rejected,
    // Dollar amounts
    submittedApps,
    awardedApps,
  ] = await Promise.all([
    Organization.findById(organizationId),
    Opportunity.countDocuments({ status: 'open' }),
    Match.countDocuments({ ...orgMatchFilter, fitScore: { $gte: 75 } }),
    Outbox.countDocuments({ status: 'pending', relatedOrganization: organizationId }),
    Alert.countDocuments({ ...orgFilter, isRead: false }),
    // Application counts
    Application.countDocuments({ ...orgFilter, status: 'drafting' }),
    Application.countDocuments({ ...orgFilter, status: { $in: ['submitted', 'in_review'] } }),
    Application.countDocuments({ ...orgFilter, status: 'waiting_on_information' }),
    Application.countDocuments({ ...orgFilter, status: 'awarded' }),
    Application.countDocuments({ ...orgFilter, status: 'rejected' }),
    // Apps for dollar summing
    Application.find({
      ...orgFilter,
      status: { $in: ['submitted', 'in_review', 'waiting_on_information'] },
    }).populate('opportunity', 'maxAmount').populate('funder', 'avgGrantMax'),
    Application.find({ ...orgFilter, status: 'awarded' })
      .populate('opportunity', 'maxAmount')
      .populate('funder', 'avgGrantMax'),
  ]);

  const systemJobs = [
    {
      name: 'Nightly Match Refresh',
      status: 'SCHEDULED',
      lastRun: null,
      nextRun: '02:00 AM daily',
      duration: null,
    },
    {
      name: 'Deadline Alert Generation',
      status: 'SCHEDULED',
      lastRun: null,
      nextRun: '02:30 AM daily',
      duration: null,
    },
    {
      name: 'High-Fit Alert Generation',
      status: 'SCHEDULED',
      lastRun: null,
      nextRun: '02:45 AM daily',
      duration: null,
    },
    {
      name: 'Email Outbox Processing',
      status: 'SCHEDULED',
      lastRun: null,
      nextRun: 'Every hour',
      duration: null,
    },
  ];

  const recentAlerts = await Alert.find({
    ...orgFilter,
    isRead: false,
    priority: { $in: ['high', 'medium'] },
  })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate('organization', 'name')
    .populate('opportunity', 'title deadline');

  const attentionItems = recentAlerts.map((alert) => ({
    type: alert.type,
    priority: alert.priority.toUpperCase(),
    orgName: alert.orgName || alert.organization?.name || 'Unknown',
    grantName: alert.grantName || alert.opportunity?.title || 'Unknown',
    description: alert.message,
    date: alert.opportunity?.deadline
      ? `Due: ${new Date(alert.opportunity.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
      : null,
  }));

  const totalRequested = submittedApps.reduce((sum, a) => {
    return sum + (a.funder?.avgGrantMax || a.opportunity?.maxAmount || a.amountRequested || 0);
  }, 0);
  const totalAwarded = awardedApps.reduce((sum, a) => {
    return sum + (a.funder?.avgGrantMax || a.opportunity?.maxAmount || a.amountRequested || 0);
  }, 0);

  const topFunders = await Funder.find({ status: 'active' }).sort({ name: 1 }).limit(5);

  return {
    totalOrganizations: orgDoc ? 1 : 0,
    activeOpportunities,
    matchedFunders,
    pendingOutbox,
    applicationsSent: submitted + awarded + waitingOnInformation, // compatibility
    activeAlerts,
    // New stats keys
    inProgress,
    submitted,
    waitingOnInformation,
    awarded,
    rejected,
    totalRequested,
    totalAwarded,
    topFunders: topFunders.map((f) => ({
      id: f._id,
      name: f.name,
      avgGrantMax: f.avgGrantMax,
      deadline: f.deadline,
    })),
    systemJobs,
    attentionItems,
  };
};

module.exports = { getStats };
