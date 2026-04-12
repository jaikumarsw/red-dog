/**
 * Safely parse and cap pagination parameters from query strings.
 * Prevents unbounded queries (e.g. limit=999999).
 *
 * @param {object} query - Raw query object (req.query or similar)
 * @param {object} [defaults]
 * @param {number} [defaults.defaultLimit=20]
 * @param {number} [defaults.maxLimit=100]
 * @returns {{ page: number, limit: number }}
 */
const parsePagination = (query = {}, { defaultLimit = 20, maxLimit = 100 } = {}) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(parseInt(query.limit, 10) || defaultLimit, maxLimit);
  return { page, limit };
};

module.exports = { parsePagination };
