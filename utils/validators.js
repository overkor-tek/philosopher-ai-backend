/**
 * Request Validation Utilities
 * Built by C1 Cloud (CP3) - Autonomous Work
 *
 * Common validators for API request validation
 */

const validator = require('validator');

/**
 * Validate email format
 * @param {string} email
 * @returns {{ valid: boolean, error?: string }}
 */
function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email is required' };
  }

  const trimmed = email.trim().toLowerCase();

  if (!validator.isEmail(trimmed)) {
    return { valid: false, error: 'Invalid email format' };
  }

  if (trimmed.length > 255) {
    return { valid: false, error: 'Email too long (max 255 characters)' };
  }

  return { valid: true, value: trimmed };
}

/**
 * Validate password strength
 * @param {string} password
 * @param {Object} options
 * @returns {{ valid: boolean, error?: string }}
 */
function validatePassword(password, options = {}) {
  const {
    minLength = 8,
    maxLength = 128,
    requireUppercase = true,
    requireLowercase = true,
    requireNumber = true,
    requireSpecial = false
  } = options;

  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required' };
  }

  if (password.length < minLength) {
    return { valid: false, error: `Password must be at least ${minLength} characters` };
  }

  if (password.length > maxLength) {
    return { valid: false, error: `Password must be at most ${maxLength} characters` };
  }

  if (requireUppercase && !/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one uppercase letter' };
  }

  if (requireLowercase && !/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one lowercase letter' };
  }

  if (requireNumber && !/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number' };
  }

  if (requireSpecial && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one special character' };
  }

  return { valid: true };
}

/**
 * Validate username/display name
 * @param {string} name
 * @returns {{ valid: boolean, error?: string }}
 */
function validateName(name) {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Name is required' };
  }

  const trimmed = name.trim();

  if (trimmed.length < 2) {
    return { valid: false, error: 'Name must be at least 2 characters' };
  }

  if (trimmed.length > 100) {
    return { valid: false, error: 'Name must be at most 100 characters' };
  }

  // Sanitize XSS attempts
  const sanitized = validator.escape(trimmed);

  return { valid: true, value: sanitized };
}

/**
 * Validate positive integer ID
 * @param {*} id
 * @returns {{ valid: boolean, error?: string }}
 */
function validateId(id) {
  const parsed = parseInt(id, 10);

  if (isNaN(parsed) || parsed <= 0) {
    return { valid: false, error: 'Invalid ID format' };
  }

  return { valid: true, value: parsed };
}

/**
 * Validate UUID
 * @param {string} uuid
 * @returns {{ valid: boolean, error?: string }}
 */
function validateUUID(uuid) {
  if (!uuid || typeof uuid !== 'string') {
    return { valid: false, error: 'UUID is required' };
  }

  if (!validator.isUUID(uuid)) {
    return { valid: false, error: 'Invalid UUID format' };
  }

  return { valid: true, value: uuid };
}

/**
 * Validate pagination parameters
 * @param {Object} params
 * @returns {{ valid: boolean, error?: string, value?: Object }}
 */
function validatePagination(params) {
  const page = parseInt(params.page, 10) || 1;
  const limit = parseInt(params.limit, 10) || 20;

  if (page < 1) {
    return { valid: false, error: 'Page must be at least 1' };
  }

  if (limit < 1 || limit > 100) {
    return { valid: false, error: 'Limit must be between 1 and 100' };
  }

  return {
    valid: true,
    value: {
      page,
      limit,
      offset: (page - 1) * limit
    }
  };
}

/**
 * Validate message content
 * @param {string} content
 * @returns {{ valid: boolean, error?: string }}
 */
function validateMessageContent(content) {
  if (!content || typeof content !== 'string') {
    return { valid: false, error: 'Message content is required' };
  }

  const trimmed = content.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: 'Message cannot be empty' };
  }

  if (trimmed.length > 50000) {
    return { valid: false, error: 'Message too long (max 50000 characters)' };
  }

  return { valid: true, value: trimmed };
}

/**
 * Validate conversation title
 * @param {string} title
 * @returns {{ valid: boolean, error?: string }}
 */
function validateTitle(title) {
  if (!title || typeof title !== 'string') {
    return { valid: false, error: 'Title is required' };
  }

  const trimmed = title.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: 'Title cannot be empty' };
  }

  if (trimmed.length > 255) {
    return { valid: false, error: 'Title too long (max 255 characters)' };
  }

  const sanitized = validator.escape(trimmed);

  return { valid: true, value: sanitized };
}

/**
 * Validate message role
 * @param {string} role
 * @returns {{ valid: boolean, error?: string }}
 */
function validateRole(role) {
  const validRoles = ['user', 'assistant', 'system'];

  if (!role || !validRoles.includes(role)) {
    return { valid: false, error: `Role must be one of: ${validRoles.join(', ')}` };
  }

  return { valid: true, value: role };
}

/**
 * Validate subscription tier
 * @param {string} tier
 * @returns {{ valid: boolean, error?: string }}
 */
function validateSubscriptionTier(tier) {
  const validTiers = ['free', 'basic', 'pro', 'enterprise'];

  if (!tier || !validTiers.includes(tier)) {
    return { valid: false, error: `Tier must be one of: ${validTiers.join(', ')}` };
  }

  return { valid: true, value: tier };
}

/**
 * Sanitize string input (XSS prevention)
 * @param {string} input
 * @returns {string}
 */
function sanitize(input) {
  if (typeof input !== 'string') return '';
  return validator.escape(input.trim());
}

/**
 * Validate multiple fields at once
 * @param {Object} data - Data to validate
 * @param {Object} rules - Validation rules
 * @returns {{ valid: boolean, errors: Object, values: Object }}
 */
function validateFields(data, rules) {
  const errors = {};
  const values = {};
  let valid = true;

  for (const [field, rule] of Object.entries(rules)) {
    const value = data[field];
    let result;

    switch (rule.type) {
      case 'email':
        result = validateEmail(value);
        break;
      case 'password':
        result = validatePassword(value, rule.options);
        break;
      case 'name':
        result = validateName(value);
        break;
      case 'id':
        result = validateId(value);
        break;
      case 'uuid':
        result = validateUUID(value);
        break;
      case 'message':
        result = validateMessageContent(value);
        break;
      case 'title':
        result = validateTitle(value);
        break;
      case 'role':
        result = validateRole(value);
        break;
      case 'tier':
        result = validateSubscriptionTier(value);
        break;
      default:
        // Required string check
        if (rule.required && (!value || (typeof value === 'string' && !value.trim()))) {
          result = { valid: false, error: `${field} is required` };
        } else {
          result = { valid: true, value };
        }
    }

    if (!result.valid) {
      valid = false;
      errors[field] = result.error;
    } else {
      values[field] = result.value !== undefined ? result.value : value;
    }
  }

  return { valid, errors, values };
}

module.exports = {
  validateEmail,
  validatePassword,
  validateName,
  validateId,
  validateUUID,
  validatePagination,
  validateMessageContent,
  validateTitle,
  validateRole,
  validateSubscriptionTier,
  sanitize,
  validateFields
};
