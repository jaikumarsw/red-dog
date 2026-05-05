const Outbox = require('./outbox.schema');
const Organization = require('../organizations/organization.schema');
const { sendEmail: sendEmailProvider } = require('../../config/email.config');
const { AppError } = require('../../middlewares/error.middleware');
const logger = require('../../utils/logger');
const { marked } = require('marked');

const getAll = async ({ page = 1, limit = 20, status, emailType, isTest, relatedOrganization }) => {
  const query = {};
  if (status) query.status = status;
  if (emailType) query.emailType = emailType;
  if (isTest !== undefined) query.isTest = isTest === 'true' || isTest === true;
  if (relatedOrganization) query.relatedOrganization = relatedOrganization;

  return Outbox.paginate(query, {
    page: parseInt(page),
    limit: parseInt(limit),
    sort: { createdAt: -1 },
  });
};

const getAllAdmin = async ({
  page = 1,
  limit = 20,
  status,
  emailType,
  sentViaGmail,
  organizationId,
  search,
}) => {
  const query = {};
  if (status) query.status = status;
  if (emailType) query.emailType = emailType;
  if (sentViaGmail !== undefined && sentViaGmail !== null && sentViaGmail !== '') {
    query.sentViaGmail = sentViaGmail === 'true' || sentViaGmail === true;
  }
  if (organizationId) {
    // Admin filter uses the "agency" linkage used for Gmail routing.
    query.relatedAgency = organizationId;
  }
  if (search) {
    const s = String(search).trim();
    if (s) {
      query.$or = [
        { recipient: { $regex: s, $options: 'i' } },
        { subject: { $regex: s, $options: 'i' } },
      ];
    }
  }

  return Outbox.paginate(query, {
    page: parseInt(page),
    limit: parseInt(limit),
    sort: { createdAt: -1 },
    populate: [
      { path: 'relatedAgency', select: 'name' },
      { path: 'relatedUser', select: 'fullName firstName lastName email' },
      { path: 'relatedGrant', select: 'projectTitle' },
    ],
  });
};

const getOne = async (id) => {
  const record = await Outbox.findById(id);
  if (!record) throw new AppError('Outbox record not found', 404);
  return record;
};

const getOneAdmin = async (id) => {
  const record = await Outbox.findById(id)
    .populate({ path: 'relatedAgency' })
    .populate({ path: 'relatedOrganization' })
    .populate({ path: 'relatedGrant', select: 'projectTitle' })
    .populate({ path: 'relatedUser', select: 'fullName firstName lastName email' });
  if (!record) throw new AppError('Outbox record not found', 404);
  return record;
};

const create = async (data) => Outbox.create(data);

