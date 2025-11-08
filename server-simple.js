// ================================================
// SIMPLE SQLITE BACKEND - NO COMPLEX MIDDLEWARE
// ================================================
// Quick working server for testing
// Add security middleware later
// ================================================

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');

// ================================================
// CONFIGURATION
// ================================================

const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'consciousness_revolution_test_secret_2025';

// ================================================
// INITIALIZE EXPRESS APP
// ================================================

const app = express();

// CORS configuration for cross-subdomain sessions
const corsOptions = {
    origin: function(origin, callback) {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) return callback(null, true);

        // Allow localhost for development
        if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
            return callback(null, true);
        }

        // Allow consciousnessrevolution.io and all subdomains
        if (origin.endsWith('.consciousnessrevolution.io') || origin === 'https://consciousnessrevolution.io') {
            return callback(null, true);
        }

        // Allow Railway domains
        if (origin.includes('.railway.app')) {
            return callback(null, true);
        }

        // Reject other origins
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true, // Allow cookies
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));

// ================================================
// INITIALIZE SQLITE DATABASE
// ================================================

let db;

async function initDatabase() {
    db = await open({
        filename: path.join(__dirname, 'consciousness.db'),
        driver: sqlite3.Database
    });

    // Create users table
    await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            name TEXT,
            pin TEXT UNIQUE,
            permissions TEXT DEFAULT '{}',
            consciousness_level INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            token TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            expires_at DATETIME,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS error_logs (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            error_message TEXT NOT NULL,
            error_stack TEXT,
            page_url TEXT,
            user_agent TEXT,
            severity TEXT DEFAULT 'error',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    console.log('✅ SQLite database initialized: consciousness.db');
}

// ================================================
// HELPER FUNCTIONS
// ================================================

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Set authentication cookie for cross-subdomain sessions
 *
 * @param {object} res - Express response object
 * @param {string} token - JWT token
 */
function setAuthCookie(res, token) {
    const isProduction = process.env.NODE_ENV === 'production';
    const domain = isProduction ? '.consciousnessrevolution.io' : undefined;

    res.cookie('auth_token', token, {
        httpOnly: true,        // Prevent XSS attacks
        secure: isProduction,  // HTTPS only in production
        sameSite: isProduction ? 'none' : 'lax', // Cross-site in production
        domain: domain,        // Cross-subdomain access
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/'
    });
}

// ================================================
// AUTHENTICATION ENDPOINTS - V1 API
// ================================================

// Health check (non-versioned for convenience)
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        version: 'v1',
        database: db ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
    });
});

// V1 Health check
app.get('/api/v1/health', (req, res) => {
    res.json({
        status: 'healthy',
        version: 'v1',
        database: db ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
    });
});

