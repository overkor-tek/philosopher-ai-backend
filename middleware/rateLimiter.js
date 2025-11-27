/**
 * Rate Limiter Configuration
 * Built by C1 Cloud (CP3) - Autonomous Work
 *
 * Centralized rate limiting middleware configurations
 *
 * Usage:
 *   const { authLimiter, apiLimiter, strictLimiter } = require('../middleware/rateLimiter');
 *   app.use('/api/v1/auth/login', authLimiter);
 */

const rateLimit = require('express-rate-limit');

/**
 * Get client IP for rate limiting
 * Works with proxies (like Railway, Heroku)
 */
const getClientIP = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0].trim()
    || req.headers['x-real-ip']
    || req.connection.remoteAddress
    || req.ip;
};

/**
 * Standard rate limit response
 */
const standardHandler = (req, res) => {
  res.status(429).json({
    success: false,
    error: 'Too many requests. Please try again later.',
    retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
  });
};

/**
 * Auth endpoints limiter (strict)
 * 5 requests per 15 minutes
 * Prevents brute force attacks
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIP,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many authentication attempts. Please try again in 15 minutes.',
      retryAfter: 900
    });
  },
  skip: (req) => {
    // Skip rate limiting in test environment
    return process.env.NODE_ENV === 'test';
  }
});

/**
 * Registration limiter
 * 3 accounts per hour per IP
 */
const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIP,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many accounts created. Please try again in an hour.',
      retryAfter: 3600
    });
  }
});

/**
 * Standard API limiter
 * 100 requests per 15 minutes
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIP,
  handler: standardHandler,
  skip: (req) => {
    return process.env.NODE_ENV === 'test';
  }
});

/**
 * Relaxed API limiter
 * 500 requests per 15 minutes
 * For read-heavy endpoints
 */
const relaxedLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIP,
  handler: standardHandler
});

/**
 * Strict limiter
 * 10 requests per minute
 * For sensitive operations
 */
const strictLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIP,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Rate limit exceeded. Please wait a moment.',
      retryAfter: 60
    });
  }
});

/**
 * AI/Chat limiter
 * 20 requests per minute
 * For AI-powered endpoints (Anthropic calls)
 */
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIP,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'AI request limit reached. Please slow down.',
      retryAfter: 60
    });
  }
});

/**
 * Global limiter
 * 1000 requests per 15 minutes
 * Applied to all routes as safety net
 */
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIP,
  handler: standardHandler
});

/**
 * Create a custom rate limiter
 * @param {Object} options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.max - Max requests per window
 * @param {string} options.message - Custom error message
 * @returns {Function} Rate limiter middleware
 */
function createLimiter({ windowMs, max, message }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: getClientIP,
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        error: message || 'Too many requests',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
  });
}

module.exports = {
  authLimiter,
  registrationLimiter,
  apiLimiter,
  relaxedLimiter,
  strictLimiter,
  aiLimiter,
  globalLimiter,
  createLimiter
};
