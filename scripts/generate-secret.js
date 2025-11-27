#!/usr/bin/env node
/**
 * Secret Generator Utility
 * Built by C1 Cloud (CP3) - Autonomous Work
 *
 * Generates cryptographically secure secrets for various purposes
 *
 * Usage:
 *   node scripts/generate-secret.js              # Generate JWT secret
 *   node scripts/generate-secret.js --type jwt   # Generate JWT secret
 *   node scripts/generate-secret.js --type api   # Generate API key
 *   node scripts/generate-secret.js --type all   # Generate all types
 *   node scripts/generate-secret.js --env        # Output as .env format
 */

const crypto = require('crypto');

/**
 * Generate a random hex string
 * @param {number} bytes - Number of bytes
 * @returns {string} Hex string
 */
function generateHex(bytes = 64) {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Generate a random base64 string
 * @param {number} bytes - Number of bytes
 * @returns {string} Base64 string (URL-safe)
 */
function generateBase64(bytes = 48) {
  return crypto.randomBytes(bytes)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Generate a UUID v4
 * @returns {string} UUID string
 */
function generateUUID() {
  return crypto.randomUUID();
}

/**
 * Generate JWT secret (128 character hex)
 * @returns {string}
 */
function generateJWTSecret() {
  return generateHex(64);
}

/**
 * Generate API key (prefixed, readable format)
 * @param {string} prefix - Key prefix (e.g., 'pk' for public, 'sk' for secret)
 * @returns {string}
 */
function generateAPIKey(prefix = 'sk') {
  const key = generateBase64(32);
  return `${prefix}_${key}`;
}

/**
 * Generate database password (complex, 32 chars)
 * @returns {string}
 */
function generateDBPassword() {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  const randomBytes = crypto.randomBytes(32);

  for (let i = 0; i < 32; i++) {
    password += chars[randomBytes[i] % chars.length];
  }

  return password;
}

/**
 * Generate encryption key (256-bit, base64)
 * @returns {string}
 */
function generateEncryptionKey() {
  return crypto.randomBytes(32).toString('base64');
}

/**
 * Generate session secret
 * @returns {string}
 */
function generateSessionSecret() {
  return generateHex(32);
}

// CLI handling
const args = process.argv.slice(2);
const typeArg = args.find(a => a.startsWith('--type='))?.split('=')[1]
  || (args.includes('--type') ? args[args.indexOf('--type') + 1] : 'jwt');
const envFormat = args.includes('--env');

const secrets = {
  jwt: {
    name: 'JWT_SECRET',
    generator: generateJWTSecret,
    description: 'JWT signing secret (128 hex chars)'
  },
  api: {
    name: 'API_KEY',
    generator: () => generateAPIKey('sk'),
    description: 'API key for external services'
  },
  db: {
    name: 'DB_PASSWORD',
    generator: generateDBPassword,
    description: 'Database password (32 chars)'
  },
  encryption: {
    name: 'ENCRYPTION_KEY',
    generator: generateEncryptionKey,
    description: 'AES-256 encryption key (base64)'
  },
  session: {
    name: 'SESSION_SECRET',
    generator: generateSessionSecret,
    description: 'Session store secret'
  }
};

function printSecret(type) {
  const config = secrets[type];
  if (!config) {
    console.error(`Unknown secret type: ${type}`);
    console.error(`Valid types: ${Object.keys(secrets).join(', ')}, all`);
    process.exit(1);
  }

  const value = config.generator();

  if (envFormat) {
    console.log(`${config.name}=${value}`);
  } else {
    console.log(`\n${config.description}`);
    console.log(`${config.name}=${value}`);
  }
}

function printAll() {
  if (!envFormat) {
    console.log('\n# Generated Secrets for .env file');
    console.log('# ' + new Date().toISOString());
    console.log('# Copy these to your .env file\n');
  }

  for (const type of Object.keys(secrets)) {
    printSecret(type);
  }

  if (!envFormat) {
    console.log('\n# WARNING: Store these securely and never commit to git!');
  }
}

// Run
if (typeArg === 'all') {
  printAll();
} else {
  printSecret(typeArg);
}
