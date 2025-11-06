#!/usr/bin/env node

/**
 * MONITORING AUTOMATION SYSTEM
 *
 * Automated health checks and monitoring for deployed backend
 * Sends alerts when issues are detected
 * Tracks metrics over time
 *
 * Usage: node MONITORING_AUTOMATION.js [--interval 300] [--alert-email your@email.com]
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = 'https://cloud-funnel-production.up.railway.app/api/v1';
const CHECK_INTERVAL = parseInt(process.argv[3]) || 300; // 5 minutes default
const LOG_FILE = path.join(__dirname, 'monitoring_log.txt');
const METRICS_FILE = path.join(__dirname, 'metrics_data.json');

// Thresholds (from DEPLOYMENT_PAPER_5)
const THRESHOLDS = {
    responseTime: {
        critical: 3000,  // 🔴 RED
        warning: 1000,   // 🟡 YELLOW
        healthy: 500     // 🟢 GREEN
    },
    errorRate: {
        critical: 25,    // 🔴 RED
        warning: 10,     // 🟠 ORANGE
        healthy: 5       // 🟢 GREEN
    }
};

// Metrics storage
let metrics = {
    checks: [],
    uptime: 0,
    downtime: 0,
    errors: 0,
    totalChecks: 0,
    startTime: new Date().toISOString()
};

// Load existing metrics
try {
    if (fs.existsSync(METRICS_FILE)) {
        const data = fs.readFileSync(METRICS_FILE, 'utf8');
        metrics = { ...metrics, ...JSON.parse(data) };
    }
} catch (error) {
    console.log('Starting fresh metrics tracking');
}

// Colors
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    bold: '\x1b[1m'
};

// Make HTTP request with timing
function makeTimedRequest(url) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        const urlObj = new URL(url);

        const req = https.request({
            hostname: urlObj.hostname,
            port: urlObj.port,
            path: urlObj.pathname,
            method: 'GET',
            timeout: 10000
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                const duration = Date.now() - startTime;
                try {
                    const jsonData = JSON.parse(data);
                    resolve({
                        status: res.statusCode,
                        data: jsonData,
                        responseTime: duration
                    });
                } catch (e) {
                    resolve({
                        status: res.statusCode,
                        data: data,
                        responseTime: duration
                    });
                }
            });
        });

        req.on('error', (error) => {
            const duration = Date.now() - startTime;
            reject({ error: error.message, responseTime: duration });
        });

        req.on('timeout', () => {
            req.destroy();
            reject({ error: 'Timeout', responseTime: 10000 });
        });

        req.end();
    });
}

// Log to file
function log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] [${level}] ${message}\n`;

    try {
        fs.appendFileSync(LOG_FILE, logLine);
    } catch (error) {
        console.error('Failed to write log:', error.message);
    }
}

// Save metrics
function saveMetrics() {
    try {
        fs.writeFileSync(METRICS_FILE, JSON.stringify(metrics, null, 2));
    } catch (error) {
        console.error('Failed to save metrics:', error.message);
    }
}

// Send alert (console for now, can be extended to email/SMS)
function sendAlert(severity, message) {
    const emoji = {
        'CRITICAL': '🔴',
        'WARNING': '🟡',
        'INFO': 'ℹ️'
    }[severity] || 'ℹ️';

    const color = {
        'CRITICAL': colors.red,
        'WARNING': colors.yellow,
        'INFO': colors.cyan
    }[severity] || colors.cyan;

    console.log(`\n${color}${colors.bold}${emoji} ALERT [${severity}]${colors.reset}`);
    console.log(`${color}${message}${colors.reset}\n`);

    log(`ALERT [${severity}]: ${message}`, severity);

    // TODO: Add email/SMS integration here
    // Can integrate with Twilio (already configured) or SendGrid
}

// Assess health status
function assessHealth(check) {
    const issues = [];
    let severity = 'HEALTHY';

    // Check response time
    if (check.responseTime > THRESHOLDS.responseTime.critical) {
        issues.push(`Response time critical: ${check.responseTime}ms`);
        severity = 'CRITICAL';
    } else if (check.responseTime > THRESHOLDS.responseTime.warning) {
        issues.push(`Response time slow: ${check.responseTime}ms`);
        if (severity !== 'CRITICAL') severity = 'WARNING';
    }

    // Check if backend is down
    if (check.error) {
        issues.push(`Backend error: ${check.error}`);
        severity = 'CRITICAL';
    }

    // Check status code
    if (check.status && check.status !== 200) {
        issues.push(`Unexpected status code: ${check.status}`);
        severity = 'CRITICAL';
    }

    // Calculate error rate
    const recentChecks = metrics.checks.slice(-20); // Last 20 checks
    const errorCount = recentChecks.filter(c => c.error || c.status !== 200).length;
    const errorRate = (errorCount / recentChecks.length) * 100;

    if (errorRate > THRESHOLDS.errorRate.critical) {
        issues.push(`Error rate critical: ${errorRate.toFixed(1)}%`);
        severity = 'CRITICAL';
    } else if (errorRate > THRESHOLDS.errorRate.warning) {
        issues.push(`Error rate elevated: ${errorRate.toFixed(1)}%`);
        if (severity !== 'CRITICAL') severity = 'WARNING';
    }

    return { severity, issues, errorRate };
}

// Perform health check
async function performHealthCheck() {
    metrics.totalChecks++;
    const checkTime = new Date().toISOString();

    console.log(`${colors.cyan}[${new Date().toLocaleTimeString()}]${colors.reset} Performing health check...`);

    try {
        const result = await makeTimedRequest(`${BASE_URL}/health`);

        const check = {
            timestamp: checkTime,
            status: result.status,
            responseTime: result.responseTime,
            data: result.data,
            error: null
        };

        metrics.checks.push(check);
        metrics.uptime++;

        // Keep only last 100 checks in memory
        if (metrics.checks.length > 100) {
            metrics.checks = metrics.checks.slice(-100);
        }

        // Assess health
        const health = assessHealth(check);

        // Display status
        if (health.severity === 'HEALTHY') {
            console.log(`  ${colors.green}✓ HEALTHY${colors.reset} - ${result.responseTime}ms - Uptime: ${calculateUptime()}%`);
        } else if (health.severity === 'WARNING') {
            console.log(`  ${colors.yellow}⚠ WARNING${colors.reset} - ${result.responseTime}ms`);
            health.issues.forEach(issue => console.log(`    - ${issue}`));
        } else {
            console.log(`  ${colors.red}✗ CRITICAL${colors.reset} - ${result.responseTime}ms`);
            health.issues.forEach(issue => console.log(`    - ${issue}`));
            sendAlert('CRITICAL', health.issues.join('\n'));
        }

        log(`Health check: ${health.severity} - ${result.responseTime}ms`, health.severity === 'HEALTHY' ? 'INFO' : health.severity);

    } catch (error) {
        const check = {
            timestamp: checkTime,
            status: null,
            responseTime: error.responseTime || 0,
            data: null,
            error: error.error
        };

        metrics.checks.push(check);
        metrics.downtime++;
        metrics.errors++;

        console.log(`  ${colors.red}✗ DOWN${colors.reset} - ${error.error}`);

        sendAlert('CRITICAL', `Backend is DOWN: ${error.error}`);
        log(`Health check FAILED: ${error.error}`, 'CRITICAL');
    }

    saveMetrics();
}

// Calculate uptime percentage
function calculateUptime() {
    if (metrics.totalChecks === 0) return 100;
    return ((metrics.uptime / metrics.totalChecks) * 100).toFixed(2);
}

// Display metrics summary
function displayMetrics() {
    console.log(`\n${colors.bold}${'═'.repeat(70)}${colors.reset}`);
    console.log(`${colors.bold}MONITORING METRICS SUMMARY${colors.reset}`);
    console.log('═'.repeat(70));

    const uptime = calculateUptime();
    const avgResponseTime = metrics.checks.length > 0
        ? (metrics.checks.reduce((sum, c) => sum + c.responseTime, 0) / metrics.checks.length).toFixed(0)
        : 0;

    const recentChecks = metrics.checks.slice(-20);
    const errorRate = recentChecks.length > 0
        ? ((recentChecks.filter(c => c.error || c.status !== 200).length / recentChecks.length) * 100).toFixed(1)
        : 0;

    console.log(`${colors.cyan}Start Time:${colors.reset}        ${metrics.startTime}`);
    console.log(`${colors.cyan}Total Checks:${colors.reset}      ${metrics.totalChecks}`);
    console.log(`${colors.cyan}Successful:${colors.reset}        ${metrics.uptime} (${uptime}%)`);
    console.log(`${colors.cyan}Failed:${colors.reset}            ${metrics.downtime}`);
    console.log(`${colors.cyan}Avg Response:${colors.reset}      ${avgResponseTime}ms`);
    console.log(`${colors.cyan}Error Rate:${colors.reset}        ${errorRate}%`);

    // Status indicator
    const uptimeNum = parseFloat(uptime);
    let statusColor = colors.green;
    let statusText = '🟢 EXCELLENT';

    if (uptimeNum < 95) {
        statusColor = colors.red;
        statusText = '🔴 CRITICAL';
    } else if (uptimeNum < 99) {
        statusColor = colors.yellow;
        statusText = '🟡 WARNING';
    }

    console.log(`${colors.cyan}Status:${colors.reset}            ${statusColor}${statusText}${colors.reset}`);
    console.log('═'.repeat(70) + '\n');
}

// Main monitoring loop
async function startMonitoring() {
    console.log(`\n${colors.bold}${colors.cyan}╔════════════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan}║          MONITORING AUTOMATION SYSTEM                          ║${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan}╚════════════════════════════════════════════════════════════════╝${colors.reset}\n`);

    console.log(`${colors.cyan}Backend URL:${colors.reset}       ${BASE_URL}`);
    console.log(`${colors.cyan}Check Interval:${colors.reset}    ${CHECK_INTERVAL} seconds`);
    console.log(`${colors.cyan}Log File:${colors.reset}          ${LOG_FILE}`);
    console.log(`${colors.cyan}Metrics File:${colors.reset}      ${METRICS_FILE}`);
    console.log(`${colors.cyan}Started:${colors.reset}           ${new Date().toLocaleString()}\n`);

    log('Monitoring system started', 'INFO');

    // Perform initial check
    await performHealthCheck();

    // Start monitoring loop
    setInterval(async () => {
        await performHealthCheck();
    }, CHECK_INTERVAL * 1000);

    // Display metrics summary every 10 checks
    let checkCount = 1;
    setInterval(() => {
        checkCount++;
        if (checkCount % 10 === 0) {
            displayMetrics();
        }
    }, CHECK_INTERVAL * 1000);

    // Handle graceful shutdown
    process.on('SIGINT', () => {
        console.log(`\n\n${colors.cyan}Shutting down monitoring system...${colors.reset}`);
        displayMetrics();
        log('Monitoring system stopped', 'INFO');
        process.exit(0);
    });
}

// Start monitoring
startMonitoring().catch(error => {
    console.error(`${colors.red}Fatal error:${colors.reset}`, error);
    log(`Fatal error: ${error.message}`, 'CRITICAL');
    process.exit(1);
});
