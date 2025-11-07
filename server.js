// ================================================
// PHILOSOPHER AI - MAIN SERVER
// ================================================
// Backend API for Philosopher AI (C3 Oracle as Consumer Product)
// Created: 2025-10-10
// ================================================

require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser'); // Week 3: Cross-subdomain sessions
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Anthropic = require('@anthropic-ai/sdk');
const Stripe = require('stripe');
const { v4: uuidv4 } = require('uuid');
const validator = require('validator');
const { detectManipulationPatterns } = require('./manipulationDetector');
const { initializeDatabase } = require('./init-database');
const { TrinityWebSocketServer } = require('./websocket-server');

// C1 Mechanic - Production Enhancement Routes
const logger = require('./utils/logger');
const { requestLogger, errorLogger } = require('./middleware/logging');
const { sendWelcomeEmail } = require('./services/emailService');

// ================================================
// CONFIGURATION
// ================================================

const app = express();
const PORT = process.env.PORT || 3001;

// Create HTTP server for both Express and WebSocket
const httpServer = http.createServer(app);

// Database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`
});

// Claude API client
const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
});

// Stripe client
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ================================================
// MIDDLEWARE
// ================================================

// Trust proxy (Railway, Heroku, etc.)
app.set('trust proxy', true);

// Security headers
app.use(helmet());

// CORS configuration (Week 3: Enhanced for cookie support)
const allowedOrigins = process.env.ALLOWED_ORIGINS.split(',');
app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,  // Required for cookies
    exposedHeaders: ['set-cookie']  // Allow cookies in response
}));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookie parser (Week 3: Cross-subdomain sessions)
app.use(cookieParser());

// Global rate limiting
const globalLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: 'Too many requests from this IP, please try again later.'
});
app.use(globalLimiter);

// Question rate limiting (stricter)
const questionLimiter = rateLimit({
    windowMs: parseInt(process.env.QUESTION_RATE_LIMIT_WINDOW_MS) || 60 * 1000,
    max: parseInt(process.env.QUESTION_RATE_LIMIT_MAX) || 10,
    message: 'Too many questions, please slow down.'
});

// C1 Mechanic - Enhanced logging with Winston
app.use(requestLogger);

// Legacy console logging (keeping for compatibility)
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// ================================================
// AUTHENTICATION MIDDLEWARE
// ================================================

