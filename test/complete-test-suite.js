/**
 * COMPLETE TESTING SUITE
 *
 * Comprehensive test coverage for entire system
 *
 * Usage: npm test
 *
 * Test Categories:
 * 1. Authentication Tests
 * 2. API Endpoint Tests
 * 3. Database Tests
 * 4. Integration Tests
 * 5. Security Tests
 * 6. Performance Tests
 */

const request = require('supertest');
const app = require('../server-simple');
const db = require('../utils/database');

// Test configuration
const TEST_USER = {
    email: 'test@example.com',
    password: 'TestPassword123!',
    name: 'Test User'
};

let authToken = null;
let userId = null;

// ============================================================================
// TEST SUITE 1: AUTHENTICATION
// ============================================================================

describe('🔐 Authentication System', () => {

    describe('POST /api/auth/register', () => {
        it('should register a new user with valid data', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send(TEST_USER)
                .expect(201);

            expect(res.body.success).toBe(true);
            expect(res.body.user).toHaveProperty('id');
            expect(res.body.user.email).toBe(TEST_USER.email);
            expect(res.body).toHaveProperty('token');

            userId = res.body.user.id;
            authToken = res.body.token;
        });

        it('should reject duplicate email registration', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send(TEST_USER)
                .expect(400);

            expect(res.body.success).toBe(false);
            expect(res.body.error).toContain('already exists');
        });

        it('should reject registration with missing fields', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({ email: 'test@example.com' })
                .expect(400);

            expect(res.body.success).toBe(false);
        });

        it('should reject registration with invalid email', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    email: 'invalid-email',
                    password: 'Password123!',
                    name: 'Test'
                })
                .expect(400);

            expect(res.body.success).toBe(false);
        });

        it('should reject registration with weak password', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    email: 'test2@example.com',
                    password: '123',
                    name: 'Test'
                })
                .expect(400);

            expect(res.body.success).toBe(false);
        });
    });

    describe('POST /api/auth/login', () => {
        it('should login with correct credentials', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: TEST_USER.email,
                    password: TEST_USER.password
                })
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body).toHaveProperty('token');
            expect(res.body.user.email).toBe(TEST_USER.email);
        });

        it('should reject login with wrong password', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: TEST_USER.email,
                    password: 'WrongPassword123!'
                })
                .expect(401);

            expect(res.body.success).toBe(false);
        });

        it('should reject login with non-existent email', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'nonexistent@example.com',
                    password: 'Password123!'
                })
                .expect(401);

            expect(res.body.success).toBe(false);
        });
    });

    describe('POST /api/auth/login-pin', () => {
        // Assuming PIN is set to 1234 for test user
        it('should login with correct PIN', async () => {
            const res = await request(app)
                .post('/api/auth/login-pin')
                .send({ pin: '1234' })
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body).toHaveProperty('token');
        });

        it('should reject login with wrong PIN', async () => {
            const res = await request(app)
                .post('/api/auth/login-pin')
                .send({ pin: '9999' })
                .expect(401);

            expect(res.body.success).toBe(false);
        });
    });

    describe('GET /api/auth/me', () => {
        it('should return current user with valid token', async () => {
            const res = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.user.email).toBe(TEST_USER.email);
        });

        it('should reject request without token', async () => {
            const res = await request(app)
                .get('/api/auth/me')
                .expect(401);

            expect(res.body.success).toBe(false);
        });

        it('should reject request with invalid token', async () => {
            const res = await request(app)
                .get('/api/auth/me')
                .set('Authorization', 'Bearer invalid-token')
                .expect(401);

            expect(res.body.success).toBe(false);
        });
    });
});

// ============================================================================
// TEST SUITE 2: API ENDPOINTS
// ============================================================================

