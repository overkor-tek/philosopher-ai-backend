/**
 * Pagination Utility
 * Built by C1 Cloud (CP3) - Autonomous Work
 *
 * Standardized pagination for API responses
 *
 * Usage:
 *   const { paginate, paginateQuery } = require('./utils/pagination');
 *   const result = await paginateQuery(pool, 'SELECT * FROM users', req.query);
 */

/**
 * Parse pagination parameters from request
 * @param {Object} query - Request query parameters
 * @param {Object} defaults - Default values
 * @returns {Object} Parsed pagination params
 */
function parsePagination(query = {}, defaults = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || defaults.page || 1);
  const limit = Math.min(
    defaults.maxLimit || 100,
    Math.max(1, parseInt(query.limit, 10) || defaults.limit || 20)
  );
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

/**
 * Create pagination metadata
 * @param {number} total - Total item count
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @returns {Object} Pagination metadata
 */
function createMeta(total, page, limit) {
  const totalPages = Math.ceil(total / limit);

  return {
    total,
    page,
    limit,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
    nextPage: page < totalPages ? page + 1 : null,
    prevPage: page > 1 ? page - 1 : null
  };
}

/**
 * Wrap data with pagination response format
 * @param {Array} data - The data array
 * @param {Object} pagination - Pagination metadata
 * @returns {Object} Formatted response
 */
function paginate(data, pagination) {
  return {
    success: true,
    data,
    pagination
  };
}

/**
 * Execute paginated database query
 * @param {Object} pool - Database pool
 * @param {string} baseQuery - SQL query without LIMIT/OFFSET
 * @param {Object} options - { params, query, defaults }
 * @returns {Promise<Object>} Paginated result
 */
async function paginateQuery(pool, baseQuery, options = {}) {
  const { params = [], query = {}, defaults = {} } = options;
  const { page, limit, offset } = parsePagination(query, defaults);

  // Count query
  const countQuery = `SELECT COUNT(*) as total FROM (${baseQuery}) as count_query`;
  const countResult = await pool.query(countQuery, params);
  const total = parseInt(countResult.rows[0].total, 10);

  // Data query with pagination
  const dataQuery = `${baseQuery} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  const dataResult = await pool.query(dataQuery, [...params, limit, offset]);

  return paginate(dataResult.rows, createMeta(total, page, limit));
}

/**
 * Simple array pagination (for in-memory data)
 * @param {Array} array - Data array
 * @param {Object} query - Query parameters
 * @param {Object} defaults - Default values
 * @returns {Object} Paginated result
 */
function paginateArray(array, query = {}, defaults = {}) {
  const { page, limit, offset } = parsePagination(query, defaults);
  const total = array.length;
  const data = array.slice(offset, offset + limit);

  return paginate(data, createMeta(total, page, limit));
}

/**
 * Express middleware to parse pagination
 * Attaches pagination params to req.pagination
 */
function paginationMiddleware(defaults = {}) {
  return (req, res, next) => {
    req.pagination = parsePagination(req.query, defaults);
    next();
  };
}

/**
 * Generate HATEOAS-style pagination links
 * @param {string} baseUrl - Base URL for the endpoint
 * @param {Object} pagination - Pagination metadata
 * @returns {Object} Links object
 */
function generateLinks(baseUrl, pagination) {
  const links = {
    self: `${baseUrl}?page=${pagination.page}&limit=${pagination.limit}`
  };

  if (pagination.hasNext) {
    links.next = `${baseUrl}?page=${pagination.nextPage}&limit=${pagination.limit}`;
  }

  if (pagination.hasPrev) {
    links.prev = `${baseUrl}?page=${pagination.prevPage}&limit=${pagination.limit}`;
  }

  links.first = `${baseUrl}?page=1&limit=${pagination.limit}`;
  links.last = `${baseUrl}?page=${pagination.totalPages}&limit=${pagination.limit}`;

  return links;
}

module.exports = {
  parsePagination,
  createMeta,
  paginate,
  paginateQuery,
  paginateArray,
  paginationMiddleware,
  generateLinks
};
