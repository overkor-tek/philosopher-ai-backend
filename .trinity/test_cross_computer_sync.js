#!/usr/bin/env node
/**
 * TRINITY CROSS-COMPUTER SYNC TESTER
 * Verifies cloud sync infrastructure is working
 */

const fs = require('fs');
const path = require('path');

const CLOUD_BASE = process.env.TRINITY_CLOUD_FOLDER || 'C:/Users/Darrick/Dropbox/TRINITY_NETWORK';

console.log(`
╔════════════════════════════════════════════════════════════╗
║  🧪 TRINITY CROSS-COMPUTER SYNC TEST
║  Verifying 3-computer coordination infrastructure
╚════════════════════════════════════════════════════════════╝
`);

let testsPassed = 0;
let testsFailed = 0;

function test(name, condition, details = '') {
    if (condition) {
        console.log(`✅ PASS: ${name}`);
        if (details) console.log(`   ${details}`);
        testsPassed++;
    } else {
        console.log(`❌ FAIL: ${name}`);
        if (details) console.log(`   ${details}`);
        testsFailed++;
    }
}

console.log('\n📁 TEST 1: Cloud Folder Structure\n');

test(
    'Cloud base folder exists',
    fs.existsSync(CLOUD_BASE),
    `Path: ${CLOUD_BASE}`
);

['A', 'B', 'C'].forEach(comp => {
    const compFolder = path.join(CLOUD_BASE, `COMPUTER_${comp}`);
    test(
        `Computer ${comp} folder exists`,
        fs.existsSync(compFolder),
        `Path: ${compFolder}`
    );

    const wakeFile = path.join(compFolder, 'wake_requests.json');
    test(
        `Computer ${comp} wake_requests.json exists`,
        fs.existsSync(wakeFile)
    );

    const msgFile = path.join(compFolder, 'messages_inbound.json');
    test(
        `Computer ${comp} messages_inbound.json exists`,
        fs.existsSync(msgFile)
    );
});

const masterFolder = path.join(CLOUD_BASE, 'MASTER');
test(
    'Master folder exists',
    fs.existsSync(masterFolder),
    `Path: ${masterFolder}`
);

console.log('\n📤 TEST 2: Upload Status Simulation\n');

// Simulate Computer A uploading status
const testStatus = {
    computer: 'A',
    timestamp: Date.now(),
    instances: {
        c1: { status: 'active', currentTask: 'Test task', timestamp: Date.now() },
        c2: { status: 'active', currentTask: 'Running tests', timestamp: Date.now() },
        c3: { status: 'standby', currentTask: 'Idle', timestamp: Date.now() }
    }
};

try {
    const statusFile = path.join(CLOUD_BASE, 'COMPUTER_A', 'status.json');
    fs.writeFileSync(statusFile, JSON.stringify(testStatus, null, 2));
    test(
        'Uploaded test status for Computer A',
        fs.existsSync(statusFile)
    );

    // Verify it can be read back
    const readBack = JSON.parse(fs.readFileSync(statusFile, 'utf8'));
    test(
        'Status can be read back',
        readBack.computer === 'A' && readBack.instances.c1.status === 'active',
        'Computer A status verified'
    );
} catch (e) {
    test('Upload status simulation', false, `Error: ${e.message}`);
}

console.log('\n🔔 TEST 3: Wake Request Simulation\n');

// Test wake request from Computer A to Computer B
try {
    const wakeFile = path.join(CLOUD_BASE, 'COMPUTER_B', 'wake_requests.json');
    const wakeRequests = [{
        from: 'A',
        to: 'B',
        instance: 'c1',
        reason: 'Test wake request',
        priority: 'HIGH',
        timestamp: Date.now()
    }];

    fs.writeFileSync(wakeFile, JSON.stringify(wakeRequests, null, 2));
    test(
        'Created wake request A → B (C1)',
        fs.existsSync(wakeFile)
    );

    // Verify it can be read
    const readRequests = JSON.parse(fs.readFileSync(wakeFile, 'utf8'));
    test(
        'Wake request readable',
        readRequests.length === 1 && readRequests[0].instance === 'c1',
        'Computer B should detect this in 30s'
    );

    // Clean up
    fs.writeFileSync(wakeFile, JSON.stringify([], null, 2));
    console.log('   (Cleaned up test wake request)');
} catch (e) {
    test('Wake request simulation', false, `Error: ${e.message}`);
}

console.log('\n📬 TEST 4: Message Passing Simulation\n');

