/**
 * Webhook Utility
 * Built by C1 Cloud (CP3) - Autonomous Work
 *
 * Send and verify webhooks with retry and signing
 *
 * Usage:
 *   const webhook = require('./utils/webhook');
 *   await webhook.send('https://example.com/hook', { event: 'user.created' });
 */

const crypto = require('crypto');
const { retry } = require('./retry');

const DEFAULT_OPTIONS = {
  timeout: 30000,
  maxAttempts: 3,
  signatureHeader: 'X-Webhook-Signature',
  timestampHeader: 'X-Webhook-Timestamp',
  idHeader: 'X-Webhook-ID'
};

/**
 * Generate webhook signature
 * @param {string} payload - JSON payload
 * @param {string} secret - Signing secret
 * @param {number} timestamp - Unix timestamp
 * @returns {string}
 */
function generateSignature(payload, secret, timestamp) {
  const signedPayload = `${timestamp}.${payload}`;
  return crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');
}

/**
 * Verify webhook signature
 * @param {string} payload - Raw JSON body
 * @param {string} signature - Received signature
 * @param {string} secret - Signing secret
 * @param {number} timestamp - Received timestamp
 * @param {number} tolerance - Max age in seconds (default 5 min)
 * @returns {boolean}
 */
function verifySignature(payload, signature, secret, timestamp, tolerance = 300) {
  // Check timestamp freshness
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > tolerance) {
    return false;
  }

  const expected = generateSignature(payload, secret, timestamp);

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expected, 'hex')
    );
  } catch {
    return false;
  }
}

/**
 * Send a webhook
 * @param {string} url - Webhook URL
 * @param {Object} payload - Event payload
 * @param {Object} options - Send options
 * @returns {Promise<Object>} Response data
 */
async function send(url, payload, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const secret = opts.secret || process.env.WEBHOOK_SECRET;
  const webhookId = crypto.randomUUID();
  const timestamp = Math.floor(Date.now() / 1000);
  const body = JSON.stringify(payload);

  // Build headers
  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'PhilosopherAI-Webhook/1.0',
    [opts.idHeader]: webhookId,
    [opts.timestampHeader]: timestamp.toString(),
    ...opts.headers
  };

  // Add signature if secret provided
  if (secret) {
    headers[opts.signatureHeader] = generateSignature(body, secret, timestamp);
  }

  // Send with retry
  const response = await retry(
    async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), opts.timeout);

      try {
        const res = await fetch(url, {
          method: 'POST',
          headers,
          body,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
          const error = new Error(`Webhook failed: ${res.status}`);
          error.status = res.status;
          throw error;
        }

        let responseData = null;
        try {
          responseData = await res.json();
        } catch {
          responseData = await res.text();
        }

        return {
          success: true,
          webhookId,
          status: res.status,
          response: responseData
        };

      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    },
    {
      maxAttempts: opts.maxAttempts,
      retryOn: (error) => {
        // Retry on network errors and 5xx
        return error.name === 'AbortError' ||
               error.code === 'ECONNRESET' ||
               (error.status >= 500 && error.status < 600);
      }
    }
  );

  return response;
}

/**
 * Middleware to verify incoming webhooks
 * @param {Object} options
 * @returns {Function} Express middleware
 */
function verifyMiddleware(options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return (req, res, next) => {
    const secret = opts.secret || process.env.WEBHOOK_SECRET;

    if (!secret) {
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    const signature = req.headers[opts.signatureHeader.toLowerCase()];
    const timestamp = parseInt(req.headers[opts.timestampHeader.toLowerCase()], 10);

    if (!signature || !timestamp) {
      return res.status(401).json({ error: 'Missing webhook signature' });
    }

    // Need raw body for verification
    const rawBody = req.rawBody || JSON.stringify(req.body);

    if (!verifySignature(rawBody, signature, secret, timestamp, opts.tolerance)) {
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    req.webhookId = req.headers[opts.idHeader.toLowerCase()];
    next();
  };
}

/**
 * Create webhook event payload
 * @param {string} type - Event type (e.g., 'user.created')
 * @param {Object} data - Event data
 * @param {Object} metadata - Additional metadata
 * @returns {Object}
 */
function createEvent(type, data, metadata = {}) {
  return {
    id: crypto.randomUUID(),
    type,
    data,
    created: new Date().toISOString(),
    apiVersion: '2024-01-01',
    ...metadata
  };
}

/**
 * Webhook delivery tracker
 */
class WebhookTracker {
  constructor() {
    this.deliveries = new Map();
    this.maxEntries = 1000;
  }

  record(webhookId, result) {
    this.deliveries.set(webhookId, {
      ...result,
      recordedAt: new Date().toISOString()
    });

    // Cleanup old entries
    if (this.deliveries.size > this.maxEntries) {
      const oldest = this.deliveries.keys().next().value;
      this.deliveries.delete(oldest);
    }
  }

  get(webhookId) {
    return this.deliveries.get(webhookId);
  }

  getRecent(limit = 50) {
    return Array.from(this.deliveries.values()).slice(-limit);
  }
}

const tracker = new WebhookTracker();

module.exports = {
  send,
  generateSignature,
  verifySignature,
  verifyMiddleware,
  createEvent,
  tracker
};
