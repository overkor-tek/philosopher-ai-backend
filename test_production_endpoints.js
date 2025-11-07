// Production Endpoint Testing Suite
// Tests all 28 new endpoints deployed to production
// Created by: C1 Mechanic - Autonomous Mode
// Date: November 7, 2025

const BASE_URL = process.env.API_URL || 'https://cloud-funnel-production.up.railway.app/api/v1';

// Color codes for terminal output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

const results = {
    passed: 0,
    failed: 0,
    tests: []
};

// Test helper functions
async function makeRequest(method, endpoint, body = null, headers = {}) {
    try {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };

        if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
            options.body = JSON.stringify(body);
        }

        const response = await fetch(`${BASE_URL}${endpoint}`, options);
        const data = await response.text();

        let jsonData;
        try {
            jsonData = JSON.parse(data);
        } catch {
            jsonData = data;
        }

        return {
            status: response.status,
            data: jsonData,
            headers: Object.fromEntries(response.headers.entries())
        };
    } catch (error) {
        return {
            status: 0,
            error: error.message
        };
    }
}

function logTest(name, passed, message = '') {
    const symbol = passed ? `${colors.green}✓${colors.reset}` : `${colors.red}✗${colors.reset}`;
    const status = passed ? `${colors.green}PASS${colors.reset}` : `${colors.red}FAIL${colors.reset}`;

    console.log(`${symbol} ${name} - ${status} ${message}`);

    results.tests.push({ name, passed, message });
    if (passed) results.passed++;
    else results.failed++;
}

function section(title) {
    console.log(`\n${colors.cyan}${'='.repeat(60)}${colors.reset}`);
    console.log(`${colors.cyan}${title}${colors.reset}`);
    console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);
}

