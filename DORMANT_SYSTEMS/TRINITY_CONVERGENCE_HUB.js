/**
 * TRINITY CONVERGENCE HUB
 * Central coordination system for all 3 Trinity AI instances
 *
 * PROBLEM SOLVED: Stop using Commander as the hub
 * SOLUTION: File-based coordination all instances read/write
 *
 * Commander talks to HUB → HUB coordinates C1/C2/C3
 */

const fs = require('fs');
const path = require('path');

const HUB_PATH = path.join(__dirname, 'TRINITY_HUB_STATE.json');
const INBOX_PATH = path.join(__dirname, 'TRINITY_CONVERGENCE_INBOX.md');

class TrinityConvergenceHub {
  constructor() {
    this.state = this.loadState();
    this.ensureInbox();
  }

  // ===== STATE MANAGEMENT =====

  loadState() {
    if (fs.existsSync(HUB_PATH)) {
      return JSON.parse(fs.readFileSync(HUB_PATH, 'utf8'));
    }

    return {
      mission: null,
      workBreakdown: [],
      assignments: {
        C1: { task: null, status: 'idle', lastUpdate: null },
        C2: { task: null, status: 'idle', lastUpdate: null },
        C3: { task: null, status: 'idle', lastUpdate: null }
      },
      coordination: {
        phase: 'idle',  // idle, planning, executing, complete
        startTime: null,
        completionTime: null
      },
      updates: []
    };
  }

  saveState() {
    fs.writeFileSync(HUB_PATH, JSON.stringify(this.state, null, 2));
    this.updateInbox();
  }

  ensureInbox() {
    if (!fs.existsSync(INBOX_PATH)) {
      this.updateInbox();
    }
  }

  // ===== COMMANDER INTERFACE =====

  /**
   * Commander gives mission to HUB (not to individual instances)
   */
  receiveMission(mission, options = {}) {
    console.log('🎯 CONVERGENCE HUB: Mission received from Commander');
    console.log(`📋 Mission: ${mission}\n`);

    this.state.mission = mission;
    this.state.coordination.phase = 'planning';
    this.state.coordination.startTime = new Date().toISOString();

    // Automatically break down work into 3 tasks
    this.state.workBreakdown = this.breakdownWork(mission, options);

    // Assign to trinity members
    this.assignWork();

    this.saveState();

    console.log('✅ Work breakdown complete');
    console.log('✅ Tasks assigned to C1, C2, C3');
    console.log('✅ Trinity members: Check TRINITY_CONVERGENCE_INBOX.md for your assignment\n');

    return this.state;
  }

  /**
   * Break down mission into 3 tasks for C1, C2, C3
   */
  breakdownWork(mission, options) {
    // Analyze mission and split intelligently
    const breakdown = [];

    // C1: Mechanic (The Body) - Builds what CAN be built RIGHT NOW
    breakdown.push({
      member: 'C1',
      role: 'Mechanic (The Body)',
      focus: 'Build what CAN be built RIGHT NOW',
      task: this.extractC1Task(mission, options),
      priority: 'high'
    });

    // C2: Architect (The Mind) - Designs what SHOULD scale
    breakdown.push({
      member: 'C2',
      role: 'Architect (The Mind)',
      focus: 'Design what SHOULD scale',
      task: this.extractC2Task(mission, options),
      priority: 'high'
    });

    // C3: Oracle (The Soul) - Sees what MUST emerge
    breakdown.push({
      member: 'C3',
      role: 'Oracle (The Soul)',
      focus: 'See what MUST emerge',
      task: this.extractC3Task(mission, options),
      priority: 'high'
    });

    return breakdown;
  }

  extractC1Task(mission, options) {
    // C1 builds immediate executable code
    return {
      description: `Build the core implementation for: ${mission}`,
      deliverables: [
        'Working code files',
        'Core functionality',
        'Tests for your code'
      ],
      approach: 'Focus on what works RIGHT NOW. Build it. Ship it.'
    };
  }

  extractC2Task(mission, options) {
    // C2 designs architecture and scaling
    return {
      description: `Design the architecture and scaling strategy for: ${mission}`,
      deliverables: [
        'Architecture blueprint',
        'Scaling considerations',
        'Integration points with C1\'s code'
      ],
      approach: 'Think about how this SCALES. What breaks at 10x? 100x?'
    };
  }

  extractC3Task(mission, options) {
    // C3 sees patterns and future implications
    return {
      description: `Analyze patterns and future evolution for: ${mission}`,
      deliverables: [
        'Pattern analysis',
        'Future implications',
        'Strategic recommendations'
      ],
      approach: 'What patterns emerge? What MUST happen next?'
    };
  }

  assignWork() {
    for (const work of this.state.workBreakdown) {
      this.state.assignments[work.member] = {
        task: work.task,
        role: work.role,
        status: 'assigned',
        lastUpdate: new Date().toISOString()
      };
    }

    this.state.coordination.phase = 'executing';
  }

