#!/usr/bin/env node
/**
 * TRINITY NETWORK HEALTH MONITOR
 * Monitors network health and provides alerts for issues
 * Runs continuously, checking every 30 seconds
 */

const fs = require('fs');
const path = require('path');

const CLOUD_BASE = process.env.TRINITY_CLOUD_FOLDER || 'C:/Users/Darrick/Dropbox/TRINITY_NETWORK';
const MASTER_DIR = path.join(CLOUD_BASE, 'MASTER');

// Health thresholds
const THRESHOLDS = {
    COMPUTER_OFFLINE_SECONDS: 120,  // Computer offline if no update in 2 minutes
    INSTANCE_STALE_MINUTES: 10,      // Instance stale if no activity in 10 minutes
    MIN_ACTIVE_INSTANCES: 3,         // Alert if less than 3 instances active
    SYNC_FAILURE_COUNT: 3            // Alert after 3 consecutive sync failures
};

// Health state
let healthState = {
    lastCheck: null,
    consecutiveFailures: 0,
    alerts: [],
    metrics: {}
};

console.log(`
╔════════════════════════════════════════════════════════════╗
║  🏥 TRINITY NETWORK HEALTH MONITOR
║  Continuous health monitoring with alerts
╚════════════════════════════════════════════════════════════╝
`);

function checkNetworkHealth() {
    console.log(`\n[${new Date().toLocaleTimeString()}] Running health check...`);

    const alerts = [];
    const metrics = {
        timestamp: Date.now(),
        computersOnline: 0,
        computersOffline: 0,
        instancesActive: 0,
        instancesStandby: 0,
        syncHealthy: true,
        overallHealth: 'UNKNOWN'
    };

    try {
        // Check if master coordinator is running
        const consolidatedFile = path.join(MASTER_DIR, 'consolidated_status.json');

        if (!fs.existsSync(consolidatedFile)) {
            alerts.push({
                level: 'CRITICAL',
                message: 'Master coordinator not running - no consolidated status file',
                action: 'Run START_MASTER_COORDINATOR.bat'
            });
            metrics.syncHealthy = false;
            metrics.overallHealth = 'CRITICAL';
        } else {
            const stats = fs.statSync(consolidatedFile);
            const ageSeconds = (Date.now() - stats.mtimeMs) / 1000;

            if (ageSeconds > 60) {
                alerts.push({
                    level: 'WARNING',
                    message: `Master coordinator stale (${Math.floor(ageSeconds)}s since last update)`,
                    action: 'Check if master_coordinator.js is still running'
                });
                metrics.syncHealthy = false;
            }

            // Read consolidated status
            const consolidated = JSON.parse(fs.readFileSync(consolidatedFile, 'utf8'));

            // Check computers
            ['A', 'B', 'C'].forEach(comp => {
                const compData = consolidated.computers[comp];

                if (compData && compData.connected) {
                    metrics.computersOnline++;

                    if (compData.lastSeen > THRESHOLDS.COMPUTER_OFFLINE_SECONDS) {
                        alerts.push({
                            level: 'WARNING',
                            message: `Computer ${comp} connection degraded (last seen ${Math.floor(compData.lastSeen)}s ago)`,
                            action: 'Check cloud sync on Computer ' + comp
                        });
                    }

                    // Check instances
                    if (compData.instances) {
                        Object.entries(compData.instances).forEach(([inst, data]) => {
                            if (data.status === 'active') {
                                metrics.instancesActive++;
                            } else {
                                metrics.instancesStandby++;
                            }
                        });
                    }
                } else {
                    metrics.computersOffline++;

                    if (consolidated.network && consolidated.network.connectedComputers < 3) {
                        alerts.push({
                            level: 'INFO',
                            message: `Computer ${comp} offline - ready for deployment`,
                            action: `Deploy .trinity folder to Computer ${comp}`
                        });
                    }
                }
            });

            // Check if enough instances are active
            if (metrics.instancesActive < THRESHOLDS.MIN_ACTIVE_INSTANCES) {
                alerts.push({
                    level: 'INFO',
                    message: `Only ${metrics.instancesActive} instance(s) active (minimum recommended: ${THRESHOLDS.MIN_ACTIVE_INSTANCES})`,
                    action: 'Wake more Trinity instances using wake_*.bat'
                });
            }

            // Determine overall health
            if (alerts.some(a => a.level === 'CRITICAL')) {
                metrics.overallHealth = 'CRITICAL';
            } else if (alerts.some(a => a.level === 'WARNING')) {
                metrics.overallHealth = 'WARNING';
            } else if (metrics.computersOnline === 3 && metrics.instancesActive >= 3) {
                metrics.overallHealth = 'EXCELLENT';
            } else if (metrics.computersOnline >= 1) {
                metrics.overallHealth = 'GOOD';
            } else {
                metrics.overallHealth = 'DEGRADED';
            }
        }

        // Update health state
        healthState.lastCheck = Date.now();
        healthState.alerts = alerts;
        healthState.metrics = metrics;
        healthState.consecutiveFailures = 0;

        // Display results
        displayHealthReport(metrics, alerts);

        // Save health report
        saveHealthReport(metrics, alerts);

    } catch (error) {
        console.error('❌ Health check error:', error.message);

        healthState.consecutiveFailures++;

        if (healthState.consecutiveFailures >= THRESHOLDS.SYNC_FAILURE_COUNT) {
            alerts.push({
                level: 'CRITICAL',
                message: `Health monitoring failing (${healthState.consecutiveFailures} consecutive failures)`,
                action: 'Check cloud folder access and file permissions'
            });
        }

        metrics.overallHealth = 'ERROR';
        displayHealthReport(metrics, alerts);
    }
}

