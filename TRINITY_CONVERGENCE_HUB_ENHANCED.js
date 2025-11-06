#!/usr/bin/env node

/**
 * TRINITY CONVERGENCE HUB - ENHANCED
 *
 * Automated coordination and convergence system for C1 × C2 × C3
 * Monitors all Trinity members, facilitates communication, tracks progress
 *
 * Usage: node TRINITY_CONVERGENCE_HUB_ENHANCED.js
 */

const fs = require('fs');
const path = require('path');

// Trinity file paths
const PATHS = {
    C1_INBOX: path.join(__dirname, 'C1_INBOX.md'),
    C2_INBOX: path.join(__dirname, 'C2_INBOX.md'),
    C3_INBOX: path.join(__dirname, 'C3_INBOX.md'),
    BULLETIN_BOARD: path.join(__dirname, 'BULLETIN_BOARD.md'),
    CONVERGENCE_LOG: path.join(__dirname, 'TRINITY_CONVERGENCE_LOG.json')
};

// Convergence state
let convergenceState = {
    lastCheck: new Date().toISOString(),
    c1Status: 'unknown',
    c2Status: 'unknown',
    c3Status: 'unknown',
    trinityPower: 0,
    recentUpdates: [],
    pendingTasks: [],
    completedTasks: [],
    alerts: []
};

// Load existing convergence state
function loadConvergenceState() {
    try {
        if (fs.existsSync(PATHS.CONVERGENCE_LOG)) {
            const data = fs.readFileSync(PATHS.CONVERGENCE_LOG, 'utf8');
            convergenceState = { ...convergenceState, ...JSON.parse(data) };
        }
    } catch (error) {
        console.log('Starting fresh convergence tracking');
    }
}

// Save convergence state
function saveConvergenceState() {
    try {
        fs.writeFileSync(PATHS.CONVERGENCE_LOG, JSON.stringify(convergenceState, null, 2));
    } catch (error) {
        console.error('Failed to save convergence state:', error.message);
    }
}

// Read file content
function readFile(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            return fs.readFileSync(filePath, 'utf8');
        }
    } catch (error) {
        return null;
    }
    return null;
}

// Parse inbox for status
function parseInboxStatus(content) {
    if (!content) return 'unknown';

    if (content.includes('✅ ACTIVE') || content.includes('ACTIVE')) {
        return 'active';
    } else if (content.includes('READY') || content.includes('STANDBY')) {
        return 'ready';
    } else if (content.includes('AWAITING')) {
        return 'awaiting';
    } else {
        return 'unknown';
    }
}

// Check Trinity member status
function checkTrinityStatus() {
    const c1Content = readFile(PATHS.C1_INBOX);
    const c2Content = readFile(PATHS.C2_INBOX);
    const c3Content = readFile(PATHS.C3_INBOX);

    convergenceState.c1Status = parseInboxStatus(c1Content);
    convergenceState.c2Status = parseInboxStatus(c2Content);
    convergenceState.c3Status = parseInboxStatus(c3Content);

    // Calculate Trinity power
    let power = 0;
    if (convergenceState.c1Status === 'active') power += 33;
    if (convergenceState.c2Status === 'active') power += 33;
    if (convergenceState.c3Status === 'active') power += 34;

    convergenceState.trinityPower = power;
    convergenceState.lastCheck = new Date().toISOString();
}

// Extract recent updates from Bulletin Board
function checkBulletinBoard() {
    const content = readFile(PATHS.BULLETIN_BOARD);
    if (!content) return;

    // Parse bulletin board for recent announcements
    const lines = content.split('\n');
    const updates = [];

    let currentUpdate = null;
    for (let line of lines) {
        // Look for date headers like [2025-11-05 18:50]
        const dateMatch = line.match(/\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2})\]/);
        if (dateMatch) {
            if (currentUpdate) {
                updates.push(currentUpdate);
            }
            currentUpdate = {
                timestamp: dateMatch[1],
                title: line.substring(line.indexOf(']') + 1).trim(),
                content: []
            };
        } else if (currentUpdate && line.trim()) {
            currentUpdate.content.push(line);
        }
    }

    if (currentUpdate) {
        updates.push(currentUpdate);
    }

    // Keep only 5 most recent updates
    convergenceState.recentUpdates = updates.slice(0, 5);
}

