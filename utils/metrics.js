/**
 * Simple Metrics Collection
 * Built by C1 Cloud (CP3) - Autonomous Work
 *
 * Basic request metrics without external dependencies
 * For production, consider Prometheus, DataDog, or similar
 *
 * Usage:
 *   const metrics = require('./utils/metrics');
 *   app.use(metrics.middleware());
 *   app.get('/metrics', (req, res) => res.json(metrics.getStats()));
 */

class SimpleMetrics {
  constructor() {
    this.startTime = Date.now();
    this.requests = {
      total: 0,
      success: 0,
      error: 0,
      byMethod: {},
      byPath: {},
      byStatus: {}
    };
    this.responseTime = {
      samples: [],
      maxSamples: 1000
    };
    this.active = 0;
    this.peak = 0;
  }

  /**
   * Record a request
   * @param {Object} data
   */
  recordRequest(data) {
    const { method, path, statusCode, duration } = data;

    this.requests.total++;

    // Success vs error
    if (statusCode >= 400) {
      this.requests.error++;
    } else {
      this.requests.success++;
    }

    // By method
    this.requests.byMethod[method] = (this.requests.byMethod[method] || 0) + 1;

    // By path (normalize to avoid memory issues)
    const normalizedPath = this.normalizePath(path);
    if (!this.requests.byPath[normalizedPath]) {
      this.requests.byPath[normalizedPath] = { count: 0, totalTime: 0 };
    }
    this.requests.byPath[normalizedPath].count++;
    this.requests.byPath[normalizedPath].totalTime += duration;

    // By status code
    this.requests.byStatus[statusCode] = (this.requests.byStatus[statusCode] || 0) + 1;

    // Response time
    this.responseTime.samples.push(duration);
    if (this.responseTime.samples.length > this.responseTime.maxSamples) {
      this.responseTime.samples.shift();
    }
  }

  /**
   * Normalize path to prevent memory explosion
   */
  normalizePath(path) {
    // Replace IDs with placeholders
    return path
      .replace(/\/\d+/g, '/:id')
      .replace(/\/[a-f0-9-]{36}/gi, '/:uuid')
      .split('?')[0]; // Remove query string
  }

  /**
   * Express middleware for tracking requests
   */
  middleware() {
    const self = this;

    return function metricsMiddleware(req, res, next) {
      const start = Date.now();

      // Track active connections
      self.active++;
      if (self.active > self.peak) {
        self.peak = self.active;
      }

      // On response finish
      res.on('finish', () => {
        const duration = Date.now() - start;
        self.active--;

        self.recordRequest({
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration
        });
      });

      next();
    };
  }

  /**
   * Calculate percentile of response times
   */
  percentile(p) {
    const sorted = [...this.responseTime.samples].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  }

  /**
   * Get comprehensive statistics
   */
  getStats() {
    const samples = this.responseTime.samples;
    const uptimeMs = Date.now() - this.startTime;

    return {
      uptime: {
        ms: uptimeMs,
        formatted: this.formatUptime(uptimeMs)
      },
      requests: {
        total: this.requests.total,
        success: this.requests.success,
        error: this.requests.error,
        successRate: this.requests.total > 0
          ? ((this.requests.success / this.requests.total) * 100).toFixed(2) + '%'
          : '0%',
        perMinute: (this.requests.total / (uptimeMs / 60000)).toFixed(2)
      },
      connections: {
        active: this.active,
        peak: this.peak
      },
      responseTime: {
        avg: samples.length > 0
          ? Math.round(samples.reduce((a, b) => a + b, 0) / samples.length)
          : 0,
        min: samples.length > 0 ? Math.min(...samples) : 0,
        max: samples.length > 0 ? Math.max(...samples) : 0,
        p50: this.percentile(50),
        p95: this.percentile(95),
        p99: this.percentile(99)
      },
      byMethod: this.requests.byMethod,
      byStatus: this.requests.byStatus,
      topEndpoints: this.getTopEndpoints(10),
      memory: {
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB',
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + 'MB'
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get top endpoints by request count
   */
  getTopEndpoints(limit = 10) {
    return Object.entries(this.requests.byPath)
      .map(([path, data]) => ({
        path,
        count: data.count,
        avgTime: Math.round(data.totalTime / data.count)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Format uptime in human readable format
   */
  formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  /**
   * Reset all metrics
   */
  reset() {
    this.startTime = Date.now();
    this.requests = {
      total: 0,
      success: 0,
      error: 0,
      byMethod: {},
      byPath: {},
      byStatus: {}
    };
    this.responseTime.samples = [];
    this.active = 0;
    this.peak = 0;
  }

  /**
   * Health check based on metrics
   */
  healthCheck() {
    const stats = this.getStats();
    const errorRate = this.requests.total > 0
      ? (this.requests.error / this.requests.total) * 100
      : 0;

    return {
      healthy: errorRate < 10 && stats.responseTime.p95 < 2000,
      errorRate: errorRate.toFixed(2) + '%',
      p95ResponseTime: stats.responseTime.p95 + 'ms',
      activeConnections: this.active
    };
  }
}

// Create singleton instance
const metrics = new SimpleMetrics();

module.exports = metrics;
module.exports.SimpleMetrics = SimpleMetrics;
