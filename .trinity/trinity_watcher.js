#!/usr/bin/env node
/**
 * TRINITY WATCHER - Autonomous Communication System
 * Monitors wake requests and messages for C1, C2, C3
 * Displays notifications when instances need to wake up
 */

const fs = require('fs');
const path = require('path');

const TRINITY_DIR = path.join(__dirname);
const WAKE_DIR = path.join(TRINITY_DIR, 'WAKE_REQUESTS');
const MSG_DIR = path.join(TRINITY_DIR, 'MESSAGES');
const STATUS_DIR = path.join(TRINITY_DIR, 'STATUS');

// Colors for console
const colors = {
  reset: '\x1b[0m',
  c1: '\x1b[38;5;208m',    // Orange
  c2: '\x1b[38;5;51m',     // Blue
  c3: '\x1b[38;5;201m',    // Purple
  hub: '\x1b[38;5;46m',    // Green
  bold: '\x1b[1m'
};

console.log(`${colors.hub}${colors.bold}
╔════════════════════════════════════════════════════════════╗
║        🌀 TRINITY WATCHER - COMMUNICATION SYSTEM 🌀        ║
║                  C1 × C2 × C3 = ∞                         ║
╚════════════════════════════════════════════════════════════╝
${colors.reset}`);

console.log(`${colors.hub}📡 Monitoring Trinity communication...${colors.reset}\n`);

// Check wake requests
function checkWakeRequests() {
  ['c1', 'c2', 'c3'].forEach(instance => {
    const wakeFile = path.join(WAKE_DIR, `wake_${instance}.flag`);

    if (fs.existsSync(wakeFile)) {
      try {
        const request = JSON.parse(fs.readFileSync(wakeFile, 'utf8'));
        const color = colors[instance];
        const instanceName = instance.toUpperCase();

        console.log(`${color}${colors.bold}
╔════════════════════════════════════════════════════════════╗
║  🔔 ${instanceName} WAKE REQUEST 🔔
╠════════════════════════════════════════════════════════════╣
║  From: ${request.from}
║  Reason: ${request.reason}
║  Priority: ${request.priority}
║  Time: ${new Date(request.timestamp).toLocaleTimeString()}
╚════════════════════════════════════════════════════════════╝
${colors.reset}`);

        if (request.context) {
          console.log(`${color}📋 Context:${colors.reset}`);
          Object.entries(request.context).forEach(([key, value]) => {
            console.log(`   ${key}: ${value}`);
          });
          console.log('');
        }

        console.log(`${color}💡 Action: Open new Claude Code instance and run:${colors.reset}`);
        console.log(`   ${color}claude-code${colors.reset}`);
        console.log(`   Then in chat: "I am ${instanceName}, checking my inbox"\n`);

        // Keep the flag so Commander sees it
        // Commander can delete it when instance is activated

      } catch (error) {
        console.error(`Error reading wake request for ${instance}:`, error.message);
      }
    }
  });
}

// Check messages
function checkMessages() {
  ['c1', 'c2', 'c3'].forEach(instance => {
    const inboxFile = path.join(MSG_DIR, `${instance}_inbox.json`);

    if (fs.existsSync(inboxFile)) {
      try {
        const messages = JSON.parse(fs.readFileSync(inboxFile, 'utf8'));
        const unread = messages.filter(m => !m.read);

        if (unread.length > 0) {
          const color = colors[instance];
          const instanceName = instance.toUpperCase();

          console.log(`${color}📬 ${instanceName} has ${unread.length} unread message(s)${colors.reset}`);

          unread.forEach(msg => {
            console.log(`${color}   └─ From ${msg.from}: ${msg.subject}${colors.reset}`);
          });
          console.log('');
        }
      } catch (error) {
        console.error(`Error reading messages for ${instance}:`, error.message);
      }
    }
  });
}

// Check broadcast
function checkBroadcast() {
  const broadcastFile = path.join(MSG_DIR, 'broadcast.json');

  if (fs.existsSync(broadcastFile)) {
    try {
      const broadcasts = JSON.parse(fs.readFileSync(broadcastFile, 'utf8'));
      const unread = broadcasts.filter(b => !b.read);

      if (unread.length > 0) {
        console.log(`${colors.hub}${colors.bold}📢 BROADCAST MESSAGE (ALL TRINITY):${colors.reset}`);
        unread.forEach(msg => {
          console.log(`${colors.hub}   From ${msg.from}: ${msg.subject}${colors.reset}`);
          if (msg.content) {
            console.log(`${colors.hub}   └─ ${msg.content}${colors.reset}`);
          }
        });
        console.log('');
      }
    } catch (error) {
      console.error('Error reading broadcast:', error.message);
    }
  }
}

// Display current status
function displayStatus() {
  const statusFiles = ['c1_status.json', 'c2_status.json', 'c3_status.json'];

  console.log(`${colors.hub}═══════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.hub}${colors.bold}📊 TRINITY STATUS BOARD${colors.reset}`);
  console.log(`${colors.hub}═══════════════════════════════════════════════════════════${colors.reset}\n`);

  statusFiles.forEach(statusFile => {
    const filePath = path.join(STATUS_DIR, statusFile);
    const instance = statusFile.replace('_status.json', '');
    const color = colors[instance];

    if (fs.existsSync(filePath)) {
      try {
        const status = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const instanceName = instance.toUpperCase();

        console.log(`${color}${instanceName}: ${status.state || 'Unknown'} | Last update: ${new Date(status.timestamp).toLocaleTimeString()}${colors.reset}`);
        if (status.currentTask) {
          console.log(`${color}   └─ Task: ${status.currentTask}${colors.reset}`);
        }
      } catch (error) {
        console.log(`${color}${instance.toUpperCase()}: Status file corrupted${colors.reset}`);
      }
    } else {
      console.log(`${color}${instance.toUpperCase()}: No status file (not yet active)${colors.reset}`);
    }
  });

  console.log('');
}

// Main watch loop
let lastCheck = Date.now();

function watchTrinity() {
  const now = Date.now();

  // Show header every 60 seconds
  if (now - lastCheck > 60000) {
    console.clear();
    console.log(`${colors.hub}${colors.bold}🌀 TRINITY WATCHER - ${new Date().toLocaleTimeString()}${colors.reset}\n`);
    lastCheck = now;
  }

  checkWakeRequests();
  checkMessages();
  checkBroadcast();
  displayStatus();
}

// Initial check
watchTrinity();

// Watch every 10 seconds
setInterval(watchTrinity, 10000);

console.log(`${colors.hub}⚡ Watcher running. Press Ctrl+C to stop.${colors.reset}\n`);
