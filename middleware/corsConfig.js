/**
 * CORS Configuration
 * Built by C1 Cloud (CP3) - Autonomous Work
 *
 * Centralized CORS configuration for different environments
 *
 * Usage:
 *   const cors = require('cors');
 *   const { corsOptions, allowedOrigins } = require('./middleware/corsConfig');
 *   app.use(cors(corsOptions));
 */

/**
 * Default allowed origins
 */
const defaultOrigins = [
  'http://localhost:3000',
  'http://localhost:8080',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:8080'
];

/**
 * Production allowed origins
 */
const productionOrigins = [
  'https://consciousnessrevolution.io',
  'https://www.consciousnessrevolution.io',
  'https://app.consciousnessrevolution.io'
];

/**
 * Get allowed origins based on environment
 * @returns {string[]}
 */
function getAllowedOrigins() {
  const envOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : [];

  if (process.env.NODE_ENV === 'production') {
    return [...productionOrigins, ...envOrigins];
  }

  // Development: allow all configured origins
  return [...defaultOrigins, ...productionOrigins, ...envOrigins];
}

/**
 * CORS options factory
 * @param {Object} customOptions - Override default options
 * @returns {Object} CORS options
 */
function createCorsOptions(customOptions = {}) {
  const allowedOrigins = getAllowedOrigins();

  return {
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, curl, etc)
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // In development, allow all localhost variants
      if (process.env.NODE_ENV !== 'production' && origin.includes('localhost')) {
        return callback(null, true);
      }

      callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Request-ID',
      'X-API-Key'
    ],
    exposedHeaders: [
      'X-Request-ID',
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset'
    ],
    maxAge: 86400, // 24 hours
    ...customOptions
  };
}

/**
 * Pre-configured CORS options
 */
const corsOptions = createCorsOptions();

/**
 * Strict CORS - only production origins
 */
const strictCorsOptions = createCorsOptions({
  origin: function (origin, callback) {
    if (!origin) {
      return callback(new Error('Origin required'));
    }

    if (productionOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Also check env origins
    const envOrigins = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
      : [];

    if (envOrigins.includes(origin)) {
      return callback(null, true);
    }

    callback(new Error('Not allowed by CORS'));
  }
});

/**
 * Permissive CORS - allow all origins (use with caution)
 */
const permissiveCorsOptions = createCorsOptions({
  origin: true
});

/**
 * API-only CORS - for public API endpoints
 */
const apiCorsOptions = createCorsOptions({
  origin: true,
  credentials: false,
  methods: ['GET', 'POST'],
  maxAge: 3600
});

module.exports = {
  corsOptions,
  strictCorsOptions,
  permissiveCorsOptions,
  apiCorsOptions,
  createCorsOptions,
  getAllowedOrigins,
  defaultOrigins,
  productionOrigins
};
