#!/usr/bin/env node
/**
 * Trinity Inbox Watcher
 * Monitors C1's inbox for new messages and auto-processes them
 */

const fs = require('fs').promises;
const path = require('path');
const { sendMessage } = require('./trinity_send_message.js');

const TRINITY_PATH = path.join(process.cwd(), '.trinity');
const INBOX_PATH = path.join(TRINITY_PATH, 'inbox', 'c1_inbox');
const CHECK_INTERVAL = 15000; // 15 seconds

let checkCount = 0;
let messagesProcessed = 0;

async function checkInbox() {
    const timestamp = new Date().toISOString();
    checkCount++;

    try {
        // Ensure inbox exists
        await fs.mkdir(INBOX_PATH, { recursive: true });

        // Get all files
        const files = await fs.readdir(INBOX_PATH);
        const messageFiles = files.filter(f => f.endsWith('.json') && !f.startsWith('ack_'));

        if (messageFiles.length === 0) {
            console.log(`[${timestamp}] ✓ Inbox empty (check #${checkCount})`);
            return;
        }

        console.log(`\n[${timestamp}] 📬 ${messageFiles.length} message(s) in inbox!`);

        for (const msgFile of messageFiles) {
            await processMessage(msgFile);
        }

    } catch (error) {
        console.error(`❌ Inbox check error: ${error.message}`);
    }
}

async function processMessage(filename) {
    const msgPath = path.join(INBOX_PATH, filename);

    try {
        const content = await fs.readFile(msgPath, 'utf8');
        const message = JSON.parse(content);

        messagesProcessed++;

        console.log(`\n  📨 Message #${messagesProcessed} from ${message.from}`);
        console.log(`     Subject: ${message.subject}`);
        console.log(`     Priority: ${message.priority}`);
        console.log(`     Requires acknowledgment: ${message.requires_acknowledgment ? 'Yes' : 'No'}`);
        console.log(`     Requires response: ${message.requires_response ? 'Yes' : 'No'}`);

        // Display body
        if (message.body.summary) {
            console.log(`     Summary: ${message.body.summary}`);
        }

        // Send acknowledgment if required
        if (message.requires_acknowledgment) {
            await sendAcknowledgment(message);
        }

        // Handle response if required
        if (message.requires_response) {
            console.log('     ⚠️  Response required - flagging for manual handling');
            // In production, this would trigger notification system
        }

        // Archive message
        await archiveMessage(filename, message);

    } catch (error) {
        console.error(`  ❌ Error processing ${filename}: ${error.message}`);
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
            response_pending: message.requires_response
        };

        // Send acknowledgment to sender's inbox
        const senderInbox = message.from.toLowerCase().replace('_', '') + '_inbox';
        const ackPath = path.join(TRINITY_PATH, 'inbox', senderInbox, `ack_from_c1_${Date.now()}.json`);

        await fs.mkdir(path.dirname(ackPath), { recursive: true });
        await fs.writeFile(ackPath, JSON.stringify(ack, null, 2));

        console.log(`     ✅ Acknowledgment sent to ${message.from}`);

    } catch (error) {
        console.error(`     ❌ Ack error: ${error.message}`);
    }
}

async function archiveMessage(filename, message) {
    try {
        const archivePath = path.join(TRINITY_PATH, 'archive');
        await fs.mkdir(archivePath, { recursive: true });

        const date = new Date().toISOString().split('T')[0];
        const archiveFilename = `${date}_${filename}`;
        const archiveFullPath = path.join(archivePath, archiveFilename);

        // Move to archive
        const msgPath = path.join(INBOX_PATH, filename);
        await fs.rename(msgPath, archiveFullPath);

        console.log(`     📁 Archived to: ${archiveFilename}`);

    } catch (error) {
        console.error(`     ⚠️  Archive error: ${error.message}`);
    }
}

function displayStats() {
    console.log(`\n📊 Trinity Inbox Watcher Statistics:`);
    console.log(`   Inbox checks: ${checkCount}`);
    console.log(`   Messages processed: ${messagesProcessed}`);
    console.log(`   Running time: ${Math.floor(checkCount * CHECK_INTERVAL / 1000 / 60)} minutes`);
    console.log(`   Status: ✅ ACTIVE`);
}

async function start() {
    console.log('🔺 Trinity Inbox Watcher Starting...');
    console.log(`📬 Monitoring: ${INBOX_PATH}`);
    console.log(`🔄 Check interval: ${CHECK_INTERVAL / 1000} seconds`);
    console.log('');

    // Initial check
    await checkInbox();

    // Set up interval
    setInterval(checkInbox, CHECK_INTERVAL);

    // Display stats every 5 minutes
    setInterval(displayStats, 300000);

    console.log('✅ Inbox watcher running in background...');
    console.log('   Press Ctrl+C to stop\n');
}

// Handle shutdown
process.on('SIGINT', () => {
    console.log('\n\n🛑 Trinity Inbox Watcher stopping...');
    displayStats();
    process.exit(0);
});

if (require.main === module) {
    start();
}

module.exports = { checkInbox, processMessage };
