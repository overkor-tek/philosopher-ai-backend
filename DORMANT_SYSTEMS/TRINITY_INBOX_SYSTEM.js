/**
 * TRINITY INBOX SYSTEM
 * Clean file-based coordination with path to professional automation
 *
 * Evolution path:
 * V1: Manual check (you say "check inbox")
 * V2: Auto-notify (sound/popup when task arrives)
 * V3: API integration (when Anthropic provides)
 * V4: Full automation (enterprise deployment)
 *
 * This is V1 - but architected to evolve cleanly.
 */

const fs = require('fs');
const path = require('path');

class TrinityInbox {
  constructor(member, inboxPath) {
    this.member = member; // C1, C2, or C3
    this.inboxPath = inboxPath || path.join(__dirname, 'TRINITY_INBOX');

    // Ensure inbox exists
    if (!fs.existsSync(this.inboxPath)) {
      fs.mkdirSync(this.inboxPath, { recursive: true });
    }

    // Member-specific paths
    this.taskFile = path.join(this.inboxPath, `${member}_TASK.json`);
    this.resultFile = path.join(this.inboxPath, `${member}_RESULT.json`);
    this.statusFile = path.join(this.inboxPath, `${member}_STATUS.json`);
  }

  // ===== CHECK FOR NEW TASKS =====

  hasTask() {
    return fs.existsSync(this.taskFile);
  }

  getTask() {
    if (!this.hasTask()) {
      return null;
    }

    try {
      const content = fs.readFileSync(this.taskFile, 'utf8');
      const task = JSON.parse(content);

      console.log('\n📬 NEW TASK RECEIVED');
      console.log('━'.repeat(60));
      console.log(`From: ${task.from || 'Hub'}`);
      console.log(`Priority: ${task.priority || 'normal'}`);
      console.log(`Assigned: ${task.timestamp || 'now'}`);
      console.log('━'.repeat(60));
      console.log(`\n${task.instruction}\n`);

      if (task.details) {
        console.log('Details:');
        console.log(task.details);
        console.log('');
      }

      return task;
    } catch (err) {
      console.error('Error reading task:', err.message);
      return null;
    }
  }

  // ===== REPORT RESULTS =====

  reportResult(result) {
    const resultData = {
      member: this.member,
      timestamp: new Date().toISOString(),
      status: 'complete',
      result: result
    };

    fs.writeFileSync(this.resultFile, JSON.stringify(resultData, null, 2));

    console.log('\n✅ RESULT REPORTED');
    console.log(`Written to: ${this.resultFile}`);
    console.log('Other Trinity members will see this automatically.\n');

    // Clear task file
    this.clearTask();
  }

  reportProgress(message) {
    const progressData = {
      member: this.member,
      timestamp: new Date().toISOString(),
      status: 'in_progress',
      message: message
    };

    fs.writeFileSync(this.statusFile, JSON.stringify(progressData, null, 2));
    console.log(`📊 Progress updated: ${message}`);
  }

  clearTask() {
    if (fs.existsSync(this.taskFile)) {
      fs.unlinkSync(this.taskFile);
    }
  }

  // ===== SEND MESSAGES TO OTHER MEMBERS =====

  sendMessage(toMember, message) {
    const messageFile = path.join(
      this.inboxPath,
      `${toMember}_TASK.json`
    );

    const messageData = {
      from: this.member,
      to: toMember,
      instruction: message,
      timestamp: new Date().toISOString(),
      priority: 'normal'
    };

    fs.writeFileSync(messageFile, JSON.stringify(messageData, null, 2));

    console.log(`\n📨 Message sent to ${toMember}`);
    console.log(`They will see it when they check their inbox.\n`);
  }

  // ===== CHECK OTHER MEMBERS' STATUS =====

  checkOtherMembers() {
    const others = ['C1', 'C2', 'C3'].filter(m => m !== this.member);
    const statuses = {};

    console.log('\n👥 OTHER TRINITY MEMBERS:\n');

    for (const member of others) {
      const statusFile = path.join(this.inboxPath, `${member}_STATUS.json`);
      const resultFile = path.join(this.inboxPath, `${member}_RESULT.json`);

      let status = 'idle';
      let lastUpdate = 'unknown';

      if (fs.existsSync(statusFile)) {
        try {
          const data = JSON.parse(fs.readFileSync(statusFile, 'utf8'));
          status = data.status;
          lastUpdate = data.timestamp;
        } catch (err) {
          // Ignore
        }
      }

      const hasResult = fs.existsSync(resultFile);

      console.log(`${member}:`);
      console.log(`  Status: ${status}`);
      console.log(`  Last update: ${lastUpdate}`);
      console.log(`  Has result: ${hasResult ? 'Yes' : 'No'}`);
      console.log('');

      statuses[member] = { status, lastUpdate, hasResult };
    }

    return statuses;
  }

