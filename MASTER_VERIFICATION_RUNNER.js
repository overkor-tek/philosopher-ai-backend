#!/usr/bin/env node
/**
 * MASTER VERIFICATION RUNNER
 * Runs all verification systems and provides consolidated report
 * Can be distributed across multiple computers
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  MASTER VERIFICATION RUNNER                                ║');
console.log('║  Running all system verification tests                     ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

const results = {
  computer: os.hostname(),
  timestamp: new Date().toISOString(),
  tests: [],
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0
  }
};

// Check which verification systems exist
const verificationSystems = [
  {
    name: 'Backend Verification',
    file: 'backend_verification_system.js',
    description: 'Tests all backend endpoints',
    priority: 'high'
  },
  {
    name: 'Connection Verification',
    file: 'connection_verification_system.js',
    description: 'Tests all system connections',
    priority: 'high'
  },
  {
    name: 'End-to-End Testing',
    file: 'end_to_end_testing_system.js',
    description: 'Tests complete user flows',
    priority: 'medium'
  },
  {
    name: 'Trinity Connection',
    file: 'SIMPLE_CONNECTION_SYSTEM.js',
    description: 'Checks Trinity computer connections',
    priority: 'medium'
  }
];

console.log('🔍 Checking available verification systems...\n');

verificationSystems.forEach(system => {
  const exists = fs.existsSync(system.file);
  console.log(`${exists ? '✅' : '⏭️ '} ${system.name}: ${exists ? 'Available' : 'Not found (skipping)'}`);

  if (exists) {
    results.tests.push({
      name: system.name,
      file: system.file,
      status: 'ready',
      priority: system.priority
    });
  }
});

console.log('\n════════════════════════════════════════════════════════════\n');

// Function to run a verification system
function runVerification(test) {
  console.log(`\n📊 Running: ${test.name}\n`);
  console.log('─'.repeat(60));

  const startTime = Date.now();

  try {
    const output = execSync(`node ${test.file}`, {
      encoding: 'utf8',
      stdio: 'pipe',
      timeout: 120000 // 2 minute timeout
    });

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    // Parse output for pass/fail
    const passed = !output.toLowerCase().includes('error') &&
                   !output.toLowerCase().includes('failed');

    test.status = passed ? 'passed' : 'failed';
    test.duration = duration;
    test.output = output.substring(0, 500); // First 500 chars

    console.log(`\n✅ ${test.name} completed in ${duration}s`);

    if (passed) {
      results.summary.passed++;
    } else {
      results.summary.failed++;
      console.log(`⚠️  Warning: Test may have issues`);
    }

  } catch (error) {
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    test.status = 'failed';
    test.duration = duration;
    test.error = error.message;

    console.log(`\n❌ ${test.name} failed after ${duration}s`);
    console.log(`Error: ${error.message.substring(0, 200)}`);

    results.summary.failed++;
  }

  results.summary.total++;
  console.log('─'.repeat(60));
}

// Run high priority tests first
console.log('🚀 Running verification tests...\n');

const highPriorityTests = results.tests.filter(t => t.priority === 'high');
const mediumPriorityTests = results.tests.filter(t => t.priority === 'medium');

if (highPriorityTests.length > 0) {
  console.log('⚡ HIGH PRIORITY TESTS:\n');
  highPriorityTests.forEach(runVerification);
}

if (mediumPriorityTests.length > 0) {
  console.log('\n📋 MEDIUM PRIORITY TESTS:\n');
  mediumPriorityTests.forEach(runVerification);
}

// Generate summary
console.log('\n');
console.log('════════════════════════════════════════════════════════════');
console.log('  VERIFICATION SUMMARY');
console.log('════════════════════════════════════════════════════════════\n');

console.log(`Computer: ${results.computer}`);
console.log(`Tests Run: ${results.summary.total}`);
console.log(`Passed: ${results.summary.passed}`);
console.log(`Failed: ${results.summary.failed}`);
console.log(`Skipped: ${results.summary.skipped}\n`);

const successRate = results.summary.total > 0
  ? Math.floor((results.summary.passed / results.summary.total) * 100)
  : 0;

console.log(`Success Rate: ${successRate}%\n`);

if (successRate === 100) {
  console.log('🎉 ALL TESTS PASSED!\n');
} else if (successRate >= 75) {
  console.log('✅ Most tests passed\n');
} else if (successRate >= 50) {
  console.log('⚠️  Some tests failed\n');
} else {
  console.log('❌ Many tests failed\n');
}

// Save results
const resultsFile = path.join('.trinity', 'verification_results.json');
const resultsDir = path.dirname(resultsFile);
if (!fs.existsSync(resultsDir)) {
  fs.mkdirSync(resultsDir, { recursive: true });
}

fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
console.log(`📄 Results saved: ${resultsFile}\n`);

// Create human-readable report
const reportFile = path.join('.trinity', 'verification_report.txt');
const report = `
╔════════════════════════════════════════════════════════════╗
║  VERIFICATION REPORT                                       ║
╚════════════════════════════════════════════════════════════╝

Computer: ${results.computer}
Date: ${new Date(results.timestamp).toLocaleString()}

SUMMARY:
─────────────────────────────────────────────────────────────
Total Tests: ${results.summary.total}
Passed: ${results.summary.passed}
Failed: ${results.summary.failed}
Success Rate: ${successRate}%

TESTS:
─────────────────────────────────────────────────────────────
${results.tests.map(test => `
${test.status === 'passed' ? '✅' : '❌'} ${test.name}
   Status: ${test.status}
   Duration: ${test.duration}s
   ${test.error ? 'Error: ' + test.error : ''}
`).join('\n')}

════════════════════════════════════════════════════════════

${successRate === 100 ? '🎉 ALL SYSTEMS VERIFIED!' :
  successRate >= 75 ? '✅ SYSTEMS MOSTLY VERIFIED' :
  '⚠️  SOME SYSTEMS NEED ATTENTION'}
`;

fs.writeFileSync(reportFile, report);
console.log(`📄 Report saved: ${reportFile}\n`);

console.log('════════════════════════════════════════════════════════════\n');
console.log('✅ Verification complete!\n');

process.exit(results.summary.failed > 0 ? 1 : 0);