const queueEmail = async ({
  recipient,
  recipientName,
  subject,
  htmlBody,
  emailType,
  isTest,
  emailKey,
  senderName,
  senderCompany,
  senderLocation,
  senderWebsite,
  relatedOrganization,
  relatedAgency,
  relatedUser,
  relatedGrant,
  scheduledFor,
}) => {
  try {
    // 1. Strip [DATA NEEDED] placeholders and clean extra whitespace
    const cleanedBody = String(htmlBody || '')
      .replace(/\[DATA NEEDED\][^\n]*/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    // 2. Convert Markdown to proper HTML (handles [text](url) -> <a href="url">text</a>)
    let finalHtml = marked.parse(cleanedBody);

    // 3. Append sender signature if any sender fields are provided
    if ((senderName || senderCompany) && !finalHtml.includes('─────────────────')) {
      const lines = [];
      if (senderName) lines.push(`<p style="margin:0"><strong>${senderName}</strong></p>`);
      if (senderCompany) lines.push(`<p style="margin:0">${senderCompany}</p>`);
      if (senderLocation) lines.push(`<p style="margin:0">${senderLocation}</p>`);
      if (senderWebsite) lines.push(`<p style="margin:0"><a href="${senderWebsite}">${senderWebsite}</a></p>`);
      finalHtml += `\n<br>\n<p style="margin:0;color:#6b7280;font-size:13px">─────────────────</p>\n${lines.join('\n')}`;
    }

    const record = new Outbox({
      recipient,
      recipientName,
      subject,
      htmlBody: finalHtml,
      emailType: emailType || 'manual',
      isTest: isTest || false,
      emailKey,
      senderName: senderName || undefined,
      senderCompany: senderCompany || undefined,
      senderLocation: senderLocation || undefined,
      senderWebsite: senderWebsite || undefined,
      relatedOrganization,
      relatedAgency,
      relatedUser,
      relatedGrant,
      scheduledFor: scheduledFor || undefined,
      status: 'pending',
    });

    // Set Reply-To to the agency's real inbox so funder replies route correctly.
    let replyTo = null;
    if (relatedAgency || relatedOrganization) {
      const orgId = relatedAgency || relatedOrganization;
      const organization = await Organization.findById(orgId)
        .select('gmailOAuth.senderEmail email')
        .lean();
      if (organization?.gmailOAuth?.senderEmail) {
        // Agency has Gmail OAuth connected — replies go to agency Gmail.
        replyTo = organization.gmailOAuth.senderEmail;
      } else if (organization?.email) {
        // Fall back to agency contact email.
        replyTo = organization.email;
      }
    }
    // If neither exists, do not set Reply-To at all.
    record.replyTo = replyTo || undefined;

    await record.save();

    return record;
  } catch (err) {
    logger.error('[Outbox] queueEmail failed:', err.message);
    throw err;
  }
};

const sendEmail = async (outboxId) => {
  const record = await Outbox.findById(outboxId);
  if (!record) throw new AppError('Outbox record not found', 404);

  try {
    let senderEmailForLog = record.senderEmail || process.env.SMTP_FROM || process.env.SMTP_USER || 'provider-resolved';
    if (record.relatedAgency) {
      const org = await Organization.findById(record.relatedAgency).select('gmailOAuth.senderEmail').lean();
      if (org?.gmailOAuth?.senderEmail) senderEmailForLog = org.gmailOAuth.senderEmail;
    }
    logger.info(`[Outbox] Sending email — From: ${senderEmailForLog}, Reply-To: ${record.replyTo || 'not-set'}, To: ${record.recipient}`);

    const result = await sendEmailProvider({
      to: record.recipient,
      subject: record.subject,
      html: record.htmlBody,
      replyTo: record.replyTo,
      senderName: record.senderName || undefined,
      organizationId: record.relatedAgency || undefined,
    });

    if (!result.success && !result.stub) {
      throw new Error(result.error || 'Email send failed');
    }

    record.status = 'sent';
    record.sentAt = new Date();
    record.providerMessageId = result.id || `resend-${Date.now()}`;
    record.sentViaGmail = !!result.sentViaGmail;
    record.senderEmail = result.senderEmail || record.senderEmail;
    await record.save();
    logger.info(`[Outbox] Sent successfully. providerMessageId: ${record.providerMessageId}`);
    return { success: true, stubbed: !!result.stub, messageId: record.providerMessageId };
  } catch (err) {
    record.status = 'failed';
    record.retryCount += 1;
    record.errorMessage = err.message;
    await record.save();
    return { success: false, error: err.message };
  }
};

const processQueue = async (limit = 50) => {
  const now = new Date();
  const pending = await Outbox.find({
    status: 'pending',
    retryCount: { $lt: 5 },
    $or: [{ scheduledFor: { $exists: false } }, { scheduledFor: null }, { scheduledFor: { $lte: now } }],
  })
    .sort({ scheduledFor: 1, createdAt: 1 })
    .limit(limit);
  let sent = 0, failed = 0;

  for (const item of pending) {
    const result = await sendEmail(item._id);
    if (result.success) sent++;
    else failed++;
  }

  return { processed: pending.length, sent, failed };
};

const retryFailed = async (outboxId) => {
  const record = await Outbox.findByIdAndUpdate(
    outboxId,
    { $set: { status: 'pending' }, $inc: { retryCount: 1 } },
    { new: true }
  );
  if (!record) throw new AppError('Outbox record not found', 404);
  return record;
};

const retryNowAdmin = async (outboxId) => {
  try {
    const record = await Outbox.findById(outboxId);
    if (!record) throw new AppError('Outbox record not found', 404);
    if (record.status !== 'failed') {
      throw new AppError('Only failed emails can be retried', 400);
    }

    record.status = 'pending';
    record.retryCount += 1;
    record.errorMessage = undefined;
    await record.save();

    await sendEmail(outboxId);
    return await getOneAdmin(outboxId);
  } catch (err) {
    logger.error('[Outbox] retryNowAdmin failed:', err.message);
    throw err;
  }
};

const deleteOneAdmin = async (outboxId) => {
  const record = await Outbox.findByIdAndDelete(outboxId);
  if (!record) throw new AppError('Outbox record not found', 404);
  return record;
};

module.exports = {
  getAll,
  getAllAdmin,
  getOne,
  getOneAdmin,
  create,
  queueEmail,
  sendEmail,
  processQueue,
  retryFailed,
  retryNowAdmin,
  deleteOneAdmin,
};
