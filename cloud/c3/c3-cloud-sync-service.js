#!/usr/bin/env node
/**
 * CP3 C3 CLOUD SYNC SERVICE
 * Trinity Network - Operations Hub Cloud Instance
 *
 * This service manages cloud synchronization for the C3 Oracle instance,
 * enabling cross-computer communication in the Trinity network (C1 x C2 x C3 = Infinity)
 */

require('dotenv').config({ path: '.env.cloud' });
const fs = require('fs');
const path = require('path');
const http = require('http');

// Configuration
const CONFIG = {
    computerId: process.env.TRINITY_COMPUTER_ID || 'C',
    instanceType: process.env.TRINITY_INSTANCE_TYPE || 'cloud',
    role: process.env.TRINITY_ROLE || 'C3_ORACLE',
    port: parseInt(process.env.PORT) || 3001,
    syncInterval: parseInt(process.env.CLOUD_SYNC_INTERVAL) || 30000,
    heartbeatInterval: parseInt(process.env.HEARTBEAT_INTERVAL) || 15000,
    cloudFolder: process.env.TRINITY_CLOUD_FOLDER || path.join(__dirname, '../../.trinity'),
    localTrinity: path.join(__dirname, '../../.trinity'),
    logLevel: process.env.LOG_LEVEL || 'info'
};

// State
const state = {
    syncCount: 0,
    lastSync: null,
    isOnline: true,
    connectedComputers: { A: false, B: false },
    messagesProcessed: 0,
    errors: []
};

// Logging
function log(level, message, data = {}) {
    const levels = ['debug', 'info', 'warn', 'error'];
    if (levels.indexOf(level) >= levels.indexOf(CONFIG.logLevel)) {
        const timestamp = new Date().toISOString();
        console.log(JSON.stringify({
            timestamp,
            level,
            computer: CONFIG.computerId,
            role: CONFIG.role,
            message,
            ...data
        }));
    }
}

