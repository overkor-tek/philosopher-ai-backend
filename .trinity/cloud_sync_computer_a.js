#!/usr/bin/env node
/**
 * TRINITY CLOUD SYNC - COMPUTER A
 * Syncs with Computers B & C via cloud folder
 */

const fs = require('fs');
const path = require('path');

// CONFIGURATION
const COMPUTER_ID = 'A';
const LOCAL_TRINITY = path.join(__dirname);
const CLOUD_BASE = process.env.TRINITY_CLOUD_FOLDER || 'C:/Users/Darrick/Dropbox/TRINITY_NETWORK';

const CLOUD_THIS = path.join(CLOUD_BASE, `COMPUTER_${COMPUTER_ID}`);
const CLOUD_MASTER = path.join(CLOUD_BASE, 'MASTER');

console.log(`
╔════════════════════════════════════════════════════════════╗
║  🌐 TRINITY CLOUD SYNC - COMPUTER ${COMPUTER_ID}
║  Syncing with Computers B & C every 30 seconds
╚════════════════════════════════════════════════════════════╝
`);

// Ensure cloud folders exist
function ensureCloudFolders() {
    [CLOUD_THIS, CLOUD_MASTER].forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`✅ Created: ${dir}`);
        }
    });

    // Create computer folders for B & C if they don't exist
    ['B', 'C'].forEach(comp => {
        const dir = path.join(CLOUD_BASE, `COMPUTER_${comp}`);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });
}

// Upload our status to cloud
function uploadStatus() {
    const localStatus = {
        computer: COMPUTER_ID,
        timestamp: Date.now(),
        instances: {}
    };

    // Read local instance statuses
    ['c1', 'c2', 'c3'].forEach(instance => {
        const statusFile = path.join(LOCAL_TRINITY, 'STATUS', `${instance}_status.json`);
        if (fs.existsSync(statusFile)) {
            try {
                localStatus.instances[instance] = JSON.parse(fs.readFileSync(statusFile, 'utf8'));
            } catch (e) {
                localStatus.instances[instance] = { status: 'unknown', error: e.message };
            }
        } else {
            localStatus.instances[instance] = { status: 'not_active' };
        }
    });

    // Write to cloud
    const cloudStatusFile = path.join(CLOUD_THIS, 'status.json');
    fs.writeFileSync(cloudStatusFile, JSON.stringify(localStatus, null, 2));

    return localStatus;
}

// Check for wake requests from other computers
function checkWakeRequests() {
    const wakeFile = path.join(CLOUD_THIS, 'wake_requests.json');

    if (fs.existsSync(wakeFile)) {
        try {
            const requests = JSON.parse(fs.readFileSync(wakeFile, 'utf8'));

            if (requests.length > 0) {
                console.log(`\n🔔 ${requests.length} wake request(s) from other computers:`);

                requests.forEach(req => {
                    console.log(`   From Computer ${req.from} → Wake ${req.instance.toUpperCase()}`);
                    console.log(`   Reason: ${req.reason}`);

                    // Create local wake flag
                    const localWakeFile = path.join(LOCAL_TRINITY, 'WAKE_REQUESTS', `wake_${req.instance}.flag`);
                    fs.writeFileSync(localWakeFile, JSON.stringify({
                        from: `Computer ${req.from} (Cloud Sync)`,
                        timestamp: Date.now(),
                        reason: req.reason,
                        priority: req.priority || 'MEDIUM',
                        context: { crossComputer: true, sourceComputer: req.from }
                    }, null, 2));

                    console.log(`   ✅ Created local wake flag for ${req.instance.toUpperCase()}`);
                });

                // Clear processed requests
                fs.writeFileSync(wakeFile, JSON.stringify([], null, 2));
            }
        } catch (e) {
            console.error('Error processing wake requests:', e.message);
        }
    }
}

