'use strict';

const { google } = require('googleapis');
const Organization = require('../modules/organizations/organization.schema');
const logger = require('../utils/logger');

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;

const oauth2Client =
  CLIENT_ID && CLIENT_SECRET && REDIRECT_URI
    ? new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI)
    : null;

const assertConfigured = () => {
  if (!oauth2Client) {
    throw new Error('Google OAuth not configured (missing GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI)');
  }
};

const getAuthUrl = (organizationId, source) => {
  try {
    assertConfigured();
    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: ['https://www.googleapis.com/auth/gmail.send', 'https://www.googleapis.com/auth/gmail.readonly'],
      state: source ? `${organizationId}|${source}` : String(organizationId),
    });
  } catch (err) {
    logger.error('[GmailOAuth] getAuthUrl failed:', err.message);
    throw err;
  }
};

const exchangeCodeForTokens = async (code) => {
  try {
    assertConfigured();
    const { tokens } = await oauth2Client.getToken(code);
    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date,
    };
  } catch (err) {
    logger.error('[GmailOAuth] exchangeCodeForTokens failed:', err.message);
    throw err;
  }
};

const getValidAccessToken = async (organization) => {
  try {
    assertConfigured();
    const refreshToken = organization?.gmailOAuth?.refreshToken;
    if (!refreshToken) {
      throw new Error('Organization has no Gmail refresh token');
    }

    const expiry = organization?.gmailOAuth?.tokenExpiry ? new Date(organization.gmailOAuth.tokenExpiry).getTime() : 0;
    const isExpired = !expiry || expiry <= Date.now() + 60 * 1000; // refresh 60s early

    if (!isExpired && organization?.gmailOAuth?.accessToken) {
      return organization.gmailOAuth.accessToken;
    }

    oauth2Client.setCredentials({ refresh_token: refreshToken });

    let accessToken = null;
    let tokenExpiry = null;

    // Prefer refreshAccessToken when available (older googleapis), otherwise use getAccessToken()
    if (typeof oauth2Client.refreshAccessToken === 'function') {
      const resp = await oauth2Client.refreshAccessToken();
      const creds = resp?.credentials || resp;
      accessToken = creds?.access_token || null;
      tokenExpiry = creds?.expiry_date ? new Date(creds.expiry_date) : null;
    } else {
      const tokenResp = await oauth2Client.getAccessToken();
      accessToken = tokenResp?.token || tokenResp || null;
      const creds = oauth2Client.credentials || {};
      tokenExpiry = creds.expiry_date ? new Date(creds.expiry_date) : null;
    }

    if (!accessToken) {
      throw new Error('Failed to refresh Gmail access token');
    }

    await Organization.findByIdAndUpdate(organization._id, {
      $set: {
        'gmailOAuth.accessToken': accessToken,
        ...(tokenExpiry ? { 'gmailOAuth.tokenExpiry': tokenExpiry } : {}),
      },
    });

    return accessToken;
  } catch (err) {
    logger.error('[GmailOAuth] getValidAccessToken failed:', err.message);
    throw err;
  }
};

const base64UrlEncode = (input) =>
  Buffer.from(input, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

const sendViaGmail = async ({ accessToken, senderEmail, to, subject, htmlBody, replyTo }) => {
  try {
    assertConfigured();
    if (!replyTo) throw new Error('replyTo is required');
    if (!accessToken) throw new Error('accessToken is required');
    if (!senderEmail) throw new Error('senderEmail is required');

    const auth = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
    auth.setCredentials({ access_token: accessToken });

    const gmail = google.gmail({ version: 'v1', auth });

    const raw = [
      `From: ${senderEmail}`,
      `To: ${to}`,
      `Subject: ${subject || ''}`,
      `Reply-To: ${replyTo}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset="UTF-8"',
      '',
      htmlBody || '',
    ].join('\r\n');

    const encodedMessage = base64UrlEncode(raw);

    const resp = await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw: encodedMessage },
    });

    const messageId = resp?.data?.id || resp?.data?.threadId;
    return { success: true, messageId };
  } catch (err) {
    logger.error('[GmailOAuth] sendViaGmail failed:', err.message);
    throw err;
  }
};

module.exports = {
  getAuthUrl,
  exchangeCodeForTokens,
  getValidAccessToken,
  sendViaGmail,
};

