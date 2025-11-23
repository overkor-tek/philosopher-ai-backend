#!/usr/bin/env node
/**
 * TRINITY CLOUD SYNC - COMPUTER B
 * Copy this file to Computer B's .trinity folder
 */

const fs = require('fs');
const path = require('path');

const COMPUTER_ID = 'B';
const LOCAL_TRINITY = path.join(__dirname);
const CLOUD_BASE = process.env.TRINITY_CLOUD_FOLDER || 'C:/Users/Darrick/Dropbox/TRINITY_NETWORK';

const CLOUD_THIS = path.join(CLOUD_BASE, `COMPUTER_${COMPUTER_ID}`);
const CLOUD_MASTER = path.join(CLOUD_BASE, 'MASTER');

console.log(`
╔════════════════════════════════════════════════════════════╗
║  🌐 TRINITY CLOUD SYNC - COMPUTER ${COMPUTER_ID}
║  Syncing with Computers A & C every 30 seconds
╚════════════════════════════════════════════════════════════╝
`);

// [Same code as Computer A, but with COMPUTER_ID = 'B']
// ... (copying the full sync logic)

function ensureCloudFolders() {
    [CLOUD_THIS, CLOUD_MASTER].forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`✅ Created: ${dir}`);
        }
    });
}

function uploadStatus() {
    const localStatus = {
        computer: COMPUTER_ID,
        timestamp: Date.now(),
        instances: {}
    };

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

    const cloudStatusFile = path.join(CLOUD_THIS, 'status.json');
    fs.writeFileSync(cloudStatusFile, JSON.stringify(localStatus, null, 2));

    return localStatus;
}

function checkWakeRequests() {
    const wakeFile = path.join(CLOUD_THIS, 'wake_requests.json');
    if (fs.existsSync(wakeFile)) {
        try {
            const requests = JSON.parse(fs.readFileSync(wakeFile, 'utf8'));
            if (requests.length > 0) {
                console.log(`\n🔔 ${requests.length} wake request(s) from other computers:`);
                requests.forEach(req => {
                    console.log(`   From Computer ${req.from} → Wake ${req.instance.toUpperCase()}`);
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
                fs.writeFileSync(wakeFile, JSON.stringify([], null, 2));
            }
        } catch (e) {
            console.error('Error processing wake requests:', e.message);
        }
    }
}

function checkMessages() {
    const msgFile = path.join(CLOUD_THIS, 'messages_inbound.json');
    if (fs.existsSync(msgFile)) {
        try {
            const messages = JSON.parse(fs.readFileSync(msgFile, 'utf8'));
            if (messages.length > 0) {
                console.log(`\n📬 ${messages.length} message(s) from other computers:`);
                messages.forEach(msg => {
                    console.log(`   From: ${msg.from} → To: ${msg.to}`);
                    const localInbox = path.join(LOCAL_TRINITY, 'MESSAGES', `${msg.to.toLowerCase()}_inbox.json`);
                    let inbox = [];
                    if (fs.existsSync(localInbox)) {
                        inbox = JSON.parse(fs.readFileSync(localInbox, 'utf8'));
                    }
                    inbox.push(msg);
                    fs.writeFileSync(localInbox, JSON.stringify(inbox, null, 2));
                    console.log(`   ✅ Added to ${msg.to} inbox`);
                });
                fs.writeFileSync(msgFile, JSON.stringify([], null, 2));
            }
        } catch (e) {
            console.error('Error processing messages:', e.message);
        }
    }
}

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
                fs.writeFileSync(outboundFile, JSON.stringify([], null, 2));
            }
        } catch (e) {
            console.error('Error uploading messages:', e.message);
        }
    }
}

function downloadOtherStatuses() {
    const statuses = {};
    ['A', 'C'].forEach(comp => {
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

let syncCount = 0;

function syncCycle() {
    syncCount++;
    console.log(`\n[${new Date().toLocaleTimeString()}] Sync #${syncCount}`);

    try {
        const ourStatus = uploadStatus();
        console.log(`✅ Uploaded status: ${Object.keys(ourStatus.instances).length} instances`);
        checkWakeRequests();
        checkMessages();
        uploadOutboundMessages();
        const otherStatuses = downloadOtherStatuses();

        console.log(`\n📊 Network Status:`);
        console.log(`   Computer B (this): ACTIVE`);
        ['A', 'C'].forEach(comp => {
            const status = otherStatuses[comp];
            if (status.status === 'not_connected') {
                console.log(`   Computer ${comp}: NOT CONNECTED`);
            } else if (status.error) {
                console.log(`   Computer ${comp}: ERROR`);
            } else {
                console.log(`   Computer ${comp}: ONLINE (${Math.floor(status.lastSeen)}s ago)`);
            }
        });
    } catch (error) {
        console.error('❌ Sync error:', error.message);
    }
}

console.log('Initializing cloud sync...');
ensureCloudFolders();
syncCycle();
setInterval(syncCycle, 30000);
console.log('\n⚡ Cloud sync running. Press Ctrl+C to stop.\n');
