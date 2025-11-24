// ================================================
// PRODUCTION-READY POSTGRESQL BACKEND
// ================================================
// Railway PostgreSQL + Full Security Suite
// OWASP Top 10 2024 Compliant
// Created: 2025-11-24
// ================================================

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const validator = require('validator');
const winston = require('winston');
const { Pool } = require('pg');
const stripe = require('stripe');
const Anthropic = require('@anthropic-ai/sdk');

// ================================================
// CONFIGURATION & VALIDATION
// ================================================

const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// CRITICAL: Validate required environment variables
const requiredEnvVars = ['JWT_SECRET', 'DATABASE_URL'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
    console.error('❌ FATAL: Missing required environment variables:');
    missingEnvVars.forEach(varName => console.error(`   - ${varName}`));
    console.error('\nSet these in Railway or .env file');
    process.exit(1);
}

// Validate JWT_SECRET strength
const JWT_SECRET = process.env.JWT_SECRET;
if (JWT_SECRET.length < 32) {
    console.error('❌ FATAL: JWT_SECRET must be at least 32 characters');
    console.error('Generate one with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
    process.exit(1);
}

// CORS whitelist
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : [
        'http://localhost:8080',
        'http://localhost:3000',
        'https://consciousnessrevolution.io',
        'https://www.consciousnessrevolution.io'
    ];

// Optional services
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// Initialize optional services
let stripeClient = null;
let anthropicClient = null;

if (STRIPE_SECRET_KEY) {
    stripeClient = stripe(STRIPE_SECRET_KEY);
    console.log('✅ Stripe integration enabled');
}

if (ANTHROPIC_API_KEY) {
    anthropicClient = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
    console.log('✅ Anthropic integration enabled');
}

// ================================================
// LOGGING CONFIGURATION
// ================================================

const logger = winston.createLogger({
    level: NODE_ENV === 'production' ? 'info' : 'debug',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: { service: 'philosopher-ai-backend' },
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' }),
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        })
    ]
});

// ================================================
// DATABASE CONNECTION
// ================================================

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: NODE_ENV === 'production' ? {
        rejectUnauthorized: false // Required for Railway PostgreSQL
    } : false,
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        logger.error('Database connection failed:', err);
        console.error('❌ Database connection failed:', err.message);
    } else {
        logger.info('Database connected successfully');
        console.log('✅ PostgreSQL database connected');
    }
});

// Handle pool errors
pool.on('error', (err) => {
    logger.error('Unexpected database error:', err);
    console.error('❌ Database error:', err.message);
});

// ================================================
// EXPRESS APP SETUP
// ================================================

const app = express();

// Trust proxy (required for Railway)
app.set('trust proxy', 1);

// HTTPS enforcement in production
if (NODE_ENV === 'production') {
    app.use((req, res, next) => {
        if (req.header('x-forwarded-proto') !== 'https') {
            logger.warn(`HTTP redirect attempt from ${req.ip}`);
            return res.redirect(`https://${req.header('host')}${req.url}`);
        }
        next();
    });
}

// Security headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"]
        }
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
}));

