/**
 * Feature Flags Utility
 * Built by C1 Cloud (CP3) - Autonomous Work
 *
 * Simple feature flag management via environment variables
 *
 * Usage:
 *   const features = require('./utils/featureFlags');
 *   if (features.isEnabled('newDashboard')) { ... }
 *   if (features.isEnabled('betaFeature', { userId: user.id })) { ... }
 */

class FeatureFlags {
  constructor() {
    this.flags = new Map();
    this.overrides = new Map();
    this.loadFromEnv();
  }

  /**
   * Load feature flags from environment variables
   * Format: FEATURE_FLAG_NAME=true|false|percentage|userIds
   */
  loadFromEnv() {
    const prefix = 'FEATURE_';

    Object.entries(process.env).forEach(([key, value]) => {
      if (key.startsWith(prefix)) {
        const flagName = this.envToFlagName(key.slice(prefix.length));
        this.define(flagName, this.parseValue(value));
      }
    });
  }

  /**
   * Convert ENV_CASE to camelCase
   */
  envToFlagName(envName) {
    return envName.toLowerCase().replace(/_([a-z])/g, (_, c) => c.toUpperCase());
  }

  /**
   * Parse environment value
   */
  parseValue(value) {
    if (value === 'true') return { enabled: true };
    if (value === 'false') return { enabled: false };

    // Percentage (e.g., "50%")
    if (value.endsWith('%')) {
      return { percentage: parseInt(value) };
    }

    // User IDs (comma-separated)
    if (value.includes(',') || /^\d+$/.test(value)) {
      return { userIds: value.split(',').map(id => id.trim()) };
    }

    return { enabled: value === '1' || value.toLowerCase() === 'on' };
  }

  /**
   * Define a feature flag
   * @param {string} name - Flag name
   * @param {Object} config - { enabled, percentage, userIds, startDate, endDate }
   */
  define(name, config = {}) {
    this.flags.set(name, {
      enabled: config.enabled ?? false,
      percentage: config.percentage ?? null,
      userIds: config.userIds ?? null,
      startDate: config.startDate ?? null,
      endDate: config.endDate ?? null,
      description: config.description ?? '',
      ...config
    });
    return this;
  }

  /**
   * Check if a feature is enabled
   * @param {string} name - Flag name
   * @param {Object} context - { userId, userGroup, ... }
   * @returns {boolean}
   */
  isEnabled(name, context = {}) {
    // Check overrides first
    if (this.overrides.has(name)) {
      return this.overrides.get(name);
    }

    const flag = this.flags.get(name);

    // Unknown flag = disabled
    if (!flag) {
      return false;
    }

    // Simple boolean
    if (flag.enabled === true) {
      return true;
    }
    if (flag.enabled === false && !flag.percentage && !flag.userIds) {
      return false;
    }

    // Date range check
    if (flag.startDate || flag.endDate) {
      const now = new Date();
      if (flag.startDate && now < new Date(flag.startDate)) {
        return false;
      }
      if (flag.endDate && now > new Date(flag.endDate)) {
        return false;
      }
    }

    // User ID whitelist
    if (flag.userIds && context.userId) {
      if (flag.userIds.includes(String(context.userId))) {
        return true;
      }
    }

    // Percentage rollout
    if (flag.percentage !== null && context.userId) {
      const hash = this.hashUserId(name, context.userId);
      return hash < flag.percentage;
    }

    return flag.enabled ?? false;
  }

  /**
   * Hash user ID for consistent percentage rollout
   */
  hashUserId(flagName, userId) {
    const str = `${flagName}:${userId}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash) % 100;
  }

  /**
   * Set a temporary override (for testing)
   * @param {string} name
   * @param {boolean} value
   */
  setOverride(name, value) {
    this.overrides.set(name, value);
    return this;
  }

  /**
   * Clear an override
   * @param {string} name
   */
  clearOverride(name) {
    this.overrides.delete(name);
    return this;
  }

  /**
   * Clear all overrides
   */
  clearAllOverrides() {
    this.overrides.clear();
    return this;
  }

  /**
   * Get all flag definitions
   */
  getAll() {
    const result = {};
    for (const [name, config] of this.flags) {
      result[name] = {
        ...config,
        overridden: this.overrides.has(name)
      };
    }
    return result;
  }

  /**
   * Get flags enabled for a specific context
   */
  getEnabled(context = {}) {
    const enabled = [];
    for (const name of this.flags.keys()) {
      if (this.isEnabled(name, context)) {
        enabled.push(name);
      }
    }
    return enabled;
  }

  /**
   * Express middleware to attach enabled flags to request
   */
  middleware() {
    return (req, res, next) => {
      const context = {
        userId: req.user?.id,
        userGroup: req.user?.subscription_tier
      };

      req.features = {
        isEnabled: (name) => this.isEnabled(name, context),
        enabled: this.getEnabled(context)
      };

      next();
    };
  }
}

// Create singleton with common flags
const features = new FeatureFlags();

// Define some default flags (can be overridden by env vars)
features.define('maintenance', { enabled: false, description: 'Enable maintenance mode' });
features.define('apiV2', { enabled: false, description: 'Enable API v2 endpoints' });
features.define('aiAssistant', { enabled: true, description: 'Enable AI assistant' });
features.define('analytics', { enabled: true, description: 'Enable analytics tracking' });
features.define('rateLimit', { enabled: true, description: 'Enable rate limiting' });

module.exports = features;
module.exports.FeatureFlags = FeatureFlags;
