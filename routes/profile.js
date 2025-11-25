// ================================================
// USER PROFILE MANAGEMENT
// ================================================
// Get, update, delete user profiles
// C1 Mechanic - Production Enhancement
// ================================================

const express = require('express');
const router = express.Router();
const pool = require('../database/db');
const validator = require('validator');

// ================================================
// GET PROFILE
// ================================================

router.get('/me', async (req, res) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const result = await pool.query(
            `SELECT id, email, username, display_name, avatar_url, bio,
                    tier, email_verified, preferences, created_at, updated_at
             FROM users
             WHERE id = $1`,
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = result.rows[0];

        // Get usage stats
        const statsResult = await pool.query(
            `SELECT
                COUNT(*) as total_questions,
                COUNT(DISTINCT DATE(created_at)) as active_days
             FROM usage_logs
             WHERE user_id = $1 AND event_type = 'question'`,
            [userId]
        );

        const stats = statsResult.rows[0];

        res.status(200).json({
            success: true,
            profile: {
                ...user,
                stats: {
                    totalQuestions: parseInt(stats.total_questions),
                    activeDays: parseInt(stats.active_days)
                }
            }
        });

    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ================================================
// UPDATE PROFILE
// ================================================

router.put('/me', async (req, res) => {
    try {
        const userId = req.user?.id;
        const { username, displayName, bio, avatarUrl, preferences } = req.body;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Validation
        if (username && !validator.isAlphanumeric(username.replace(/_/g, ''))) {
            return res.status(400).json({
                error: 'Username can only contain letters, numbers, and underscores'
            });
        }

        if (username && (username.length < 3 || username.length > 30)) {
            return res.status(400).json({
                error: 'Username must be between 3 and 30 characters'
            });
        }

        if (displayName && displayName.length > 100) {
            return res.status(400).json({
                error: 'Display name cannot exceed 100 characters'
            });
        }

        if (bio && bio.length > 500) {
            return res.status(400).json({
                error: 'Bio cannot exceed 500 characters'
            });
        }

        if (avatarUrl && !validator.isURL(avatarUrl)) {
            return res.status(400).json({
                error: 'Avatar URL must be a valid URL'
            });
        }

        // Check if username is taken
        if (username) {
            const existingUser = await pool.query(
                'SELECT id FROM users WHERE username = $1 AND id != $2',
                [username, userId]
            );

            if (existingUser.rows.length > 0) {
                return res.status(409).json({ error: 'Username already taken' });
            }
        }

        // Build update query dynamically
        const updates = [];
        const values = [];
        let paramCount = 1;

        if (username !== undefined) {
            updates.push(`username = $${paramCount++}`);
            values.push(username);
        }

        if (displayName !== undefined) {
            updates.push(`display_name = $${paramCount++}`);
            values.push(displayName);
        }

        if (bio !== undefined) {
            updates.push(`bio = $${paramCount++}`);
            values.push(bio);
        }

        if (avatarUrl !== undefined) {
            updates.push(`avatar_url = $${paramCount++}`);
            values.push(avatarUrl);
        }

        if (preferences !== undefined) {
            updates.push(`preferences = $${paramCount++}`);
            values.push(JSON.stringify(preferences));
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        updates.push(`updated_at = NOW()`);
        values.push(userId);

        const query = `
            UPDATE users
            SET ${updates.join(', ')}
            WHERE id = $${paramCount}
            RETURNING id, email, username, display_name, avatar_url, bio,
                      tier, email_verified, preferences, updated_at
        `;

        const result = await pool.query(query, values);

        // Log event
        await pool.query(
            `INSERT INTO usage_logs (user_id, event_type, event_data)
             VALUES ($1, $2, $3)`,
            [userId, 'profile_updated', JSON.stringify({ updates: Object.keys(req.body) })]
        );

        res.status(200).json({
            success: true,
            profile: result.rows[0]
        });

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ================================================
// DELETE ACCOUNT
// ================================================

router.delete('/me', async (req, res) => {
    try {
        const userId = req.user?.id;
        const { confirmPassword } = req.body;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (!confirmPassword) {
            return res.status(400).json({ error: 'Password confirmation required' });
        }

        // Verify password
        const userResult = await pool.query(
            'SELECT password_hash FROM users WHERE id = $1',
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const bcrypt = require('bcrypt');
        const validPassword = await bcrypt.compare(confirmPassword, userResult.rows[0].password_hash);

        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid password' });
        }

        // Soft delete - mark as deleted instead of actually deleting
        await pool.query(
            `UPDATE users
             SET email = CONCAT('deleted_', id, '@deleted.com'),
                 password_hash = '',
                 username = NULL,
                 display_name = 'Deleted User',
                 avatar_url = NULL,
                 bio = NULL,
                 updated_at = NOW()
             WHERE id = $1`,
            [userId]
        );

        // Log event
        await pool.query(
            `INSERT INTO usage_logs (user_id, event_type, event_data)
             VALUES ($1, $2, $3)`,
            [userId, 'account_deleted', JSON.stringify({ timestamp: new Date() })]
        );

        res.status(200).json({
            success: true,
            message: 'Account deleted successfully'
        });

    } catch (error) {
        console.error('Delete account error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ================================================
// GET PUBLIC PROFILE (by username)
// ================================================

router.get('/user/:username', async (req, res) => {
    try {
        const { username } = req.params;

        const result = await pool.query(
            `SELECT username, display_name, avatar_url, bio, created_at
             FROM users
             WHERE username = $1 AND email NOT LIKE 'deleted_%'`,
            [username]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.status(200).json({
            success: true,
            profile: result.rows[0]
        });

    } catch (error) {
        console.error('Get public profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ================================================
// UPDATE PREFERENCES
// ================================================

router.patch('/me/preferences', async (req, res) => {
    try {
        const userId = req.user?.id;
        const { preferences } = req.body;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (!preferences || typeof preferences !== 'object') {
            return res.status(400).json({ error: 'Valid preferences object required' });
        }

        // Get current preferences
        const currentResult = await pool.query(
            'SELECT preferences FROM users WHERE id = $1',
            [userId]
        );

        const currentPreferences = currentResult.rows[0]?.preferences || {};

        // Merge with new preferences
        const updatedPreferences = {
            ...currentPreferences,
            ...preferences
        };

        // Update
        await pool.query(
            `UPDATE users
             SET preferences = $1, updated_at = NOW()
             WHERE id = $2`,
            [JSON.stringify(updatedPreferences), userId]
        );

        res.status(200).json({
            success: true,
            preferences: updatedPreferences
        });

    } catch (error) {
        console.error('Update preferences error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
