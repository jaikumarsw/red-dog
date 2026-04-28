'use strict';

const { google } = require('googleapis');
const Organization = require('../organizations/organization.schema');
const logger = require('../../utils/logger');
const { getValidAccessToken } = require('../../config/gmail.config');

const getGmailClient = async (org) => {
  const accessToken = await getValidAccessToken(org);
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  auth.setCredentials({ access_token: accessToken });
  return google.gmail({ version: 'v1', auth });
};

const setupGmailWatch = async (organization) => {
  try {
    const topicName = process.env.GMAIL_PUBSUB_TOPIC;
    if (!topicName) {
      throw new Error('GMAIL_PUBSUB_TOPIC not configured');
    }
    if (!organization?.gmailOAuth?.isConnected) {
      throw new Error('Organization is not connected to Gmail');
    }

    const gmail = await getGmailClient(organization);

    const resp = await gmail.users.watch({
      userId: 'me',
      requestBody: {
        labelIds: ['INBOX'],
        topicName,
      },
    });

    const historyId = resp?.data?.historyId ? String(resp.data.historyId) : null;
    const expiration = resp?.data?.expiration ? new Date(Number(resp.data.expiration)) : null;

    await Organization.findByIdAndUpdate(organization._id, {
      $set: {
        ...(historyId ? { 'gmailOAuth.historyId': historyId } : {}),
        ...(expiration ? { 'gmailOAuth.watchExpiry': expiration } : {}),
      },
    });

    return { historyId, expiration };
  } catch (err) {
    logger.error('[GmailWatch] setupGmailWatch failed:', err.message);
    throw err;
  }
};

const renewAllWatches = async () => {
  try {
    const cutoff = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const orgs = await Organization.find({
      'gmailOAuth.isConnected': true,
      $or: [
        { 'gmailOAuth.watchExpiry': { $exists: false } },
        { 'gmailOAuth.watchExpiry': null },
        { 'gmailOAuth.watchExpiry': { $lte: cutoff } },
      ],
    });

    const results = [];
    for (const org of orgs) {
      try {
        const r = await setupGmailWatch(org);
        logger.info('[GmailWatch] renewed:', org._id, org.gmailOAuth?.senderEmail, r);
        results.push({ organizationId: org._id, ok: true, ...r });
      } catch (e) {
        logger.warn('[GmailWatch] renew failed:', org._id, e.message);
        results.push({ organizationId: org._id, ok: false, error: e.message });
      }
    }

    return { processed: orgs.length, results };
  } catch (err) {
    logger.error('[GmailWatch] renewAllWatches failed:', err.message);
    throw err;
  }
};

module.exports = { setupGmailWatch, renewAllWatches };

