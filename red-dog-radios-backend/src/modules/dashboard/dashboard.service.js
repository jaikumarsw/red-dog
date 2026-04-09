const Organization = require('../organizations/organization.schema');
const Opportunity = require('../opportunities/opportunity.schema');
const Match = require('../matches/match.schema');
const Outbox = require('../outbox/outbox.schema');
const Application = require('../applications/application.schema');
const Alert = require('../alerts/alert.schema');

const getStats = async () => {
  const [
    totalOrganizations,
    activeOpportunities,
    highFitMatches,
    pendingOutbox,
    applicationsSent,
    activeAlerts,
  ] = await Promise.all([
    Organization.countDocuments({ status: 'active' }),
    Opportunity.countDocuments({ status: 'open' }),
    Match.countDocuments({ fitScore: { $gte: 75 } }),
    Outbox.countDocuments({ status: 'pending' }),
    Application.countDocuments({ status: { $in: ['submitted', 'in_review', 'awarded'] } }),
    Alert.countDocuments({ isRead: false }),
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

  // Fetch attention items from recent high-priority alerts
  const recentAlerts = await Alert.find({ isRead: false, priority: { $in: ['high', 'medium'] } })
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

  return {
    totalOrganizations,
    activeOpportunities,
    highFitMatches,
    pendingOutbox,
    applicationsSent,
    activeAlerts,
    systemJobs,
    attentionItems,
  };
};

module.exports = { getStats };
