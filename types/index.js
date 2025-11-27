/**
 * Philosopher AI - Type Definitions (JSDoc)
 * Built by C1 Cloud (CP3) - Autonomous Work
 *
 * Use these for IDE autocomplete and documentation
 */

/**
 * @typedef {Object} User
 * @property {number} id - User ID
 * @property {string} email - User email
 * @property {string} name - Display name
 * @property {string} subscription_tier - 'free' | 'basic' | 'pro' | 'enterprise'
 * @property {number} manipulation_immunity_score - 0-100
 * @property {Date} created_at - Account creation date
 * @property {Date} last_login - Last login date
 */

/**
 * @typedef {Object} Conversation
 * @property {number} id - Conversation ID
 * @property {number} user_id - Owner user ID
 * @property {string} title - Conversation title
 * @property {boolean} archived - Is archived
 * @property {Date} created_at - Creation date
 * @property {Date} updated_at - Last update date
 */

/**
 * @typedef {Object} Message
 * @property {number} id - Message ID
 * @property {number} conversation_id - Parent conversation ID
 * @property {'user' | 'assistant' | 'system'} role - Message role
 * @property {string} content - Message content
 * @property {boolean} manipulation_detected - Was manipulation detected
 * @property {number} manipulation_score - 0-100
 * @property {Date} created_at - Creation date
 */

/**
 * @typedef {Object} Payment
 * @property {number} id - Payment ID
 * @property {number} user_id - User ID
 * @property {string} stripe_payment_id - Stripe payment intent ID
 * @property {number} amount - Amount in dollars
 * @property {string} currency - Currency code
 * @property {'pending' | 'completed' | 'failed' | 'refunded'} status - Payment status
 * @property {string} payment_method - Payment method used
 * @property {Date} created_at - Creation date
 */

/**
 * @typedef {Object} ApiResponse
 * @property {boolean} success - Was request successful
 * @property {string} [error] - Error message if failed
 * @property {*} [data] - Response data
 */

/**
 * @typedef {Object} AuthResponse
 * @property {boolean} success - Was auth successful
 * @property {User} user - User object
 * @property {string} token - JWT token
 */

/**
 * @typedef {Object} HealthResponse
 * @property {'healthy' | 'unhealthy'} status - Health status
 * @property {string} timestamp - ISO timestamp
 * @property {string} database - Database connection status
 * @property {Object} integrations - Integration status
 * @property {boolean} integrations.stripe - Stripe enabled
 * @property {boolean} integrations.anthropic - Anthropic enabled
 */

/**
 * @typedef {Object} PaginatedResponse
 * @property {boolean} success - Was request successful
 * @property {Array} data - Array of items
 * @property {number} total - Total count
 * @property {number} page - Current page
 * @property {number} limit - Items per page
 */

/**
 * @typedef {Object} JwtPayload
 * @property {number} userId - User ID
 * @property {string} email - User email
 * @property {number} iat - Issued at timestamp
 * @property {number} exp - Expiration timestamp
 */

/**
 * @typedef {Object} RequestUser
 * @property {number} userId - User ID from JWT
 * @property {string} email - User email from JWT
 */

// Export for IDE recognition
module.exports = {};