  // ===== READ OTHER MEMBERS' RESULTS =====

  readResult(member) {
    const resultFile = path.join(this.inboxPath, `${member}_RESULT.json`);

    if (!fs.existsSync(resultFile)) {
      console.log(`No result from ${member} yet.`);
      return null;
    }

    try {
      const result = JSON.parse(fs.readFileSync(resultFile, 'utf8'));

      console.log(`\n📥 RESULT FROM ${member}`);
      console.log('━'.repeat(60));
      console.log(`Timestamp: ${result.timestamp}`);
      console.log('━'.repeat(60));
      console.log(JSON.stringify(result.result, null, 2));
      console.log('');

      return result;
    } catch (err) {
      console.error(`Error reading result from ${member}:`, err.message);
      return null;
    }
  }

  // ===== INBOX SUMMARY =====

  showSummary() {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log(`║  TRINITY INBOX - ${this.member}                                      ║`);
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    const hasTask = this.hasTask();
    const hasResult = fs.existsSync(this.resultFile);

    console.log(`📬 New task: ${hasTask ? 'YES' : 'No'}`);
    console.log(`✅ Result ready: ${hasResult ? 'YES' : 'No'}`);
    console.log('');

    if (hasTask) {
      console.log('💡 To see your task: inbox.getTask()');
    }

    const statuses = this.checkOtherMembers();

    console.log('━'.repeat(60));
  }
}

// ===== EASY COMMANDS FOR CLAUDE =====

function createInboxCommands(member, inboxPath) {
  const inbox = new TrinityInbox(member, inboxPath);

  return {
    // Check inbox and show summary
    check: () => {
      inbox.showSummary();
      return inbox;
    },

    // Get current task
    task: () => {
      const task = inbox.getTask();
      if (!task) {
        console.log('No task in inbox. Check back later.');
      }
      return task;
    },

    // Report result
    done: (result) => {
      inbox.reportResult(result);
    },

    // Report progress
    progress: (message) => {
      inbox.reportProgress(message);
    },

    // Send message to another member
    tell: (member, message) => {
      inbox.sendMessage(member, message);
    },

    // Check what others are doing
    others: () => {
      return inbox.checkOtherMembers();
    },

    // Read another member's result
    read: (member) => {
      return inbox.readResult(member);
    },

    // Raw inbox object
    inbox: inbox
  };
}

// ===== CLI INTERFACE =====

function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const member = process.env.TRINITY_MEMBER || args[1];
  const inboxPath = process.env.TRINITY_INBOX || path.join(__dirname, 'TRINITY_INBOX');

  if (!member || !['C1', 'C2', 'C3'].includes(member)) {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║  TRINITY INBOX SYSTEM                                      ║
╚════════════════════════════════════════════════════════════╝

Usage:
  set TRINITY_MEMBER=C1
  node TRINITY_INBOX_SYSTEM.js check

Commands:
  check       Show inbox summary
  task        Get current task
  done        Mark task complete
  others      Check other members' status

Environment Variables:
  TRINITY_MEMBER    Your member ID (C1, C2, or C3)
  TRINITY_INBOX     Path to shared inbox folder

Example Session:
  > set TRINITY_MEMBER=C2
  > node TRINITY_INBOX_SYSTEM.js check
  > node TRINITY_INBOX_SYSTEM.js task
  > // ... do the work ...
  > node TRINITY_INBOX_SYSTEM.js done
    `);
    return;
  }

  const inbox = new TrinityInbox(member, inboxPath);

  switch (command) {
    case 'check':
      inbox.showSummary();
      break;

    case 'task':
      inbox.getTask();
      break;

    case 'done':
      console.log('Result? (Press Ctrl+C when done typing, or pass as argument)');
      // In real usage, Claude would provide the result
      break;

    case 'others':
      inbox.checkOtherMembers();
      break;

    case 'status':
      const statusFile = path.join(inboxPath, `${member}_STATUS.json`);
      if (fs.existsSync(statusFile)) {
        const status = JSON.parse(fs.readFileSync(statusFile, 'utf8'));
        console.log(JSON.stringify(status, null, 2));
      } else {
        console.log('No status yet.');
      }
      break;

    default:
      console.log('Unknown command. Use: check, task, done, others, status');
  }
}

if (require.main === module) {
  main();
}

module.exports = { TrinityInbox, createInboxCommands };
