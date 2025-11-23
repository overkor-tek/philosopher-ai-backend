/**
 * Backend Health Monitor
 * Continuously monitors the backend API health and alerts on failures
 * Run with: node monitor_backend.js
 */

const http = require('http');

const CONFIG = {
    BACKEND_URL: 'http://localhost:3001/api/health',
    CHECK_INTERVAL: 60000, // 60 seconds
    TIMEOUT: 5000, // 5 seconds
    ALERT_THRESHOLD: 3 // Alert after 3 consecutive failures
};

let consecutiveFailures = 0;
let isAlerted = false;
let startTime = new Date();

// Color codes for console output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    grey: '\x1b[90m'
};

function log(message, color = 'reset') {
    const timestamp = new Date().toISOString();
    console.log(`${colors[color]}[${timestamp}] ${message}${colors.reset}`);
}

function logStatus(healthy, responseTime, data) {
    if (healthy) {
        log(`✅ Backend HEALTHY - Response: ${responseTime}ms | DB: ${data.database} | v${data.version}`, 'green');
    } else {
        log(`❌ Backend UNHEALTHY or UNREACHABLE`, 'red');
    }
}

function alert(message) {
    log(`🚨 ALERT: ${message}`, 'red');
    isAlerted = true;
}

function clearAlert() {
    if (isAlerted) {
        log(`✅ ALERT CLEARED - Backend recovered!`, 'green');
        isAlerted = false;
    }
}

function checkBackendHealth() {
    return new Promise((resolve) => {
        const url = new URL(CONFIG.BACKEND_URL);

        const options = {
            hostname: url.hostname,
            port: url.port || 80,
            path: url.pathname + url.search,
            method: 'GET',
            timeout: CONFIG.TIMEOUT
        };

        const req = http.request(options, (res) => {
            let data = '';

            res.on('data', chunk => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    const healthy = res.statusCode === 200 && json.database === 'connected';

                    if (healthy) {
                        consecutiveFailures = 0;
                        clearAlert();
                    } else {
                        consecutiveFailures++;
                    }

                    resolve({
                        healthy,
                        statusCode: res.statusCode,
                        responseTime: 0,
                        data: json
                    });
                } catch (e) {
                    consecutiveFailures++;
                    resolve({
                        healthy: false,
                        statusCode: res.statusCode,
                        error: 'Invalid JSON response'
                    });
                }
            });
        });

        req.on('timeout', () => {
            req.destroy();
            consecutiveFailures++;
            resolve({
                healthy: false,
                error: 'Request timeout'
            });
        });

        req.on('error', (error) => {
            consecutiveFailures++;
            resolve({
                healthy: false,
                error: error.message
            });
        });

        req.end();
    });
}

async function monitor() {
    log(`Backend Health Monitor started - Checking every ${CONFIG.CHECK_INTERVAL / 1000}s`, 'blue');
    log(`Backend URL: ${CONFIG.BACKEND_URL}`, 'grey');
    log(`Alert threshold: ${CONFIG.ALERT_THRESHOLD} consecutive failures`, 'grey');
    log('---', 'grey');

    const performCheck = async () => {
        try {
            const startCheck = Date.now();
            const result = await checkBackendHealth();
            const responseTime = Date.now() - startCheck;

            result.responseTime = responseTime;
            logStatus(result.healthy, responseTime, result.data || {});

            if (consecutiveFailures >= CONFIG.ALERT_THRESHOLD) {
                alert(`Backend has failed ${consecutiveFailures} times in a row`);
            }

        } catch (error) {
            log(`Monitor error: ${error.message}`, 'red');
            consecutiveFailures++;
        }

        setTimeout(performCheck, CONFIG.CHECK_INTERVAL);
    };

    // Initial check
    await performCheck();
}

// Graceful shutdown
process.on('SIGINT', () => {
    const uptime = Math.floor((Date.now() - startTime.getTime()) / 1000);
    log(`\nMonitor stopped. Uptime: ${uptime}s`, 'yellow');
    process.exit(0);
});

process.on('SIGTERM', () => {
    const uptime = Math.floor((Date.now() - startTime.getTime()) / 1000);
    log(`\nMonitor terminated. Uptime: ${uptime}s`, 'yellow');
    process.exit(0);
});

// Start monitoring
monitor().catch(error => {
    log(`Fatal error: ${error.message}`, 'red');
    process.exit(1);
});
