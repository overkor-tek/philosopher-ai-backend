/**
 * AUTHENTICATION MIDDLEWARE
 * Verifies JWT tokens for protected routes
 */

const jwt = require('jsonwebtoken');
const pool = require('../database/db');
const logger = require('../utils/logger');

const verifyToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Access token required'
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Get user from database
        const userResult = await pool.query(
            'SELECT * FROM users WHERE id = $1 AND is_active = true',
            [decoded.userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(401).json({
                success: false,
                error: 'User not found or inactive'
            });
        }

        // Attach user to request
        req.user = userResult.rows[0];
        next();
    } catch (error) {
        logger.error('Auth middleware error:', error);
        return res.status(403).json({
            success: false,
            error: 'Invalid or expired token'
        });
    }
};

module.exports = verifyToken;
