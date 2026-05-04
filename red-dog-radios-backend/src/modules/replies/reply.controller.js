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
    { $sort: { receivedAt: -1 } },
    {
      $group: {
        _id: '$outboxId',
        count: { $sum: 1 },
        latestReplyId: { $first: '$_id' },
        latestReplyFrom: { $first: '$from' },
        latestReplySubject: { $first: '$subject' },
        latestReplyAt: { $first: '$receivedAt' },
        latestAshleenAnalysis: { $first: '$ashleenAnalysis' },
        latestAshleenSuggestion: { $first: '$ashleenSuggestion' },
        latestAshleenError: { $first: '$ashleenError' },
        adminViewed: { $first: '$adminViewed' },
      }
    }
  ]);

  const replyDataMap = new Map();
  replyCounts.forEach(rc => {
    replyDataMap.set(rc._id.toString(), {
      count: rc.count,
      replyId: rc.latestReplyId,
      from: rc.latestReplyFrom,
      subject: rc.latestReplySubject,
      receivedAt: rc.latestReplyAt,
      ashleenAnalysis: rc.latestAshleenAnalysis,
      ashleenSuggestion: rc.latestAshleenSuggestion,
      ashleenError: rc.latestAshleenError,
      adminViewed: rc.adminViewed,
    });
  });

  const enriched = outboxRecords.map(r => ({
    ...r,
    replyCount: (replyDataMap.get(r._id.toString())?.count) || 0,
    latestReply: replyDataMap.get(r._id.toString()) || null,
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

/**
 * Agency: list all replies to this org's outreach emails
 * Sorted newest first. Includes Ashleen suggestion status.
 */
const agencyReplies = asyncHandler(async (req, res) => {
  const organizationId = req.user.organizationId;
  if (!organizationId) {
    return res.status(400).json({ success: false, message: 'No organization linked to account' });
  }

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;

  const replies = await Reply.find({ organizationId })
    .populate({
      path: 'outboxId',
      select: 'subject sentAt relatedGrant',
      populate: {
        path: 'relatedGrant',
        select: 'projectTitle opportunity',
        populate: { path: 'opportunity', select: 'title funder' },
      },
    })
    .sort({ receivedAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .select('-htmlBody -body -ashleenSuggestion') // summaries only in list
    .lean();

  const total = await Reply.countDocuments({ organizationId });
  const unread = await Reply.countDocuments({ organizationId, agencyViewed: false });

  return success(res, { replies, total, unread, page, totalPages: Math.ceil(total / limit) });
});

/**
 * Agency: get single reply with full Ashleen suggestion
 */
const agencyReplyDetail = asyncHandler(async (req, res) => {
  const organizationId = req.user.organizationId;
  const reply = await Reply.findOne({ _id: req.params.id, organizationId })
    .populate({
      path: 'outboxId',
      select: 'subject sentAt senderName senderEmail relatedGrant',
      populate: {
        path: 'relatedGrant',
        select: 'projectTitle opportunity organization',
        populate: [
          { path: 'opportunity', select: 'title funder contactEmail' },
          { path: 'organization', select: 'name' },
        ],
      },
    })
    .lean();

  if (!reply) {
    return res.status(404).json({ success: false, message: 'Reply not found' });
  }

  // Mark as viewed
  await Reply.findByIdAndUpdate(req.params.id, {
    $set: { agencyViewed: true, agencyViewedAt: new Date() },
  });

  return success(res, { reply });
});

/**
 * Agency: explicitly mark reply as viewed
 */
const markAgencyViewed = asyncHandler(async (req, res) => {
  const organizationId = req.user.organizationId;
  await Reply.updateOne(
    { _id: req.params.id, organizationId },
    { $set: { agencyViewed: true, agencyViewedAt: new Date() } }
  );
  return success(res, { marked: true });
});

module.exports = {
  adminListReplies,
  adminGetReply,
  adminCommunications,
  triggerPoll,
  adminRepliesByOutbox,
  agencyReplies,
  agencyReplyDetail,
  markAgencyViewed
};
