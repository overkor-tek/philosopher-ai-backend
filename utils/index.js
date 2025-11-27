/**
 * Utils Index
 * Built by C1 Cloud (CP3) - Autonomous Work
 *
 * Central export for all utilities
 *
 * Usage:
 *   const { db, validators, response, logger } = require('./utils');
 */

// Database
const db = require('./db');

// Validation
const validators = require('./validators');

// Response helpers
const response = require('./response');

// Logger
const logger = require('./logger');

// Error tracking
const errorTracker = require('./error-tracker');

// Email notifications
const emailNotifier = require('./email-notifier');

// Cache
const cache = require('./cache');

// Metrics
const metrics = require('./metrics');

// Shutdown
const shutdown = require('./shutdown');

// Health check
const healthCheck = require('./healthCheck');

// Feature flags
const featureFlags = require('./featureFlags');

// Pagination
const pagination = require('./pagination');

// Retry
const retry = require('./retry');

// Crypto
const cryptoUtils = require('./crypto');

// Webhooks
const webhook = require('./webhook');

module.exports = {
  // Database
  db,
  query: db.query,
  transaction: db.transaction,

  // Validation
  validators,
  validateEmail: validators.validateEmail,
  validatePassword: validators.validatePassword,
  validateFields: validators.validateFields,
  sanitize: validators.sanitize,

  // Response helpers
  response,
  success: response.success,
  created: response.created,
  error: response.error,
  badRequest: response.badRequest,
  unauthorized: response.unauthorized,
  forbidden: response.forbidden,
  notFound: response.notFound,
  serverError: response.serverError,

  // Logging
  logger,

  // Error tracking
  errorTracker,

  // Cache
  cache,
  cacheMiddleware: cache.cacheMiddleware,

  // Metrics
  metrics,
  metricsMiddleware: metrics.middleware.bind(metrics),

  // Shutdown
  shutdown,

  // Health check
  healthCheck,

  // Feature flags
  featureFlags,

  // Pagination
  pagination,
  paginate: pagination.paginate,
  paginateQuery: pagination.paginateQuery,

  // Retry
  retry: retry.retry,
  withRetry: retry.withRetry,
  CircuitBreaker: retry.CircuitBreaker,

  // Crypto
  crypto: cryptoUtils,
  encrypt: cryptoUtils.encrypt,
  decrypt: cryptoUtils.decrypt,
  generateToken: cryptoUtils.generateToken,

  // Webhooks
  webhook
};