// Banner
function printBanner() {
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║  🌐 CP3 C3 CLOUD SYNC SERVICE                                  ║
║  Trinity Network - Operations Hub                              ║
╠════════════════════════════════════════════════════════════════╣
║  Computer ID: ${CONFIG.computerId.padEnd(45)}║
║  Role: ${CONFIG.role.padEnd(52)}║
║  Instance: ${CONFIG.instanceType.padEnd(48)}║
║  Port: ${String(CONFIG.port).padEnd(52)}║
║  Sync Interval: ${String(CONFIG.syncInterval / 1000) + 's'.padEnd(43)}║
╠════════════════════════════════════════════════════════════════╣
║  C1 x C2 x C3 = ∞   |   Trinity Formula Active                 ║
╚════════════════════════════════════════════════════════════════╝
`);
}

// Ensure directories exist
function ensureDirectories() {
    const dirs = [
        path.join(CONFIG.localTrinity, 'STATUS'),
        path.join(CONFIG.localTrinity, 'MESSAGES'),
        path.join(CONFIG.localTrinity, 'WAKE_REQUESTS'),
        path.join(CONFIG.localTrinity, 'logs'),
        path.join(CONFIG.cloudFolder, `COMPUTER_${CONFIG.computerId}`)
    ];

    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            try {
                fs.mkdirSync(dir, { recursive: true });
                log('info', `Created directory: ${dir}`);
            } catch (err) {
                log('error', `Failed to create directory: ${dir}`, { error: err.message });
            }
        }
    });
}

// Upload C3 status to cloud
function uploadStatus() {
    const statusData = {
        computer: CONFIG.computerId,
        role: CONFIG.role,
        instanceType: CONFIG.instanceType,
        timestamp: Date.now(),
        isOnline: state.isOnline,
        syncCount: state.syncCount,
        lastSync: state.lastSync,
        messagesProcessed: state.messagesProcessed,
        instances: {}
    };

    // Read local instance statuses
    ['c1', 'c2', 'c3'].forEach(instance => {
        const statusFile = path.join(CONFIG.localTrinity, 'STATUS', `${instance}_status.json`);
        if (fs.existsSync(statusFile)) {
            try {
                statusData.instances[instance] = JSON.parse(fs.readFileSync(statusFile, 'utf8'));
            } catch (err) {
                statusData.instances[instance] = { status: 'error', error: err.message };
            }
        } else {
            statusData.instances[instance] = { status: 'not_active' };
        }
    });

    // Write to cloud folder
    const cloudStatusFile = path.join(CONFIG.cloudFolder, `COMPUTER_${CONFIG.computerId}`, 'status.json');
    try {
        fs.writeFileSync(cloudStatusFile, JSON.stringify(statusData, null, 2));
        log('debug', 'Status uploaded to cloud', { instances: Object.keys(statusData.instances) });
    } catch (err) {
        log('error', 'Failed to upload status', { error: err.message });
    }

    return statusData;
}

// Check for wake requests from other computers
function checkWakeRequests() {
    const wakeFile = path.join(CONFIG.cloudFolder, `COMPUTER_${CONFIG.computerId}`, 'wake_requests.json');

    if (fs.existsSync(wakeFile)) {
        try {
            const requests = JSON.parse(fs.readFileSync(wakeFile, 'utf8'));

            if (Array.isArray(requests) && requests.length > 0) {
                log('info', `Processing ${requests.length} wake request(s)`);

                requests.forEach(req => {
                    const localWakeFile = path.join(
                        CONFIG.localTrinity,
                        'WAKE_REQUESTS',
                        `wake_${req.instance || 'c3'}.flag`
                    );

                    fs.writeFileSync(localWakeFile, JSON.stringify({
                        from: `Computer ${req.from} (Cloud Sync)`,
                        timestamp: Date.now(),
                        reason: req.reason || 'Cross-computer wake request',
                        priority: req.priority || 'MEDIUM',
                        context: { crossComputer: true, sourceComputer: req.from }
                    }, null, 2));

                    log('info', `Wake flag created for ${req.instance || 'c3'}`, { from: req.from });
                });

                // Clear processed requests
                fs.writeFileSync(wakeFile, JSON.stringify([], null, 2));
            }
        } catch (err) {
            log('error', 'Error processing wake requests', { error: err.message });
        }
    }
}

// Process inbound messages from other computers
function processInboundMessages() {
    const msgFile = path.join(CONFIG.cloudFolder, `COMPUTER_${CONFIG.computerId}`, 'messages_inbound.json');

    if (fs.existsSync(msgFile)) {
        try {
            const messages = JSON.parse(fs.readFileSync(msgFile, 'utf8'));

            if (Array.isArray(messages) && messages.length > 0) {
                log('info', `Processing ${messages.length} inbound message(s)`);

                messages.forEach(msg => {
                    const target = msg.to || 'c3';
                    const inboxFile = path.join(CONFIG.localTrinity, 'MESSAGES', `${target.toLowerCase()}_inbox.json`);

                    let inbox = [];
                    if (fs.existsSync(inboxFile)) {
                        try {
                            inbox = JSON.parse(fs.readFileSync(inboxFile, 'utf8'));
                        } catch (e) {
                            inbox = [];
                        }
                    }

                    inbox.push({
                        ...msg,
                        receivedAt: Date.now(),
                        processedBy: 'c3_cloud_sync'
                    });

                    fs.writeFileSync(inboxFile, JSON.stringify(inbox, null, 2));
                    state.messagesProcessed++;

                    log('info', `Message delivered to ${target}`, { from: msg.from });
                });

                // Clear processed messages
                fs.writeFileSync(msgFile, JSON.stringify([], null, 2));
            }
        } catch (err) {
            log('error', 'Error processing messages', { error: err.message });
        }
    }
}

// Upload outbound messages to target computers
function uploadOutboundMessages() {
    const outboundFile = path.join(CONFIG.localTrinity, 'MESSAGES', 'outbound_queue.json');

    if (fs.existsSync(outboundFile)) {
        try {
            const outbound = JSON.parse(fs.readFileSync(outboundFile, 'utf8'));

            if (Array.isArray(outbound) && outbound.length > 0) {
                outbound.forEach(msg => {
                    const targetComputer = msg.targetComputer || 'A';
                    const targetFile = path.join(
                        CONFIG.cloudFolder,
                        `COMPUTER_${targetComputer}`,
                        'messages_inbound.json'
                    );

                    let targetMessages = [];
                    if (fs.existsSync(targetFile)) {
                        try {
                            targetMessages = JSON.parse(fs.readFileSync(targetFile, 'utf8'));
                        } catch (e) {
                            targetMessages = [];
                        }
                    }

                    targetMessages.push({
                        ...msg,
                        sentAt: Date.now(),
                        sentBy: `Computer ${CONFIG.computerId}`
                    });

                    fs.writeFileSync(targetFile, JSON.stringify(targetMessages, null, 2));
                    log('info', `Message sent to Computer ${targetComputer}`);
                });

                // Clear outbound queue
                fs.writeFileSync(outboundFile, JSON.stringify([], null, 2));
            }
        } catch (err) {
            log('error', 'Error uploading messages', { error: err.message });
        }
    }
}

// Check status of other computers
function checkOtherComputers() {
    ['A', 'B'].forEach(comp => {
        const statusFile = path.join(CONFIG.cloudFolder, `COMPUTER_${comp}`, 'status.json');

        if (fs.existsSync(statusFile)) {
            try {
                const stats = fs.statSync(statusFile);
                const ageSeconds = (Date.now() - stats.mtimeMs) / 1000;

                // Consider online if updated within last 2 minutes
                state.connectedComputers[comp] = ageSeconds < 120;

                if (state.connectedComputers[comp]) {
                    log('debug', `Computer ${comp} is online`, { lastSeen: `${Math.floor(ageSeconds)}s ago` });
                }
            } catch (err) {
                state.connectedComputers[comp] = false;
            }
        } else {
            state.connectedComputers[comp] = false;
        }
    });
}

// Main sync cycle
function syncCycle() {
    state.syncCount++;
    state.lastSync = new Date().toISOString();

    log('info', `Sync cycle #${state.syncCount} started`);

    try {
        uploadStatus();
        checkWakeRequests();
        processInboundMessages();
        uploadOutboundMessages();
        checkOtherComputers();

        // Log network status
        const networkStatus = {
            'Computer C (this)': 'ACTIVE',
            'Computer A': state.connectedComputers.A ? 'ONLINE' : 'OFFLINE',
            'Computer B': state.connectedComputers.B ? 'ONLINE' : 'OFFLINE'
        };

        log('info', 'Sync cycle complete', {
            network: networkStatus,
            messagesProcessed: state.messagesProcessed
        });

    } catch (err) {
        log('error', 'Sync cycle failed', { error: err.message });
        state.errors.push({ time: Date.now(), error: err.message });
    }
}

