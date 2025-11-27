/**
 * Centralized Configuration
 * Built by C1 Cloud (CP3) - Autonomous Work
 *
 * Usage: const config = require('./config');
 */

require('dotenv').config();

const config = {
  // Server
  server: {
    port: parseInt(process.env.PORT, 10) || 3001,
    env: process.env.NODE_ENV || 'development',
    isProduction: process.env.NODE_ENV === 'production',
    isDevelopment: process.env.NODE_ENV !== 'production'
  },

  // Database
  database: {
    url: process.env.DATABASE_URL,
    poolSize: parseInt(process.env.DB_POOL_SIZE, 10) || 20,
    ssl: process.env.NODE_ENV === 'production'
  },

  // Authentication
  auth: {
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiry: process.env.JWT_EXPIRY || '7d',
    saltRounds: 12,
    maxFailedAttempts: 10,
    lockoutDuration: 60 * 60 * 1000 // 1 hour
  },

  // Rate Limiting
  rateLimit: {
    auth: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5 // 5 attempts
    },
    api: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100 // 100 requests
    }
  },

  // CORS
  cors: {
    origins: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',')
      : [
          'http://localhost:8080',
          'http://localhost:3000',
          'https://consciousnessrevolution.io',
          'https://www.consciousnessrevolution.io'
        ],
    credentials: true
  },

  // External Services
  services: {
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY,
      enabled: !!process.env.ANTHROPIC_API_KEY
    },
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY,
      enabled: !!process.env.STRIPE_SECRET_KEY
    },
    sendgrid: {
      apiKey: process.env.SENDGRID_API_KEY,
      fromEmail: process.env.FROM_EMAIL || 'noreply@consciousnessrevolution.io',
      fromName: process.env.FROM_NAME || 'Consciousness Revolution',
      enabled: !!process.env.SENDGRID_API_KEY
    }
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    files: {
      error: 'logs/error.log',
      combined: 'logs/combined.log'
    }
  },

  // Security
  security: {
    helmet: true,
    https: process.env.NODE_ENV === 'production'
  }
};

// Validation
function validateConfig() {
  const errors = [];

  if (!config.auth.jwtSecret) {
    errors.push('JWT_SECRET is required');
  } else if (config.auth.jwtSecret.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters');
  }

  if (!config.database.url) {
    errors.push('DATABASE_URL is required');
  }

  return errors;
}

config.validate = validateConfig;
config.isValid = () => validateConfig().length === 0;

module.exports = config;
