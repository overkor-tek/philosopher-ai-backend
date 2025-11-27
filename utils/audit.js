/**
 * Audit Logging Utility
 * Built by C1 Cloud (CP3) - Autonomous Work
 *
 * Security-focused audit trail for compliance and forensics
 *
 * Usage:
 *   const audit = require('./utils/audit');
 *   audit.log('user.login', { userId: 123, ip: req.ip });
 *   audit.log('data.export', { userId: 123, records: 500 }, 'high');
 */

const fs = require('fs');
const path = require('path');

/**
 * Severity levels for audit events
 */
const SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

/**
 * Standard audit event types
 */
const EVENT_TYPES = {
  // Authentication
  USER_LOGIN: 'user.login',
  USER_LOGOUT: 'user.logout',
  USER_LOGIN_FAILED: 'user.login_failed',
  PASSWORD_CHANGED: 'user.password_changed',
  PASSWORD_RESET: 'user.password_reset',
  MFA_ENABLED: 'user.mfa_enabled',
  MFA_DISABLED: 'user.mfa_disabled',

  // Authorization
  ACCESS_DENIED: 'auth.access_denied',
  PERMISSION_CHANGED: 'auth.permission_changed',
  ROLE_ASSIGNED: 'auth.role_assigned',

  // Data operations
  DATA_CREATED: 'data.created',
  DATA_UPDATED: 'data.updated',
  DATA_DELETED: 'data.deleted',
  DATA_EXPORTED: 'data.exported',
  DATA_IMPORTED: 'data.imported',

  // Admin actions
  ADMIN_ACTION: 'admin.action',
  CONFIG_CHANGED: 'admin.config_changed',
  USER_CREATED: 'admin.user_created',
  USER_DELETED: 'admin.user_deleted',
  USER_SUSPENDED: 'admin.user_suspended',

  // Security
  SUSPICIOUS_ACTIVITY: 'security.suspicious',
  RATE_LIMIT_EXCEEDED: 'security.rate_limit',
  INVALID_TOKEN: 'security.invalid_token',
  API_KEY_CREATED: 'security.api_key_created',
  API_KEY_REVOKED: 'security.api_key_revoked'
};

class AuditLogger {
  constructor(options = {}) {
    this.options = {
      logToFile: options.logToFile !== false,
      logToConsole: options.logToConsole || process.env.NODE_ENV !== 'production',
      logDirectory: options.logDirectory || path.join(process.cwd(), 'logs'),
      maxFileSize: options.maxFileSize || 10 * 1024 * 1024, // 10MB
      retentionDays: options.retentionDays || 90,
      ...options
    };

    this.buffer = [];
    this.bufferSize = options.bufferSize || 100;
    this.flushInterval = options.flushInterval || 5000;

    // Ensure log directory exists
    if (this.options.logToFile) {
      this.ensureLogDirectory();
      this.startFlushTimer();
    }
  }

  ensureLogDirectory() {
    if (!fs.existsSync(this.options.logDirectory)) {
      fs.mkdirSync(this.options.logDirectory, { recursive: true });
    }
  }

  startFlushTimer() {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.flushInterval);