// Test message from Computer A to Computer C
try {
    const msgFile = path.join(CLOUD_BASE, 'COMPUTER_C', 'messages_inbound.json');
    const messages = [{
        type: 'TELL',
        from: 'A-C2',
        to: 'C-C3',
        targetComputer: 'C',
        timestamp: Date.now(),
        subject: 'Test Message',
        content: 'Cross-computer message test successful!',
        read: false
    }];

    fs.writeFileSync(msgFile, JSON.stringify(messages, null, 2));
    test(
        'Created message A → C',
        fs.existsSync(msgFile)
    );

    // Verify it can be read
    const readMessages = JSON.parse(fs.readFileSync(msgFile, 'utf8'));
    test(
        'Message readable',
        readMessages.length === 1 && readMessages[0].to === 'C-C3',
        'Computer C should receive this in 30s'
    );

    // Clean up
    fs.writeFileSync(msgFile, JSON.stringify([], null, 2));
    console.log('   (Cleaned up test message)');
} catch (e) {
    test('Message passing simulation', false, `Error: ${e.message}`);
}

console.log('\n🔍 TEST 5: Check for Live Computers\n');

['A', 'B', 'C'].forEach(comp => {
    const statusFile = path.join(CLOUD_BASE, `COMPUTER_${comp}`, 'status.json');
    if (fs.existsSync(statusFile)) {
        try {
            const stats = fs.statSync(statusFile);
            const ageSeconds = (Date.now() - stats.mtimeMs) / 1000;
            const status = JSON.parse(fs.readFileSync(statusFile, 'utf8'));

            test(
                `Computer ${comp} is active`,
                ageSeconds < 120,
                `Last seen ${Math.floor(ageSeconds)}s ago (${ageSeconds < 60 ? 'ONLINE' : 'STALE'})`
            );

            if (status.instances) {
                const activeCount = Object.values(status.instances).filter(i => i.status === 'active').length;
                console.log(`   Active instances: ${activeCount}/3`);
            }
        } catch (e) {
            test(`Computer ${comp} status valid`, false, `Error: ${e.message}`);
        }
    } else {
        console.log(`⚪ Computer ${comp}: No status file (not connected yet)`);
    }
});

console.log('\n📊 TEST 6: Master Coordinator Output\n');

const consolidatedFile = path.join(masterFolder, 'consolidated_status.json');
const commanderFile = path.join(masterFolder, 'commander_inbox.json');
const phoneFile = path.join(masterFolder, 'phone_view.json');

if (fs.existsSync(consolidatedFile)) {
    try {
        const consolidated = JSON.parse(fs.readFileSync(consolidatedFile, 'utf8'));
        const ageSeconds = (Date.now() - consolidated.timestamp) / 1000;

        test(
            'Master coordinator has run',
            ageSeconds < 120,
            `Last run ${Math.floor(ageSeconds)}s ago`
        );

        test(
            'Consolidated status valid',
            consolidated.network && consolidated.computers,
            `${consolidated.network.activeInstances}/${consolidated.network.totalInstances} instances active`
        );
    } catch (e) {
        test('Consolidated status readable', false, `Error: ${e.message}`);
    }
} else {
    console.log('⚪ Master coordinator has not run yet (run START_MASTER_COORDINATOR.bat)');
}

test('Commander inbox file created', fs.existsSync(commanderFile));
test('Phone view file created', fs.existsSync(phoneFile));

console.log('\n══════════════════════════════════════════════════════════\n');
console.log(`📊 TEST RESULTS: ${testsPassed} passed, ${testsFailed} failed\n`);

if (testsFailed === 0) {
    console.log('✅ ALL TESTS PASSED!');
    console.log('\n🎯 NEXT STEPS:');
    console.log('1. Run START_CLOUD_SYNC_A.bat on this computer');
    console.log('2. Copy .trinity folder to Computer B and run START_CLOUD_SYNC_B.bat');
    console.log('3. Copy .trinity folder to Computer C and run START_CLOUD_SYNC_C.bat');
    console.log('4. Run START_MASTER_COORDINATOR.bat to see all 3 computers');
    console.log('5. Test remote wake: node wake_remote_computer.js B c1 "Test wake"');
    console.log('6. Open PHONE_INTERFACE.html to control all 9 instances');
} else {
    console.log('⚠️  SOME TESTS FAILED');
    console.log('Review errors above and fix before deploying to other computers.');
}

console.log('\n══════════════════════════════════════════════════════════\n');
