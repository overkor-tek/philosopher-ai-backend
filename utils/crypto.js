/**
 * Cryptography Utilities
 * Built by C1 Cloud (CP3) - Autonomous Work
 *
 * Secure encryption, hashing, and token generation
 *
 * Usage:
 *   const crypto = require('./utils/crypto');
 *   const encrypted = crypto.encrypt('sensitive data');
 *   const decrypted = crypto.decrypt(encrypted);
 */

const crypto = require('crypto');

// Encryption algorithm and key settings
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16;  // 128 bits for GCM
const AUTH_TAG_LENGTH = 16;

/**
 * Get or derive encryption key
 * @returns {Buffer}
 */
function getKey() {
  const secret = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('ENCRYPTION_KEY or JWT_SECRET environment variable required');
  }

  // If key is exactly 32 bytes (base64), use directly
  if (secret.length === 44 && secret.endsWith('=')) {
    return Buffer.from(secret, 'base64');
  }

  // Otherwise derive key from secret
  return crypto.scryptSync(secret, 'philosopher-ai-salt', KEY_LENGTH);
}

/**
 * Encrypt data using AES-256-GCM
 * @param {string|Object} data - Data to encrypt
 * @returns {string} Encrypted data as base64
 */
function encrypt(data) {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const plaintext = typeof data === 'object' ? JSON.stringify(data) : String(data);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  const authTag = cipher.getAuthTag();

  // Combine iv + authTag + encrypted as base64
  return Buffer.concat([
    iv,
    authTag,
    Buffer.from(encrypted, 'base64')
  ]).toString('base64');
}

/**
 * Decrypt data encrypted with encrypt()
 * @param {string} encryptedData - Base64 encrypted data
 * @returns {string} Decrypted data
 */
function decrypt(encryptedData) {
  const key = getKey();
  const data = Buffer.from(encryptedData, 'base64');

  // Extract iv, authTag, and ciphertext
  const iv = data.subarray(0, IV_LENGTH);
  const authTag = data.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = data.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, null, 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Decrypt and parse JSON data
 * @param {string} encryptedData
 * @returns {Object}
 */
function decryptJSON(encryptedData) {
  const decrypted = decrypt(encryptedData);
  return JSON.parse(decrypted);
}

/**
 * Hash data using SHA-256
 * @param {string} data
 * @returns {string} Hex hash
 */
function hash(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Hash data using SHA-512
 * @param {string} data
 * @returns {string} Hex hash
 */
function hash512(data) {
  return crypto.createHash('sha512').update(data).digest('hex');
}

/**
 * Create HMAC signature
 * @param {string} data - Data to sign
 * @param {string} secret - HMAC secret (defaults to env)
 * @returns {string} Hex signature
 */
function hmac(data, secret = null) {
  const key = secret || process.env.HMAC_SECRET || process.env.JWT_SECRET;
  return crypto.createHmac('sha256', key).update(data).digest('hex');
}

/**
 * Verify HMAC signature
 * @param {string} data
 * @param {string} signature
 * @param {string} secret
 * @returns {boolean}
 */
function verifyHmac(data, signature, secret = null) {
  const expected = hmac(data, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expected, 'hex')
  );
}

/**
 * Generate random bytes
 * @param {number} length
 * @returns {string} Hex string
 */
function randomBytes(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate random token
 * @param {number} length - Desired string length
 * @returns {string} URL-safe base64 token
 */
function generateToken(length = 32) {
  const bytes = Math.ceil(length * 0.75);
  return crypto.randomBytes(bytes).toString('base64url').slice(0, length);
}

/**
 * Generate UUID v4
 * @returns {string}
 */
function uuid() {
  return crypto.randomUUID();
}

/**
 * Hash password with bcrypt-like approach using scrypt
 * @param {string} password
 * @returns {string}
 */
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verify password against hash
 * @param {string} password
 * @param {string} storedHash
 * @returns {boolean}
 */
function verifyPassword(password, storedHash) {
  const [salt, hash] = storedHash.split(':');
  const testHash = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(testHash, 'hex'));
}

/**
 * Create time-limited token
 * @param {Object} data - Data to encode
 * @param {number} expiresIn - Seconds until expiry
 * @returns {string}
 */
function createTimedToken(data, expiresIn = 3600) {
  const payload = {
    data,
    exp: Date.now() + (expiresIn * 1000)
  };
  return encrypt(payload);
}

/**
 * Verify and decode time-limited token
 * @param {string} token
 * @returns {Object|null} Data or null if expired/invalid
 */
function verifyTimedToken(token) {
  try {
    const payload = decryptJSON(token);

    if (payload.exp < Date.now()) {
      return null; // Expired
    }

    return payload.data;
  } catch {
    return null;
  }
}

module.exports = {
  encrypt,
  decrypt,
  decryptJSON,
  hash,
  hash512,
  hmac,
  verifyHmac,
  randomBytes,
  generateToken,
  uuid,
  hashPassword,
  verifyPassword,
  createTimedToken,
  verifyTimedToken
};
