#!/usr/bin/env node
/**
 * Trinity Auto-Sync System
 * Automatically syncs with GitHub every 30 seconds
 * Ensures all computers stay coordinated
 */

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const fs = require('fs').promises;
const path = require('path');

const SYNC_INTERVAL = 30000; // 30 seconds
const BASE_PATH = process.cwd();
const TRINITY_PATH = path.join(BASE_PATH, '.trinity');

let syncCount = 0;
let lastError = null;

async function gitSync() {
    const timestamp = new Date().toISOString();

    try {
        console.log(`\n[${ timestamp}] 🔄 Trinity Auto-Sync #${++syncCount}`);

        // Pull latest changes from GitHub
        console.log('  📥 Pulling from GitHub...');
        const { stdout: pullOutput, stderr: pullError } = await execPromise('git pull origin master --quiet', {
            cwd: BASE_PATH
        });

        if (pullOutput && !pullOutput.includes('Already up to date')) {
            console.log('  ✅ New changes pulled from Trinity network');
            console.log(`     ${pullOutput.trim()}`);
        } else {
            console.log('  ✓ Already up to date');
        }

        // Check for untracked Trinity files
        const { stdout: statusOutput } = await execPromise('git status --porcelain .trinity/', {
            cwd: BASE_PATH
        });

        if (statusOutput.trim()) {
            console.log('  📤 New Trinity messages to push...');

            // Add Trinity changes
            await execPromise('git add .trinity/', { cwd: BASE_PATH });

            // Commit
            const commitMsg = `Trinity sync - Auto-sync #${syncCount} at ${timestamp}`;
            await execPromise(`git commit -m "${commitMsg}"`, { cwd: BASE_PATH });

            // Push
            await execPromise('git push origin master --quiet', { cwd: BASE_PATH });

            console.log('  ✅ Pushed to GitHub');
        }

        lastError = null;

    } catch (error) {
        if (error.message.includes('nothing to commit')) {
            // Not an error, just nothing new
            console.log('  ✓ No new changes to sync');
        } else {
            console.error(`  ❌ Sync error: ${error.message}`);
            lastError = error.message;
        }
    }
}

async function updateStatus() {
    try {
        const statusPath = path.join(TRINITY_PATH, 'shared', 'status.json');
        const status = JSON.parse(await fs.readFile(statusPath, 'utf8'));

        // Update C1's status
        status.last_updated = new Date().toISOString();
        status.computers.c1_mechanic.last_seen = new Date().toISOString();
        status.computers.c1_mechanic.current_task = 'Auto-syncing Trinity network';
        status.communication_stats.protocol_version = '2.0_active';

        await fs.writeFile(statusPath, JSON.stringify(status, null, 2));

    } catch (error) {
        // Status file might not exist yet
        console.log('  ⚠️  Status update skipped (file not ready)');
    }
}

async function checkInbox() {
    try {
        const inboxPath = path.join(TRINITY_PATH, 'inbox', 'c1_inbox');
        const files = await fs.readdir(inboxPath);

        const newMessages = files.filter(f => f.endsWith('.json'));

        if (newMessages.length > 0) {
            console.log(`  📬 ${newMessages.length} new message(s) in C1 inbox!`);

            for (const msgFile of newMessages) {
                const msgPath = path.join(inboxPath, msgFile);
                const message = JSON.parse(await fs.readFile(msgPath, 'utf8'));

                console.log(`     📨 From ${message.from}: ${message.subject}`);

                // Send acknowledgment
                await sendAcknowledgment(message);
            }
        }

    } catch (error) {
        // Inbox might not exist yet
    }
}

async function sendAcknowledgment(message) {
    try {
        const ack = {
            ack_id: `ack_${message.message_id}`,
            message_id: message.message_id,
            received_by: 'C1_Mechanic',
            received_at: new Date().toISOString(),
            read: true,
            response_pending: false
        };

        // Determine sender's inbox
        const senderInbox = message.from.toLowerCase().replace('_', '') + '_inbox';
        const ackPath = path.join(TRINITY_PATH, 'inbox', senderInbox, `ack_from_c1_${Date.now()}.json`);

        await fs.writeFile(ackPath, JSON.stringify(ack, null, 2));

        console.log(`     ✅ Acknowledgment sent to ${message.from}`);

    } catch (error) {
        console.error(`     ❌ Ack error: ${error.message}`);
    }
}

async function displayStats() {
    console.log(`\n📊 Trinity Auto-Sync Statistics:`);
    console.log(`   Sync cycles: ${syncCount}`);
    console.log(`   Running time: ${Math.floor(syncCount * SYNC_INTERVAL / 1000 / 60)} minutes`);
    console.log(`   Last error: ${lastError || 'None'}`);
    console.log(`   Status: ${lastError ? '🟡 WARNING' : '✅ HEALTHY'}`);
}

// Main loop
async function start() {
    console.log('🔺 Trinity Auto-Sync System Starting...');
    console.log(`📁 Base path: ${BASE_PATH}`);
    console.log(`🔄 Sync interval: ${SYNC_INTERVAL / 1000} seconds`);
    console.log('');

    // Initial sync
    await gitSync();
    await updateStatus();
    await checkInbox();

    // Set up interval
    setInterval(async () => {
        await gitSync();
        await updateStatus();
        await checkInbox();
    }, SYNC_INTERVAL);

    // Display stats every 5 minutes
    setInterval(displayStats, 300000);

    console.log('\n✅ Auto-sync running in background...');
    console.log('   Press Ctrl+C to stop\n');
}

// Handle shutdown
process.on('SIGINT', () => {
    console.log('\n\n🛑 Trinity Auto-Sync stopping...');
    displayStats();
    process.exit(0);
});

start();
