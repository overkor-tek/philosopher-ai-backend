/**
 * Middleware Index
 * Built by C1 Cloud (CP3) - Autonomous Work
 *
 * Central export for all middleware
 *
 * Usage:
 *   const {
 *     verifyToken,
 *     asyncHandler,
 *     rateLimiters,
 *     requestId,
 *     corsConfig
 *   } = require('./middleware');
 */

// Authentication
const verifyToken = require('./auth');

// Error handling
const {
  asyncHandler,
  createError,
  HttpError,
  validationError,
  notFoundHandler,
  errorHandler
} = require('./asyncHandler');

// Rate limiting
const rateLimiters = require('./rateLimiter');

// Request tracing
const requestId = require('./requestId');

// CORS configuration
const corsConfig = require('./corsConfig');

// Logging
const loggingMiddleware = require('./logging');

// Analytics
const analyticsMiddleware = require('./analytics');

// API Key authentication
const apiKey = require('./apiKey');

module.exports = {
  // Auth
  verifyToken,
  auth: verifyToken,

  // Error handling
  asyncHandler,
  createError,
  HttpError,
  validationError,
  notFoundHandler,
  errorHandler,

  // Rate limiting
  rateLimiters,
  authLimiter: rateLimiters.authLimiter,
  apiLimiter: rateLimiters.apiLimiter,
  strictLimiter: rateLimiters.strictLimiter,

  // Request ID
  requestId,

  // CORS
  corsConfig,
  corsOptions: corsConfig.corsOptions,

  // Logging
  logging: loggingMiddleware,

  // Analytics
  analytics: analyticsMiddleware,

  // API Key
  apiKey,
  apiKeyAuth: apiKey.apiKeyAuth
};
