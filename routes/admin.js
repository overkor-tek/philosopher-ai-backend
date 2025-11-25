// ================================================
// ADMIN DASHBOARD API
// ================================================
// Platform management, user management, analytics
// C1 Mechanic - Production Enhancement
// ================================================

const express = require('express');
const router = express.Router();
const pool = require('../database/db');
const logger = require('../utils/logger');

// ================================================
// ADMIN AUTHENTICATION MIDDLEWARE
// ================================================

const requireAdmin = async (req, res, next) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Check if user is admin
        const result = await pool.query(
            'SELECT is_admin FROM users WHERE id = $1',
            [userId]
        );

        if (result.rows.length === 0 || !result.rows[0].is_admin) {
            logger.logSecurity('Unauthorized admin access attempt', {
                userId,
                ip: req.ip
            });
            return res.status(403).json({ error: 'Forbidden - Admin access required' });
        }

        next();
    } catch (error) {
        logger.error('Admin auth error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Apply admin middleware to all routes
router.use(requireAdmin);

// ================================================
// DASHBOARD OVERVIEW
// ================================================

router.get('/dashboard', async (req, res) => {
    try {
        const startTime = Date.now();

        // Get user statistics
        const userStatsResult = await pool.query(`
            SELECT
                COUNT(*) as total_users,
                COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as new_users_24h,
                COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as new_users_7d,
                COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as new_users_30d,
                COUNT(*) FILTER (WHERE tier = 'free') as free_tier_users,
                COUNT(*) FILTER (WHERE tier = 'pro') as pro_tier_users,
                COUNT(*) FILTER (WHERE tier = 'enterprise') as enterprise_tier_users,
                COUNT(*) FILTER (WHERE email_verified = true) as verified_users
            FROM users
            WHERE email NOT LIKE 'deleted_%'
        `);

        // Get usage statistics
        const usageStatsResult = await pool.query(`
            SELECT
                COUNT(*) as total_questions,
                COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as questions_24h,
                COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as questions_7d,
                COUNT(DISTINCT user_id) as active_users
            FROM usage_logs
            WHERE event_type = 'question'
        `);

        // Get revenue statistics (if you have payments table)
        const revenueStatsResult = await pool.query(`
            SELECT
                COALESCE(SUM(amount), 0) as total_revenue,
                COALESCE(SUM(amount) FILTER (WHERE created_at > NOW() - INTERVAL '30 days'), 0) as revenue_30d,
                COUNT(*) as total_transactions,
                COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as transactions_30d
            FROM payments
            WHERE status = 'succeeded'
        `).catch(() => ({ rows: [{ total_revenue: 0, revenue_30d: 0, total_transactions: 0, transactions_30d: 0 }] }));

        const userStats = userStatsResult.rows[0];
        const usageStats = usageStatsResult.rows[0];
        const revenueStats = revenueStatsResult.rows[0];

        const duration = Date.now() - startTime;
        logger.logPerformance('Admin dashboard query', duration);

        res.status(200).json({
            success: true,
            dashboard: {
                users: {
                    total: parseInt(userStats.total_users),
                    new24h: parseInt(userStats.new_users_24h),
                    new7d: parseInt(userStats.new_users_7d),
                    new30d: parseInt(userStats.new_users_30d),
                    verified: parseInt(userStats.verified_users),
                    byTier: {
                        free: parseInt(userStats.free_tier_users),
                        pro: parseInt(userStats.pro_tier_users),
                        enterprise: parseInt(userStats.enterprise_tier_users)
                    }
                },
                usage: {
                    totalQuestions: parseInt(usageStats.total_questions),
                    questions24h: parseInt(usageStats.questions_24h),
                    questions7d: parseInt(usageStats.questions_7d),
                    activeUsers: parseInt(usageStats.active_users)
                },
                revenue: {
                    total: parseFloat(revenueStats.total_revenue),
                    last30d: parseFloat(revenueStats.revenue_30d),
                    totalTransactions: parseInt(revenueStats.total_transactions),
                    transactions30d: parseInt(revenueStats.transactions_30d)
                },
                queryDuration: `${duration}ms`
            }
        });

    } catch (error) {
        logger.error('Admin dashboard error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ================================================
// USER MANAGEMENT - LIST USERS
// ================================================

router.get('/users', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const offset = (page - 1) * limit;
        const search = req.query.search || '';
        const tier = req.query.tier || '';

        let query = `
            SELECT id, email, username, display_name, tier, email_verified,
                   created_at, updated_at
            FROM users
            WHERE email NOT LIKE 'deleted_%'
        `;

        const params = [];
        let paramCount = 1;

        if (search) {
            query += ` AND (email ILIKE $${paramCount} OR username ILIKE $${paramCount})`;
            params.push(`%${search}%`);
            paramCount++;
        }

        if (tier) {
            query += ` AND tier = $${paramCount}`;
            params.push(tier);
            paramCount++;
        }

        query += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);

        // Get total count
        let countQuery = 'SELECT COUNT(*) FROM users WHERE email NOT LIKE \'deleted_%\'';
        const countParams = [];
        if (search) {
            countQuery += ' AND (email ILIKE $1 OR username ILIKE $1)';
            countParams.push(`%${search}%`);
        }
        if (tier && search) {
            countQuery += ' AND tier = $2';
            countParams.push(tier);
        } else if (tier) {
            countQuery += ' AND tier = $1';
            countParams.push(tier);
        }

        const countResult = await pool.query(countQuery, countParams);
        const totalUsers = parseInt(countResult.rows[0].count);

        res.status(200).json({
            success: true,
            users: result.rows,
            pagination: {
                page,
                limit,
                total: totalUsers,
                pages: Math.ceil(totalUsers / limit)
            }
        });

    } catch (error) {
        logger.error('Admin list users error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ================================================
// USER MANAGEMENT - GET USER DETAILS
// ================================================

router.get('/users/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        // Get user details
        const userResult = await pool.query(
            `SELECT id, email, username, display_name, avatar_url, bio,
                    tier, email_verified, preferences, created_at, updated_at
             FROM users
             WHERE id = $1 AND email NOT LIKE 'deleted_%'`,
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = userResult.rows[0];

        // Get usage stats
        const usageResult = await pool.query(
            `SELECT
                COUNT(*) FILTER (WHERE event_type = 'question') as total_questions,
                MAX(created_at) FILTER (WHERE event_type = 'question') as last_question,
                COUNT(DISTINCT DATE(created_at)) as active_days
             FROM usage_logs
             WHERE user_id = $1`,
            [userId]
        );

        const usage = usageResult.rows[0];

        // Get recent activity
        const activityResult = await pool.query(
            `SELECT event_type, event_data, created_at
             FROM usage_logs
             WHERE user_id = $1
             ORDER BY created_at DESC
             LIMIT 20`,
            [userId]
        );

        res.status(200).json({
            success: true,
            user: {
                ...user,
                usage: {
                    totalQuestions: parseInt(usage.total_questions),
                    lastQuestion: usage.last_question,
                    activeDays: parseInt(usage.active_days)
                },
                recentActivity: activityResult.rows
            }
        });

    } catch (error) {
        logger.error('Admin get user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ================================================
// USER MANAGEMENT - UPDATE USER TIER
// ================================================

router.patch('/users/:userId/tier', async (req, res) => {
    try {
        const { userId } = req.params;
        const { tier } = req.body;

        if (!['free', 'pro', 'enterprise'].includes(tier)) {
            return res.status(400).json({ error: 'Invalid tier' });
        }

        await pool.query(
            'UPDATE users SET tier = $1, updated_at = NOW() WHERE id = $2',
            [tier, userId]
        );

        logger.logAuth('Admin tier change', userId, {
            newTier: tier,
            changedBy: req.user.id
        });

        res.status(200).json({
            success: true,
            message: `User tier updated to ${tier}`
        });

    } catch (error) {
        logger.error('Admin update tier error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ================================================
// SYSTEM HEALTH
// ================================================

router.get('/system/health', async (req, res) => {
    try {
        const startTime = Date.now();

        // Check database connection
        const dbResult = await pool.query('SELECT NOW()');
        const dbLatency = Date.now() - startTime;

        // Get database stats
        const dbStatsResult = await pool.query(`
            SELECT
                pg_database_size(current_database()) as db_size,
                (SELECT count(*) FROM pg_stat_activity) as active_connections
        `);

        const dbStats = dbStatsResult.rows[0];

        res.status(200).json({
            success: true,
            system: {
                status: 'healthy',
                uptime: process.uptime(),
                memory: {
                    used: process.memoryUsage().heapUsed,
                    total: process.memoryUsage().heapTotal,
                    percentage: ((process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100).toFixed(2)
                },
                database: {
                    connected: true,
                    latency: `${dbLatency}ms`,
                    size: parseInt(dbStats.db_size),
                    activeConnections: parseInt(dbStats.active_connections)
                },
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        logger.error('Admin system health error:', error);
        res.status(500).json({
            success: false,
            error: 'System health check failed'
        });
    }
});

module.exports = router;