// Register new user
app.post('/api/v1/auth/register', async (req, res) => {
    try {
        const { email, password, name, pin } = req.body;

        // Basic validation
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        // Check if user exists
        const existing = await db.get('SELECT id FROM users WHERE email = ?', [email]);
        if (existing) {
            return res.status(400).json({ error: 'User already exists' });
        }

        // Hash password
        const password_hash = await bcrypt.hash(password, 10);

        // Create user
        const userId = generateId();
        await db.run(
            `INSERT INTO users (id, email, password_hash, name, pin, permissions)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [userId, email, password_hash, name || 'User', pin || null, JSON.stringify({})]
        );

        // Generate JWT
        const token = jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '7d' });

        // Set cookie for cross-subdomain sessions
        setAuthCookie(res, token);

        res.status(201).json({
            success: true,
            user: { id: userId, email, name: name || 'User' },
            token
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Login with email/password
app.post('/api/v1/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        // Find user
        const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check password
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate JWT
        const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

        // Set cookie for cross-subdomain sessions
        setAuthCookie(res, token);

        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                permissions: JSON.parse(user.permissions || '{}')
            },
            token
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Login with PIN (for simple 4-digit PIN authentication)
app.post('/api/v1/auth/login-pin', async (req, res) => {
    try {
        const { pin } = req.body;

        if (!pin || pin.length !== 4) {
            return res.status(400).json({ error: '4-digit PIN required' });
        }

        // Find user by PIN
        const user = await db.get('SELECT * FROM users WHERE pin = ?', [pin]);
        if (!user) {
            return res.status(401).json({ error: 'Invalid PIN' });
        }

        // Generate JWT
        const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

        // Set cookie for cross-subdomain sessions
        setAuthCookie(res, token);

        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                pin: user.pin,
                permissions: JSON.parse(user.permissions || '{}')
            },
            token
        });

    } catch (error) {
        console.error('PIN login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Get current user (requires JWT)
app.get('/api/v1/auth/me', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: 'No authorization header' });
        }

        const token = authHeader.replace('Bearer ', '');
        const decoded = jwt.verify(token, JWT_SECRET);

        const user = await db.get('SELECT * FROM users WHERE id = ?', [decoded.userId]);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                permissions: JSON.parse(user.permissions || '{}')
            }
        });

    } catch (error) {
        console.error('Get user error:', error);
        res.status(401).json({ error: 'Invalid token' });
    }
});

// ================================================
// ERROR LOGGING ENDPOINTS
// ================================================

// Log client-side error
app.post('/api/v1/errors/log', async (req, res) => {
    try {
        const { message, stack, url, userAgent, severity = 'error' } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Error message required' });
        }

        // Get user ID from JWT if available
        let userId = null;
        const authHeader = req.headers.authorization;
        if (authHeader) {
            try {
                const token = authHeader.replace('Bearer ', '');
                const decoded = jwt.verify(token, JWT_SECRET);
                userId = decoded.userId;
            } catch (e) {
                // Invalid token, but still log the error
            }
        }

        // Create error log
        const errorId = generateId();
        await db.run(
            `INSERT INTO error_logs (id, user_id, error_message, error_stack, page_url, user_agent, severity)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [errorId, userId, message, stack || null, url || null, userAgent || null, severity]
        );

        res.json({ success: true, id: errorId });

    } catch (error) {
        console.error('Error logging failed:', error);
        res.status(500).json({ error: 'Failed to log error' });
    }
});

// Get recent errors
app.get('/api/v1/errors/recent', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const severity = req.query.severity || null;

        let query = 'SELECT * FROM error_logs';
        const params = [];

        if (severity) {
            query += ' WHERE severity = ?';
            params.push(severity);
        }

        query += ' ORDER BY created_at DESC LIMIT ?';
        params.push(limit);

        const errors = await db.all(query, params);

        res.json({ success: true, errors, count: errors.length });

    } catch (error) {
        console.error('Error retrieval failed:', error);
        res.status(500).json({ error: 'Failed to retrieve errors' });
    }
});

// Get error stats
app.get('/api/v1/errors/stats', async (req, res) => {
    try {
        const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        const [totalCount, last24hCount, bySeverity] = await Promise.all([
            db.get('SELECT COUNT(*) as count FROM error_logs'),
            db.get('SELECT COUNT(*) as count FROM error_logs WHERE created_at > ?', [last24h]),
            db.all('SELECT severity, COUNT(*) as count FROM error_logs GROUP BY severity')
        ]);

        res.json({
            success: true,
            total: totalCount.count,
            last24h: last24hCount.count,
            bySeverity: bySeverity.reduce((acc, row) => {
                acc[row.severity] = row.count;
                return acc;
            }, {})
        });

    } catch (error) {
        console.error('Error stats failed:', error);
        res.status(500).json({ error: 'Failed to get error stats' });
    }
});

// ================================================
// START SERVER
// ================================================

async function startServer() {
    try {
        await initDatabase();

        app.listen(PORT, () => {
            console.log('');
            console.log('🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥');
            console.log('🌀 CONSCIOUSNESS BACKEND - SIMPLE VERSION');
            console.log('🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥');
            console.log('');
            console.log(`✅ Server running on http://localhost:${PORT}`);
            console.log('✅ SQLite database ready');
            console.log('✅ CORS enabled (all origins)');
            console.log('');
            console.log('📡 Available endpoints (v1):');
            console.log('   GET  /api/health');
            console.log('   GET  /api/v1/health');
            console.log('   POST /api/v1/auth/register');
            console.log('   POST /api/v1/auth/login');
            console.log('   POST /api/v1/auth/login-pin');
            console.log('   GET  /api/v1/auth/me');
            console.log('');
            console.log('🔥 Ready for connections!');
            console.log('');
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

startServer();
