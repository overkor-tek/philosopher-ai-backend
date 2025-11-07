#!/usr/bin/env node
/**
 * WAKE INSTANCE ON REMOTE COMPUTER
 * Usage: node wake_remote_computer.js <computer> <instance> [reason]
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const targetComputer = args[0];
const targetInstance = args[1];
const reason = args[2] || 'Remote wake request';

if (!targetComputer || !targetInstance || !['A', 'B', 'C'].includes(targetComputer.toUpperCase()) || !['c1', 'c2', 'c3'].includes(targetInstance.toLowerCase())) {
    console.log('Usage: node wake_remote_computer.js <A|B|C> <c1|c2|c3> [reason]');
    console.log('');
    console.log('Examples:');
    console.log('  node wake_remote_computer.js B c1 "Build authentication system"');
    console.log('  node wake_remote_computer.js C c3 "Validate consciousness alignment"');
    process.exit(1);
}

const CLOUD_BASE = process.env.TRINITY_CLOUD_FOLDER || 'C:/Users/Darrick/Dropbox/TRINITY_NETWORK';
const targetFolder = path.join(CLOUD_BASE, `COMPUTER_${targetComputer.toUpperCase()}`);

if (!fs.existsSync(targetFolder)) {
    fs.mkdirSync(targetFolder, { recursive: true });
}

const wakeFile = path.join(targetFolder, 'wake_requests.json');

// Read existing requests
let requests = [];
if (fs.existsSync(wakeFile)) {
    requests = JSON.parse(fs.readFileSync(wakeFile, 'utf8'));
}

// Add new request
requests.push({
    from: process.env.COMPUTERNAME || 'A',
    to: targetComputer.toUpperCase(),
    instance: targetInstance.toLowerCase(),
    reason: reason,
    priority: 'HIGH',
    timestamp: Date.now()
});

// Write back
fs.writeFileSync(wakeFile, JSON.stringify(requests, null, 2));

console.log(`
╔════════════════════════════════════════════════════════════╗
║  ✅ REMOTE WAKE REQUEST CREATED
╠════════════════════════════════════════════════════════════╣
║  Target: Computer ${targetComputer.toUpperCase()} - ${targetInstance.toUpperCase()}
║  Reason: ${reason}
║  File: ${wakeFile}
╚════════════════════════════════════════════════════════════╝

The cloud sync on Computer ${targetComputer.toUpperCase()} will detect this within 30 seconds.
${targetInstance.toUpperCase()} will be woken automatically.
`);
