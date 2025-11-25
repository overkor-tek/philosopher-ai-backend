// ================================================
// ANALYTICS & METRICS COLLECTION
// ================================================
// Track platform usage, growth, and engagement metrics
// C1 Mechanic - Production Enhancement
// ================================================

const express = require('express');
const router = express.Router();
const pool = require('../database/db');
const logger = require('../utils/logger');

// ================================================
// TRACK EVENT
// ================================================

router.post('/track', async (req, res) => {
    try {
        const userId = req.user?.id || null;
        const { event, properties } = req.body;

        if (!event) {
            return res.status(400).json({ error: 'Event name is required' });
        }

        // Store event
        await pool.query(
            `INSERT INTO usage_logs (user_id, event_type, event_data)
             VALUES ($1, $2, $3)`,
            [userId, event, JSON.stringify(properties || {})]
        );

        res.status(200).json({
            success: true,
            message: 'Event tracked'
        });

    } catch (error) {
        logger.error('Analytics track error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ================================================
// USER METRICS (for authenticated users)
// ================================================

router.get('/me/metrics', async (req, res) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Get user metrics
        const metricsResult = await pool.query(`
            SELECT
                COUNT(*) FILTER (WHERE event_type = 'question') as total_questions,
                COUNT(*) FILTER (WHERE event_type = 'question' AND created_at > NOW() - INTERVAL '7 days') as questions_7d,
                COUNT(*) FILTER (WHERE event_type = 'question' AND created_at > NOW() - INTERVAL '30 days') as questions_30d,
                COUNT(DISTINCT DATE(created_at)) as total_active_days,
                MAX(created_at) as last_activity,
                MIN(created_at) as first_activity
            FROM usage_logs
            WHERE user_id = $1
        `, [userId]);

        const metrics = metricsResult.rows[0];

        // Get question history by day (last 30 days)
        const historyResult = await pool.query(`
            SELECT
                DATE(created_at) as date,
                COUNT(*) as count
            FROM usage_logs
            WHERE user_id = $1
            AND event_type = 'question'
            AND created_at > NOW() - INTERVAL '30 days'
            GROUP BY DATE(created_at)
            ORDER BY date DESC
        `, [userId]);

        res.status(200).json({
            success: true,
            metrics: {
                totalQuestions: parseInt(metrics.total_questions),
                questions7d: parseInt(metrics.questions_7d),
                questions30d: parseInt(metrics.questions_30d),
                totalActiveDays: parseInt(metrics.total_active_days),
                lastActivity: metrics.last_activity,
                firstActivity: metrics.first_activity,
                history: historyResult.rows
            }
        });

    } catch (error) {
        logger.error('Analytics user metrics error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ================================================
// PLATFORM METRICS (public)
// ================================================

router.get('/platform', async (req, res) => {
    try {
        // Get platform-wide metrics
        const metricsResult = await pool.query(`
            SELECT
                COUNT(DISTINCT user_id) FILTER (WHERE event_type = 'question') as total_users,
                COUNT(*) FILTER (WHERE event_type = 'question') as total_questions,
                COUNT(*) FILTER (WHERE event_type = 'question' AND created_at > NOW() - INTERVAL '24 hours') as questions_24h,
                COUNT(DISTINCT user_id) FILTER (WHERE event_type = 'question' AND created_at > NOW() - INTERVAL '24 hours') as active_users_24h
            FROM usage_logs
        `);

        const metrics = metricsResult.rows[0];

        res.status(200).json({
            success: true,
            platform: {
                totalUsers: parseInt(metrics.total_users),
                totalQuestions: parseInt(metrics.total_questions),
                questions24h: parseInt(metrics.questions_24h),
                activeUsers24h: parseInt(metrics.active_users_24h)
            }
        });

    } catch (error) {
        logger.error('Analytics platform metrics error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ================================================
// GROWTH METRICS (requires authentication)
// ================================================

router.get('/growth', async (req, res) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Get growth metrics (last 30 days)
        const growthResult = await pool.query(`
            SELECT
                DATE(created_at) as date,
                COUNT(DISTINCT user_id) as new_users,
                COUNT(*) FILTER (WHERE event_type = 'question') as questions
            FROM usage_logs
            WHERE created_at > NOW() - INTERVAL '30 days'
            GROUP BY DATE(created_at)
            ORDER BY date DESC
        `);

        res.status(200).json({
            success: true,
            growth: growthResult.rows
        });

    } catch (error) {
        logger.error('Analytics growth metrics error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ================================================
// ENGAGEMENT METRICS
// ================================================

router.get('/engagement', async (req, res) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Calculate engagement metrics
        const engagementResult = await pool.query(`
            WITH user_activity AS (
                SELECT
                    user_id,
                    COUNT(*) FILTER (WHERE event_type = 'question') as questions,
                    COUNT(DISTINCT DATE(created_at)) as active_days,
                    MAX(created_at) as last_active,
                    MIN(created_at) as first_active
                FROM usage_logs
                WHERE created_at > NOW() - INTERVAL '30 days'
                GROUP BY user_id
            )
            SELECT
                COUNT(*) as total_active_users,
                AVG(questions) as avg_questions_per_user,
                AVG(active_days) as avg_active_days,
                PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY questions) as median_questions
            FROM user_activity
        `);

        const engagement = engagementResult.rows[0];

        res.status(200).json({
            success: true,
            engagement: {
                totalActiveUsers: parseInt(engagement.total_active_users),
                avgQuestionsPerUser: parseFloat(engagement.avg_questions_per_user).toFixed(2),
                avgActiveDays: parseFloat(engagement.avg_active_days).toFixed(2),
                medianQuestions: parseFloat(engagement.median_questions)
            }
        });

    } catch (error) {
        logger.error('Analytics engagement metrics error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
