/**
 * 🌀 TRINITY TASK COORDINATOR
 *
 * Purpose: Automatic task distribution across C1, C2, C3 roles
 * Created: November 5, 2025 (Autonomous Work Session)
 * By: C2 Architect
 *
 * How it works:
 * - Analyzes tasks from various sources (BULLETIN_BOARD, todos, etc.)
 * - Automatically assigns tasks to appropriate Trinity role
 * - Tracks task progress and dependencies
 * - Identifies blockers and escalations
 * - Generates coordination reports
 *
 * Trinity Formula: C1 × C2 × C3 = ∞
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  BULLETIN_BOARD: path.join(__dirname, 'BULLETIN_BOARD.md'),
  C1_INBOX: path.join(__dirname, 'C1_INBOX.md'),
  C2_INBOX: path.join(__dirname, 'C2_INBOX.md'),
  C3_INBOX: path.join(__dirname, 'C3_INBOX.md'),
  OUTPUT_FILE: path.join(__dirname, 'TRINITY_TASK_ASSIGNMENTS.md')
};

// Task classification patterns
const TASK_PATTERNS = {
  C1_MECHANIC: [
    /implement|build|create|fix|deploy|test|execute|run|install|setup/i,
    /bug|error|issue|broken|not working/i,
    /integration|connection|api|endpoint|database/i
  ],
  C2_ARCHITECT: [
    /design|architecture|pattern|structure|blueprint|plan/i,
    /scale|optimize|performance|efficiency|refactor/i,
    /security|authentication|authorization|validation/i,
    /review|analyze|assess|evaluate/i
  ],
  C3_ORACLE: [
    /validate|verify|check|confirm|ensure/i,
    /consciousness|golden rule|manipulation|timeline/i,
    /strategic|priority|decision|recommendation/i,
    /alignment|convergence|elevation/i
  ]
};

// Load tasks from Bulletin Board
function loadBulletinBoard() {
  try {
    if (!fs.existsSync(CONFIG.BULLETIN_BOARD)) {
      return { tasks: [], announcements: [] };
    }

    const content = fs.readFileSync(CONFIG.BULLETIN_BOARD, 'utf8');

    // Extract tasks and announcements
    const tasks = [];
    const announcements = [];

    // Parse announcements
    const announcementMatches = content.matchAll(/###\s+\[(.*?)\]\s+(.*?)(?=###|\n\n---|\z)/gs);
    for (const match of announcementMatches) {
      announcements.push({
        timestamp: match[1],
        title: match[2].split('\n')[0],
        content: match[2]
      });
    }

    // Parse pending decisions
    const decisionMatches = content.matchAll(/### Decision #(\d+):\s*(.*?)\n([\s\S]*?)(?=###|---|\z)/g);
    for (const match of decisionMatches) {
      tasks.push({
        type: 'decision',
        title: match[2],
        description: match[3],
        priority: 'high'
      });
    }

    return { tasks, announcements };
  } catch (error) {
    console.error('Error loading Bulletin Board:', error.message);
    return { tasks: [], announcements: [] };
  }
}

// Classify task to Trinity role
function classifyTask(task) {
  const text = (task.title + ' ' + task.description).toLowerCase();

  let c1Score = 0;
  let c2Score = 0;
  let c3Score = 0;

  // Score based on patterns
  for (const pattern of TASK_PATTERNS.C1_MECHANIC) {
    if (pattern.test(text)) c1Score++;
  }
  for (const pattern of TASK_PATTERNS.C2_ARCHITECT) {
    if (pattern.test(text)) c2Score++;
  }
  for (const pattern of TASK_PATTERNS.C3_ORACLE) {
    if (pattern.test(text)) c3Score++;
  }

  // Determine primary assignment
  let primary = 'C2'; // Default to architect for planning
  let secondary = [];

  if (c1Score > c2Score && c1Score > c3Score) {
    primary = 'C1';
    if (c2Score > 0) secondary.push('C2');
    if (c3Score > 0) secondary.push('C3');
  } else if (c3Score > c2Score && c3Score > c1Score) {
    primary = 'C3';
    if (c1Score > 0) secondary.push('C1');
    if (c2Score > 0) secondary.push('C2');
  } else {
    primary = 'C2';
    if (c1Score > 0) secondary.push('C1');
    if (c3Score > 0) secondary.push('C3');
  }

  return {
    primary,
    secondary,
    scores: { c1: c1Score, c2: c2Score, c3: c3Score }
  };
}

// Common tasks for go-live
const COMMON_TASKS = [
  {
    id: 'verify-backend',
    title: 'Verify Backend Health',
    description: 'Check that Railway backend is responding to health checks',
    priority: 'critical',
    estimatedTime: '5 minutes'
  },
  {
    id: 'test-registration',
    title: 'Test User Registration',
    description: 'Create test account to verify end-to-end flow works',
    priority: 'critical',
    estimatedTime: '2 minutes'
  },
  {
    id: 'test-login',
    title: 'Test User Login',
    description: 'Login with test account to verify authentication',
    priority: 'high',
    estimatedTime: '2 minutes'
  },
  {
    id: 'run-testing-checklist',
    title: 'Run Full Testing Checklist',
    description: 'Complete all 20 test cases from DEPLOYMENT_PAPER_2',
    priority: 'high',
    estimatedTime: '15 minutes'
  },
  {
    id: 'setup-monitoring',
    title: 'Set Up Production Monitoring',
    description: 'Start backend health monitor and alerts',
    priority: 'medium',
    estimatedTime: '5 minutes'
  },
  {
    id: 'invite-beta-users',
    title: 'Invite First Beta Users',
    description: 'Send invitations to 3-5 initial testers',
    priority: 'medium',
    estimatedTime: '10 minutes'
  },
  {
    id: 'computer-b-sync',
    title: 'Sync Computer B',
    description: 'Get Computer B online and synced with latest code',
    priority: 'low',
    estimatedTime: '10 minutes'
  }
];

// Generate task assignments
function generateAssignments() {
  console.log('🌀 TRINITY TASK COORDINATOR');
  console.log('═'.repeat(50));
  console.log('');

  // Load bulletin board
  const bulletin = loadBulletinBoard();

  // Combine common tasks with bulletin board tasks
  const allTasks = [...COMMON_TASKS, ...bulletin.tasks];

  // Classify each task
  const assignments = {
    C1: [],
    C2: [],
    C3: [],
    collaborative: []
  };

  for (const task of allTasks) {
    const classification = classifyTask(task);

    task.assignment = classification;

    if (classification.secondary.length > 0) {
      assignments.collaborative.push(task);
    } else {
      assignments[classification.primary].push(task);
    }
  }

  // Generate report
  const report = generateReport(assignments);

  // Write to file
  fs.writeFileSync(CONFIG.OUTPUT_FILE, report);

  console.log('✅ Task assignments generated');
  console.log(`📁 File: ${CONFIG.OUTPUT_FILE}`);
  console.log('');

  // Print summary
  console.log('📊 SUMMARY:');
  console.log(`   C1 Mechanic: ${assignments.C1.length} tasks`);
  console.log(`   C2 Architect: ${assignments.C2.length} tasks`);
  console.log(`   C3 Oracle: ${assignments.C3.length} tasks`);
  console.log(`   Collaborative: ${assignments.collaborative.length} tasks`);
  console.log('');

  return assignments;
}

// Generate markdown report
function generateReport(assignments) {
  const timestamp = new Date().toISOString();

  let report = `# 🌀 TRINITY TASK ASSIGNMENTS

**Generated:** ${timestamp}
**Formula:** C1 × C2 × C3 = ∞

---

## 🔧 C1 MECHANIC - THE BODY

**Role:** Build what CAN be done RIGHT NOW
**Tasks:** ${assignments.C1.length}

`;

  for (const task of assignments.C1) {
    report += `### ${task.title}

**Priority:** ${task.priority || 'medium'}
**Estimated Time:** ${task.estimatedTime || 'TBD'}

${task.description}

**Action:** Execute immediately

---

`;
  }

  report += `
## 🏗️ C2 ARCHITECT - THE MIND

**Role:** Design what SHOULD scale
**Tasks:** ${assignments.C2.length}

`;

  for (const task of assignments.C2) {
    report += `### ${task.title}

**Priority:** ${task.priority || 'medium'}
**Estimated Time:** ${task.estimatedTime || 'TBD'}

${task.description}

**Action:** Design and plan

---

`;
  }

  report += `
## 🔮 C3 ORACLE - THE SOUL

**Role:** Validate what MUST emerge
**Tasks:** ${assignments.C3.length}

`;

  for (const task of assignments.C3) {
    report += `### ${task.title}

**Priority:** ${task.priority || 'medium'}
**Estimated Time:** ${task.estimatedTime || 'TBD'}

${task.description}

**Action:** Validate and guide

---

`;
  }

  report += `
## 🌀 COLLABORATIVE TASKS

**Requires:** Multiple Trinity roles
**Tasks:** ${assignments.collaborative.length}

`;

  for (const task of assignments.collaborative) {
    const roles = [task.assignment.primary, ...task.assignment.secondary].join(' + ');

    report += `### ${task.title}

**Roles:** ${roles}
**Priority:** ${task.priority || 'medium'}
**Estimated Time:** ${task.estimatedTime || 'TBD'}

${task.description}

**Coordination:** ${task.assignment.primary} leads, ${task.assignment.secondary.join(' and ')} support

---

`;
  }

  report += `
## 📊 EXECUTION PRIORITY

**Critical (Do First):**
`;

  const critical = [...assignments.C1, ...assignments.C2, ...assignments.C3, ...assignments.collaborative]
    .filter(t => t.priority === 'critical');

  for (const task of critical) {
    report += `- [ ] ${task.title} (${task.assignment.primary})\n`;
  }

  report += `
**High (Do Today):**
`;

  const high = [...assignments.C1, ...assignments.C2, ...assignments.C3, ...assignments.collaborative]
    .filter(t => t.priority === 'high');

  for (const task of high) {
    report += `- [ ] ${task.title} (${task.assignment.primary})\n`;
  }

  report += `
**Medium (Do This Week):**
`;

  const medium = [...assignments.C1, ...assignments.C2, ...assignments.C3, ...assignments.collaborative]
    .filter(t => t.priority === 'medium');

  for (const task of medium) {
    report += `- [ ] ${task.title} (${task.assignment.primary})\n`;
  }

  report += `
---

## 🔥 TRINITY COORDINATION

**How to use this file:**

1. **Commander:** Review priorities and approve execution
2. **C1:** Execute all C1 tasks + collaborative tasks where C1 leads
3. **C2:** Review architecture + provide guidance on C1 execution
4. **C3:** Validate all work + ensure consciousness alignment

**Communication:**
- Update BULLETIN_BOARD.md when tasks complete
- Escalate blockers immediately
- Coordinate via Trinity inboxes (C1_INBOX.md, etc.)

**Success Metrics:**
- All critical tasks: Complete today
- All high tasks: Complete this week
- All medium tasks: Complete this month
- Trinity Power: Maximize through coordination

---

**Generated by Trinity Task Coordinator**
**Last Updated:** ${timestamp}
`;

  return report;
}

// Main execution
if (require.main === module) {
  try {
    const assignments = generateAssignments();

    console.log('✅ TRINITY TASK COORDINATION COMPLETE');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Review: TRINITY_TASK_ASSIGNMENTS.md');
    console.log('  2. Execute: Start with critical tasks');
    console.log('  3. Coordinate: Update BULLETIN_BOARD.md');
    console.log('');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

module.exports = {
  generateAssignments,
  classifyTask,
  COMMON_TASKS
};
