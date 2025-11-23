#!/usr/bin/env node
/**
 * TRINITY WAKE - Create wake request for an instance
 * Usage: node trinity_wake.js <c1|c2|c3> [reason] [priority]
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const instance = args[0];
const reason = args[1] || 'Wake request';
const priority = args[2] || 'MEDIUM';

if (!instance || !['c1', 'c2', 'c3'].includes(instance)) {
  console.error('Usage: node trinity_wake.js <c1|c2|c3> [reason] [priority]');
  process.exit(1);
}

const TRINITY_DIR = path.join(__dirname);
const WAKE_DIR = path.join(TRINITY_DIR, 'WAKE_REQUESTS');
const wakeFile = path.join(WAKE_DIR, `wake_${instance}.flag`);

const wakeRequest = {
  from: 'Commander',
  timestamp: Date.now(),
  reason: reason,
  priority: priority,
  context: {
    automated: false,
    trigger: 'Manual wake command'
  }
};

fs.writeFileSync(wakeFile, JSON.stringify(wakeRequest, null, 2));

const colors = {
  c1: '\x1b[38;5;208m',
  c2: '\x1b[38;5;51m',
  c3: '\x1b[38;5;201m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

const color = colors[instance];
const instanceName = instance.toUpperCase();

console.log(`${color}${colors.bold}
╔════════════════════════════════════════════════════════════╗
║  ✅ ${instanceName} WAKE REQUEST CREATED
╠════════════════════════════════════════════════════════════╣
║  Reason: ${reason}
║  Priority: ${priority}
║  File: ${wakeFile}
╚════════════════════════════════════════════════════════════╝
${colors.reset}`);

console.log(`\n${color}The Trinity Watcher will detect this and notify you.${colors.reset}`);
console.log(`${color}To activate ${instanceName}, open a new Claude Code instance.${colors.reset}\n`);
