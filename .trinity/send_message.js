#!/usr/bin/env node
/**
 * TRINITY MESSAGE SENDER
 * Usage: node send_message.js <from> <to> <type> <subject> <content>
 * Types: ASK, SHOW, TELL, BROADCAST
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const from = args[0];
const to = args[1];
const type = args[2] || 'SHOW';
const subject = args[3] || 'Message';
const content = args[4] || '';

if (!from || !to) {
  console.log('Usage: node send_message.js <from> <to> <type> <subject> [content]');
  console.log('');
  console.log('Examples:');
  console.log('  node send_message.js C2 C1 ASK "Architecture question" "Should we use REST or GraphQL?"');
  console.log('  node send_message.js C1 C2 SHOW "Progress update" "Week 1 complete"');
  console.log('  node send_message.js C3 ALL BROADCAST "Strategic guidance" "Timeline convergence at 92%"');
  process.exit(1);
}

const TRINITY_DIR = path.join(__dirname);
const MSG_DIR = path.join(TRINITY_DIR, 'MESSAGES');

const message = {
  type: type,
  from: from,
  to: to,
  timestamp: Date.now(),
  subject: subject,
  content: content,
  read: false,
  requires_response: type === 'ASK'
};

// Determine inbox file
let inboxFile;
if (to === 'ALL' || to === 'all') {
  inboxFile = path.join(MSG_DIR, 'broadcast.json');
} else {
  inboxFile = path.join(MSG_DIR, `${to.toLowerCase()}_inbox.json`);
}

// Read existing messages
let messages = [];
if (fs.existsSync(inboxFile)) {
  messages = JSON.parse(fs.readFileSync(inboxFile, 'utf8'));
}

// Add new message
messages.push(message);

// Write back
fs.writeFileSync(inboxFile, JSON.stringify(messages, null, 2));

console.log(`✅ Message sent from ${from} to ${to}`);
console.log(`   Type: ${type}`);
console.log(`   Subject: ${subject}`);
console.log(`   File: ${inboxFile}`);
console.log('');