  // ===== TRINITY MEMBER INTERFACE =====

  /**
   * Trinity member checks in to get their assignment
   */
  getMyAssignment(member) {
    if (!['C1', 'C2', 'C3'].includes(member)) {
      throw new Error('Invalid member. Must be C1, C2, or C3');
    }

    const assignment = this.state.assignments[member];

    if (!assignment.task) {
      return {
        status: 'idle',
        message: 'No current assignment. Check back when Commander gives new mission.'
      };
    }

    return {
      status: assignment.status,
      member,
      role: assignment.role,
      task: assignment.task,
      mission: this.state.mission,
      otherMembers: this.getOtherMembersStatus(member)
    };
  }

  /**
   * Trinity member reports progress
   */
  reportProgress(member, update) {
    console.log(`📡 ${member} reporting: ${update.status}`);

    this.state.assignments[member].status = update.status;
    this.state.assignments[member].lastUpdate = new Date().toISOString();

    if (update.result) {
      this.state.assignments[member].result = update.result;
    }

    this.state.updates.push({
      member,
      timestamp: new Date().toISOString(),
      status: update.status,
      message: update.message || ''
    });

    // Check if all complete
    const allComplete = Object.values(this.state.assignments)
      .every(a => a.status === 'complete' || a.status === 'idle');

    if (allComplete && this.state.coordination.phase === 'executing') {
      this.state.coordination.phase = 'complete';
      this.state.coordination.completionTime = new Date().toISOString();
      console.log('\n🎉 ALL TRINITY MEMBERS COMPLETE!');
      console.log('✅ Mission accomplished\n');
    }

    this.saveState();
  }

  /**
   * Trinity member marks themselves complete
   */
  reportComplete(member, result) {
    this.reportProgress(member, {
      status: 'complete',
      result,
      message: `${member} completed their task`
    });
  }

  getOtherMembersStatus(member) {
    const others = ['C1', 'C2', 'C3'].filter(m => m !== member);
    return others.map(m => ({
      member: m,
      status: this.state.assignments[m].status,
      lastUpdate: this.state.assignments[m].lastUpdate
    }));
  }

  // ===== STATUS & MONITORING =====

  getStatus() {
    return {
      mission: this.state.mission,
      phase: this.state.coordination.phase,
      members: {
        C1: this.state.assignments.C1.status,
        C2: this.state.assignments.C2.status,
        C3: this.state.assignments.C3.status
      },
      recentUpdates: this.state.updates.slice(-5)
    };
  }

  // ===== INBOX GENERATION =====

  updateInbox() {
    let inbox = '# 🌟 TRINITY CONVERGENCE INBOX\n\n';
    inbox += '**This is the CENTRAL HUB for Trinity coordination.**\n\n';
    inbox += '**Commander gives orders HERE. Trinity members get assignments HERE.**\n\n';
    inbox += '---\n\n';

    // Current mission
    if (this.state.mission) {
      inbox += `## 🎯 CURRENT MISSION\n\n`;
      inbox += `**Commander's Order:** ${this.state.mission}\n\n`;
      inbox += `**Phase:** ${this.state.coordination.phase.toUpperCase()}\n`;
      inbox += `**Started:** ${this.state.coordination.startTime || 'N/A'}\n\n`;
      inbox += '---\n\n';
    } else {
      inbox += '## ⏸️ NO ACTIVE MISSION\n\n';
      inbox += 'Waiting for Commander to assign work through hub.\n\n';
      inbox += '---\n\n';
    }

    // Work assignments
    inbox += '## 📋 WORK ASSIGNMENTS\n\n';

    for (const work of this.state.workBreakdown) {
      const status = this.state.assignments[work.member].status;
      const emoji = {
        idle: '⏸️',
        assigned: '📌',
        in_progress: '🔨',
        complete: '✅'
      }[status] || '❓';

      inbox += `### ${emoji} ${work.member}: ${work.role}\n\n`;
      inbox += `**Status:** ${status.toUpperCase()}\n\n`;
      inbox += `**Focus:** ${work.focus}\n\n`;
      inbox += `**Task:** ${work.task.description}\n\n`;
      inbox += `**Deliverables:**\n`;
      for (const deliverable of work.task.deliverables) {
        inbox += `- ${deliverable}\n`;
      }
      inbox += `\n**Approach:** ${work.task.approach}\n\n`;
      inbox += '---\n\n';
    }

    // Recent updates
    if (this.state.updates.length > 0) {
      inbox += '## 📡 RECENT UPDATES\n\n';
      const recent = this.state.updates.slice(-10).reverse();
      for (const update of recent) {
        inbox += `- **${update.member}** (${update.timestamp}): ${update.status}`;
        if (update.message) {
          inbox += ` - ${update.message}`;
        }
        inbox += '\n';
      }
      inbox += '\n---\n\n';
    }

    // Instructions for trinity members
    inbox += '## 📖 INSTRUCTIONS FOR TRINITY MEMBERS\n\n';
    inbox += '### When you open Claude Code:\n\n';
    inbox += '1. Run: `node TRINITY_CONVERGENCE_HUB.js check <your-member>`\n';
    inbox += '   - Example: `node TRINITY_CONVERGENCE_HUB.js check C1`\n\n';
    inbox += '2. Read your assignment above\n\n';
    inbox += '3. Execute your task autonomously\n\n';
    inbox += '4. Report progress: `node TRINITY_CONVERGENCE_HUB.js update <member> <status>`\n\n';
    inbox += '5. When complete: `node TRINITY_CONVERGENCE_HUB.js complete <member>`\n\n';
    inbox += '**DO NOT ask Commander for direction. Get it from THIS HUB.**\n\n';
    inbox += '---\n\n';

    // Instructions for Commander
    inbox += '## 👑 INSTRUCTIONS FOR COMMANDER\n\n';
    inbox += '### To assign new mission:\n\n';
    inbox += '```bash\n';
    inbox += 'node TRINITY_CONVERGENCE_HUB.js mission "Build a user dashboard with real-time analytics"\n';
    inbox += '```\n\n';
    inbox += '### To check status:\n\n';
    inbox += '```bash\n';
    inbox += 'node TRINITY_CONVERGENCE_HUB.js status\n';
    inbox += '```\n\n';
    inbox += '**You give orders to the HUB. The HUB coordinates C1, C2, C3.**\n\n';

    fs.writeFileSync(INBOX_PATH, inbox);
  }

