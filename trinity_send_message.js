#!/usr/bin/env node
/**
 * Trinity Message Sender
 * Send formatted messages to other Trinity members
 */

const fs = require('fs').promises;
const path = require('path');

const TRINITY_PATH = path.join(process.cwd(), '.trinity');

async function sendMessage(options) {
    const {
        from = 'C1_Mechanic',
        to,
        cc = [],
        priority = 'NORMAL',
        type = 'STATUS_UPDATE',
        subject,
        body,
        attachments = [],
        requiresAcknowledgment = true,
        requiresResponse = false,
        threadId = null,
        tags = []
    } = options;

    // Validate required fields
    if (!to) throw new Error('Recipient (to) is required');
    if (!subject) throw new Error('Subject is required');
    if (!body) throw new Error('Body is required');

    // Create message
    const timestamp = new Date().toISOString();
    const messageId = `msg_${Date.now()}_${from.toLowerCase()}`;

    const message = {
        message_id: messageId,
        from,
        to,
        cc,
        priority,
        type,
        timestamp,
        thread_id: threadId || `thread_${Date.now()}`,

        subject,

        body: {
            summary: typeof body === 'string' ? body : body.summary,
            details: typeof body === 'string' ? '' : body.details || '',
            action_required: typeof body === 'string' ? '' : body.action_required || '',
            deadline: typeof body === 'string' ? '' : body.deadline || ''
        },

        attachments,
        requires_acknowledgment: requiresAcknowledgment,
        requires_response: requiresResponse,

        metadata: {
            session_id: `session_${new Date().toISOString().split('T')[0]}`,
            tags
        }
    };

    // Determine recipient's inbox
    const recipientInbox = to.toLowerCase().replace('_', '') + '_inbox';
    const inboxPath = path.join(TRINITY_PATH, 'inbox', recipientInbox);

    // Ensure inbox exists
    await fs.mkdir(inboxPath, { recursive: true });

    // Write message
    const messagePath = path.join(inboxPath, `from_${from.toLowerCase()}_${Date.now()}.json`);
    await fs.writeFile(messagePath, JSON.stringify(message, null, 2));

    console.log(`✅ Message sent to ${to}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   Priority: ${priority}`);
    console.log(`   File: ${messagePath}`);

    return message;
}

// CLI usage
if (require.main === module) {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.log('Usage: node trinity_send_message.js <to> <subject> <body>');
        console.log('');
        console.log('Example:');
        console.log('  node trinity_send_message.js C2_Architect "Test Message" "This is a test"');
        console.log('');
        console.log('Or use programmatically:');
        console.log('  const { sendMessage } = require("./trinity_send_message.js");');
        console.log('  await sendMessage({ to: "C2_Architect", subject: "...", body: "..." });');
        process.exit(1);
    }

    const [to, subject, body] = args;

    sendMessage({
        to,
        subject,
        body,
        priority: 'NORMAL'
    }).then(() => {
        console.log('\n📨 Message queued. Will be synced to GitHub within 30 seconds.');
    }).catch(error => {
        console.error('❌ Error:', error.message);
        process.exit(1);
    });
}

module.exports = { sendMessage };
