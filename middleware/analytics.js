// ================================================
// ENDPOINT ANALYTICS MIDDLEWARE
// ================================================
// Tracks API usage, performance, and errors
// C1 Mechanic - Autonomous Production Enhancement
// ================================================

const logger = require('../utils/logger');

// In-memory analytics store (persists across requests)
const analytics = {
  requests: [],
  endpoints: new Map(),
  errors: [],
  startTime: Date.now(),
};

// Configuration
const CONFIG = {
  maxRequestHistory: 1000, // Keep last 1000 requests
  maxErrorHistory: 500,    // Keep last 500 errors
  slowRequestThreshold: 1000, // Log requests slower than 1s
};

/**
 * Analytics Middleware
 * Tracks every API request with timing and metadata
 */
function analyticsMiddleware(req, res, next) {
  const startTime = Date.now();
  const requestId = generateRequestId();

  // Store original end function
  const originalEnd = res.end;

  // Override end to capture response
  res.end = function (...args) {
    const endTime = Date.now();
    const duration = endTime - startTime;

    // Create analytics record
    const record = {
      requestId,
      method: req.method,
      endpoint: req.path,
      statusCode: res.statusCode,
      duration,
      timestamp: new Date(),
      userId: req.user?.id || null,
      userAgent: req.get('user-agent'),
      ip: req.ip || req.connection.remoteAddress,
      query: req.query,
      slow: duration > CONFIG.slowRequestThreshold,
    };

    // Store request
    storeRequest(record);

    // Track endpoint stats
    trackEndpoint(record);

    // Log slow requests
    if (record.slow) {
      logger.warn('Slow request detected', {
        endpoint: record.endpoint,
        duration: record.duration,
        method: record.method,
      });
    }

    // Track errors
    if (res.statusCode >= 400) {
      trackError(record);
    }

    // Call original end
    return originalEnd.apply(res, args);
  };

  next();
}

/**
 * Store request in history
 */
function storeRequest(record) {
  analytics.requests.push(record);

  // Keep only recent requests
  if (analytics.requests.length > CONFIG.maxRequestHistory) {
    analytics.requests.shift();
  }
}

/**
 * Track endpoint-specific statistics
 */
function trackEndpoint(record) {
  const key = `${record.method} ${record.endpoint}`;

  if (!analytics.endpoints.has(key)) {
    analytics.endpoints.set(key, {
      method: record.method,
      endpoint: record.endpoint,
      count: 0,
      totalDuration: 0,
      minDuration: Infinity,
      maxDuration: 0,
      errors: 0,
      lastAccessed: null,
    });
  }

  const stats = analytics.endpoints.get(key);
  stats.count++;
  stats.totalDuration += record.duration;
  stats.minDuration = Math.min(stats.minDuration, record.duration);
  stats.maxDuration = Math.max(stats.maxDuration, record.duration);
  stats.lastAccessed = record.timestamp;

  if (record.statusCode >= 400) {
    stats.errors++;
  }
}

/**
 * Track error
 */
function trackError(record) {
  const errorRecord = {
    ...record,
    errorCode: getErrorCode(record.statusCode),
  };

  analytics.errors.push(errorRecord);

  // Keep only recent errors
  if (analytics.errors.length > CONFIG.maxErrorHistory) {
    analytics.errors.shift();
  }

  // Log critical errors
  if (record.statusCode >= 500) {
    logger.error('Server error occurred', {
      endpoint: record.endpoint,
      statusCode: record.statusCode,
      method: record.method,
      userId: record.userId,
    });
  }
}

/**
 * Generate unique request ID
 */
function generateRequestId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get error code name
 */
function getErrorCode(statusCode) {
  const codes = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    429: 'RATE_LIMITED',
    500: 'SERVER_ERROR',
    502: 'BAD_GATEWAY',
    503: 'SERVICE_UNAVAILABLE',
  };
  return codes[statusCode] || 'UNKNOWN_ERROR';
}

/**
 * Get analytics summary
 */