// Health check endpoint
function createHealthServer() {
    const server = http.createServer((req, res) => {
        if (req.url === '/health' || req.url === '/api/health') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: 'healthy',
                computer: CONFIG.computerId,
                role: CONFIG.role,
                syncCount: state.syncCount,
                lastSync: state.lastSync,
                connectedComputers: state.connectedComputers,
                uptime: process.uptime()
            }));
        } else if (req.url === '/api/trinity/status') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                trinity: 'C1 x C2 x C3 = Infinity',
                computers: {
                    A: state.connectedComputers.A ? 'online' : 'offline',
                    B: state.connectedComputers.B ? 'online' : 'offline',
                    C: 'online (this instance)'
                },
                state: state
            }));
        } else {
            res.writeHead(404);
            res.end('Not found');
        }
    });

    server.listen(CONFIG.port, () => {
        log('info', `Health server listening on port ${CONFIG.port}`);
    });

    return server;
}

// Heartbeat
function startHeartbeat() {
    setInterval(() => {
        const heartbeat = {
            computer: CONFIG.computerId,
            role: CONFIG.role,
            timestamp: Date.now(),
            isOnline: true,
            syncCount: state.syncCount
        };

        const heartbeatFile = path.join(CONFIG.localTrinity, 'STATUS', 'c3_cloud_heartbeat.json');
        fs.writeFileSync(heartbeatFile, JSON.stringify(heartbeat, null, 2));

        log('debug', 'Heartbeat sent');
    }, CONFIG.heartbeatInterval);
}

// Graceful shutdown
function setupShutdown() {
    const shutdown = (signal) => {
        log('info', `Received ${signal}, shutting down gracefully...`);

        // Update status to offline
        const offlineStatus = {
            computer: CONFIG.computerId,
            role: CONFIG.role,
            timestamp: Date.now(),
            isOnline: false,
            shutdownReason: signal
        };

        const statusFile = path.join(CONFIG.cloudFolder, `COMPUTER_${CONFIG.computerId}`, 'status.json');
        try {
            fs.writeFileSync(statusFile, JSON.stringify(offlineStatus, null, 2));
        } catch (err) {
            // Ignore errors during shutdown
        }

        process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
}

// Main entry point
async function main() {
    printBanner();

    log('info', 'Initializing C3 Cloud Sync Service...');

    ensureDirectories();
    setupShutdown();

    // Initial sync
    syncCycle();

    // Start periodic sync
    setInterval(syncCycle, CONFIG.syncInterval);

    // Start heartbeat
    startHeartbeat();

    // Start health server
    createHealthServer();

    log('info', 'C3 Cloud Sync Service started successfully');
    log('info', `Syncing every ${CONFIG.syncInterval / 1000} seconds`);
    log('info', 'Press Ctrl+C to stop');
}

// Run
main().catch(err => {
    log('error', 'Fatal error', { error: err.message });
    process.exit(1);
});
