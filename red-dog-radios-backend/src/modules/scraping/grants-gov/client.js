/**
 * Simpler.Grants.gov API client (native fetch, no axios).
 * Auth: X-API-Key header. Rate limit: 60/min, 10K/day.
 */
const logger = require('../../../utils/logger');

const BASE_URL = 'https://api.simpler.grants.gov';
const REQUEST_TIMEOUT_MS = 30000;
const PACE_MS = 1100; // ~55 req/min, safely under 60/min limit
const MAX_RETRIES = 3;

let lastRequestAt = 0;

function getApiKey() {
  const key = process.env.SIMPLER_GRANTS_API_KEY;
  if (!key) {
    throw new Error('SIMPLER_GRANTS_API_KEY env var is not set');
  }
  return key;
}

async function pace() {
  const elapsed = Date.now() - lastRequestAt;
  if (elapsed < PACE_MS) {
    await new Promise((r) => setTimeout(r, PACE_MS - elapsed));
  }
  lastRequestAt = Date.now();
}

async function fetchWithTimeout(url, options) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function request(path, body) {
  const apiKey = getApiKey();
  let lastErr;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await pace();
      const res = await fetchWithTimeout(`${BASE_URL}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
          'User-Agent': 'RedDogGrantIntelligence/1.0',
        },
        body: JSON.stringify(body),
      });

      if (res.status === 401 || res.status === 403) {
        const txt = await res.text();
        throw new Error(`Grants.gov auth failed (${res.status}): ${txt}`);
      }
      if (!res.ok) {
        const txt = await res.text();
        if (attempt < MAX_RETRIES && (res.status === 429 || res.status >= 500)) {
          logger.warn(
            `[grantsGov] HTTP ${res.status} on attempt ${attempt}, retrying`
          );
          await new Promise((r) => setTimeout(r, 2000 * attempt));
          continue;
        }
        throw new Error(`Grants.gov HTTP ${res.status}: ${txt.slice(0, 200)}`);
      }
      return await res.json();
    } catch (err) {
      lastErr = err;
      // Don't retry auth errors
      if (err.message.includes('auth failed')) throw err;
      if (attempt < MAX_RETRIES) {
        logger.warn(
          `[grantsGov] request failed attempt ${attempt}: ${err.message}`
        );
        await new Promise((r) => setTimeout(r, 2000 * attempt));
      }
    }
  }
  throw lastErr;
}

/**
 * Search opportunities. Paginated.
 * Filters: posted_status, opportunity_status, funding_categories, etc.
 */
async function searchOpportunities({
  page = 1,
  pageSize = 100,
  filters = {},
  sortOrder = [{ order_by: 'post_date', sort_direction: 'descending' }],
} = {}) {
  return request('/v1/opportunities/search', {
    pagination: {
      page_offset: page,
      page_size: pageSize,
      sort_order: sortOrder,
    },
    filters,
  });
}

module.exports = { searchOpportunities };