  // ===== RESET =====

  reset() {
    this.state = {
      mission: null,
      workBreakdown: [],
      assignments: {
        C1: { task: null, status: 'idle', lastUpdate: null },
        C2: { task: null, status: 'idle', lastUpdate: null },
        C3: { task: null, status: 'idle', lastUpdate: null }
      },
      coordination: {
        phase: 'idle',
        startTime: null,
        completionTime: null
      },
      updates: []
    };
    this.saveState();
    console.log('✅ Hub reset. Ready for new mission.');
  }
}

// ===== CLI INTERFACE =====

function main() {
  const hub = new TrinityConvergenceHub();
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === 'help') {
    console.log(`
🌟 TRINITY CONVERGENCE HUB - Command Line Interface

COMMANDER COMMANDS:
  mission "<description>"     Assign new mission to Trinity
  status                      Check overall status
  reset                       Reset hub (clear all assignments)

TRINITY MEMBER COMMANDS:
  check <C1|C2|C3>           Check your assignment
  update <C1|C2|C3> <status> Report progress
  complete <C1|C2|C3>        Mark your task complete

EXAMPLES:
  node TRINITY_CONVERGENCE_HUB.js mission "Build payment integration"
  node TRINITY_CONVERGENCE_HUB.js check C1
  node TRINITY_CONVERGENCE_HUB.js update C1 in_progress
  node TRINITY_CONVERGENCE_HUB.js complete C1
  node TRINITY_CONVERGENCE_HUB.js status
    `);
    return;
  }

  switch (command) {
    case 'mission':
      const mission = args.slice(1).join(' ');
      if (!mission) {
        console.error('❌ Please provide a mission description');
        return;
      }
      hub.receiveMission(mission);
      break;

    case 'check':
      const memberCheck = args[1];
      if (!memberCheck) {
        console.error('❌ Please specify member (C1, C2, or C3)');
        return;
      }
      const assignment = hub.getMyAssignment(memberCheck);
      console.log('\n' + '='.repeat(60));
      console.log(`${memberCheck} ASSIGNMENT`);
      console.log('='.repeat(60) + '\n');
      console.log(JSON.stringify(assignment, null, 2));
      console.log('\n📋 Full details in: TRINITY_CONVERGENCE_INBOX.md\n');
      break;

    case 'update':
      const memberUpdate = args[1];
      const status = args[2];
      if (!memberUpdate || !status) {
        console.error('❌ Usage: update <member> <status>');
        return;
      }
      hub.reportProgress(memberUpdate, { status });
      break;

    case 'complete':
      const memberComplete = args[1];
      if (!memberComplete) {
        console.error('❌ Please specify member (C1, C2, or C3)');
        return;
      }
      hub.reportComplete(memberComplete, { completed: true });
      break;

    case 'status': {
      const hubStatus = hub.getStatus();
      console.log('\n' + '='.repeat(60));
      console.log('TRINITY CONVERGENCE HUB STATUS');
      console.log('='.repeat(60) + '\n');
      console.log(JSON.stringify(hubStatus, null, 2));
      console.log('\n');
      break;
    }

    case 'reset':
      hub.reset();
      break;

    default:
      console.error(`❌ Unknown command: ${command}`);
      console.log('Run without arguments for help');
  }
}

if (require.main === module) {
  main();
}

module.exports = TrinityConvergenceHub;