// Check messages from other computers
function checkMessages() {
    const msgFile = path.join(CLOUD_THIS, 'messages_inbound.json');

    if (fs.existsSync(msgFile)) {
        try {
            const messages = JSON.parse(fs.readFileSync(msgFile, 'utf8'));

            if (messages.length > 0) {
                console.log(`\n📬 ${messages.length} message(s) from other computers:`);

                messages.forEach(msg => {
                    console.log(`   From: ${msg.from} → To: ${msg.to}`);
                    console.log(`   Subject: ${msg.subject}`);

                    // Add to local inbox
                    const localInbox = path.join(LOCAL_TRINITY, 'MESSAGES', `${msg.to.toLowerCase()}_inbox.json`);
                    let inbox = [];
                    if (fs.existsSync(localInbox)) {
                        inbox = JSON.parse(fs.readFileSync(localInbox, 'utf8'));
                    }
                    inbox.push(msg);
                    fs.writeFileSync(localInbox, JSON.stringify(inbox, null, 2));

                    console.log(`   ✅ Added to ${msg.to} inbox`);
                });

                // Clear processed messages
                fs.writeFileSync(msgFile, JSON.stringify([], null, 2));
            }
        } catch (e) {
            console.error('Error processing messages:', e.message);
        }
    }
}

// Send outbound messages to cloud
function uploadOutboundMessages() {
    const outboundFile = path.join(LOCAL_TRINITY, 'MESSAGES', 'outbound_queue.json');

    if (fs.existsSync(outboundFile)) {
        try {
            const outbound = JSON.parse(fs.readFileSync(outboundFile, 'utf8'));

            if (outbound.length > 0) {
                outbound.forEach(msg => {
                    const targetComputer = msg.targetComputer;
                    const targetFile = path.join(CLOUD_BASE, `COMPUTER_${targetComputer}`, 'messages_inbound.json');

                    let messages = [];
                    if (fs.existsSync(targetFile)) {
                        messages = JSON.parse(fs.readFileSync(targetFile, 'utf8'));
                    }
                    messages.push(msg);
                    fs.writeFileSync(targetFile, JSON.stringify(messages, null, 2));

                    console.log(`📤 Sent message to Computer ${targetComputer}`);
                });

                // Clear queue
                fs.writeFileSync(outboundFile, JSON.stringify([], null, 2));
            }
        } catch (e) {
            console.error('Error uploading messages:', e.message);
        }
    }
}

// Download status from other computers
function downloadOtherStatuses() {
    const statuses = {};

    ['B', 'C'].forEach(comp => {
        const statusFile = path.join(CLOUD_BASE, `COMPUTER_${comp}`, 'status.json');
        if (fs.existsSync(statusFile)) {
            try {
                const stats = fs.statSync(statusFile);
                const ageSeconds = (Date.now() - stats.mtimeMs) / 1000;

                statuses[comp] = {
                    ...JSON.parse(fs.readFileSync(statusFile, 'utf8')),
                    lastSeen: ageSeconds
                };
            } catch (e) {
                statuses[comp] = { error: e.message };
            }
        } else {
            statuses[comp] = { status: 'not_connected' };
        }
    });

    return statuses;
}

// Main sync loop
let syncCount = 0;

function syncCycle() {
    syncCount++;
    console.log(`\n[${new Date().toLocaleTimeString()}] Sync #${syncCount}`);

    try {
        // Upload our status
        const ourStatus = uploadStatus();
        console.log(`✅ Uploaded status: ${Object.keys(ourStatus.instances).length} instances`);

        // Check for wake requests
        checkWakeRequests();

        // Check for messages
        checkMessages();

        // Upload outbound messages
        uploadOutboundMessages();

        // Download other computer statuses
        const otherStatuses = downloadOtherStatuses();

        console.log(`\n📊 Network Status:`);
        console.log(`   Computer A (this): ACTIVE`);
        ['B', 'C'].forEach(comp => {
            const status = otherStatuses[comp];
            if (status.status === 'not_connected') {
                console.log(`   Computer ${comp}: NOT CONNECTED (no status file)`);
            } else if (status.error) {
                console.log(`   Computer ${comp}: ERROR (${status.error})`);
            } else {
                console.log(`   Computer ${comp}: ONLINE (last seen ${Math.floor(status.lastSeen)}s ago)`);
            }
        });

    } catch (error) {
        console.error('❌ Sync error:', error.message);
    }
}

// Initialize
console.log('Initializing cloud sync...');
ensureCloudFolders();

// Initial sync
syncCycle();

// Sync every 30 seconds
setInterval(syncCycle, 30000);

console.log('\n⚡ Cloud sync running. Press Ctrl+C to stop.\n');