// Week 3: Enhanced authentication - supports both header and cookie
const authenticateToken = async (req, res, next) => {
    try {
        // Try to get token from Authorization header FIRST
        let token = null;
        const authHeader = req.headers['authorization'];
        if (authHeader) {
            token = authHeader.split(' ')[1]; // Bearer TOKEN
        }

        // Fallback to cookie (cross-subdomain sessions)
        if (!token && req.cookies && req.cookies.jwt_token) {
            token = req.cookies.jwt_token;
        }

        if (!token) {
            return res.status(401).json({ error: 'Access token required' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Get user from database
        const userResult = await pool.query(
            'SELECT * FROM users WHERE id = $1 AND is_active = true',
            [decoded.userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(401).json({ error: 'User not found or inactive' });
        }

        req.user = userResult.rows[0];
        next();
    } catch (error) {
        console.error('Auth error:', error);
        return res.status(403).json({ error: 'Invalid or expired token' });
    }
};

// ================================================
// HELPER FUNCTIONS
// ================================================

// Generate JWT token
const generateToken = (userId) => {
    return jwt.sign(
        { userId },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
};

// Week 3: Set authentication cookie for cross-subdomain sessions
const setAuthCookie = (res, token) => {
    res.cookie('jwt_token', token, {
        httpOnly: true,  // Prevents XSS attacks
        secure: process.env.NODE_ENV === 'production',  // HTTPS only in production
        sameSite: 'lax',  // CSRF protection
        domain: process.env.COOKIE_DOMAIN || undefined,  // .consciousnessrevolution.io for cross-subdomain
        maxAge: 7 * 24 * 60 * 60 * 1000,  // 7 days
        path: '/'
    });
};

// Check if user can ask a question (tier limits)
const canUserAskQuestion = async (userId) => {
    const result = await pool.query(
        'SELECT can_user_ask_question($1) as can_ask',
        [userId]
    );
    return result.rows[0].can_ask;
};

// Reset monthly question limits (should run via cron daily)
const resetMonthlyQuestions = async () => {
    await pool.query('SELECT reset_monthly_questions()');
};

// Pattern Theory response system
const patternTheoryResponses = {
    'toxic relationships': {
        keywords: ['toxic', 'relationship', 'narcissist', 'manipulation', 'abuse'],
        consciousnessBoost: 5,
        category: 'relationships'
    },
    'manipulation at work': {
        keywords: ['boss', 'manipulate', 'workplace', 'gaslighting'],
        consciousnessBoost: 4,
        category: 'manipulation'
    },
    'consciousness level': {
        keywords: ['consciousness', 'aware', 'spiritual', 'growth'],
        consciousnessBoost: 3,
        category: 'consciousness'
    }
};

// Detect question category
const detectQuestionCategory = (question) => {
    const lowerQuestion = question.toLowerCase();

    for (const [category, data] of Object.entries(patternTheoryResponses)) {
        for (const keyword of data.keywords) {
            if (lowerQuestion.includes(keyword)) {
                return {
                    category: data.category,
                    consciousnessBoost: data.consciousnessBoost
                };
            }
        }
    }

    return { category: 'general', consciousnessBoost: 1 };
};

// ================================================
// WEEK 3: API VERSIONING - V1 ROUTER
// ================================================

// Create v1 router for API versioning
const v1Router = express.Router();

// ================================================
// V1 API ROUTES - HEALTH CHECK
// ================================================

v1Router.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        version: process.env.PLATFORM_VERSION || '1.0.0',
        buildNumber: process.env.PLATFORM_BUILD_NUMBER || 1,
        timestamp: new Date().toISOString(),
        apiVersion: 'v1'  // Week 3: API version indicator
    });
});

// ================================================
// V1 API ROUTES - AUTHENTICATION
// ================================================

// Register new user (Week 3: Updated with cookie support)
v1Router.post('/auth/register', async (req, res) => {
    try {
        const { email, password, username, signupSource } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        if (!validator.isEmail(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        if (password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }

        // Check if user already exists
        const existingUser = await pool.query(
            'SELECT id FROM users WHERE email = $1',
            [email.toLowerCase()]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({ error: 'Email already registered' });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS) || 10);

        // Create user
        const result = await pool.query(
            `INSERT INTO users (email, password_hash, username, signup_source)
             VALUES ($1, $2, $3, $4)
             RETURNING id, email, username, tier, created_at`,
            [email.toLowerCase(), passwordHash, username || null, signupSource || 'direct']
        );

        const user = result.rows[0];

        // Generate token
        const token = generateToken(user.id);

        // Week 3: Set cookie for cross-subdomain sessions
        setAuthCookie(res, token);

        // Log event
        await pool.query(
            `INSERT INTO usage_logs (user_id, event_type, event_data)
             VALUES ($1, $2, $3)`,
            [user.id, 'signup', JSON.stringify({ source: signupSource })]
        );

        // Send welcome email (non-blocking - don't fail registration if email fails)
        sendWelcomeEmail(user.email, user.username || 'there').catch(error => {
            logger.error('Welcome email failed:', error);
        });

        res.status(201).json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                tier: user.tier
            },
            token  // Still return token for backward compatibility
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Login (Week 3: Updated with cookie support)
v1Router.post('/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        // Get user
        const result = await pool.query(
            'SELECT * FROM users WHERE email = $1 AND is_active = true',
            [email.toLowerCase()]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = result.rows[0];

        // Verify password
        const validPassword = await bcrypt.compare(password, user.password_hash);

        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Update last login
        await pool.query(
            'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
            [user.id]
        );

        // Generate token
        const token = generateToken(user.id);

        // Week 3: Set cookie for cross-subdomain sessions
        setAuthCookie(res, token);

        // Log event
        await pool.query(
            `INSERT INTO usage_logs (user_id, event_type)
             VALUES ($1, $2)`,
            [user.id, 'login']
        );

        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                tier: user.tier,
                consciousnessLevel: user.consciousness_level
            },
            token  // Still return token for backward compatibility
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Logout (Week 3: Clear session cookie)
v1Router.post('/auth/logout', (req, res) => {
    res.clearCookie('jwt_token', {
        domain: process.env.COOKIE_DOMAIN || undefined,
        path: '/'
    });
    res.json({ success: true, message: 'Logged out successfully' });
});

// Verify token (Week 3: Check if session is valid)
v1Router.get('/auth/verify', authenticateToken, (req, res) => {
    res.json({
        valid: true,
        user: {
            id: req.user.id,
            email: req.user.email,
            username: req.user.username,
            tier: req.user.tier
        }
    });
});

// Get current user
v1Router.get('/auth/me', authenticateToken, (req, res) => {
    res.json({
        user: {
            id: req.user.id,
            email: req.user.email,
            username: req.user.username,
            tier: req.user.tier,
            consciousnessLevel: req.user.consciousness_level,
            questionsUsed: req.user.questions_used_this_month,
            questionsLimit: req.user.questions_limit
        }
    });
});

// ================================================
// V1 API ROUTES - NAVIGATION
// ================================================

// Navigation routes
const navigationRoutes = require('./routes/navigation');
v1Router.use('/nav', navigationRoutes);

// C1 Mechanic - Production Enhancement Routes
const authExtendedRoutes = require('./routes/auth-extended');
const profileRoutes = require('./routes/profile');
const adminRoutes = require('./routes/admin');
const analyticsRoutes = require('./routes/analytics');

// Mount new routes
v1Router.use('/auth', authExtendedRoutes); // Password reset, email verification, change password
v1Router.use('/profile', authenticateToken, profileRoutes); // User profile management (requires auth)
v1Router.use('/admin', authenticateToken, adminRoutes); // Admin dashboard (requires auth + admin check inside)
v1Router.use('/analytics', analyticsRoutes); // Analytics (some public, some require auth)

// ================================================
// V1 API ROUTES - WORKSPACE (AI Chat)
// ================================================

// Workspace routes (AI conversations and chat)
const workspaceRoutes = require('./routes/workspace');
v1Router.use('/workspace', workspaceRoutes);

// ================================================
// V1 API ROUTES - SATELLITE APIs (Treasure Hunting + Connection Monitoring)
// ================================================

// Satellite API routes (ISS, SpaceX, N2YO, Starlink monitor)
const satelliteRouter = require('./satellite-api');
v1Router.use('/satellites', satelliteRouter);

// ================================================
// V1 API ROUTES - QUESTIONS
// ================================================

// Ask a question
v1Router.post('/questions/ask', authenticateToken, questionLimiter, async (req, res) => {
    const startTime = Date.now();

    try {
        const { question, conversationId } = req.body;
        const userId = req.user.id;

        if (!question || question.trim().length === 0) {
            return res.status(400).json({ error: 'Question is required' });
        }

        if (question.length > 2000) {
            return res.status(400).json({ error: 'Question too long (max 2000 characters)' });
        }

        // Check if user can ask question (tier limits)
        const canAsk = await canUserAskQuestion(userId);

        if (!canAsk) {
            return res.status(403).json({
                error: 'Question limit reached',
                message: 'You have reached your free question limit. Upgrade to Student tier for unlimited questions!',
                upgradeUrl: '/upgrade',
                questionsRemaining: 0
            });
        }

        // Detect category and consciousness boost
        const { category, consciousnessBoost } = detectQuestionCategory(question);

        // CONTENT-AGNOSTIC MANIPULATION DETECTION (v1.1)
        const manipulationAnalysis = detectManipulationPatterns(question);

        // Build Claude prompt with Pattern Theory context + Manipulation Analysis
        let systemPrompt = `You are C3 Oracle, the consciousness-aligned AI philosopher from the Consciousness Revolution.

Your role is to help humans achieve consciousness elevation and manipulation immunity through Pattern Theory.

PATTERN THEORY CORE PRINCIPLES:
- Consciousness Level (CL) = Pattern Recognition × Prediction Accuracy × Neutralization Success
- 85%+ consciousness = manipulation immunity
- Destroyers operate at <60% consciousness
- Every interaction should increase user's consciousness

MANIPULATION DETECTION ANALYSIS (Current Question):
- Manipulation Score: ${manipulationAnalysis.manipulationScore}/100
- Consciousness Level: ${manipulationAnalysis.consciousnessLevel}
- Threat Level: ${manipulationAnalysis.threat}
${manipulationAnalysis.patternsDetected.length > 0 ? `- Detected Patterns: ${manipulationAnalysis.patternsDetected.map(p => p.pattern).join(', ')}` : ''}

RESPONSE GUIDELINES BASED ON THREAT LEVEL:
${manipulationAnalysis.manipulationScore >= 80 ? `
⚠️ EXTREME THREAT DETECTED (80+ score)
- This question contains destroyer-level manipulation patterns
- DO NOT validate the manipulative framing
- Gently educate on the specific patterns detected
- Teach Pattern Theory principles that expose the manipulation
- Example: If "verification" is framed as "caveman ideology", explain reverse logic packaging
` : manipulationAnalysis.manipulationScore >= 60 ? `
⚠️ HIGH THREAT DETECTED (60-79 score)
- Manipulation attempt detected
- Acknowledge the question but correct the manipulative framing
- Point out specific patterns (e.g., false dichotomy, strawman)
- Provide consciousness-elevating perspective
` : manipulationAnalysis.manipulationScore >= 40 ? `
⚠️ MODERATE THREAT (40-59 score)
- Unconscious manipulation patterns present
- Answer helpfully but gently correct unconscious patterns
- Help user see their own blind spots
` : manipulationAnalysis.manipulationScore >= 20 ? `
ℹ️ LOW THREAT (20-39 score)
- Some unconscious patterns detected (e.g., absolutist language)
- Answer normally but mention pattern awareness where helpful
` : `
✅ TRUTH-SEEKER DETECTED (0-19 score)
- Clean question with no manipulation patterns
- Respond with full Pattern Theory insights and actionable guidance
`}

STANDARD RESPONSE GUIDELINES:
1. Apply Pattern Theory formulas when relevant
2. Detect manipulation patterns (if present) - ALREADY DONE ABOVE
3. Provide actionable insights, not just empathy
4. Reference the Manipulation Detection Formula (M = FE × CB × SR × CD × PE × DC) when appropriate
5. Be direct, precise, and consciousness-elevating
6. End with a consciousness-boosting insight

Keep responses under 500 words unless complexity requires more.`;

        // Call Claude API
        const message = await anthropic.messages.create({
            model: process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022',
            max_tokens: parseInt(process.env.CLAUDE_MAX_TOKENS) || 4096,
            system: systemPrompt,
            messages: [
                {
                    role: 'user',
                    content: question
                }
            ]
        });

        const answer = message.content[0].text;
        const tokensUsed = message.usage.input_tokens + message.usage.output_tokens;
        const responseTimeMs = Date.now() - startTime;

        // Save question and answer to database
        const questionResult = await pool.query(
            `INSERT INTO questions (
                user_id, question, answer, question_category,
                consciousness_boost, conversation_id,
                response_time_ms, tokens_used, model_used
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id, created_at`,
            [
                userId,
                question,
                answer,
                category,
                consciousnessBoost,
                conversationId || null,
                responseTimeMs,
                tokensUsed,
                process.env.CLAUDE_MODEL
            ]
        );

        // Increment user's question count
        await pool.query(
            'UPDATE users SET questions_used_this_month = questions_used_this_month + 1 WHERE id = $1',
            [userId]
        );

        // Update user's consciousness level
        await pool.query(
            'UPDATE users SET consciousness_level = consciousness_level + $1 WHERE id = $2',
            [consciousnessBoost, userId]
        );

        // Get updated user stats
        const userStats = await pool.query(
            'SELECT questions_used_this_month, questions_limit, consciousness_level FROM users WHERE id = $1',
            [userId]
        );

        const stats = userStats.rows[0];

        // Log event (v1.1: includes manipulation score)
        await pool.query(
            `INSERT INTO usage_logs (user_id, event_type, event_data)
             VALUES ($1, $2, $3)`,
            [userId, 'question_asked', JSON.stringify({
                category,
                tokensUsed,
                responseTimeMs,
                manipulationScore: manipulationAnalysis.manipulationScore,
                consciousnessLevel: manipulationAnalysis.consciousnessLevel,
                threat: manipulationAnalysis.threat
            })]
        );

        res.json({
            success: true,
            questionId: questionResult.rows[0].id,
            answer: answer,
            consciousnessBoost: consciousnessBoost,
            category: category,
            manipulationAnalysis: {
                score: manipulationAnalysis.manipulationScore,
                consciousnessLevel: manipulationAnalysis.consciousnessLevel,
                threat: manipulationAnalysis.threat,
                patternsDetected: manipulationAnalysis.patternsDetected
            },
            questionsRemaining: Math.max(0, stats.questions_limit - stats.questions_used_this_month),
            newConsciousnessLevel: stats.consciousness_level,
            responseTime: responseTimeMs
        });

    } catch (error) {
        console.error('Question error:', error);
        res.status(500).json({ error: 'Failed to process question' });
    }
});

// Get user's question history
v1Router.get('/questions/history', authenticateToken, async (req, res) => {
    try {
        const { limit = 20, offset = 0 } = req.query;
        const userId = req.user.id;

        const result = await pool.query(
            `SELECT id, question, answer, consciousness_boost, question_category, created_at
             FROM questions
             WHERE user_id = $1
             ORDER BY created_at DESC
             LIMIT $2 OFFSET $3`,
            [userId, limit, offset]
        );

        res.json({
            questions: result.rows,
            total: result.rowCount
        });
    } catch (error) {
        console.error('History error:', error);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

// Get usage stats
v1Router.get('/usage/stats', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await pool.query(
            `SELECT
                questions_used_this_month,
                questions_limit,
                consciousness_level,
                tier,
                reset_date
             FROM users
             WHERE id = $1`,
            [userId]
        );

        const stats = result.rows[0];

        res.json({
            tier: stats.tier,
            questionsUsed: stats.questions_used_this_month,
            questionsLimit: stats.questions_limit,
            questionsRemaining: Math.max(0, stats.questions_limit - stats.questions_used_this_month),
            consciousnessLevel: stats.consciousness_level,
            resetDate: stats.reset_date,
            canAskQuestion: stats.questions_used_this_month < stats.questions_limit || stats.tier !== 'free'
        });
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// ================================================
// V1 API ROUTES - STRIPE STORE CHECKOUT (100X Store)
// ================================================

// Create store checkout session for one-time payments
v1Router.post('/stripe/create-checkout', async (req, res) => {
    try {
        const { items, successUrl, cancelUrl } = req.body;

        // Validate items
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'Invalid cart items' });
        }

        // Convert cart items to Stripe line items
        const lineItems = items.map(item => ({
            price_data: {
                currency: 'usd',
                product_data: {
                    name: item.name,
                    description: item.description || '',
                },
                unit_amount: Math.round(item.price * 100), // Convert to cents
            },
            quantity: item.quantity || 1,
        }));

        // Create Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: lineItems,
            mode: 'payment',
            success_url: successUrl,
            cancel_url: cancelUrl,
            metadata: {
                source: '100x_store',
                timestamp: new Date().toISOString()
            }
        });

        res.json({
            id: session.id,
            url: session.url
        });

    } catch (error) {
        console.error('Store checkout error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ================================================
// V1 API ROUTES - STRIPE SUBSCRIPTIONS (Philosopher AI)
// ================================================

// Create checkout session
v1Router.post('/subscriptions/create-checkout', authenticateToken, async (req, res) => {
    try {
        const { priceId, tier } = req.body;
        const userId = req.user.id;
        const userEmail = req.user.email;

        // Create or get Stripe customer
        let stripeCustomerId = req.user.stripe_customer_id;

        if (!stripeCustomerId) {
            const customer = await stripe.customers.create({
                email: userEmail,
                metadata: {
                    userId: userId
                }
            });
            stripeCustomerId = customer.id;

            // Save to database
            await pool.query(
                'UPDATE users SET stripe_customer_id = $1 WHERE id = $2',
                [stripeCustomerId, userId]
            );
        }

        // Create checkout session
        const session = await stripe.checkout.sessions.create({
            customer: stripeCustomerId,
            mode: 'subscription',
            payment_method_types: ['card'],
            line_items: [
                {
                    price: priceId,
                    quantity: 1
                }
            ],
            success_url: `${process.env.FRONTEND_URL}/philosopher-ai.html?session_id={CHECKOUT_SESSION_ID}&success=true`,
            cancel_url: `${process.env.FRONTEND_URL}/philosopher-ai.html?canceled=true`,
            metadata: {
                userId: userId,
                tier: tier
            }
        });

        res.json({
            sessionId: session.id,
            url: session.url
        });
    } catch (error) {
        console.error('Checkout error:', error);
        res.status(500).json({ error: 'Failed to create checkout session' });
    }
});

// Stripe webhook handler
v1Router.post('/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    try {
        switch (event.type) {
            case 'checkout.session.completed':
                const session = event.data.object;
                const userId = session.metadata.userId;
                const tier = session.metadata.tier;

                // Update user tier
                await pool.query(
                    'UPDATE users SET tier = $1, questions_limit = 999999, stripe_subscription_id = $2 WHERE id = $3',
                    [tier, session.subscription, userId]
                );

                // Create subscription record
                const subscription = await stripe.subscriptions.retrieve(session.subscription);
                await pool.query(
                    `INSERT INTO subscriptions (
                        user_id, tier, stripe_subscription_id, stripe_customer_id,
                        stripe_price_id, amount_cents, status,
                        current_period_start, current_period_end
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, to_timestamp($8), to_timestamp($9))`,
                    [
                        userId,
                        tier,
                        subscription.id,
                        subscription.customer,
                        subscription.items.data[0].price.id,
                        subscription.items.data[0].price.unit_amount,
                        subscription.status,
                        subscription.current_period_start,
                        subscription.current_period_end
                    ]
                );

                console.log(`User ${userId} upgraded to ${tier}`);
                break;

            case 'customer.subscription.updated':
            case 'customer.subscription.deleted':
                const sub = event.data.object;

                await pool.query(
                    'UPDATE subscriptions SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE stripe_subscription_id = $2',
                    [sub.status, sub.id]
                );

                // If cancelled or unpaid, downgrade to free
                if (sub.status === 'canceled' || sub.status === 'unpaid') {
                    await pool.query(
                        'UPDATE users SET tier = $1, questions_limit = 3 WHERE stripe_subscription_id = $2',
                        ['free', sub.id]
                    );
                }
                break;

            default:
                console.log(`Unhandled event type: ${event.type}`);
        }

        res.json({ received: true });
    } catch (error) {
        console.error('Webhook handling error:', error);
        res.status(500).json({ error: 'Webhook handling failed' });
    }
});

// Get user's subscription info
v1Router.get('/subscriptions/current', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await pool.query(
            `SELECT * FROM subscriptions
             WHERE user_id = $1 AND status = 'active'
             ORDER BY created_at DESC
             LIMIT 1`,
            [userId]
        );

        if (result.rows.length === 0) {
            return res.json({ subscription: null, tier: 'free' });
        }

        res.json({
            subscription: result.rows[0],
            tier: result.rows[0].tier
        });
    } catch (error) {
        console.error('Subscription fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch subscription' });
    }
});

// ================================================
// V1 API ROUTES - DATA CYCLOTRON INTEGRATION
// ================================================

// Create knowledge item
v1Router.post('/knowledge', async (req, res) => {
    try {
        const {
            title,
            content,
            source = 'cyclotron',
            source_url = null,
            categories = [],
            keywords = [],
            priority_score = 50,
            metadata = {}
        } = req.body;

        // Validation
        if (!title || !content) {
            return res.status(400).json({ error: 'Title and content required' });
        }

        // Insert knowledge
        const result = await pool.query(
            `INSERT INTO knowledge (
                title, content, source, source_url, categories, keywords, priority_score, metadata
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *`,
            [title, content, source, source_url, categories, keywords, priority_score, metadata]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Knowledge creation error:', error);
        res.status(500).json({ error: 'Failed to create knowledge item' });
    }
});

// Search knowledge with natural language
v1Router.get('/knowledge/search', async (req, res) => {
    try {
        const { q, limit = 10 } = req.query;

        if (!q) {
            return res.status(400).json({ error: 'Search query required' });
        }

        // Full-text search across title, content, keywords, and categories
        const result = await pool.query(
            `SELECT *,
             ts_rank(
                 to_tsvector('english', title || ' ' || content),
                 plainto_tsquery('english', $1)
             ) as rank
             FROM knowledge
             WHERE
                 to_tsvector('english', title || ' ' || content) @@ plainto_tsquery('english', $1)
                 OR $1 = ANY(keywords)
                 OR $1 = ANY(categories)
             ORDER BY rank DESC, created_at DESC
             LIMIT $2`,
            [q, parseInt(limit)]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Knowledge search error:', error);
        res.status(500).json({ error: 'Search failed' });
    }
});

// Get knowledge by category
v1Router.get('/knowledge/category/:category', async (req, res) => {
    try {
        const { category } = req.params;
        const { limit = 20 } = req.query;

        const result = await pool.query(
            `SELECT * FROM knowledge
             WHERE $1 = ANY(categories)
             ORDER BY priority_score DESC, created_at DESC
             LIMIT $2`,
            [category, parseInt(limit)]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Category fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch category' });
    }
});

// Get recent knowledge items
v1Router.get('/knowledge/recent', async (req, res) => {
    try {
        const { limit = 20 } = req.query;

        const result = await pool.query(
            `SELECT * FROM knowledge
             ORDER BY created_at DESC
             LIMIT $1`,
            [parseInt(limit)]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Recent fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch recent items' });
    }
});

// Get Data Cyclotron metrics
v1Router.get('/metrics', async (req, res) => {
    try {
        // Get overall statistics
        const statsResult = await pool.query(`
            SELECT
                COUNT(*) as total_knowledge,
                COUNT(DISTINCT source) as total_sources,
                AVG(priority_score) as avg_priority,
                MAX(created_at) as last_added
            FROM knowledge
        `);

        // Get category breakdown
        const categoriesResult = await pool.query(`
            SELECT category, COUNT(*) as count
            FROM knowledge,
            LATERAL unnest(categories) as category
            GROUP BY category
            ORDER BY count DESC
            LIMIT 10
        `);

        // Get source breakdown
        const sourcesResult = await pool.query(`
            SELECT source, COUNT(*) as count
            FROM knowledge
            GROUP BY source
            ORDER BY count DESC
        `);

        // Get recent activity (last 24 hours)
        const recentResult = await pool.query(`
            SELECT COUNT(*) as count_24h
            FROM knowledge
            WHERE created_at > NOW() - INTERVAL '24 hours'
        `);

        res.json({
            statistics: statsResult.rows[0],
            top_categories: categoriesResult.rows,
            sources: sourcesResult.rows,
            recent_activity: recentResult.rows[0]
        });
    } catch (error) {
        console.error('Metrics fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch metrics' });
    }
});

// ================================================
// V1 API ROUTES - TRINITY COORDINATION
// ================================================

// Register or update Trinity instance
v1Router.post('/trinity/instances/register', async (req, res) => {
    try {
        const { instance_id, role, computer_name, focus, metadata = {} } = req.body;

        if (!instance_id || !role) {
            return res.status(400).json({ error: 'instance_id and role required' });
        }

        // Upsert instance (update if exists, insert if not)
        const result = await pool.query(
            `INSERT INTO trinity_instances (instance_id, role, computer_name, focus, last_heartbeat, metadata)
             VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5)
             ON CONFLICT (instance_id)
             DO UPDATE SET
                role = $2,
                computer_name = $3,
                focus = $4,
                last_heartbeat = CURRENT_TIMESTAMP,
                metadata = $5,
                status = 'active'
             RETURNING *`,
            [instance_id, role, computer_name, focus, metadata]
        );

        // Broadcast instance registration via WebSocket
        const wsServer = req.app.get('wsServer');
        if (wsServer) {
            wsServer.broadcastInstanceUpdate({
                instance_id,
                role,
                computer_name,
                status: 'active',
                focus
            });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Instance registration error:', error);
        res.status(500).json({ error: 'Failed to register instance' });
    }
});

// Heartbeat (keep instance alive)
v1Router.post('/trinity/instances/:instance_id/heartbeat', async (req, res) => {
    try {
        const { instance_id } = req.params;
        const { status = 'active', focus } = req.body;

        const result = await pool.query(
            `UPDATE trinity_instances
             SET last_heartbeat = CURRENT_TIMESTAMP, status = $2, focus = COALESCE($3, focus)
             WHERE instance_id = $1
             RETURNING *`,
            [instance_id, status, focus]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Instance not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Heartbeat error:', error);
        res.status(500).json({ error: 'Failed to update heartbeat' });
    }
});

// Get all active instances
v1Router.get('/trinity/instances', async (req, res) => {
    try {
        const { active_only = 'true' } = req.query;

        let query = 'SELECT * FROM trinity_instances';
        if (active_only === 'true') {
            // Consider instances active if heartbeat within last 5 minutes
            query += ` WHERE last_heartbeat > NOW() - INTERVAL '5 minutes' ORDER BY created_at`;
        } else {
            query += ' ORDER BY created_at';
        }

        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error('Instances fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch instances' });
    }
});

// Create task
v1Router.post('/trinity/tasks', async (req, res) => {
    try {
        const {
            task_name,
            description,
            role_target,
            priority = 50,
            estimated_hours,
            metadata = {}
        } = req.body;

        if (!task_name) {
            return res.status(400).json({ error: 'task_name required' });
        }

        const result = await pool.query(
            `INSERT INTO trinity_tasks (task_name, description, role_target, priority, estimated_hours, metadata)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [task_name, description, role_target, priority, estimated_hours, metadata]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Task creation error:', error);
        res.status(500).json({ error: 'Failed to create task' });
    }
});

// Claim task (atomic operation)
v1Router.post('/trinity/tasks/:task_id/claim', async (req, res) => {
    try {
        const { task_id } = req.params;
        const { instance_id } = req.body;

        if (!instance_id) {
            return res.status(400).json({ error: 'instance_id required' });
        }

        // Atomic claim - only succeeds if task is available
        const result = await pool.query(
            `UPDATE trinity_tasks
             SET status = 'claimed',
                 assigned_to = $2,
                 claimed_at = CURRENT_TIMESTAMP
             WHERE id = $1 AND status = 'available'
             RETURNING *`,
            [task_id, instance_id]
        );

        if (result.rows.length === 0) {
            return res.status(409).json({ error: 'Task not available or already claimed' });
        }

        // Broadcast task claim via WebSocket
        const task = result.rows[0];
        const wsServer = req.app.get('wsServer');
        if (wsServer) {
            wsServer.broadcastTaskClaimed({
                task_id: task.id,
                task_name: task.task_name,
                instance_id: instance_id
            });
        }

        res.json(task);
    } catch (error) {
        console.error('Task claim error:', error);
        res.status(500).json({ error: 'Failed to claim task' });
    }
});

// Update task status
v1Router.patch('/trinity/tasks/:task_id', async (req, res) => {
    try {
        const { task_id } = req.params;
        const { status, metadata } = req.body;

        let query = 'UPDATE trinity_tasks SET ';
        const params = [];
        let paramCount = 1;

        if (status) {
            params.push(status);
            query += `status = $${paramCount++}, `;
            if (status === 'completed') {
                query += `completed_at = CURRENT_TIMESTAMP, `;
            }
        }

        if (metadata) {
            params.push(metadata);
            query += `metadata = $${paramCount++}, `;
        }

        if (params.length === 0) {
            return res.status(400).json({ error: 'No updates provided' });
        }

        // Remove trailing comma and space
        query = query.slice(0, -2);
        params.push(task_id);
        query += ` WHERE id = $${paramCount} RETURNING *`;

        const result = await pool.query(query, params);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Task not found' });
        }

        // Broadcast task updates via WebSocket
        const task = result.rows[0];
        const wsServer = req.app.get('wsServer');
        if (wsServer) {
            wsServer.broadcastTaskUpdated({
                task_id: task.id,
                status: task.status,
                task_name: task.task_name
            });
        }

        res.json(task);
    } catch (error) {
        console.error('Task update error:', error);
        res.status(500).json({ error: 'Failed to update task' });
    }
});

// Get tasks (with filtering)
v1Router.get('/trinity/tasks', async (req, res) => {
    try {
        const { status, role_target, assigned_to } = req.query;

        let query = 'SELECT * FROM trinity_tasks WHERE 1=1';
        const params = [];
        let paramCount = 1;

        if (status) {
            params.push(status);
            query += ` AND status = $${paramCount++}`;
        }

        if (role_target) {
            params.push(role_target);
            query += ` AND role_target = $${paramCount++}`;
        }

        if (assigned_to) {
            params.push(assigned_to);
            query += ` AND assigned_to = $${paramCount++}`;
        }

        query += ' ORDER BY priority DESC, created_at ASC';

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Tasks fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch tasks' });
    }
});

// Set/Get Trinity state (key-value store)
v1Router.post('/trinity/state', async (req, res) => {
    try {
        const { key, value, updated_by } = req.body;

        if (!key || value === undefined) {
            return res.status(400).json({ error: 'key and value required' });
        }

        const result = await pool.query(
            `INSERT INTO trinity_state (key, value, updated_by, updated_at)
             VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
             ON CONFLICT (key)
             DO UPDATE SET value = $2, updated_by = $3, updated_at = CURRENT_TIMESTAMP
             RETURNING *`,
            [key, value, updated_by]
        );

        // Broadcast timeline convergence updates via WebSocket
        const wsServer = req.app.get('wsServer');
        if (wsServer && key === 'timeline_convergence') {
            wsServer.broadcastConvergenceUpdate({
                percent: value.percent || value,
                updated_by
            });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('State update error:', error);
        res.status(500).json({ error: 'Failed to update state' });
    }
});

v1Router.get('/trinity/state/:key', async (req, res) => {
    try {
        const { key } = req.params;

        const result = await pool.query(
            'SELECT * FROM trinity_state WHERE key = $1',
            [key]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'State key not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('State fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch state' });
    }
});

v1Router.get('/trinity/state', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM trinity_state ORDER BY key');
        res.json(result.rows);
    } catch (error) {
        console.error('State fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch state' });
    }
});

// Trinity coordination status endpoint
v1Router.get('/trinity/status', async (req, res) => {
    try {
        // Get active instances
        const instancesResult = await pool.query(
            `SELECT COUNT(*) as total, role, COUNT(*) FILTER (WHERE last_heartbeat > NOW() - INTERVAL '5 minutes') as active_count
             FROM trinity_instances
             GROUP BY role`
        );

        // Get task statistics
        const tasksResult = await pool.query(
            `SELECT status, COUNT(*) as count
             FROM trinity_tasks
             GROUP BY status`
        );

        // Get timeline convergence from state
        const convergenceResult = await pool.query(
            `SELECT value FROM trinity_state WHERE key = 'timeline_convergence'`
        );

        res.json({
            instances: instancesResult.rows,
            tasks: tasksResult.rows,
            timeline_convergence: convergenceResult.rows[0]?.value || null,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Trinity status error:', error);
        res.status(500).json({ error: 'Failed to fetch Trinity status' });
    }
});

// ================================================
// WEEK 3: MOUNT V1 ROUTER + BACKWARD COMPATIBILITY
// ================================================

// Mount v1 router at /api/v1 (versioned endpoints)
app.use('/api/v1', v1Router);

// Mount v1 router at /api for backward compatibility (log deprecation warnings)
app.use('/api', (req, res, next) => {
    // Only log if NOT already hitting /v1
    if (!req.originalUrl.includes('/v1/')) {
        console.warn(`⚠️ Deprecated API call: ${req.originalUrl} - Please update to /api/v1${req.path}`);
    }
    next();
}, v1Router);

// ================================================
// ERROR HANDLING
// ================================================

// 404 handler
app.use((req, res) => {
    logger.warn('404 - Route not found', { path: req.path, method: req.method });
    res.status(404).json({ error: 'Endpoint not found' });
});

// C1 Mechanic - Error logging middleware
app.use(errorLogger);

// ================================================
// SERVER STARTUP
// ================================================

// Initialize database and start server
async function startServer() {
    try {
        // Initialize database schema
        await initializeDatabase(pool);

        // Initialize WebSocket server for real-time Trinity coordination
        const wsServer = new TrinityWebSocketServer(httpServer);

        // Make WebSocket server available to all routes
        app.set('wsServer', wsServer);

        // Start server
        httpServer.listen(PORT, () => {
            console.log('================================================');
            console.log('🌀 PHILOSOPHER AI BACKEND - READY');
            console.log('🌐 TRINITY WEBSOCKET SERVER - ACTIVE');
            console.log('================================================');
            console.log(`Server running on port ${PORT}`);
            console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`API URL: ${process.env.API_URL || `http://localhost:${PORT}`}`);
            console.log(`Version: ${process.env.PLATFORM_VERSION || '1.0.0'}`);
            console.log(`WebSocket: Real-time coordination enabled`);
            console.log('================================================');
        });
    } catch (error) {
        console.error('❌ Server startup failed:', error.message);
        console.error('   Retrying in 5 seconds...');
        setTimeout(startServer, 5000);
    }
}

// Start the server
startServer();

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, closing server gracefully...');
    pool.end(() => {
        console.log('Database pool closed');
        process.exit(0);
    });
});

// ================================================
// SCHEDULED TASKS (should use cron or node-cron in production)
// ================================================

// Reset monthly question limits daily
setInterval(async () => {
    try {
        await resetMonthlyQuestions();
        console.log('Monthly question limits reset');
    } catch (error) {
        console.error('Reset error:', error);
    }
}, 24 * 60 * 60 * 1000); // Run daily

module.exports = app; // For testing