function displayHealthReport(metrics, alerts) {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  📊 NETWORK HEALTH REPORT');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    // Overall health indicator
    const healthEmoji = {
        'EXCELLENT': '🟢',
        'GOOD': '🟡',
        'WARNING': '🟠',
        'DEGRADED': '🔴',
        'CRITICAL': '💀',
        'ERROR': '❌',
        'UNKNOWN': '⚪'
    };

    console.log(`${healthEmoji[metrics.overallHealth]} Overall Health: ${metrics.overallHealth}\n`);

    // Metrics
    console.log('📈 Metrics:');
    console.log(`   Computers Online: ${metrics.computersOnline}/3`);
    console.log(`   Computers Offline: ${metrics.computersOffline}/3`);
    console.log(`   Instances Active: ${metrics.instancesActive}/9`);
    console.log(`   Instances Standby: ${metrics.instancesStandby}/9`);
    console.log(`   Sync Healthy: ${metrics.syncHealthy ? 'YES' : 'NO'}`);

    // Alerts
    if (alerts.length > 0) {
        console.log('\n🚨 Alerts:\n');

        alerts.forEach(alert => {
            const levelEmoji = {
                'CRITICAL': '💀',
                'WARNING': '⚠️',
                'INFO': 'ℹ️'
            };

            console.log(`${levelEmoji[alert.level]} ${alert.level}: ${alert.message}`);
            console.log(`   ➜ Action: ${alert.action}\n`);
        });
    } else {
        console.log('\n✅ No alerts - all systems nominal\n');
    }
}

function saveHealthReport(metrics, alerts) {
    const report = {
        timestamp: Date.now(),
        metrics,
        alerts,
        consecutiveFailures: healthState.consecutiveFailures
    };

    const reportFile = path.join(MASTER_DIR, 'health_report.json');

    try {
        fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
        console.log(`✅ Health report saved: ${reportFile}`);
    } catch (error) {
        console.error(`❌ Could not save health report: ${error.message}`);
    }
}

function sendAlert(alert) {
    // In future, could send to:
    // - Email
    // - SMS
    // - Desktop notification
    // - Slack/Discord webhook

    console.log(`\n🔔 ALERT: ${alert.message}`);
}

let checkCount = 0;

function healthCheckCycle() {
    checkCount++;
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Health Check #${checkCount}`);
    console.log('='.repeat(60));

    checkNetworkHealth();
}

// Initial check
console.log('Initializing health monitor...\n');
healthCheckCycle();

// Check every 30 seconds
setInterval(healthCheckCycle, 30000);

console.log('\n⚡ Health monitor running. Press Ctrl+C to stop.\n');

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\n👋 Health monitor shutting down...');
    console.log(`Total checks performed: ${checkCount}`);
    console.log(`Last health status: ${healthState.metrics.overallHealth}`);
    process.exit(0);
});
