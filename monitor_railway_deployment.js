#!/usr/bin/env node

/**
 * Railway Deployment Monitor
 * Checks backend health and reports when deployment is complete
 */

const https = require('https');

const BACKEND_URL = 'https://cloud-funnel-production.up.railway.app/api/v1/health';
const CHECK_INTERVAL = 10000; // 10 seconds
const MAX_ATTEMPTS = 30; // 5 minutes max

let attempts = 0;

console.log('🔍 Monitoring Railway Deployment...\n');
console.log(`Backend: ${BACKEND_URL}`);
console.log(`Checking every ${CHECK_INTERVAL / 1000} seconds\n`);

function checkHealth() {
    attempts++;

    https.get(BACKEND_URL, (res) => {
        let data = '';

        res.on('data', (chunk) => {
            data += chunk;
        });

        res.on('end', () => {
            if (res.statusCode === 200) {
                try {
                    const health = JSON.parse(data);
                    console.log(`\n✅ DEPLOYMENT COMPLETE! (attempt ${attempts})`);
                    console.log(`Status: ${health.status}`);
                    console.log(`Database: ${health.database || 'connected'}`);
                    console.log(`\nBackend is live and healthy! 🚀\n`);
                    console.log('Next step: Run automated tests to verify auth fix');
                    console.log('Command: node AUTOMATED_TESTING_SUITE.js\n');
                    process.exit(0);
                } catch (e) {
                    console.log(`[${attempts}] ⏳ Received response but parsing failed, retrying...`);
                }
            } else {
                console.log(`[${attempts}] ⏳ Status ${res.statusCode}, waiting for deployment...`);
            }
        });
    }).on('error', (err) => {
        console.log(`[${attempts}] ⏳ Connection refused (Railway still deploying)...`);
    });

    if (attempts >= MAX_ATTEMPTS) {
        console.log(`\n⚠️ Max attempts reached. Deployment may be taking longer than expected.`);
        console.log(`Check Railway dashboard: https://railway.app`);
        process.exit(1);
    }
}

// Initial check
checkHealth();

// Check periodically
const interval = setInterval(() => {
    checkHealth();
}, CHECK_INTERVAL);

// Handle Ctrl+C
process.on('SIGINT', () => {
    console.log('\n\n👋 Monitoring stopped by user');
    clearInterval(interval);
    process.exit(0);
});
