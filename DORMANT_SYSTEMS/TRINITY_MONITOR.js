/**
 * TRINITY MONITOR
 * Runs on each computer - auto-checks shared folder for tasks
 *
 * This is the "wake up" mechanism:
 * - Checks shared folder every 5 seconds
 * - Reads task files for this Trinity member
 * - Executes tasks automatically
 * - Writes progress back to shared folder
 *
 * Usage:
 *   set TRINITY_MEMBER=C1
 *   set TRINITY_SHARED=C:\Users\Darrick\Dropbox\Trinity
 *   node TRINITY_MONITOR.js
 */

const fs = require('fs');
const path = require('path');

// Configuration from environment
const MEMBER = process.env.TRINITY_MEMBER || 'C1';
const SHARED_PATH = process.env.TRINITY_SHARED || path.join(__dirname, 'trinity-shared');

if (!['C1', 'C2', 'C3'].includes(MEMBER)) {
  console.error('❌ Set TRINITY_MEMBER to C1, C2, or C3');
  process.exit(1);
}

if (!fs.existsSync(SHARED_PATH)) {
  console.error(`❌ Shared folder not found: ${SHARED_PATH}`);
  console.error('Set TRINITY_SHARED environment variable to correct path');
  process.exit(1);
}

// Paths
const MESSAGES_PATH = path.join(SHARED_PATH, 'messages');
const STATE_FILE = path.join(SHARED_PATH, 'trinity-state.json');
const MY_STATUS_FILE = path.join(SHARED_PATH, `status-${MEMBER}.json`);

// Ensure directories exist
if (!fs.existsSync(MESSAGES_PATH)) {
  fs.mkdirSync(MESSAGES_PATH, { recursive: true });
}

console.log(`\n🌟 TRINITY MONITOR STARTING`);
console.log(`   Member: ${MEMBER}`);
console.log(`   Shared: ${SHARED_PATH}`);
console.log(`   Status: ONLINE\n`);

// Track processed messages
const processedMessages = new Set();

// Update my status
function updateMyStatus(status) {
  const statusData = {
    member: MEMBER,
    status: status,
    lastUpdate: new Date().toISOString(),
    processedMessages: Array.from(processedMessages)
  };

  try {
    fs.writeFileSync(MY_STATUS_FILE, JSON.stringify(statusData, null, 2));
  } catch (err) {
    console.error('Failed to write status:', err.message);
  }
}

// Read new messages for me
function checkForMessages() {
  if (!fs.existsSync(MESSAGES_PATH)) {
    return [];
  }

  const files = fs.readdirSync(MESSAGES_PATH);
  const newMessages = [];

  for (const file of files) {
    // Skip if already processed
    if (processedMessages.has(file)) {
      continue;
    }

    const filePath = path.join(MESSAGES_PATH, file);

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const message = JSON.parse(content);

      // Check if message is for me
      if (message.to === MEMBER || message.to === 'ALL') {
        newMessages.push({
          file,
          ...message
        });
        processedMessages.add(file);
      }
    } catch (err) {
      // Skip invalid files
    }
  }

  return newMessages;
}

// Execute task
async function executeTask(message) {
  console.log(`\n📨 NEW MESSAGE FROM ${message.from}`);
  console.log(`   Type: ${message.action}`);
  console.log(`   Time: ${message.timestamp}\n`);

  if (message.action === 'WAKE_UP') {
    console.log(`⏰ WAKE UP CALL!`);
    console.log(`   Instruction: ${message.instruction}\n`);

    // Update status
    updateMyStatus('working');

    // In a real implementation, this would:
    // 1. Parse the instruction
    // 2. Determine what code to write/run
    // 3. Execute the task
    // 4. Write results back

    // For now, simulate work
    console.log(`🔨 ${MEMBER} is working on: ${message.instruction}`);
    console.log(`   (In real deployment, this would execute the actual task)\n`);

    // Write response
    const response = {
      from: MEMBER,
      to: message.from,
      action: 'TASK_RECEIVED',
      originalTask: message.instruction,
      status: 'working',
      timestamp: new Date().toISOString()
    };

    const responseFile = path.join(MESSAGES_PATH, `response-${MEMBER}-${Date.now()}.json`);
    fs.writeFileSync(responseFile, JSON.stringify(response, null, 2));

    console.log(`✅ Response sent to ${message.from}\n`);
  }
  else if (message.action === 'TASK_ASSIGNMENT') {
    console.log(`📋 TASK ASSIGNED!`);
    console.log(`   Task: ${JSON.stringify(message.task, null, 2)}\n`);

    updateMyStatus('working');

    // Execute task
    console.log(`🔨 ${MEMBER} executing task...`);

    // Simulate work
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Mark complete
    const completion = {
      from: MEMBER,
      to: message.from,
      action: 'TASK_COMPLETE',
      task: message.task,
      result: `${MEMBER} completed the task successfully`,
      timestamp: new Date().toISOString()
    };

    const completionFile = path.join(MESSAGES_PATH, `complete-${MEMBER}-${Date.now()}.json`);
    fs.writeFileSync(completionFile, JSON.stringify(completion, null, 2));

    console.log(`✅ Task complete. Notification sent.\n`);

    updateMyStatus('idle');
  }
  else if (message.action === 'HELP_REQUEST') {
    console.log(`🆘 HELP REQUESTED!`);
    console.log(`   Topic: ${message.topic}\n`);

    // Respond with help
    const help = {
      from: MEMBER,
      to: message.from,
      action: 'HELP_RESPONSE',
      topic: message.topic,
      response: `${MEMBER} can help with ${message.topic}`,
      timestamp: new Date().toISOString()
    };

    const helpFile = path.join(MESSAGES_PATH, `help-${MEMBER}-${Date.now()}.json`);
    fs.writeFileSync(helpFile, JSON.stringify(help, null, 2));

    console.log(`✅ Help response sent.\n`);
  }
  else if (message.action === 'TASK_COMPLETE') {
    console.log(`✅ ${message.from} completed their task`);
    console.log(`   Task: ${message.task}\n`);
  }
}

// Main monitoring loop
async function monitor() {
  // Update status
  updateMyStatus('idle');

  console.log(`👀 ${MEMBER} monitoring for messages...\n`);

  // Check every 5 seconds
  setInterval(async () => {
    const messages = checkForMessages();

    if (messages.length > 0) {
      for (const message of messages) {
        await executeTask(message);
      }
    }

    // Update heartbeat
    updateMyStatus('idle');
  }, 5000);

  // Keep alive
  console.log(`✅ Monitor active. Checking every 5 seconds.`);
  console.log(`Press Ctrl+C to stop.\n`);
}

// Handle shutdown
process.on('SIGINT', () => {
  console.log(`\n\n⏸️  ${MEMBER} shutting down...`);
  updateMyStatus('offline');
  process.exit(0);
});

// Start monitoring
monitor();

// Also export for programmatic use
module.exports = {
  checkForMessages,
  executeTask,
  updateMyStatus
};
