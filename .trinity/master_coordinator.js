#!/usr/bin/env node
/**
 * TRINITY MASTER COORDINATOR
 * Consolidates all 3 computers into one view
 * Generates Commander summary
 */

const fs = require('fs');
const path = require('path');

const CLOUD_BASE = process.env.TRINITY_CLOUD_FOLDER || 'C:/Users/Darrick/Dropbox/TRINITY_NETWORK';
const MASTER_DIR = path.join(CLOUD_BASE, 'MASTER');

console.log(`
╔════════════════════════════════════════════════════════════╗
║  ⚡ TRINITY MASTER COORDINATOR ⚡
║  Consolidating 9 instances across 3 computers
╚════════════════════════════════════════════════════════════╝
`);

// Ensure master folder exists
if (!fs.existsSync(MASTER_DIR)) {
    fs.mkdirSync(MASTER_DIR, { recursive: true});
}

function readComputerStatus(computer) {
    const statusFile = path.join(CLOUD_BASE, `COMPUTER_${computer}`, 'status.json');

    if (fs.existsSync(statusFile)) {
        try {
            const stats = fs.statSync(statusFile);
            const ageSeconds = (Date.now() - stats.mtimeMs) / 1000;
            const status = JSON.parse(fs.readFileSync(statusFile, 'utf8'));

            return {
                ...status,
                lastSeen: ageSeconds,
                connected: ageSeconds < 120 // Connected if seen in last 2 minutes
            };
        } catch (e) {
            return { computer, error: e.message, connected: false };
        }
    }

    return { computer, status: 'not_connected', connected: false };
}

function consolidateAll() {
    const computers = ['A', 'B', 'C'].map(readComputerStatus);

    const consolidated = {
        timestamp: Date.now(),
        computers: {
            A: computers[0],
            B: computers[1],
            C: computers[2]
        },
        network: {
            totalInstances: 9,
            activeInstances: 0,
            connectedComputers: computers.filter(c => c.connected).length,
            disconnectedComputers: computers.filter(c => !c.connected).map(c => c.computer)
        },
        instances: {},
        recentActivity: []
    };

    // Count active instances
    computers.forEach(comp => {
        if (comp.instances) {
            Object.entries(comp.instances).forEach(([instance, data]) => {
                const key = `${comp.computer}-${instance.toUpperCase()}`;
                consolidated.instances[key] = data;

                if (data.status === 'active') {
                    consolidated.network.activeInstances++;
                }

                // Track recent activity
                if (data.lastActivity) {
                    consolidated.recentActivity.push({
                        instance: key,
                        activity: data.lastActivity,
                        timestamp: data.timestamp || Date.now()
                    });
                }
            });
        }
    });

    // Sort recent activity by timestamp
    consolidated.recentActivity.sort((a, b) => b.timestamp - a.timestamp);
    consolidated.recentActivity = consolidated.recentActivity.slice(0, 10); // Keep last 10

    return consolidated;
}

function generateCommanderSummary(consolidated) {
    const summary = {
        timestamp: Date.now(),
        headline: `${consolidated.network.activeInstances}/9 instances active across ${consolidated.network.connectedComputers}/3 computers`,
        computers: {},
        recentActivity: consolidated.recentActivity.slice(0, 5),
        nextActions: [],
        alerts: []
    };

    // Summarize each computer
    ['A', 'B', 'C'].forEach(comp => {
        const compData = consolidated.computers[comp];

        if (compData.connected) {
            const instances = compData.instances || {};
            const activeCount = Object.values(instances).filter(i => i.status === 'active').length;

            summary.computers[comp] = {
                status: 'ONLINE',
                activeInstances: `${activeCount}/3`,
                lastSeen: `${Math.floor(compData.lastSeen)}s ago`,
                details: Object.entries(instances).map(([inst, data]) => ({
                    instance: inst.toUpperCase(),
                    status: data.status || 'unknown',
                    task: data.currentTask || 'idle'
                }))
            };
        } else {
            summary.computers[comp] = {
                status: 'OFFLINE',
                message: 'Not connected to cloud network'
            };

            summary.alerts.push(`Computer ${comp} is offline`);
        }
    });

    // Generate next actions
    if (consolidated.network.connectedComputers === 3) {
        summary.nextActions.push('All computers connected - full Trinity network operational');
    } else {
        summary.nextActions.push(`Connect ${3 - consolidated.network.connectedComputers} more computer(s)`);
    }

    if (consolidated.network.activeInstances < 9) {
        summary.nextActions.push(`Wake ${9 - consolidated.network.activeInstances} more instance(s)`);
    }

    return summary;
}

