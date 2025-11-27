/**
 * Request ID Middleware
 * Built by C1 Cloud (CP3) - Autonomous Work
 *
 * Adds unique request IDs for tracing and debugging
 *
 * Usage:
 *   const requestId = require('./middleware/requestId');
 *   app.use(requestId());
 *
 * Access:
 *   req.id - The request ID
 *   res.get('X-Request-ID') - Also in response headers
 */

const crypto = require('crypto');

/**
 * Generate a short unique ID
 * @returns {string}
 */
function generateShortId() {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(4).toString('hex');
  return `${timestamp}-${random}`;
}

/**
 * Generate a UUID v4
 * @returns {string}
 */
function generateUUID() {
  return crypto.randomUUID();
}

/**
 * Request ID middleware factory
 * @param {Object} options
 * @param {string} options.headerName - Header name for request ID (default: 'X-Request-ID')
 * @param {boolean} options.setResponseHeader - Whether to set response header (default: true)
 * @param {string} options.format - ID format: 'short' or 'uuid' (default: 'short')
 * @param {boolean} options.trustProxy - Trust incoming X-Request-ID header (default: false)
 * @returns {Function} Express middleware
 */
function requestIdMiddleware(options = {}) {
  const {
    headerName = 'X-Request-ID',
    setResponseHeader = true,
    format = 'short',
    trustProxy = false
  } = options;

  const generator = format === 'uuid' ? generateUUID : generateShortId;

  return function requestIdHandler(req, res, next) {
    // Use existing request ID if trusted, otherwise generate new
    let requestId;

    if (trustProxy && req.headers[headerName.toLowerCase()]) {
      requestId = req.headers[headerName.toLowerCase()];
    } else {
      requestId = generator();
    }

    // Attach to request
    req.id = requestId;
    req.requestId = requestId;

    // Set response header
    if (setResponseHeader) {
      res.setHeader(headerName, requestId);
    }

    // Add to logging context if available
    if (req.log) {
      req.log = req.log.child({ requestId });
    }

    next();
  };
}

/**
 * Get request ID from request or generate a new one
 * Useful in services that don't have access to middleware
 * @param {Object} req - Express request (optional)
 * @returns {string}
 */
function getRequestId(req = null) {
  if (req && req.id) {
    return req.id;
  }
  return generateShortId();
}

/**
 * Create a child logger with request ID
 * @param {Object} logger - Winston or similar logger
 * @param {string} requestId
 * @returns {Object} Logger with request ID in metadata
 */
function createRequestLogger(logger, requestId) {
  return {
    info: (message, meta = {}) => logger.info(message, { ...meta, requestId }),
    warn: (message, meta = {}) => logger.warn(message, { ...meta, requestId }),
    error: (message, meta = {}) => logger.error(message, { ...meta, requestId }),
    debug: (message, meta = {}) => logger.debug(message, { ...meta, requestId })
  };
}

// Export middleware factory as default
module.exports = requestIdMiddleware;

// Named exports for utility functions
module.exports.generateShortId = generateShortId;
module.exports.generateUUID = generateUUID;
module.exports.getRequestId = getRequestId;
module.exports.createRequestLogger = createRequestLogger;
