const Reply = require('./reply.schema');
const Outbox = require('../outbox/outbox.schema');
const Organization = require('../organizations/organization.schema');
const asyncHandler = require('../../utils/asyncHandler');
const { success } = require('../../utils/apiResponse');
const { pollAllAgencies } = require('./reply.polling.service');

// GET /api/admin/replies — paginated list for admin
const adminListReplies = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const organizationId = req.query.organizationId;
  
  const filter = {};
  if (organizationId) filter.organizationId = organizationId;

  const replies = await Reply.find(filter)
    .populate('organizationId', 'name')
    .populate('outboxId', 'subject recipient sentAt')
    .sort({ receivedAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  const total = await Reply.countDocuments(filter);

  return success(res, { 
    replies, 
    total, 
    page, 
    totalPages: Math.ceil(total / limit) 
  });
});

// GET /api/admin/replies/:id — single reply detail
const adminGetReply = asyncHandler(async (req, res) => {
  const reply = await Reply.findById(req.params.id)
    .populate('organizationId', 'name email')
    .populate('outboxId');
  
  if (!reply) return res.status(404).json({ error: 'Not found' });

  // Mark as viewed by admin
  if (!reply.adminViewed) {
    reply.adminViewed = true;
    await reply.save();
  }

  return success(res, reply);
});

// GET /api/admin/communications — combined view of sent + received
const adminCommunications = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const organizationId = req.query.organizationId;

  const filter = {};
  if (organizationId) filter.relatedOrganization = organizationId;

  // Get outbox records
  const outboxRecords = await Outbox.find({ ...filter, status: 'sent' })
    .populate('relatedOrganization', 'name')
    .sort({ sentAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  // For each outbox, attach reply count
  const outboxIds = outboxRecords.map(r => r._id);
  const replyCounts = await Reply.aggregate([
    { $match: { outboxId: { $in: outboxIds } } },
    { $group: { _id: '$outboxId', count: { $sum: 1 } } }
  ]);

  const replyCountMap = new Map();
  replyCounts.forEach(rc => replyCountMap.set(rc._id.toString(), rc.count));

  const enriched = outboxRecords.map(r => ({
    ...r,
    replyCount: replyCountMap.get(r._id.toString()) || 0
  }));

  const total = await Outbox.countDocuments({ ...filter, status: 'sent' });

  return success(res, {
    communications: enriched,
    total,
    page,
    totalPages: Math.ceil(total / limit)
  });
});

// POST /api/admin/replies/poll-now — manual trigger (admin)
const triggerPoll = asyncHandler(async (req, res) => {
  const result = await pollAllAgencies();
  return success(res, result);
});

// GET /api/admin/replies/by-outbox/:outboxId — replies for a 
// specific sent message (thread view)
const adminRepliesByOutbox = asyncHandler(async (req, res) => {
  const replies = await Reply.find({ outboxId: req.params.outboxId })
    .populate('organizationId', 'name')
    .sort({ receivedAt: 1 });
  
  return success(res, replies);
});

module.exports = {
  adminListReplies,
  adminGetReply,
  adminCommunications,
  triggerPoll,
  adminRepliesByOutbox
};