function displayConsolidated(consolidated, summary) {
    console.log(`\n╔════════════════════════════════════════════════════════════╗`);
    console.log(`║  📊 TRINITY NETWORK STATUS`);
    console.log(`╚════════════════════════════════════════════════════════════╝\n`);

    console.log(`⚡ Network Overview:`);
    console.log(`   Total Instances: ${consolidated.network.totalInstances}`);
    console.log(`   Active Instances: ${consolidated.network.activeInstances}`);
    console.log(`   Connected Computers: ${consolidated.network.connectedComputers}/3\n`);

    console.log(`🖥️  Computer Status:`);
    ['A', 'B', 'C'].forEach(comp => {
        const compData = consolidated.computers[comp];
        if (compData.connected) {
            const activeCount = Object.values(compData.instances || {}).filter(i => i.status === 'active').length;
            console.log(`   Computer ${comp}: ✅ ONLINE (${activeCount}/3 active, ${Math.floor(compData.lastSeen)}s ago)`);
        } else {
            console.log(`   Computer ${comp}: ⭕ OFFLINE (${compData.status || 'not connected'})`);
        }
    });

    console.log(`\n📋 Commander Summary:`);
    console.log(`   ${summary.headline}`);

    if (summary.alerts.length > 0) {
        console.log(`\n⚠️  Alerts:`);
        summary.alerts.forEach(alert => console.log(`   - ${alert}`));
    }

    if (summary.nextActions.length > 0) {
        console.log(`\n🎯 Next Actions:`);
        summary.nextActions.forEach(action => console.log(`   - ${action}`));
    }

    if (consolidated.recentActivity.length > 0) {
        console.log(`\n🕐 Recent Activity:`);
        consolidated.recentActivity.slice(0, 5).forEach(activity => {
            const timeAgo = Math.floor((Date.now() - activity.timestamp) / 1000);
            console.log(`   ${activity.instance}: ${activity.activity} (${timeAgo}s ago)`);
        });
    }

    console.log('');
}

let coordinationCount = 0;

function coordinateCycle() {
    coordinationCount++;
    console.log(`[${new Date().toLocaleTimeString()}] Coordination #${coordinationCount}`);

    try {
        // Consolidate all computers
        const consolidated = consolidateAll();

        // Generate Commander summary
        const summary = generateCommanderSummary(consolidated);

        // Save consolidated view
        fs.writeFileSync(
            path.join(MASTER_DIR, 'consolidated_status.json'),
            JSON.stringify(consolidated, null, 2)
        );

        // Save Commander summary
        fs.writeFileSync(
            path.join(MASTER_DIR, 'commander_inbox.json'),
            JSON.stringify(summary, null, 2)
        );

        // Save phone-optimized view
        const phoneView = {
            timestamp: Date.now(),
            summary: summary.headline,
            computers: summary.computers,
            recentActivity: summary.recentActivity,
            nextActions: summary.nextActions
        };

        fs.writeFileSync(
            path.join(MASTER_DIR, 'phone_view.json'),
            JSON.stringify(phoneView, null, 2)
        );

        // Display
        displayConsolidated(consolidated, summary);

        console.log(`✅ Consolidated status saved to: ${MASTER_DIR}`);

    } catch (error) {
        console.error('❌ Coordination error:', error.message);
    }
}

console.log('Initializing master coordinator...\n');

// Initial coordination
coordinateCycle();

// Coordinate every 30 seconds
setInterval(coordinateCycle, 30000);

console.log('⚡ Master coordinator running. Press Ctrl+C to stop.\n');
