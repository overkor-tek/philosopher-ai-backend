/**
 * Retry Utility
 * Built by C1 Cloud (CP3) - Autonomous Work
 *
 * Robust retry mechanism with exponential backoff
 *
 * Usage:
 *   const { retry, withRetry } = require('./utils/retry');
 *   const result = await retry(() => fetchExternalAPI(), { maxAttempts: 3 });
 */

/**
 * Default options
 */
const DEFAULT_OPTIONS = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  factor: 2,
  jitter: true,
  retryOn: null, // function(error) => boolean
  onRetry: null, // function(error, attempt) => void
  timeout: null // per-attempt timeout
};

/**
 * Calculate delay with exponential backoff and optional jitter
 */
function calculateDelay(attempt, options) {
  let delay = options.initialDelay * Math.pow(options.factor, attempt - 1);
  delay = Math.min(delay, options.maxDelay);

  if (options.jitter) {
    // Add 0-50% random jitter
    delay = delay * (1 + Math.random() * 0.5);
  }

  return Math.floor(delay);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Wrap a promise with timeout
 */
function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Operation timed out')), ms)
    )
  ]);
}

/**
 * Determine if error should trigger retry
 */
function shouldRetry(error, options) {
  // Custom retry condition
  if (options.retryOn) {
    return options.retryOn(error);
  }

  // Network errors
  if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
    return true;
  }

  // Timeout errors
  if (error.message === 'Operation timed out') {
    return true;
  }

  // HTTP 5xx errors
  if (error.status >= 500 || error.statusCode >= 500) {
    return true;
  }

  // Rate limiting (429)
  if (error.status === 429 || error.statusCode === 429) {
    return true;
  }

  return false;
}

/**
 * Retry an async function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {Object} options - Retry options
 * @returns {Promise<*>} Result from successful execution
 */
async function retry(fn, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      let result;

      if (opts.timeout) {
        result = await withTimeout(fn(attempt), opts.timeout);
      } else {
        result = await fn(attempt);
      }

      return result;

    } catch (error) {
      lastError = error;

      const isLastAttempt = attempt === opts.maxAttempts;
      const shouldRetryError = shouldRetry(error, opts);

      if (isLastAttempt || !shouldRetryError) {
        throw error;
      }

      const delay = calculateDelay(attempt, opts);

      if (opts.onRetry) {
        opts.onRetry(error, attempt, delay);
      }

      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Create a retryable wrapper for a function
 * @param {Function} fn - Function to wrap
 * @param {Object} options - Retry options
 * @returns {Function} Wrapped function with retry
 */
function withRetry(fn, options = {}) {
  return async (...args) => {
    return retry(() => fn(...args), options);
  };
}

/**
 * Retry with circuit breaker pattern
 */
class CircuitBreaker {
  constructor(options = {}) {
    this.threshold = options.threshold || 5;
    this.resetTimeout = options.resetTimeout || 30000;
    this.failures = 0;
    this.state = 'closed'; // closed, open, half-open
    this.lastFailure = null;
  }

  async execute(fn, retryOptions = {}) {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailure > this.resetTimeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await retry(fn, retryOptions);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failures = 0;
    this.state = 'closed';
  }

  onFailure() {
    this.failures++;
    this.lastFailure = Date.now();

    if (this.failures >= this.threshold) {
      this.state = 'open';
    }
  }

  getState() {
    return {
      state: this.state,
      failures: this.failures,
      threshold: this.threshold
    };
  }

  reset() {
    this.failures = 0;
    this.state = 'closed';
    this.lastFailure = null;
  }
}

/**
 * Pre-configured retry for HTTP requests
 */
const httpRetry = (fn) => retry(fn, {
  maxAttempts: 3,
  initialDelay: 1000,
  factor: 2,
  retryOn: (error) => {
    // Retry on network errors and 5xx
    return error.code === 'ECONNRESET' ||
           error.code === 'ETIMEDOUT' ||
           (error.status >= 500 && error.status < 600) ||
           error.status === 429;
  }
});

/**
 * Pre-configured retry for database operations
 */
const dbRetry = (fn) => retry(fn, {
  maxAttempts: 3,
  initialDelay: 100,
  maxDelay: 2000,
  retryOn: (error) => {
    // Retry on connection errors
    return error.code === 'ECONNREFUSED' ||
           error.code === '57P01' || // admin shutdown
           error.code === '57P02' || // crash shutdown
           error.code === '57P03';   // cannot connect now
  }
});

module.exports = {
  retry,
  withRetry,
  CircuitBreaker,
  httpRetry,
  dbRetry,
  calculateDelay,
  sleep
};
