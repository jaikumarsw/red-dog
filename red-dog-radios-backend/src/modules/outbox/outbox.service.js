const Outbox = require('./outbox.schema');
const transporter = require('../../config/email.config');
const { AppError } = require('../../middlewares/error.middleware');
const logger = require('../../utils/logger');

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

const getOne = async (id) => {
  const record = await Outbox.findById(id);
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
  relatedOrganization,
  relatedUser,
  scheduledFor,
}) => {
  return Outbox.create({
    recipient,
    recipientName,
    subject,
    htmlBody,
    emailType: emailType || 'manual',
    isTest: isTest || false,
    emailKey,
    relatedOrganization,
    relatedUser,
    scheduledFor: scheduledFor || undefined,
    status: 'pending',
  });
};

const sendEmail = async (outboxId) => {
  const record = await Outbox.findById(outboxId);
  if (!record) throw new AppError('Outbox record not found', 404);

  const smtpConfigured = !!(process.env.SMTP_USER && process.env.SMTP_PASS);

  if (!smtpConfigured) {
    // Stub: Mark as sent without actually sending
    logger.info(`[STUB] Email to ${record.recipient}: "${record.subject}" — SMTP not configured, marking as sent`);
    record.status = 'sent';
    record.sentAt = new Date();
    record.providerMessageId = `stub-${Date.now()}`;
    await record.save();
    return { success: true, stubbed: true, messageId: record.providerMessageId };
  }

  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: record.recipient,
      subject: record.subject,
      html: record.htmlBody,
    });
    record.status = 'sent';
    record.sentAt = new Date();
    record.providerMessageId = info.messageId;
    await record.save();
    return { success: true, messageId: info.messageId };
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

module.exports = { getAll, getOne, create, queueEmail, sendEmail, processQueue, retryFailed };
