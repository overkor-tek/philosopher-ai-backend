/**
 * Health Check Aggregator
 * Built by C1 Cloud (CP3) - Autonomous Work
 *
 * Combines multiple health checks into a single status
 *
 * Usage:
 *   const health = require('./utils/healthCheck');
 *   health.addCheck('database', async () => await db.checkConnection());
 *   app.get('/health', async (req, res) => res.json(await health.check()));
 */

class HealthChecker {
  constructor() {
    this.checks = new Map();
    this.startTime = Date.now();
  }

  /**
   * Add a health check
   * @param {string} name - Check name
   * @param {Function} checker - Async function returning { healthy: boolean, ... }
   * @param {Object} options - { critical: boolean, timeout: number }
   */
  addCheck(name, checker, options = {}) {
    this.checks.set(name, {
      checker,
      critical: options.critical !== false, // default true
      timeout: options.timeout || 5000
    });
    return this;
  }

  /**
   * Remove a health check
   * @param {string} name
   */
  removeCheck(name) {
    this.checks.delete(name);
    return this;
  }

  /**
   * Run a single check with timeout
   */
  async runCheck(name, config) {
    const start = Date.now();

    try {
      const result = await Promise.race([
        config.checker(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), config.timeout)
        )
      ]);

      return {
        name,
        healthy: result.healthy !== false,
        latency: Date.now() - start,
        critical: config.critical,
        ...result
      };
    } catch (error) {
      return {
        name,
        healthy: false,
        latency: Date.now() - start,
        critical: config.critical,
        error: error.message
      };
    }
  }

  /**
   * Run all health checks
   * @returns {Promise<Object>}
   */
  async check() {
    const results = await Promise.all(
      Array.from(this.checks.entries()).map(
        ([name, config]) => this.runCheck(name, config)
      )
    );

    const checksMap = {};
    let allHealthy = true;
    let criticalHealthy = true;

    for (const result of results) {
      checksMap[result.name] = result;

      if (!result.healthy) {
        allHealthy = false;
        if (result.critical) {
          criticalHealthy = false;
        }
      }
    }

    return {
      status: criticalHealthy ? (allHealthy ? 'healthy' : 'degraded') : 'unhealthy',
      healthy: criticalHealthy,
      timestamp: new Date().toISOString(),
      uptime: this.formatUptime(Date.now() - this.startTime),
      uptimeMs: Date.now() - this.startTime,
      checks: checksMap,
      summary: {
        total: results.length,
        healthy: results.filter(r => r.healthy).length,
        unhealthy: results.filter(r => !r.healthy).length,
        critical: results.filter(r => r.critical && !r.healthy).length
      }
    };
  }

  /**
   * Quick health check (no details)
   * @returns {Promise<boolean>}
   */
  async isHealthy() {
    const result = await this.check();
    return result.healthy;
  }

  /**
   * Express middleware for health endpoint
   * @param {Object} options
   */
  middleware(options = {}) {
    const { path = '/health', detailed = true } = options;

    return async (req, res, next) => {
      if (req.path !== path) {
        return next();
      }

      try {
        const result = await this.check();
        const statusCode = result.healthy ? 200 : 503;

        if (detailed) {
          res.status(statusCode).json(result);
        } else {
          res.status(statusCode).json({
            status: result.status,
            healthy: result.healthy
          });
        }
      } catch (error) {
        res.status(500).json({
          status: 'error',
          healthy: false,
          error: error.message
        });
      }
    };
  }

  /**
   * Kubernetes-style liveness probe
   */
  livenessProbe() {
    return (req, res) => {
      res.status(200).json({ status: 'alive' });
    };
  }

  /**
   * Kubernetes-style readiness probe
   */
  readinessProbe() {
    return async (req, res) => {
      const healthy = await this.isHealthy();
      res.status(healthy ? 200 : 503).json({
        status: healthy ? 'ready' : 'not ready'
      });
    };
  }

  /**
   * Format uptime
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
}

// Create singleton with default checks
const health = new HealthChecker();

// Add default memory check
health.addCheck('memory', async () => {
  const used = process.memoryUsage();
  const heapUsedMB = Math.round(used.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(used.heapTotal / 1024 / 1024);
  const percentUsed = (used.heapUsed / used.heapTotal) * 100;

  return {
    healthy: percentUsed < 90,
    heapUsed: `${heapUsedMB}MB`,
    heapTotal: `${heapTotalMB}MB`,
    percentUsed: `${percentUsed.toFixed(1)}%`
  };
}, { critical: false });

// Add default event loop check
health.addCheck('eventLoop', async () => {
  const start = Date.now();
  await new Promise(resolve => setImmediate(resolve));
  const lag = Date.now() - start;

  return {
    healthy: lag < 100,
    lag: `${lag}ms`
  };
}, { critical: false });

module.exports = health;
module.exports.HealthChecker = HealthChecker;