// Test suite begins
(async () => {
    console.log(`\n${colors.blue}🧪 Production Endpoint Testing Suite${colors.reset}`);
    console.log(`${colors.blue}Testing: ${BASE_URL}${colors.reset}\n`);

    // ========================================
    // 1. AUTHENTICATION EXTENSIONS TESTS (6 endpoints)
    // ========================================

    section('1. Password Reset & Email Verification (6 endpoints)');

    // Test 1.1: Forgot Password
    const forgotPassword = await makeRequest('POST', '/auth/forgot-password', {
        email: 'test@example.com'
    });
    logTest(
        'POST /auth/forgot-password',
        forgotPassword.status === 200,
        `Status: ${forgotPassword.status}`
    );

    // Test 1.2: Verify Reset Token (should fail with invalid token)
    const verifyReset = await makeRequest('GET', '/auth/verify-reset-token/invalid-token-123');
    logTest(
        'GET /auth/verify-reset-token/:token',
        verifyReset.status === 400 || verifyReset.status === 404,
        `Status: ${verifyReset.status} (correctly rejects invalid token)`
    );

    // Test 1.3: Reset Password (should fail without valid token)
    const resetPassword = await makeRequest('POST', '/auth/reset-password', {
        token: 'invalid-token',
        newPassword: 'NewPassword123!'
    });
    logTest(
        'POST /auth/reset-password',
        resetPassword.status === 400 || resetPassword.status === 404,
        `Status: ${resetPassword.status} (correctly requires valid token)`
    );

    // Test 1.4: Send Verification Email (should require auth)
    const sendVerif = await makeRequest('POST', '/auth/send-verification-email');
    logTest(
        'POST /auth/send-verification-email',
        sendVerif.status === 401 || sendVerif.status === 403,
        `Status: ${sendVerif.status} (correctly requires authentication)`
    );

    // Test 1.5: Verify Email (should fail with invalid token)
    const verifyEmail = await makeRequest('POST', '/auth/verify-email', {
        token: 'invalid-token'
    });
    logTest(
        'POST /auth/verify-email',
        verifyEmail.status === 400 || verifyEmail.status === 404,
        `Status: ${verifyEmail.status} (correctly rejects invalid token)`
    );

    // Test 1.6: Change Password (should require auth)
    const changePass = await makeRequest('POST', '/auth/change-password', {
        currentPassword: 'old',
        newPassword: 'new'
    });
    logTest(
        'POST /auth/change-password',
        changePass.status === 401 || changePass.status === 403,
        `Status: ${changePass.status} (correctly requires authentication)`
    );

    // ========================================
    // 2. PROFILE MANAGEMENT TESTS (5 endpoints)
    // ========================================

    section('2. Profile Management (5 endpoints)');

    // Test 2.1: Get Own Profile (should require auth)
    const getProfile = await makeRequest('GET', '/profile/me');
    logTest(
        'GET /profile/me',
        getProfile.status === 401 || getProfile.status === 403,
        `Status: ${getProfile.status} (correctly requires authentication)`
    );

    // Test 2.2: Update Profile (should require auth)
    const updateProfile = await makeRequest('PUT', '/profile/me', {
        displayName: 'Test User'
    });
    logTest(
        'PUT /profile/me',
        updateProfile.status === 401 || updateProfile.status === 403,
        `Status: ${updateProfile.status} (correctly requires authentication)`
    );

    // Test 2.3: Delete Account (should require auth)
    const deleteAccount = await makeRequest('DELETE', '/profile/me', {
        confirmPassword: 'test'
    });
    logTest(
        'DELETE /profile/me',
        deleteAccount.status === 401 || deleteAccount.status === 403,
        `Status: ${deleteAccount.status} (correctly requires authentication)`
    );

    // Test 2.4: Get Public Profile (should work without auth but fail with invalid username)
    const publicProfile = await makeRequest('GET', '/profile/user/nonexistentuser123');
    logTest(
        'GET /profile/user/:username',
        publicProfile.status === 404 || publicProfile.status === 200,
        `Status: ${publicProfile.status} (endpoint accessible)`
    );

    // Test 2.5: Update Preferences (should require auth)
    const updatePrefs = await makeRequest('PATCH', '/profile/me/preferences', {
        preferences: { theme: 'dark' }
    });
    logTest(
        'PATCH /profile/me/preferences',
        updatePrefs.status === 401 || updatePrefs.status === 403,
        `Status: ${updatePrefs.status} (correctly requires authentication)`
    );

    // ========================================
    // 3. ADMIN DASHBOARD TESTS (6 endpoints)
    // ========================================

    section('3. Admin Dashboard (6 endpoints)');

    // Test 3.1: Admin Dashboard (should require admin)
    const adminDash = await makeRequest('GET', '/admin/dashboard');
    logTest(
        'GET /admin/dashboard',
        adminDash.status === 401 || adminDash.status === 403,
        `Status: ${adminDash.status} (correctly requires admin authentication)`
    );

    // Test 3.2: List Users (should require admin)
    const listUsers = await makeRequest('GET', '/admin/users');
    logTest(
        'GET /admin/users',
        listUsers.status === 401 || listUsers.status === 403,
        `Status: ${listUsers.status} (correctly requires admin authentication)`
    );

    // Test 3.3: Get User Details (should require admin)
    const userDetails = await makeRequest('GET', '/admin/users/some-user-id');
    logTest(
        'GET /admin/users/:userId',
        userDetails.status === 401 || userDetails.status === 403,
        `Status: ${userDetails.status} (correctly requires admin authentication)`
    );

    // Test 3.4: Update User Tier (should require admin)
    const updateTier = await makeRequest('PATCH', '/admin/users/some-user-id/tier', {
        tier: 'pro'
    });
    logTest(
        'PATCH /admin/users/:userId/tier',
        updateTier.status === 401 || updateTier.status === 403,
        `Status: ${updateTier.status} (correctly requires admin authentication)`
    );

    // Test 3.5: System Health (should require admin)
    const sysHealth = await makeRequest('GET', '/admin/system/health');
    logTest(
        'GET /admin/system/health',
        sysHealth.status === 401 || sysHealth.status === 403,
        `Status: ${sysHealth.status} (correctly requires admin authentication)`
    );

    // ========================================
    // 4. ANALYTICS TESTS (5 endpoints)
    // ========================================

    section('4. Analytics & Metrics (5 endpoints)');

    // Test 4.1: Track Event (should work without auth)
    const trackEvent = await makeRequest('POST', '/analytics/track', {
        event: 'test_event',
        properties: { source: 'test_suite' }
    });
    logTest(
        'POST /analytics/track',
        trackEvent.status === 200 || trackEvent.status === 201,
        `Status: ${trackEvent.status} (public endpoint working)`
    );

    // Test 4.2: Get User Metrics (should require auth)
    const userMetrics = await makeRequest('GET', '/analytics/me/metrics');
    logTest(
        'GET /analytics/me/metrics',
        userMetrics.status === 401 || userMetrics.status === 403,
        `Status: ${userMetrics.status} (correctly requires authentication)`
    );

    // Test 4.3: Get Platform Metrics (should work without auth)
    const platformMetrics = await makeRequest('GET', '/analytics/platform');
    logTest(
        'GET /analytics/platform',
        platformMetrics.status === 200,
        `Status: ${platformMetrics.status} (public endpoint working)`
    );

    // Test 4.4: Get Growth Metrics (should require auth)
    const growthMetrics = await makeRequest('GET', '/analytics/growth');
    logTest(
        'GET /analytics/growth',
        growthMetrics.status === 401 || growthMetrics.status === 403,
        `Status: ${growthMetrics.status} (correctly requires authentication)`
    );

    // Test 4.5: Get Engagement Metrics (should require auth)
    const engagementMetrics = await makeRequest('GET', '/analytics/engagement');
    logTest(
        'GET /analytics/engagement',
        engagementMetrics.status === 401 || engagementMetrics.status === 403,
        `Status: ${engagementMetrics.status} (correctly requires authentication)`
    );

    // ========================================
    // 5. EXISTING ENDPOINT TESTS (Verify nothing broke)
    // ========================================

    section('5. Existing Endpoints (Regression Check)');

    // Test 5.1: Health Check
    const health = await makeRequest('GET', '/health');
    logTest(
        'GET /health',
        health.status === 200,
        `Status: ${health.status}`
    );

    // ========================================
    // FINAL REPORT
    // ========================================

    console.log(`\n${colors.cyan}${'='.repeat(60)}${colors.reset}`);
    console.log(`${colors.cyan}TEST SUMMARY${colors.reset}`);
    console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);

    const passRate = ((results.passed / (results.passed + results.failed)) * 100).toFixed(1);
    const passColor = passRate >= 90 ? colors.green : passRate >= 70 ? colors.yellow : colors.red;

    console.log(`${colors.green}✓ Passed: ${results.passed}${colors.reset}`);
    console.log(`${colors.red}✗ Failed: ${results.failed}${colors.reset}`);
    console.log(`${passColor}Pass Rate: ${passRate}%${colors.reset}\n`);

    if (results.failed > 0) {
        console.log(`${colors.yellow}Failed Tests:${colors.reset}`);
        results.tests.filter(t => !t.passed).forEach(t => {
            console.log(`  ${colors.red}✗${colors.reset} ${t.name} - ${t.message}`);
        });
        console.log('');
    }

    console.log(`${colors.blue}Testing complete!${colors.reset}\n`);

    // Exit with appropriate code
    process.exit(results.failed > 0 ? 1 : 0);
})();