    if (this.flushTimer.unref) {
      this.flushTimer.unref();
    }
  }

  /**
   * Log an audit event
   * @param {string} eventType - Event type (use EVENT_TYPES)
   * @param {Object} data - Event data
   * @param {string} severity - Event severity
   * @param {Object} context - Additional context
   */
  log(eventType, data = {}, severity = SEVERITY.LOW, context = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      eventType,
      severity,
      data: this.sanitizeData(data),
      context: {
        environment: process.env.NODE_ENV || 'development',
        hostname: process.env.HOSTNAME || 'unknown',
        ...context
      },
      metadata: {
        version: '1.0',
        source: 'philosopher-ai-backend'
      }
    };

    // Add to buffer
    this.buffer.push(entry);

    // Console output in development
    if (this.options.logToConsole) {
      this.logToConsole(entry);
    }

    // Flush if buffer is full
    if (this.buffer.length >= this.bufferSize) {
      this.flush();
    }

    return entry;
  }

  /**
   * Sanitize sensitive data before logging
   */
  sanitizeData(data) {
    const sanitized = { ...data };
    const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'creditCard'];

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Log to console with formatting
   */
  logToConsole(entry) {
    const severityColors = {
      low: '\x1b[32m',      // green
      medium: '\x1b[33m',   // yellow
      high: '\x1b[31m',     // red
      critical: '\x1b[35m'  // magenta
    };

    const color = severityColors[entry.severity] || '\x1b[0m';
    const reset = '\x1b[0m';

    console.log(
      `${color}[AUDIT]${reset} ${entry.timestamp} ${entry.eventType} (${entry.severity})`,
      JSON.stringify(entry.data)
    );
  }

  /**
   * Flush buffer to file
   */
  flush() {
    if (this.buffer.length === 0 || !this.options.logToFile) {
      return;
    }

    const entries = this.buffer.splice(0, this.buffer.length);
    const date = new Date().toISOString().split('T')[0];
    const logFile = path.join(this.options.logDirectory, `audit-${date}.log`);

    const lines = entries.map(e => JSON.stringify(e)).join('\n') + '\n';

    try {
      fs.appendFileSync(logFile, lines);
    } catch (error) {
      console.error('Failed to write audit log:', error.message);
      // Re-add entries to buffer on failure
      this.buffer.unshift(...entries);
    }
  }

  /**
   * Query audit logs
   * @param {Object} filters - { eventType, userId, startDate, endDate, severity }
   * @param {number} limit
   */
  async query(filters = {}, limit = 100) {
    const results = [];
    const files = this.getLogFiles(filters.startDate, filters.endDate);

    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.trim().split('\n');

        for (const line of lines) {
          if (results.length >= limit) break;

          try {
            const entry = JSON.parse(line);

            if (this.matchesFilters(entry, filters)) {
              results.push(entry);
            }
          } catch {
            // Skip malformed lines
          }
        }
      } catch {
        // Skip unreadable files
      }
    }

    return results;
  }

  /**
   * Get log files within date range
   */
  getLogFiles(startDate, endDate) {
    const files = [];

    try {
      const allFiles = fs.readdirSync(this.options.logDirectory)
        .filter(f => f.startsWith('audit-') && f.endsWith('.log'))
        .sort();

      for (const file of allFiles) {
        const dateStr = file.replace('audit-', '').replace('.log', '');

        if (startDate && dateStr < startDate) continue;
        if (endDate && dateStr > endDate) continue;

        files.push(path.join(this.options.logDirectory, file));
      }
    } catch {
      // Return empty if directory doesn't exist
    }

    return files;
  }

  /**
   * Check if entry matches filters
   */
  matchesFilters(entry, filters) {
    if (filters.eventType && entry.eventType !== filters.eventType) {
      return false;
    }
    if (filters.userId && entry.data.userId !== filters.userId) {
      return false;
    }
    if (filters.severity && entry.severity !== filters.severity) {
      return false;
    }
    return true;
  }

  /**
   * Express middleware for automatic request auditing
   */
  middleware(options = {}) {
    const { auditRoutes = ['/api/v1/admin', '/api/v1/auth'] } = options;

    return (req, res, next) => {
      const shouldAudit = auditRoutes.some(route => req.path.startsWith(route));

      if (!shouldAudit) {
        return next();
      }

      // Capture response
      const originalEnd = res.end;
      res.end = (...args) => {
        this.log('http.request', {
          method: req.method,
          path: req.path,
          userId: req.user?.id,
          ip: req.ip,
          statusCode: res.statusCode,
          userAgent: req.get('user-agent')
        }, res.statusCode >= 400 ? SEVERITY.MEDIUM : SEVERITY.LOW);

        originalEnd.apply(res, args);
      };

      next();
    };
  }

  /**
   * Cleanup old log files
   */
  cleanup() {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.options.retentionDays);
    const cutoff = cutoffDate.toISOString().split('T')[0];

    try {
      const files = fs.readdirSync(this.options.logDirectory)
        .filter(f => f.startsWith('audit-') && f.endsWith('.log'));

      for (const file of files) {
        const dateStr = file.replace('audit-', '').replace('.log', '');
        if (dateStr < cutoff) {
          fs.unlinkSync(path.join(this.options.logDirectory, file));
          console.log(`Deleted old audit log: ${file}`);
        }
      }
    } catch (error) {
      console.error('Failed to cleanup audit logs:', error.message);
    }
  }

  /**
   * Shutdown - flush remaining entries
   */
  shutdown() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flush();
  }
}

// Create singleton
const audit = new AuditLogger();

// Convenience methods
module.exports = audit;
module.exports.AuditLogger = AuditLogger;
module.exports.SEVERITY = SEVERITY;
module.exports.EVENT_TYPES = EVENT_TYPES;
