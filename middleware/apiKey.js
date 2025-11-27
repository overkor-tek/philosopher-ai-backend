/**
 * API Key Authentication Middleware
 * Built by C1 Cloud (CP3) - Autonomous Work
 *
 * Validates API keys for server-to-server authentication
 *
 * Usage:
 *   const { apiKeyAuth, validateApiKey } = require('./middleware/apiKey');
 *   app.use('/api/v1/webhooks', apiKeyAuth());
 */

const crypto = require('crypto');

/**
 * Generate a secure API key
 * @param {string} prefix - Key prefix (e.g., 'pk', 'sk')
 * @returns {string}
 */
function generateApiKey(prefix = 'sk') {
  const key = crypto.randomBytes(24).toString('base64url');
  return `${prefix}_${key}`;
}

/**
 * Hash an API key for storage
 * @param {string} key - Plain text API key
 * @returns {string} Hashed key
 */
function hashApiKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * Constant-time string comparison
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
function secureCompare(a, b) {
  if (a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * Extract API key from request
 * @param {Object} req - Express request
 * @param {Object} options - { header, query, bearer }
 * @returns {string|null}
 */
function extractApiKey(req, options = {}) {
  const {
    header = 'X-API-Key',
    query = 'api_key',
    bearer = true
  } = options;

  // Check header
  const headerKey = req.headers[header.toLowerCase()];
  if (headerKey) {
    return headerKey;
  }

  // Check Authorization bearer
  if (bearer) {
    const auth = req.headers.authorization;
    if (auth && auth.startsWith('Bearer ')) {
      return auth.slice(7);
    }
  }

  // Check query parameter
  if (query && req.query[query]) {
    return req.query[query];
  }

  return null;
}

/**
 * API Key validation result
 */
class ApiKeyResult {
  constructor(valid, data = {}) {
    this.valid = valid;
    this.keyId = data.keyId || null;
    this.clientId = data.clientId || null;
    this.scopes = data.scopes || [];
    this.metadata = data.metadata || {};
  }
}

/**
 * Simple in-memory API key store (for development)
 * In production, use database storage
 */
class ApiKeyStore {
  constructor() {
    this.keys = new Map();
  }

  /**
   * Add an API key
   * @param {Object} keyData - { key, clientId, scopes, metadata }
   */
  add(keyData) {
    const hash = hashApiKey(keyData.key);
    this.keys.set(hash, {
      keyId: keyData.keyId || crypto.randomUUID(),
      clientId: keyData.clientId,
      scopes: keyData.scopes || ['*'],
      metadata: keyData.metadata || {},
      createdAt: new Date()
    });
  }

  /**
   * Validate an API key
   * @param {string} key - Plain text key
   * @returns {ApiKeyResult}
   */
  validate(key) {
    const hash = hashApiKey(key);
    const data = this.keys.get(hash);

    if (data) {
      return new ApiKeyResult(true, data);
    }

    return new ApiKeyResult(false);
  }

  /**
   * Revoke an API key
   * @param {string} key
   */
  revoke(key) {
    const hash = hashApiKey(key);
    return this.keys.delete(hash);
  }
}

// Singleton key store
const keyStore = new ApiKeyStore();

// Load API keys from environment
if (process.env.API_KEYS) {
  process.env.API_KEYS.split(',').forEach((key, index) => {
    keyStore.add({
      key: key.trim(),
      clientId: `env-client-${index}`,
      scopes: ['*']
    });
  });
}

/**
 * API key authentication middleware factory
 * @param {Object} options
 * @returns {Function} Express middleware
 */
function apiKeyAuth(options = {}) {
  const {
    required = true,
    scopes = null,
    validator = null,
    onError = null
  } = options;

  return async (req, res, next) => {
    const apiKey = extractApiKey(req, options);

    // No key provided
    if (!apiKey) {
      if (!required) {
        return next();
      }
      return sendError(res, 401, 'API key required', onError);
    }

    // Validate key
    let result;

    if (validator) {
      result = await validator(apiKey);
    } else {
      result = keyStore.validate(apiKey);
    }

    if (!result.valid) {
      return sendError(res, 401, 'Invalid API key', onError);
    }

    // Check scopes
    if (scopes && scopes.length > 0) {
      const hasScope = scopes.some(scope =>
        result.scopes.includes('*') || result.scopes.includes(scope)
      );

      if (!hasScope) {
        return sendError(res, 403, 'Insufficient permissions', onError);
      }
    }

    // Attach to request
    req.apiKey = result;
    req.clientId = result.clientId;

    next();
  };
}

/**
 * Send error response
 */
function sendError(res, status, message, onError) {
  if (onError) {
    return onError(res, status, message);
  }

  return res.status(status).json({
    success: false,
    error: message
  });
}

/**
 * Validate API key without middleware
 * @param {string} key
 * @returns {ApiKeyResult}
 */
function validateApiKey(key) {
  return keyStore.validate(key);
}

module.exports = {
  apiKeyAuth,
  validateApiKey,
  generateApiKey,
  hashApiKey,
  extractApiKey,
  ApiKeyStore,
  keyStore
};
