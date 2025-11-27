/**
 * Security Middleware Configuration
 * Built by C1 Cloud (CP3) - Autonomous Work
 *
 * Centralized security headers and protections
 *
 * Usage:
 *   const security = require('./middleware/security');
 *   app.use(security.headers());
 *   app.use(security.xss());
 */

/**
 * Security headers configuration (works with or without helmet)
 * @param {Object} options
 * @returns {Function} Express middleware
 */
function securityHeaders(options = {}) {
  const defaults = {
    contentSecurityPolicy: options.contentSecurityPolicy !== false,
    crossOriginEmbedderPolicy: false, // Can break some features
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    crossOriginResourcePolicy: { policy: 'same-origin' },
    dnsPrefetchControl: { allow: false },
    frameguard: { action: 'deny' },
    hidePoweredBy: true,
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true
    },
    ieNoOpen: true,
    noSniff: true,
    originAgentCluster: true,
    permittedCrossDomainPolicies: { permittedPolicies: 'none' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xssFilter: true,
    ...options
  };

  return (req, res, next) => {
    // X-Content-Type-Options
    if (defaults.noSniff) {
      res.setHeader('X-Content-Type-Options', 'nosniff');
    }

    // X-Frame-Options
    if (defaults.frameguard) {
      res.setHeader('X-Frame-Options', defaults.frameguard.action.toUpperCase());
    }

    // X-XSS-Protection (legacy but still useful)
    if (defaults.xssFilter) {
      res.setHeader('X-XSS-Protection', '1; mode=block');
    }

    // Strict-Transport-Security
    if (defaults.hsts && process.env.NODE_ENV === 'production') {
      let hstsValue = `max-age=${defaults.hsts.maxAge}`;
      if (defaults.hsts.includeSubDomains) hstsValue += '; includeSubDomains';
      if (defaults.hsts.preload) hstsValue += '; preload';
      res.setHeader('Strict-Transport-Security', hstsValue);
    }

    // Referrer-Policy
    if (defaults.referrerPolicy) {
      res.setHeader('Referrer-Policy', defaults.referrerPolicy.policy);
    }

    // X-DNS-Prefetch-Control
    if (defaults.dnsPrefetchControl) {
      res.setHeader('X-DNS-Prefetch-Control', defaults.dnsPrefetchControl.allow ? 'on' : 'off');
    }

    // X-Permitted-Cross-Domain-Policies
    if (defaults.permittedCrossDomainPolicies) {
      res.setHeader('X-Permitted-Cross-Domain-Policies', defaults.permittedCrossDomainPolicies.permittedPolicies);
    }

    // Remove X-Powered-By
    if (defaults.hidePoweredBy) {
      res.removeHeader('X-Powered-By');
    }

    // Content-Security-Policy
    if (defaults.contentSecurityPolicy) {
      const csp = typeof defaults.contentSecurityPolicy === 'object'
        ? defaults.contentSecurityPolicy
        : {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:', 'https:'],
            fontSrc: ["'self'"],
            connectSrc: ["'self'"],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"]
          };

      const cspString = Object.entries(csp)
        .map(([key, values]) => {
          const directive = key.replace(/([A-Z])/g, '-$1').toLowerCase();
          return `${directive} ${values.join(' ')}`;
        })
        .join('; ');

      res.setHeader('Content-Security-Policy', cspString);
    }

    next();
  };
}

/**
 * XSS sanitization middleware
 * Sanitizes request body, query, and params
 */
function xssSanitizer() {
  const escapeHtml = (str) => {
    if (typeof str !== 'string') return str;
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  };

  const sanitizeObject = (obj) => {
    if (typeof obj !== 'object' || obj === null) {
      return escapeHtml(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }

    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  };

  return (req, res, next) => {
    if (req.body) req.body = sanitizeObject(req.body);
    if (req.query) req.query = sanitizeObject(req.query);
    if (req.params) req.params = sanitizeObject(req.params);
    next();
  };
}

/**
 * SQL injection prevention check
 * Logs suspicious patterns (doesn't block - use parameterized queries)
 */
function sqlInjectionCheck(options = {}) {
  const patterns = [
    /(\%27)|(\')|(\-\-)|(\%23)|(#)/i,
    /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/i,
    /\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i,
    /((\%27)|(\'))union/i
  ];

  return (req, res, next) => {
    const checkValue = (value, location) => {
      if (typeof value !== 'string') return false;

      for (const pattern of patterns) {
        if (pattern.test(value)) {
          console.warn(`[SECURITY] Potential SQL injection detected in ${location}:`, value.substring(0, 100));

          if (options.onDetection) {
            options.onDetection(req, location, value);
          }

          return true;
        }
      }
      return false;
    };

    const checkObject = (obj, location) => {
      if (!obj) return false;

      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string' && checkValue(value, `${location}.${key}`)) {
          if (options.block) {
            return true;
          }
        }
      }
      return false;
    };

    if (options.block) {
      if (checkObject(req.body, 'body') ||
          checkObject(req.query, 'query') ||
          checkObject(req.params, 'params')) {
        return res.status(400).json({
          success: false,
          error: 'Invalid input detected'
        });
      }
    } else {
      checkObject(req.body, 'body');
      checkObject(req.query, 'query');
      checkObject(req.params, 'params');
    }

    next();
  };
}

/**
 * Request size limiter
 */
function requestSizeLimiter(options = {}) {
  const maxSize = options.maxSize || 1024 * 1024; // 1MB default

  return (req, res, next) => {
    const contentLength = parseInt(req.headers['content-length'], 10);

    if (contentLength && contentLength > maxSize) {
      return res.status(413).json({
        success: false,
        error: 'Request entity too large',
        maxSize: `${maxSize / 1024}KB`
      });
    }

    next();
  };
}

/**
 * IP whitelist/blacklist middleware
 */
function ipFilter(options = {}) {
  const { whitelist = [], blacklist = [], onBlocked = null } = options;

  return (req, res, next) => {
    const clientIp = req.ip || req.connection.remoteAddress;

    // Check blacklist first
    if (blacklist.length > 0 && blacklist.includes(clientIp)) {
      if (onBlocked) onBlocked(req, 'blacklist');
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // If whitelist is set, only allow whitelisted IPs
    if (whitelist.length > 0 && !whitelist.includes(clientIp)) {
      if (onBlocked) onBlocked(req, 'whitelist');
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    next();
  };
}

/**
 * Combine all security middleware
 */
function combined(options = {}) {
  const middleware = [
    securityHeaders(options.headers),
  ];

  if (options.xss !== false) {
    middleware.push(xssSanitizer());
  }

  if (options.sqlCheck) {
    middleware.push(sqlInjectionCheck(options.sqlCheck));
  }

  if (options.sizeLimit) {
    middleware.push(requestSizeLimiter(options.sizeLimit));
  }

  if (options.ipFilter) {
    middleware.push(ipFilter(options.ipFilter));
  }

  return (req, res, next) => {
    let index = 0;

    const runNext = () => {
      if (index >= middleware.length) {
        return next();
      }
      middleware[index++](req, res, runNext);
    };

    runNext();
  };
}

module.exports = {
  headers: securityHeaders,
  securityHeaders,
  xss: xssSanitizer,
  xssSanitizer,
  sqlInjectionCheck,
  requestSizeLimiter,
  ipFilter,
  combined
};
