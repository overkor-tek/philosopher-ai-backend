/**
 * Database Connection Utility
 * Built by C1 Cloud (CP3) - Autonomous Work
 *
 * Centralized PostgreSQL connection pool singleton
 * Use this instead of creating new Pool() instances
 *
 * Usage:
 *   const { pool, query, transaction } = require('../utils/db');
 *   const result = await query('SELECT * FROM users WHERE id = $1', [userId]);
 */

const { Pool } = require('pg');

// Singleton pool instance
let pool = null;

/**
 * Get or create the database pool
 * @returns {Pool}
 */
function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL
      || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

    pool = new Pool({
      connectionString,
      max: parseInt(process.env.DB_POOL_SIZE, 10) || 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      // SSL for production
      ssl: process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL?.includes('localhost')
        ? { rejectUnauthorized: false }
        : false
    });

    // Log pool events in development
    if (process.env.NODE_ENV !== 'production') {
      pool.on('connect', () => {
        console.log('DB: New client connected');
      });

      pool.on('error', (err) => {
        console.error('DB: Unexpected error on idle client:', err.message);
      });
    }

    // Handle shutdown gracefully
    process.on('SIGINT', async () => {
      await closePool();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await closePool();
      process.exit(0);
    });
  }

  return pool;
}

/**
 * Execute a query
 * @param {string} text - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<import('pg').QueryResult>}
 */
async function query(text, params = []) {
  const pool = getPool();
  const start = Date.now();

  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;

    // Log slow queries
    if (duration > 1000 && process.env.NODE_ENV !== 'production') {
      console.warn(`Slow query (${duration}ms):`, text.substring(0, 100));
    }

    return result;
  } catch (error) {
    console.error('Database query error:', error.message);
    console.error('Query:', text.substring(0, 200));
    throw error;
  }
}

/**
 * Get a client from the pool for transactions
 * @returns {Promise<import('pg').PoolClient>}
 */
async function getClient() {
  const pool = getPool();
  return pool.connect();
}

/**
 * Execute a transaction
 * @param {Function} callback - Async function that receives the client
 * @returns {Promise<*>} Result from the callback
 *
 * @example
 * const result = await transaction(async (client) => {
 *   await client.query('INSERT INTO users (name) VALUES ($1)', ['Alice']);
 *   await client.query('INSERT INTO audit (action) VALUES ($1)', ['user_created']);
 *   return { success: true };
 * });
 */
async function transaction(callback) {
  const client = await getClient();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Check database connectivity
 * @returns {Promise<{ connected: boolean, latency?: number, error?: string }>}
 */
async function checkConnection() {
  const start = Date.now();

  try {
    await query('SELECT 1');
    return {
      connected: true,
      latency: Date.now() - start
    };
  } catch (error) {
    return {
      connected: false,
      error: error.message
    };
  }
}

/**
 * Close the connection pool
 * @returns {Promise<void>}
 */
async function closePool() {
  if (pool) {
    console.log('Closing database pool...');
    await pool.end();
    pool = null;
    console.log('Database pool closed');
  }
}

/**
 * Get pool statistics
 * @returns {Object}
 */
function getPoolStats() {
  if (!pool) {
    return { initialized: false };
  }

  return {
    initialized: true,
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount
  };
}

// Export pool getter for direct access if needed
module.exports = {
  get pool() {
    return getPool();
  },
  query,
  getClient,
  transaction,
  checkConnection,
  closePool,
  getPoolStats
};
