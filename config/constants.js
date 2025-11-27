/**
 * Application Constants
 * Built by C1 Cloud (CP3) - Autonomous Work
 */

module.exports = {
  // API Versions
  API_VERSION: 'v1',
  API_PREFIX: '/api/v1',

  // User Roles
  ROLES: {
    USER: 'user',
    ADMIN: 'admin',
    SUPERADMIN: 'superadmin'
  },

  // Subscription Tiers
  TIERS: {
    FREE: 'free',
    BASIC: 'basic',
    PRO: 'pro',
    ENTERPRISE: 'enterprise'
  },

  // Message Roles
  MESSAGE_ROLES: {
    USER: 'user',
    ASSISTANT: 'assistant',
    SYSTEM: 'system'
  },

  // Payment Status
  PAYMENT_STATUS: {
    PENDING: 'pending',
    COMPLETED: 'completed',
    FAILED: 'failed',
    REFUNDED: 'refunded'
  },

  // HTTP Status Codes
  HTTP: {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    LOCKED: 423,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_ERROR: 500,
    SERVICE_UNAVAILABLE: 503
  },

  // Error Messages
  ERRORS: {
    UNAUTHORIZED: 'Authentication required',
    FORBIDDEN: 'Access denied',
    NOT_FOUND: 'Resource not found',
    VALIDATION: 'Validation failed',
    INTERNAL: 'Internal server error',
    RATE_LIMIT: 'Too many requests',
    LOCKED: 'Account locked'
  },

  // Regex Patterns
  PATTERNS: {
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    PIN: /^\d{6,8}$/
  },

  // Limits
  LIMITS: {
    PASSWORD_MIN: 12,
    PIN_MIN: 6,
    PIN_MAX: 8,
    TITLE_MAX: 255,
    CONTENT_MAX: 50000
  }
};