describe('🌐 API Endpoints', () => {

    describe('GET /api/health', () => {
        it('should return healthy status', async () => {
            const res = await request(app)
                .get('/api/health')
                .expect(200);

            expect(res.body.status).toBe('healthy');
            expect(res.body.database).toBe('connected');
            expect(res.body).toHaveProperty('timestamp');
        });
    });

    describe('GET /api/*', () => {
        it('should return 404 for non-existent endpoints', async () => {
            const res = await request(app)
                .get('/api/nonexistent')
                .expect(404);

            expect(res.body.success).toBe(false);
        });
    });

    describe('Rate Limiting', () => {
        it('should enforce rate limits after too many requests', async () => {
            // Make 101 requests (limit is 100 per 15 min)
            const requests = [];
            for (let i = 0; i < 101; i++) {
                requests.push(request(app).get('/api/health'));
            }

            const responses = await Promise.all(requests);
            const tooManyRequests = responses.filter(res => res.status === 429);

            expect(tooManyRequests.length).toBeGreaterThan(0);
        }, 30000); // 30 second timeout
    });
});

// ============================================================================
// TEST SUITE 3: DATABASE
// ============================================================================

describe('💾 Database Operations', () => {

    describe('Connection', () => {
        it('should connect to database successfully', async () => {
            const result = await db.query('SELECT 1 as test');
            expect(result.rows[0].test).toBe(1);
        });
    });

    describe('User Table', () => {
        it('should insert user correctly', async () => {
            const result = await db.query(
                'SELECT * FROM users WHERE email = $1',
                [TEST_USER.email]
            );

            expect(result.rows.length).toBe(1);
            expect(result.rows[0].email).toBe(TEST_USER.email);
        });

        it('should enforce unique email constraint', async () => {
            try {
                await db.query(
                    'INSERT INTO users (id, email, password_hash, name) VALUES ($1, $2, $3, $4)',
                    ['test-id-2', TEST_USER.email, 'hash', 'Test']
                );
                fail('Should have thrown constraint error');
            } catch (error) {
                expect(error.code).toBe('23505'); // Unique violation
            }
        });
    });

    describe('Transactions', () => {
        it('should rollback on error', async () => {
            const client = await db.getClient();

            try {
                await client.query('BEGIN');
                await client.query(
                    'INSERT INTO users (id, email, password_hash, name) VALUES ($1, $2, $3, $4)',
                    ['test-trans-1', 'trans1@example.com', 'hash', 'Test']
                );

                // This should fail (duplicate email)
                await client.query(
                    'INSERT INTO users (id, email, password_hash, name) VALUES ($1, $2, $3, $4)',
                    ['test-trans-2', 'trans1@example.com', 'hash', 'Test']
                );

                await client.query('COMMIT');
                fail('Should have thrown error');
            } catch (error) {
                await client.query('ROLLBACK');
                // Verify rollback worked
                const result = await db.query(
                    'SELECT * FROM users WHERE email = $1',
                    ['trans1@example.com']
                );
                expect(result.rows.length).toBe(0);
            } finally {
                client.release();
            }
        });
    });
});

// ============================================================================
// TEST SUITE 4: INTEGRATION TESTS
// ============================================================================