function getAnalyticsSummary() {
  const now = Date.now();
  const uptimeSeconds = Math.floor((now - analytics.startTime) / 1000);

  // Calculate averages and stats
  const totalRequests = analytics.requests.length;
  const totalErrors = analytics.errors.length;
  const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;

  // Calculate average response time
  const avgDuration = totalRequests > 0
    ? analytics.requests.reduce((sum, r) => sum + r.duration, 0) / totalRequests
    : 0;

  // Get slow requests
  const slowRequests = analytics.requests.filter(r => r.slow).length;

  // Get top endpoints
  const topEndpoints = Array.from(analytics.endpoints.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map(stat => ({
      endpoint: `${stat.method} ${stat.endpoint}`,
      count: stat.count,
      avgDuration: Math.round(stat.totalDuration / stat.count),
      minDuration: stat.minDuration,
      maxDuration: stat.maxDuration,
      errorRate: stat.count > 0 ? (stat.errors / stat.count) * 100 : 0,
      lastAccessed: stat.lastAccessed,
    }));

  // Get recent errors
  const recentErrors = analytics.errors.slice(-20).reverse().map(err => ({
    timestamp: err.timestamp,
    endpoint: `${err.method} ${err.endpoint}`,
    statusCode: err.statusCode,
    errorCode: err.errorCode,
    duration: err.duration,
    userId: err.userId,
  }));

  // Status code breakdown
  const statusCodeCounts = {};
  analytics.requests.forEach(r => {
    const code = Math.floor(r.statusCode / 100) * 100; // Group: 200, 400, 500
    statusCodeCounts[code] = (statusCodeCounts[code] || 0) + 1;
  });

  return {
    uptime: {
      seconds: uptimeSeconds,
      formatted: formatUptime(uptimeSeconds),
    },
    requests: {
      total: totalRequests,
      errors: totalErrors,
      errorRate: errorRate.toFixed(2) + '%',
      avgDuration: Math.round(avgDuration) + 'ms',
      slowRequests,
    },
    statusCodes: statusCodeCounts,
    topEndpoints,
    recentErrors,
    timestamp: new Date(),
  };
}

/**
 * Get detailed endpoint stats
 */
function getEndpointStats(method, path) {
  const key = `${method} ${path}`;
  const stats = analytics.endpoints.get(key);

  if (!stats) {
    return null;
  }

  // Get requests for this endpoint
  const endpointRequests = analytics.requests
    .filter(r => r.method === method && r.endpoint === path)
    .slice(-100); // Last 100 requests

  // Calculate percentiles
  const durations = endpointRequests.map(r => r.duration).sort((a, b) => a - b);
  const p50 = percentile(durations, 50);
  const p95 = percentile(durations, 95);
  const p99 = percentile(durations, 99);

  return {
    method: stats.method,
    endpoint: stats.endpoint,
    count: stats.count,
    avgDuration: Math.round(stats.totalDuration / stats.count),
    minDuration: stats.minDuration,
    maxDuration: stats.maxDuration,
    p50Duration: Math.round(p50),
    p95Duration: Math.round(p95),
    p99Duration: Math.round(p99),
    errorCount: stats.errors,
    errorRate: ((stats.errors / stats.count) * 100).toFixed(2) + '%',
    lastAccessed: stats.lastAccessed,
    recentRequests: endpointRequests.slice(-10).reverse(),
  };
}

/**
 * Calculate percentile
 */
function percentile(arr, p) {
  if (arr.length === 0) return 0;
  const index = Math.ceil((arr.length * p) / 100) - 1;
  return arr[Math.max(0, Math.min(index, arr.length - 1))];
}

/**
 * Format uptime
 */
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
}

/**
 * Clear old data (call periodically)
 */
function clearOldData() {
  const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago

  // Keep only recent requests
  analytics.requests = analytics.requests.filter(
    r => r.timestamp.getTime() > cutoffTime
  );

  // Keep only recent errors
  analytics.errors = analytics.errors.filter(
    e => e.timestamp.getTime() > cutoffTime
  );

  logger.info('Analytics data cleared', {
    requestsKept: analytics.requests.length,
    errorsKept: analytics.errors.length,
  });
}

// Clear old data every hour
setInterval(clearOldData, 60 * 60 * 1000);

module.exports = {
  analyticsMiddleware,
  getAnalyticsSummary,
  getEndpointStats,
  clearOldData,
};
