// ================================================
// AUTHENTICATION EXTENSIONS
// ================================================
// Password reset, email verification, profile management
// C1 Mechanic - Production Enhancement
// ================================================

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { Pool } = require('pg');
const { sendPasswordResetEmail, sendEmailVerification } = require('../services/emailService');

// Database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

// ================================================
// PASSWORD RESET - REQUEST
// ================================================

router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        // Check if user exists
        const userResult = await pool.query(
            'SELECT id, email FROM users WHERE email = $1',
            [email.toLowerCase()]
        );

        // Always return success to prevent email enumeration
        if (userResult.rows.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'If that email exists, a reset link has been sent'
            });
        }

        const user = userResult.rows[0];

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
        const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

        // Store reset token
        await pool.query(
            `UPDATE users
             SET reset_token_hash = $1, reset_token_expiry = $2
             WHERE id = $3`,
            [resetTokenHash, resetTokenExpiry, user.id]
        );

        // Log event
        await pool.query(
            `INSERT INTO usage_logs (user_id, event_type, event_data)
             VALUES ($1, $2, $3)`,
            [user.id, 'password_reset_requested', JSON.stringify({ email })]
        );

        // Send password reset email
        const emailResult = await sendPasswordResetEmail(user.email, resetToken, user.name || 'there');

        // In development, also log the reset URL
        if (process.env.NODE_ENV === 'development') {
            const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
            console.log(`Password reset URL: ${resetUrl}`);
            console.log(`Email sent:`, emailResult);
        }

        res.status(200).json({
            success: true,
            message: 'If that email exists, a reset link has been sent'
        });

    } catch (error) {
        console.error('Password reset request error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ================================================
// PASSWORD RESET - VERIFY TOKEN
// ================================================

router.get('/verify-reset-token/:token', async (req, res) => {
    try {
        const { token } = req.params;

        if (!token) {
            return res.status(400).json({ error: 'Token is required' });
        }

        // Hash the provided token
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        // Check if token exists and is valid
        const result = await pool.query(
            `SELECT id, email FROM users
             WHERE reset_token_hash = $1
             AND reset_token_expiry > NOW()`,
            [tokenHash]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({
                error: 'Invalid or expired reset token',
                valid: false
            });
        }

        res.status(200).json({
            success: true,
            valid: true,
            email: result.rows[0].email
        });

    } catch (error) {
        console.error('Token verification error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ================================================
// PASSWORD RESET - COMPLETE
// ================================================

router.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({ error: 'Token and new password are required' });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }

        // Hash the provided token
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        // Find user with valid token
        const userResult = await pool.query(
            `SELECT id, email FROM users
             WHERE reset_token_hash = $1
             AND reset_token_expiry > NOW()`,
            [tokenHash]
        );

        if (userResult.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid or expired reset token' });
        }

        const user = userResult.rows[0];

        // Hash new password
        const passwordHash = await bcrypt.hash(newPassword, 10);

        // Update password and clear reset token
        await pool.query(
            `UPDATE users
             SET password_hash = $1,
                 reset_token_hash = NULL,
                 reset_token_expiry = NULL,
                 updated_at = NOW()
             WHERE id = $2`,
            [passwordHash, user.id]
        );

        // Log event
        await pool.query(
            `INSERT INTO usage_logs (user_id, event_type, event_data)
             VALUES ($1, $2, $3)`,
            [user.id, 'password_reset_completed', JSON.stringify({ email: user.email })]
        );

        res.status(200).json({
            success: true,
            message: 'Password has been reset successfully'
        });

    } catch (error) {
        console.error('Password reset completion error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ================================================
// EMAIL VERIFICATION - SEND
// ================================================

router.post('/send-verification-email', async (req, res) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Get user
        const userResult = await pool.query(
            'SELECT id, email, email_verified FROM users WHERE id = $1',
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = userResult.rows[0];

        if (user.email_verified) {
            return res.status(400).json({ error: 'Email already verified' });
        }

        // Generate verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationTokenHash = crypto.createHash('sha256').update(verificationToken).digest('hex');
        const verificationTokenExpiry = new Date(Date.now() + 86400000); // 24 hours

        // Store verification token
        await pool.query(
            `UPDATE users
             SET email_verification_token_hash = $1,
                 email_verification_token_expiry = $2
             WHERE id = $3`,
            [verificationTokenHash, verificationTokenExpiry, user.id]
        );

        // Send verification email
        const emailResult = await sendEmailVerification(user.email, verificationToken, user.name || 'there');

        // In development, also log the verification URL
        if (process.env.NODE_ENV === 'development') {
            const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
            console.log(`Email verification URL: ${verificationUrl}`);
            console.log(`Email sent:`, emailResult);
        }

        res.status(200).json({
            success: true,
            message: 'Verification email sent'
        });

    } catch (error) {
        console.error('Send verification email error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ================================================
// EMAIL VERIFICATION - VERIFY
// ================================================

router.post('/verify-email', async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ error: 'Token is required' });
        }

        // Hash the provided token
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        // Find user with valid token
        const userResult = await pool.query(
            `SELECT id, email FROM users
             WHERE email_verification_token_hash = $1
             AND email_verification_token_expiry > NOW()
             AND email_verified = FALSE`,
            [tokenHash]
        );

        if (userResult.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid or expired verification token' });
        }

        const user = userResult.rows[0];

        // Mark email as verified
        await pool.query(
            `UPDATE users
             SET email_verified = TRUE,
                 email_verification_token_hash = NULL,
                 email_verification_token_expiry = NULL,
                 updated_at = NOW()
             WHERE id = $1`,
            [user.id]
        );

        // Log event
        await pool.query(
            `INSERT INTO usage_logs (user_id, event_type, event_data)
             VALUES ($1, $2, $3)`,
            [user.id, 'email_verified', JSON.stringify({ email: user.email })]
        );

        res.status(200).json({
            success: true,
            message: 'Email verified successfully'
        });

    } catch (error) {
        console.error('Email verification error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ================================================
// CHANGE PASSWORD (authenticated)
// ================================================

router.post('/change-password', async (req, res) => {
    try {
        const userId = req.user?.id;
        const { currentPassword, newPassword } = req.body;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current and new password are required' });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({ error: 'New password must be at least 8 characters' });
        }

        // Get user
        const userResult = await pool.query(
            'SELECT id, password_hash FROM users WHERE id = $1',
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = userResult.rows[0];

        // Verify current password
        const validPassword = await bcrypt.compare(currentPassword, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        // Hash new password
        const newPasswordHash = await bcrypt.hash(newPassword, 10);

        // Update password
        await pool.query(
            `UPDATE users
             SET password_hash = $1, updated_at = NOW()
             WHERE id = $2`,
            [newPasswordHash, user.id]
        );

        // Log event
        await pool.query(
            `INSERT INTO usage_logs (user_id, event_type, event_data)
             VALUES ($1, $2, $3)`,
            [user.id, 'password_changed', JSON.stringify({ timestamp: new Date() })]
        );

        res.status(200).json({
            success: true,
            message: 'Password changed successfully'
        });

    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