describe('🔗 Integration Tests', () => {

    describe('User Registration → Login → Profile Flow', () => {
        const newUser = {
            email: 'integration@example.com',
            password: 'Integration123!',
            name: 'Integration Test'
        };

        let integrationToken = null;

        it('should complete full user flow', async () => {
            // 1. Register
            const registerRes = await request(app)
                .post('/api/auth/register')
                .send(newUser)
                .expect(201);

            expect(registerRes.body.success).toBe(true);
            integrationToken = registerRes.body.token;

            // 2. Login
            const loginRes = await request(app)
                .post('/api/auth/login')
                .send({
                    email: newUser.email,
                    password: newUser.password
                })
                .expect(200);

            expect(loginRes.body.success).toBe(true);

            // 3. Get Profile
            const profileRes = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${integrationToken}`)
                .expect(200);

            expect(profileRes.body.success).toBe(true);
            expect(profileRes.body.user.email).toBe(newUser.email);
        });
    });
});

// ============================================================================
// TEST SUITE 5: SECURITY TESTS
// ============================================================================

describe('🛡️ Security Tests', () => {

    describe('SQL Injection Prevention', () => {
        it('should prevent SQL injection in login', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: "' OR '1'='1",
                    password: "' OR '1'='1"
                })
                .expect(401);

            expect(res.body.success).toBe(false);
        });
    });

    describe('XSS Prevention', () => {
        it('should sanitize user input', async () => {
            const xssAttempt = {
                email: 'xss@example.com',
                password: 'Password123!',
                name: '<script>alert("XSS")</script>'
            };

            const res = await request(app)
                .post('/api/auth/register')
                .send(xssAttempt)
                .expect(201);

            // Name should be escaped or rejected
            expect(res.body.user.name).not.toContain('<script>');
        });
    });

    describe('Password Security', () => {
        it('should not return password hash in API responses', async () => {
            const res = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(res.body.user).not.toHaveProperty('password');
            expect(res.body.user).not.toHaveProperty('password_hash');
        });
    });

    describe('JWT Token Security', () => {
        it('should reject expired tokens', async () => {
            // Create token that's already expired
            const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InRlc3QiLCJleHAiOjF9.invalid';

            const res = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${expiredToken}`)
                .expect(401);

            expect(res.body.success).toBe(false);
        });

        it('should reject tokens with invalid signature', async () => {
            const tamperedToken = authToken.slice(0, -5) + 'AAAAA';

            const res = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${tamperedToken}`)
                .expect(401);

            expect(res.body.success).toBe(false);
        });
    });
});

// ============================================================================
// TEST SUITE 6: PERFORMANCE TESTS
// ============================================================================

describe('⚡ Performance Tests', () => {

    describe('API Response Times', () => {
        it('health endpoint should respond in <100ms', async () => {
            const start = Date.now();
            await request(app).get('/api/health').expect(200);
            const duration = Date.now() - start;

            expect(duration).toBeLessThan(100);
        });

        it('auth endpoints should respond in <500ms', async () => {
            const start = Date.now();
            await request(app)
                .post('/api/auth/login')
                .send({
                    email: TEST_USER.email,
                    password: TEST_USER.password
                });
            const duration = Date.now() - start;

            expect(duration).toBeLessThan(500);
        });
    });

    describe('Concurrent Requests', () => {
        it('should handle 50 concurrent requests', async () => {
            const requests = [];
            for (let i = 0; i < 50; i++) {
                requests.push(request(app).get('/api/health'));
            }

            const responses = await Promise.all(requests);
            const successful = responses.filter(res => res.status === 200);

            expect(successful.length).toBe(50);
        }, 10000); // 10 second timeout
    });
});

// ============================================================================
// TEST CLEANUP
// ============================================================================

afterAll(async () => {
    // Clean up test data
    await db.query('DELETE FROM users WHERE email LIKE $1', ['%@example.com']);
    await db.close();
});

// ============================================================================
// TEST SUMMARY REPORTER
// ============================================================================

class TestReporter {
    constructor() {
        this.results = {
            total: 0,
            passed: 0,
            failed: 0,
            skipped: 0,
            duration: 0
        };
    }

    generateReport() {
        const passRate = ((this.results.passed / this.results.total) * 100).toFixed(2);

        return `
╔══════════════════════════════════════════════════════════╗
║              COMPLETE TEST SUITE RESULTS                 ║
╠══════════════════════════════════════════════════════════╣
║                                                          ║
║  Total Tests:     ${String(this.results.total).padStart(4)}                                  ║
║  Passed:          ${String(this.results.passed).padStart(4)} (${passRate}%)                        ║
║  Failed:          ${String(this.results.failed).padStart(4)}                                  ║
║  Skipped:         ${String(this.results.skipped).padStart(4)}                                  ║
║                                                          ║
║  Duration:        ${String(this.results.duration).padStart(4)}ms                               ║
║                                                          ║
║  Status: ${this.results.failed === 0 ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}                           ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
`;
    }
}

module.exports = { TEST_USER, authToken };
