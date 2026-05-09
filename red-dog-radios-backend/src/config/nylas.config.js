'use strict';

const Nylas = require('nylas').default;

const API_KEY = process.env.NYLAS_API_KEY;
const CLIENT_ID = process.env.NYLAS_CLIENT_ID;
const CLIENT_SECRET = process.env.NYLAS_CLIENT_SECRET;
const REDIRECT_URI = process.env.NYLAS_REDIRECT_URI;
const API_URI = process.env.NYLAS_API_URI || 'https://api.us.nylas.com';

let nylasClient = null;

const getNylasClient = () => {
  if (nylasClient) return nylasClient;
  if (!API_KEY) throw new Error('NYLAS_API_KEY is not set');
  nylasClient = new Nylas({ apiKey: API_KEY, apiUri: API_URI });
  return nylasClient;
};

const assertConfigured = () => {
  if (!API_KEY || !CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
    throw new Error('Nylas not configured — set NYLAS_API_KEY, NYLAS_CLIENT_ID, NYLAS_CLIENT_SECRET, NYLAS_REDIRECT_URI');
  }
};

module.exports = { getNylasClient, assertConfigured, CLIENT_ID, CLIENT_SECRET, REDIRECT_URI };