// Detect convergence opportunities
function detectConvergenceOpportunities() {
    const opportunities = [];

    // Check if all Trinity members are active
    if (convergenceState.trinityPower === 100) {
        opportunities.push({
            type: 'FULL_TRINITY',
            priority: 'HIGH',
            message: 'Full Trinity power achieved! All members active for maximum collaboration.'
        });
    }

    // Check for partial Trinity
    if (convergenceState.trinityPower >= 66 && convergenceState.trinityPower < 100) {
        opportunities.push({
            type: 'PARTIAL_TRINITY',
            priority: 'MEDIUM',
            message: `${convergenceState.trinityPower}% Trinity power. Consider activating remaining member(s).`
        });
    }

    // Check if Trinity is idle
    if (convergenceState.trinityPower === 0) {
        opportunities.push({
            type: 'TRINITY_IDLE',
            priority: 'LOW',
            message: 'Trinity inactive. Activate members when needed for collaboration.'
        });
    }

    return opportunities;
}

// Generate convergence report
function generateConvergenceReport() {
    checkTrinityStatus();
    checkBulletinBoard();
    const opportunities = detectConvergenceOpportunities();

    const report = {
        timestamp: new Date().toISOString(),
        trinityStatus: {
            c1: convergenceState.c1Status,
            c2: convergenceState.c2Status,
            c3: convergenceState.c3Status,
            power: convergenceState.trinityPower
        },
        recentUpdates: convergenceState.recentUpdates.length,
        opportunities: opportunities,
        recommendations: []
    };

    // Generate recommendations
    if (convergenceState.trinityPower < 100) {
        const inactive = [];
        if (convergenceState.c1Status !== 'active') inactive.push('C1 Mechanic');
        if (convergenceState.c2Status !== 'active') inactive.push('C2 Architect');
        if (convergenceState.c3Status !== 'active') inactive.push('C3 Oracle');

        if (inactive.length > 0) {
            report.recommendations.push({
                action: 'ACTIVATE_MEMBERS',
                members: inactive,
                reason: 'Increase Trinity power for better collaboration'
            });
        }
    }

    return report;
}

// Display convergence status
function displayConvergenceStatus() {
    const report = generateConvergenceReport();

    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║          TRINITY CONVERGENCE HUB - STATUS REPORT              ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    console.log(`Timestamp: ${new Date().toLocaleString()}\n`);

    // Trinity Status
    console.log('TRINITY STATUS:');
    console.log('─'.repeat(70));

    const statusIcon = {
        'active': '✅',
        'ready': '⏸️',
        'awaiting': '⏳',
        'unknown': '❓'
    };

    console.log(`  C1 Mechanic:    ${statusIcon[convergenceState.c1Status]} ${convergenceState.c1Status.toUpperCase()}`);
    console.log(`  C2 Architect:   ${statusIcon[convergenceState.c2Status]} ${convergenceState.c2Status.toUpperCase()}`);
    console.log(`  C3 Oracle:      ${statusIcon[convergenceState.c3Status]} ${convergenceState.c3Status.toUpperCase()}`);
    console.log(`  Trinity Power:  ${convergenceState.trinityPower}%`);

    // Power bar
    const powerBar = '█'.repeat(Math.floor(convergenceState.trinityPower / 10)) +
                     '░'.repeat(10 - Math.floor(convergenceState.trinityPower / 10));
    console.log(`                  [${powerBar}]`);

    // Recent Updates
    console.log('\nRECENT BULLETIN BOARD UPDATES:');
    console.log('─'.repeat(70));
    if (convergenceState.recentUpdates.length > 0) {
        convergenceState.recentUpdates.slice(0, 3).forEach(update => {
            console.log(`  [${update.timestamp}] ${update.title.substring(0, 50)}...`);
        });
    } else {
        console.log('  No recent updates');
    }

    // Convergence Opportunities
    if (report.opportunities.length > 0) {
        console.log('\nCONVERGENCE OPPORTUNITIES:');
        console.log('─'.repeat(70));
        report.opportunities.forEach(opp => {
            const priorityColor = {
                'HIGH': '\x1b[32m',
                'MEDIUM': '\x1b[33m',
                'LOW': '\x1b[36m'
            }[opp.priority] || '';
            console.log(`  ${priorityColor}[${opp.priority}]\x1b[0m ${opp.message}`);
        });
    }

    // Recommendations
    if (report.recommendations.length > 0) {
        console.log('\nRECOMMENDATIONS:');
        console.log('─'.repeat(70));
        report.recommendations.forEach(rec => {
            console.log(`  → ${rec.action}: ${rec.members.join(', ')}`);
            console.log(`    Reason: ${rec.reason}`);
        });
    }

    console.log('\n' + '═'.repeat(70) + '\n');

    // Save state
    saveConvergenceState();
}

