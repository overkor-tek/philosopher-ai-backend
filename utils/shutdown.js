/**
 * Graceful Shutdown Handler
 * Built by C1 Cloud (CP3) - Autonomous Work
 *
 * Handles graceful shutdown of the server and cleanup
 * Ensures in-flight requests complete before exit
 *
 * Usage:
 *   const shutdown = require('./utils/shutdown');
 *   shutdown.register(server);
 *   shutdown.addCleanup('database', async () => await pool.end());
 */

class GracefulShutdown {
  constructor(options = {}) {
    this.options = {
      timeout: options.timeout || 30000, // 30 seconds default
      signals: options.signals || ['SIGTERM', 'SIGINT'],
      forceExitCode: options.forceExitCode || 1,
      ...options
    };

    this.server = null;
    this.cleanupHandlers = new Map();
    this.isShuttingDown = false;
    this.connections = new Set();
  }

  /**
   * Register an HTTP server for graceful shutdown
   * @param {http.Server} server
   */
  register(server) {
    this.server = server;

    // Track connections
    server.on('connection', (conn) => {
      this.connections.add(conn);
      conn.on('close', () => this.connections.delete(conn));
    });

    // Register signal handlers
    this.options.signals.forEach(signal => {
      process.on(signal, () => this.shutdown(signal));
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      this.shutdown('uncaughtException');
    });

    // Handle unhandled rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      this.shutdown('unhandledRejection');
    });

    console.log('Graceful shutdown handler registered');
    return this;
  }

  /**
   * Add a cleanup handler
   * @param {string} name - Handler name for logging
   * @param {Function} handler - Async cleanup function
   */
  addCleanup(name, handler) {
    this.cleanupHandlers.set(name, handler);
    return this;
  }

  /**
   * Remove a cleanup handler
   * @param {string} name
   */
  removeCleanup(name) {
    this.cleanupHandlers.delete(name);
    return this;
  }

  /**
   * Initiate graceful shutdown
   * @param {string} signal - Signal or reason for shutdown
   */
  async shutdown(signal) {
    if (this.isShuttingDown) {
      console.log('Shutdown already in progress...');
      return;
    }

    this.isShuttingDown = true;
    console.log(`\nReceived ${signal}. Starting graceful shutdown...`);

    // Set force exit timeout
    const forceExitTimer = setTimeout(() => {
      console.error('Forced exit - cleanup took too long');
      process.exit(this.options.forceExitCode);
    }, this.options.timeout);

    try {
      // Stop accepting new connections
      if (this.server) {
        console.log('Stopping server...');
        await this.closeServer();
      }

      // Run cleanup handlers
      console.log(`Running ${this.cleanupHandlers.size} cleanup handler(s)...`);
      await this.runCleanupHandlers();

      // Success
      clearTimeout(forceExitTimer);
      console.log('Graceful shutdown complete');
      process.exit(0);

    } catch (error) {
      console.error('Error during shutdown:', error);
      clearTimeout(forceExitTimer);
      process.exit(this.options.forceExitCode);
    }
  }

  /**
   * Close the HTTP server
   */
  closeServer() {
    return new Promise((resolve, reject) => {
      // Stop accepting new connections
      this.server.close((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });

      // Close existing connections gracefully
      console.log(`Closing ${this.connections.size} active connection(s)...`);
      for (const conn of this.connections) {
        conn.end();
      }

      // Force destroy after timeout
      setTimeout(() => {
        for (const conn of this.connections) {
          conn.destroy();
        }
      }, 5000);
    });
  }

  /**
   * Run all cleanup handlers
   */
  async runCleanupHandlers() {
    const results = [];

    for (const [name, handler] of this.cleanupHandlers) {
      try {
        console.log(`  Cleaning up: ${name}...`);
        const start = Date.now();
        await handler();
        const duration = Date.now() - start;
        console.log(`  ✓ ${name} (${duration}ms)`);
        results.push({ name, success: true, duration });
      } catch (error) {
        console.error(`  ✗ ${name}: ${error.message}`);
        results.push({ name, success: false, error: error.message });
      }
    }

    return results;
  }

  /**
   * Check if shutdown is in progress
   */
  isShutdownInProgress() {
    return this.isShuttingDown;
  }

  /**
   * Get active connections count
   */
  getConnectionCount() {
    return this.connections.size;
  }

  /**
   * Middleware to reject requests during shutdown
   */
  middleware() {
    return (req, res, next) => {
      if (this.isShuttingDown) {
        res.set('Connection', 'close');
        return res.status(503).json({
          success: false,
          error: 'Server is shutting down',
          retryAfter: 30
        });
      }
      next();
    };
  }
}

// Create singleton instance
const shutdown = new GracefulShutdown();

module.exports = shutdown;
module.exports.GracefulShutdown = GracefulShutdown;