// CORS with strict whitelist
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) return callback(null, true);

        if (ALLOWED_ORIGINS.includes(origin)) {
            callback(null, true);
        } else {
            logger.warn(`CORS blocked origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing with size limits
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Request logging middleware
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('user-agent')
    });
    next();
});

// ================================================
// RATE LIMITING
// ================================================

// Strict rate limiting for authentication endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    message: 'Too many authentication attempts, please try again in 15 minutes',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
        res.status(429).json({
            error: 'Too many authentication attempts, please try again in 15 minutes'
        });
    }
});

// General API rate limiter
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: 'Too many requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false
});

app.use('/api/v1/', apiLimiter);

// ================================================
// HELPER FUNCTIONS
// ================================================

// Password strength validation
function validatePassword(password) {
    if (!password) {
        return { valid: false, error: 'Password is required' };
    }
    if (password.length < 12) {
        return { valid: false, error: 'Password must be at least 12 characters' };
    }
    if (!/[A-Z]/.test(password)) {
        return { valid: false, error: 'Password must contain at least one uppercase letter' };
    }
    if (!/[a-z]/.test(password)) {
        return { valid: false, error: 'Password must contain at least one lowercase letter' };
    }
    if (!/[0-9]/.test(password)) {
        return { valid: false, error: 'Password must contain at least one number' };
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        return { valid: false, error: 'Password must contain at least one special character' };
    }
    return { valid: true };
}

// PIN validation (6-8 digits)
function validatePIN(pin) {
    if (!pin) return { valid: true }; // PIN is optional

    if (pin.length < 6 || pin.length > 8) {
        return { valid: false, error: 'PIN must be 6-8 digits' };
    }
    if (!/^\d+$/.test(pin)) {
        return { valid: false, error: 'PIN must contain only digits' };
    }
    return { valid: true };
}

// Check if account is locked
async function isAccountLocked(userId) {
    try {
        const result = await pool.query(
            'SELECT locked_until, failed_attempts FROM users WHERE id = $1',
            [userId]
        );

        if (result.rows.length === 0) return false;

        const user = result.rows[0];
        if (!user.locked_until) return false;

        const lockExpiry = new Date(user.locked_until);
        if (lockExpiry > new Date()) {
            return true;
        }

        // Lock expired, reset
        await pool.query(
            'UPDATE users SET locked_until = NULL, failed_attempts = 0 WHERE id = $1',
            [userId]
        );
        return false;
    } catch (error) {
        logger.error('Error checking account lock status:', error);
        return false;
    }
}

// Increment failed login attempts
async function incrementFailedAttempts(userId) {
    try {
        const result = await pool.query(
            'SELECT failed_attempts FROM users WHERE id = $1',
            [userId]
        );

        if (result.rows.length === 0) return;

        const attempts = (result.rows[0].failed_attempts || 0) + 1;

        // Lock account after 10 failed attempts for 1 hour
        if (attempts >= 10) {
            const lockUntil = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
            await pool.query(
                'UPDATE users SET failed_attempts = $1, locked_until = $2 WHERE id = $3',
                [attempts, lockUntil, userId]
            );
            logger.warn(`Account locked due to failed attempts: User ID ${userId}`);
        } else {
            await pool.query(
                'UPDATE users SET failed_attempts = $1 WHERE id = $2',
                [attempts, userId]
            );
        }
    } catch (error) {
        logger.error('Error incrementing failed attempts:', error);
    }
}

// Reset failed attempts on successful login
async function resetFailedAttempts(userId) {
    try {
        await pool.query(
            'UPDATE users SET failed_attempts = 0, locked_until = NULL, last_login = NOW() WHERE id = $1',
            [userId]
        );
    } catch (error) {
        logger.error('Error resetting failed attempts:', error);
    }
}

// JWT middleware for protected routes
function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: 'No authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            logger.warn(`Invalid token attempt from ${req.ip}`);
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        req.user = decoded;
        next();
    });
}

// ================================================
// HEALTH CHECK ENDPOINTS
// ================================================

// Root health check (no /api prefix for Railway)
app.get('/api/health', async (req, res) => {
    try {
        // Test database connection
        const result = await pool.query('SELECT NOW() as time');

        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            database: 'connected',
            dbTime: result.rows[0].time,
            version: 'v1.0-production',
            environment: NODE_ENV,
            integrations: {
                stripe: !!stripeClient,
                anthropic: !!anthropicClient
            }
        });
    } catch (error) {
        logger.error('Health check failed:', error);
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: 'Database connection failed'
        });
    }
});

// Detailed health check
app.get('/api/v1/health', async (req, res) => {
    try {
        // Test database connection
        const dbResult = await pool.query('SELECT NOW() as time, version() as version');

        // Get table count
        const tableResult = await pool.query(`
            SELECT COUNT(*) as count
            FROM information_schema.tables
            WHERE table_schema = 'public'
        `);

        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            database: {
                status: 'connected',
                time: dbResult.rows[0].time,
                version: dbResult.rows[0].version,
                tables: parseInt(tableResult.rows[0].count)
            },
            server: {
                environment: NODE_ENV,
                uptime: process.uptime(),
                memory: process.memoryUsage()
            },
            integrations: {
                stripe: !!stripeClient,
                anthropic: !!anthropicClient
            },
            security: {
                cors: 'enabled',
                helmet: 'enabled',
                rateLimit: 'enabled',
                jwt: 'enabled'
            }
        });
    } catch (error) {
        logger.error('Detailed health check failed:', error);
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: NODE_ENV === 'production' ? 'Service unavailable' : error.message
        });
    }
});

// ================================================
// AUTHENTICATION ENDPOINTS
// ================================================

// Register new user
app.post('/api/v1/auth/register', authLimiter, async (req, res) => {
    const client = await pool.connect();

    try {
        const { email, password, name, pin, anthropic_api_key } = req.body;

        // Email validation
        if (!email || !validator.isEmail(email)) {
            logger.warn(`Registration attempt with invalid email from ${req.ip}`);
            return res.status(400).json({ error: 'Valid email address required' });
        }

        // Password validation
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.valid) {
            logger.warn(`Registration attempt with weak password from ${req.ip}`);
            return res.status(400).json({ error: passwordValidation.error });
        }

        // PIN validation (if provided)
        const pinValidation = validatePIN(pin);
        if (!pinValidation.valid) {
            logger.warn(`Registration attempt with invalid PIN from ${req.ip}`);
            return res.status(400).json({ error: pinValidation.error });
        }

        // Check if user already exists
        const existingUser = await client.query(
            'SELECT id FROM users WHERE email = $1',
            [email.toLowerCase()]
        );

        if (existingUser.rows.length > 0) {
            logger.warn(`Registration attempt for existing email: ${email} from ${req.ip}`);
            return res.status(400).json({ error: 'User already exists' });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 12);

        // Hash PIN if provided
        const pinHash = pin ? await bcrypt.hash(pin, 12) : null;

        // Create user
        const result = await client.query(
            `INSERT INTO users (email, password, name, pin_hash, anthropic_api_key, subscription_tier)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id, email, name, subscription_tier, created_at`,
            [email.toLowerCase(), passwordHash, name || 'User', pinHash, anthropic_api_key || null, 'free']
        );

        const user = result.rows[0];

        // Generate JWT
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        logger.info(`User registered: ${email} (ID: ${user.id}) from ${req.ip}`);

        res.status(201).json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                subscription_tier: user.subscription_tier,
                created_at: user.created_at
            },
            token
        });

    } catch (error) {
        logger.error('Registration error:', error);
        res.status(500).json({
            error: NODE_ENV === 'production' ? 'Registration failed' : error.message
        });
    } finally {
        client.release();
    }
});

// Login with email/password
app.post('/api/v1/auth/login', authLimiter, async (req, res) => {
    const client = await pool.connect();

    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        logger.info(`Login attempt: ${email} from ${req.ip}`);

        // Find user
        const result = await client.query(
            'SELECT * FROM users WHERE email = $1',
            [email.toLowerCase()]
        );

        if (result.rows.length === 0) {
            logger.warn(`Login attempt for non-existent user: ${email} from ${req.ip}`);
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = result.rows[0];

        // Check if account is locked
        if (await isAccountLocked(user.id)) {
            logger.warn(`Login attempt for locked account: ${email} from ${req.ip}`);
            return res.status(423).json({
                error: 'Account locked due to too many failed attempts. Try again later.'
            });
        }

        // Verify password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            await incrementFailedAttempts(user.id);
            logger.warn(`Failed login attempt: ${email} from ${req.ip}`);
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Reset failed attempts on successful login
        await resetFailedAttempts(user.id);

        // Generate JWT
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        logger.info(`Successful login: ${email} from ${req.ip}`);

        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                subscription_tier: user.subscription_tier,
                manipulation_immunity_score: user.manipulation_immunity_score
            },
            token
        });

    } catch (error) {
        logger.error('Login error:', error);
        res.status(500).json({
            error: NODE_ENV === 'production' ? 'Login failed' : error.message
        });
    } finally {
        client.release();
    }
});

// Get current user
app.get('/api/v1/auth/me', authenticateToken, async (req, res) => {
    const client = await pool.connect();

    try {
        const result = await client.query(
            'SELECT id, email, name, subscription_tier, manipulation_immunity_score, created_at, last_login FROM users WHERE id = $1',
            [req.user.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            success: true,
            user: result.rows[0]
        });

    } catch (error) {
        logger.error('Get user error:', error);
        res.status(500).json({
            error: NODE_ENV === 'production' ? 'Failed to fetch user' : error.message
        });
    } finally {
        client.release();
    }
});

// ================================================
// CONVERSATION ENDPOINTS
// ================================================

// Create new conversation
app.post('/api/v1/conversations', authenticateToken, async (req, res) => {
    const client = await pool.connect();

    try {
        const { title } = req.body;

        const result = await client.query(
            `INSERT INTO conversations (user_id, title)
             VALUES ($1, $2)
             RETURNING id, user_id, title, created_at, updated_at, archived`,
            [req.user.userId, title || 'New Conversation']
        );

        logger.info(`Conversation created: ${result.rows[0].id} by user ${req.user.userId}`);

        res.status(201).json({
            success: true,
            conversation: result.rows[0]
        });

    } catch (error) {
        logger.error('Create conversation error:', error);
        res.status(500).json({
            error: NODE_ENV === 'production' ? 'Failed to create conversation' : error.message
        });
    } finally {
        client.release();
    }
});

// Get user's conversations
app.get('/api/v1/conversations', authenticateToken, async (req, res) => {
    const client = await pool.connect();

    try {
        const result = await client.query(
            `SELECT c.*,
                    COUNT(m.id) as message_count,
                    MAX(m.created_at) as last_message_at
             FROM conversations c
             LEFT JOIN messages m ON c.id = m.conversation_id
             WHERE c.user_id = $1 AND c.archived = false
             GROUP BY c.id
             ORDER BY c.updated_at DESC`,
            [req.user.userId]
        );

        res.json({
            success: true,
            conversations: result.rows
        });

    } catch (error) {
        logger.error('Get conversations error:', error);
        res.status(500).json({
            error: NODE_ENV === 'production' ? 'Failed to fetch conversations' : error.message
        });
    } finally {
        client.release();
    }
});

// Get conversation by ID with messages
app.get('/api/v1/conversations/:id', authenticateToken, async (req, res) => {
    const client = await pool.connect();

    try {
        const conversationId = req.params.id;

        // Get conversation
        const convResult = await client.query(
            'SELECT * FROM conversations WHERE id = $1 AND user_id = $2',
            [conversationId, req.user.userId]
        );

        if (convResult.rows.length === 0) {
            return res.status(404).json({ error: 'Conversation not found' });
        }

        // Get messages
        const msgResult = await client.query(
            `SELECT id, role, content, manipulation_detected, manipulation_score, created_at
             FROM messages
             WHERE conversation_id = $1
             ORDER BY created_at ASC`,
            [conversationId]
        );

        res.json({
            success: true,
            conversation: convResult.rows[0],
            messages: msgResult.rows
        });

    } catch (error) {
        logger.error('Get conversation error:', error);
        res.status(500).json({
            error: NODE_ENV === 'production' ? 'Failed to fetch conversation' : error.message
        });
    } finally {
        client.release();
    }
});

// Add message to conversation
app.post('/api/v1/conversations/:id/messages', authenticateToken, async (req, res) => {
    const client = await pool.connect();

    try {
        const conversationId = req.params.id;
        const { role, content } = req.body;

        if (!role || !content) {
            return res.status(400).json({ error: 'Role and content required' });
        }

        // Verify conversation belongs to user
        const convResult = await client.query(
            'SELECT id FROM conversations WHERE id = $1 AND user_id = $2',
            [conversationId, req.user.userId]
        );

        if (convResult.rows.length === 0) {
            return res.status(404).json({ error: 'Conversation not found' });
        }

        // Insert message
        const msgResult = await client.query(
            `INSERT INTO messages (conversation_id, role, content)
             VALUES ($1, $2, $3)
             RETURNING id, conversation_id, role, content, manipulation_detected, manipulation_score, created_at`,
            [conversationId, role, content]
        );

        // Update conversation timestamp
        await client.query(
            'UPDATE conversations SET updated_at = NOW() WHERE id = $1',
            [conversationId]
        );

        logger.info(`Message added to conversation ${conversationId} by user ${req.user.userId}`);

        res.status(201).json({
            success: true,
            message: msgResult.rows[0]
        });

    } catch (error) {
        logger.error('Add message error:', error);
        res.status(500).json({
            error: NODE_ENV === 'production' ? 'Failed to add message' : error.message
        });
    } finally {
        client.release();
    }
});

// ================================================
// PAYMENT ENDPOINTS (STRIPE)
// ================================================

// Create payment intent
app.post('/api/v1/payments/create-intent', authenticateToken, async (req, res) => {
    if (!stripeClient) {
        return res.status(503).json({ error: 'Payment processing not configured' });
    }

    const client = await pool.connect();

    try {
        const { amount, currency = 'usd', description } = req.body;

        if (!amount || amount < 50) { // Minimum $0.50
            return res.status(400).json({ error: 'Invalid amount' });
        }

        // Create Stripe payment intent
        const paymentIntent = await stripeClient.paymentIntents.create({
            amount: Math.round(amount), // Amount in cents
            currency: currency.toLowerCase(),
            description: description || 'Consciousness Revolution Payment',
            metadata: {
                userId: req.user.userId,
                email: req.user.email
            }
        });

        // Record payment in database
        await client.query(
            `INSERT INTO payments (user_id, stripe_payment_id, amount, currency, status)
             VALUES ($1, $2, $3, $4, $5)`,
            [req.user.userId, paymentIntent.id, amount / 100, currency, 'pending']
        );

        logger.info(`Payment intent created: ${paymentIntent.id} for user ${req.user.userId}`);

        res.json({
            success: true,
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id
        });

    } catch (error) {
        logger.error('Payment intent creation error:', error);
        res.status(500).json({
            error: NODE_ENV === 'production' ? 'Payment processing failed' : error.message
        });
    } finally {
        client.release();
    }
});

// Get user's payment history
app.get('/api/v1/payments', authenticateToken, async (req, res) => {
    const client = await pool.connect();

    try {
        const result = await client.query(
            `SELECT id, stripe_payment_id, amount, currency, status, payment_method, created_at
             FROM payments
             WHERE user_id = $1
             ORDER BY created_at DESC
             LIMIT 50`,
            [req.user.userId]
        );

        res.json({
            success: true,
            payments: result.rows
        });

    } catch (error) {
        logger.error('Get payments error:', error);
        res.status(500).json({
            error: NODE_ENV === 'production' ? 'Failed to fetch payments' : error.message
        });
    } finally {
        client.release();
    }
});

// ================================================
// ERROR HANDLING
// ================================================

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        path: req.path,
        message: 'Endpoint not found'
    });
});

// Global error handler
app.use((err, req, res, next) => {
    logger.error('Unhandled error:', {
        error: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        ip: req.ip
    });

    res.status(err.status || 500).json({
        error: NODE_ENV === 'production' ? 'Internal server error' : err.message
    });
});

// ================================================
// SERVER STARTUP
// ================================================

async function startServer() {
    try {
        // Test database connection
        await pool.query('SELECT NOW()');
        logger.info('Database connection verified');

        // Start Express server
        app.listen(PORT, '0.0.0.0', () => {
            console.log('');
            console.log('========================================');
            console.log('🚀 PRODUCTION BACKEND - OPERATIONAL');
            console.log('========================================');
            console.log('');
            console.log(`Server: http://localhost:${PORT}`);
            console.log(`Environment: ${NODE_ENV}`);
            console.log(`Database: PostgreSQL (Railway)`);
            console.log(`CORS Origins: ${ALLOWED_ORIGINS.join(', ')}`);
            console.log('');
            console.log('✅ Security Features:');
            console.log('   - Helmet security headers');
            console.log('   - CORS whitelist');
            console.log('   - Rate limiting (auth: 5/15min, api: 100/15min)');
            console.log('   - JWT authentication');
            console.log('   - Password strength enforcement');
            console.log('   - Account lockout (10 failed attempts)');
            console.log('   - Request logging (Winston)');
            console.log('');
            console.log('✅ Integrations:');
            console.log(`   - Stripe: ${stripeClient ? 'ENABLED' : 'DISABLED'}`);
            console.log(`   - Anthropic: ${anthropicClient ? 'ENABLED' : 'DISABLED'}`);
            console.log('');
            console.log('📋 API Endpoints:');
            console.log('   GET  /api/health');
            console.log('   GET  /api/v1/health');
            console.log('   POST /api/v1/auth/register');
            console.log('   POST /api/v1/auth/login');
            console.log('   GET  /api/v1/auth/me');
            console.log('   POST /api/v1/conversations');
            console.log('   GET  /api/v1/conversations');
            console.log('   GET  /api/v1/conversations/:id');
            console.log('   POST /api/v1/conversations/:id/messages');
            console.log('   POST /api/v1/payments/create-intent');
            console.log('   GET  /api/v1/payments');
            console.log('');
            console.log('========================================');
            console.log('Ready for production traffic');
            console.log('========================================');
            console.log('');

            logger.info(`Production server started on port ${PORT}`);
        });

    } catch (error) {
        logger.error('Server startup failed:', error);
        console.error('❌ Server startup failed:', error.message);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully...');
    console.log('\nSIGTERM received, shutting down gracefully...');

    try {
        await pool.end();
        logger.info('Database pool closed');
        process.exit(0);
    } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
    }
});

process.on('SIGINT', async () => {
    logger.info('SIGINT received, shutting down gracefully...');
    console.log('\nSIGINT received, shutting down gracefully...');

    try {
        await pool.end();
        logger.info('Database pool closed');
        process.exit(0);
    } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
    }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception:', error);
    console.error('❌ Uncaught exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled rejection:', { reason, promise });
    console.error('❌ Unhandled rejection:', reason);
});

// Start the server
startServer();