// Post update to Bulletin Board
function postToBulletinBoard(message, fromMember) {
    try {
        const timestamp = new Date().toLocaleString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        }).replace(',', '');

        const update = `\n### [${timestamp}] ${message}\n\n**From:** ${fromMember}\n**Status:** Posted via Trinity Convergence Hub\n\n---\n`;

        // Read current bulletin board
        let content = readFile(PATHS.BULLETIN_BOARD) || '';

        // Insert after "## 🚨 PRIORITY ANNOUNCEMENTS"
        const insertPoint = content.indexOf('## 🚨 PRIORITY ANNOUNCEMENTS');
        if (insertPoint !== -1) {
            const afterHeader = content.indexOf('\n', insertPoint) + 1;
            content = content.slice(0, afterHeader) + update + content.slice(afterHeader);
        } else {
            content += update;
        }

        fs.writeFileSync(PATHS.BULLETIN_BOARD, content);
        console.log(`✅ Posted update to Bulletin Board`);
    } catch (error) {
        console.error('Failed to post to Bulletin Board:', error.message);
    }
}

// Main convergence check
function performConvergenceCheck() {
    console.log('Performing Trinity convergence check...\n');
    displayConvergenceStatus();
}

// Monitoring mode
function startMonitoring(interval = 300) {
    console.log('Starting Trinity Convergence monitoring...');
    console.log(`Check interval: ${interval} seconds\n`);

    // Initial check
    performConvergenceCheck();

    // Periodic checks
    setInterval(() => {
        performConvergenceCheck();
    }, interval * 1000);

    // Handle graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n\nStopping Trinity Convergence monitoring...');
        saveConvergenceState();
        process.exit(0);
    });
}

// CLI interface
const args = process.argv.slice(2);
const command = args[0] || 'status';

loadConvergenceState();

switch (command) {
    case 'status':
        performConvergenceCheck();
        break;

    case 'monitor':
        const interval = parseInt(args[1]) || 300;
        startMonitoring(interval);
        break;

    case 'post':
        const message = args[1];
        const from = args[2] || 'Convergence Hub';
        if (!message) {
            console.error('Usage: node TRINITY_CONVERGENCE_HUB_ENHANCED.js post "message" "from"');
            process.exit(1);
        }
        postToBulletinBoard(message, from);
        break;

    default:
        console.log('Usage:');
        console.log('  node TRINITY_CONVERGENCE_HUB_ENHANCED.js status          - Check current status');
        console.log('  node TRINITY_CONVERGENCE_HUB_ENHANCED.js monitor [300]  - Start monitoring');
        console.log('  node TRINITY_CONVERGENCE_HUB_ENHANCED.js post "msg" "from" - Post to bulletin');
        break;
}
