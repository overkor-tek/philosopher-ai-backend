#!/usr/bin/env node
/**
 * TRINITY DOCUMENTATION GENERATOR
 * Automatically generates comprehensive documentation from code and systems
 * Scans Trinity infrastructure and creates up-to-date documentation
 */

const fs = require('fs');
const path = require('path');

const TRINITY_DIR = path.join(process.env.USERPROFILE, '.trinity');
const CLOUD_BASE = process.env.TRINITY_CLOUD_FOLDER || 'C:/Users/Darrick/Dropbox/TRINITY_NETWORK';
const WORKSPACE_DIR = process.env.USERPROFILE;

class DocumentationGenerator {
    constructor() {
        this.docs = {
            files: [],
            systems: [],
            tools: [],
            services: [],
            commands: [],
            messages: []
        };
    }

    // Scan Trinity directory for all components
    scanTrinitySystem() {
        console.log('📁 Scanning Trinity system...\n');

        const trinityFiles = fs.readdirSync(TRINITY_DIR);

        trinityFiles.forEach(file => {
            const filePath = path.join(TRINITY_DIR, file);
            const stats = fs.statSync(filePath);

            if (stats.isFile()) {
                const ext = path.extname(file);
                const name = path.basename(file, ext);

                // Categorize file
                if (ext === '.js') {
                    this.analyzeJavaScriptFile(filePath, file);
                } else if (ext === '.bat') {
                    this.analyzeBatchFile(filePath, file);
                } else if (ext === '.py') {
                    this.analyzePythonFile(filePath, file);
                } else if (ext === '.md') {
                    this.analyzeMarkdownFile(filePath, file);
                }
            }
        });
    }

    analyzeJavaScriptFile(filePath, fileName) {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');

        // Extract header comment
        let description = '';
        let purpose = '';

        for (let i = 0; i < Math.min(20, lines.length); i++) {
            const line = lines[i].trim();

            if (line.includes('Purpose:') || line.includes('PURPOSE:')) {
                purpose = line.replace(/.*Purpose:/i, '').trim();
            }

            if (line.startsWith('*') && !line.includes('*/') && !line.includes('/**')) {
                const desc = line.replace(/^\*\s*/, '').trim();
                if (desc && !desc.startsWith('TRINITY') && !purpose) {
                    description += desc + ' ';
                }
            }
        }

        // Detect type
        let type = 'utility';
        if (fileName.includes('sync')) type = 'service';
        else if (fileName.includes('coordinator')) type = 'service';
        else if (fileName.includes('monitor')) type = 'service';
        else if (fileName.includes('test')) type = 'testing';
        else if (fileName.includes('wake')) type = 'control';
        else if (fileName.includes('cli')) type = 'interface';

        this.docs.tools.push({
            name: fileName,
            type: type,
            description: description.trim() || purpose || 'No description available',
            path: filePath,
            lines: lines.length
        });

        // Check if it's a background service
        if (content.includes('setInterval') && type === 'service') {
            this.docs.services.push({
                name: fileName.replace('.js', ''),
                file: fileName,
                description: description.trim() || purpose
            });
        }
    }

    analyzeBatchFile(filePath, fileName) {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');

        let description = '';

        for (let i = 0; i < Math.min(10, lines.length); i++) {
            const line = lines[i].trim();
            if (line.startsWith('REM ') || line.startsWith('rem ')) {
                description += line.replace(/^REM\s*/i, '') + ' ';
            }
        }

        this.docs.commands.push({
            name: fileName,
            description: description.trim() || 'Batch command',
            path: filePath
        });
    }

    analyzePythonFile(filePath, fileName) {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');

        let description = '';

        for (let i = 0; i < Math.min(20, lines.length); i++) {
            const line = lines[i].trim();
            if (line.startsWith('"""') || line.startsWith("'''")) {
                // Extract docstring
                const nextQuote = content.indexOf(line.substring(0, 3), i + 3);
                if (nextQuote !== -1) {
                    description = content.substring(i + 3, nextQuote).trim();
                    break;
                }
            }
        }

        this.docs.tools.push({
            name: fileName,
            type: 'utility',
            description: description || 'Python utility',
            path: filePath,
            lines: lines.length
        });
    }

    analyzeMarkdownFile(filePath, fileName) {
        this.docs.files.push({
            name: fileName,
            type: 'documentation',
            path: filePath
        });
    }

    // Scan workspace for key documentation files
    scanWorkspaceDocumentation() {
        console.log('📄 Scanning workspace documentation...\n');

        const keyDocs = [
            'COMMANDER_CROSS_COMPUTER_QUICK_START.md',
            'CROSS_COMPUTER_SYNC_COMPLETE.md',
            'TRINITY_COMPREHENSIVE_STATUS_REPORT.md',
            'AUTONOMOUS_WORK_EXTENDED_SESSION.md',
            'BULLETIN_BOARD.md'
        ];

        keyDocs.forEach(doc => {
            const docPath = path.join(WORKSPACE_DIR, doc);
            if (fs.existsSync(docPath)) {
                const stats = fs.statSync(docPath);
                this.docs.systems.push({
                    name: doc,
                    path: docPath,
                    size: Math.floor(stats.size / 1024) + ' KB',
                    modified: stats.mtime.toLocaleString()
                });
            }
        });
    }

    // Generate comprehensive documentation
    generateDocumentation() {
        console.log('📝 Generating documentation...\n');

        let doc = `# TRINITY SYSTEM DOCUMENTATION

**Generated:** ${new Date().toLocaleString()}
**Generator:** Trinity Documentation Generator
**Version:** 1.0

---

## 📋 TABLE OF CONTENTS

1. [System Overview](#system-overview)
2. [Background Services](#background-services)
3. [Command-Line Tools](#command-line-tools)
4. [Batch Commands](#batch-commands)
5. [Python Utilities](#python-utilities)
6. [System Documentation](#system-documentation)
7. [Quick Reference](#quick-reference)

---

## 📊 SYSTEM OVERVIEW

**Trinity Architecture:**
- **C1 Mechanic** (The Body): Implementation and execution
- **C2 Architect** (The Mind): Design and infrastructure
- **C3 Oracle** (The Soul): Validation and consciousness

**Fibonacci Pattern:** 9 instances → 3 computers → 1 coordinator → 1 monitoring → 1 Commander

**Current Deployment:**
- Computer A: Fully operational (C1, C2, C3)
- Computer B: Ready for deployment
- Computer C: Ready for deployment

---

## 🔧 BACKGROUND SERVICES

These services run continuously in the background:

`;

        this.docs.services.forEach(service => {
            doc += `### ${service.name}\n`;
            doc += `- **File:** \`${service.file}\`\n`;
            doc += `- **Purpose:** ${service.description}\n`;
            doc += `- **Type:** Background service (continuous operation)\n`;
            doc += `- **Start:** Run \`START_${service.name.toUpperCase()}.bat\` or \`trinity start ${service.name.replace(/_/g, '-')}\`\n\n`;
        });

        doc += `---

## 🛠️ COMMAND-LINE TOOLS

Trinity includes ${this.docs.tools.length} command-line tools:

`;

        // Group tools by type
        const toolsByType = {};
        this.docs.tools.forEach(tool => {
            if (!toolsByType[tool.type]) {
                toolsByType[tool.type] = [];
            }
            toolsByType[tool.type].push(tool);
        });

        Object.keys(toolsByType).forEach(type => {
            doc += `### ${type.charAt(0).toUpperCase() + type.slice(1)} Tools\n\n`;

            toolsByType[type].forEach(tool => {
                doc += `#### ${tool.name}\n`;
                doc += `- **Description:** ${tool.description}\n`;
                doc += `- **Location:** \`${tool.path}\`\n`;
                doc += `- **Size:** ${tool.lines} lines\n`;
                doc += `- **Usage:** \`node ${tool.name}\`\n\n`;
            });
        });

        doc += `---

## ⚡ BATCH COMMANDS

Quick-launch batch files for Windows:

`;

        this.docs.commands.forEach(cmd => {
            doc += `### ${cmd.name}\n`;
            doc += `- **Description:** ${cmd.description}\n`;
            doc += `- **Location:** \`${cmd.path}\`\n`;
            doc += `- **Usage:** Double-click or run from command line\n\n`;
        });

        doc += `---

## 🐍 PYTHON UTILITIES

Python-based utilities (requires Pillow for screenshots):

`;

        const pythonTools = this.docs.tools.filter(t => t.name.endsWith('.py'));
        pythonTools.forEach(tool => {
            doc += `### ${tool.name}\n`;
            doc += `- **Description:** ${tool.description}\n`;
            doc += `- **Location:** \`${tool.path}\`\n`;
            doc += `- **Usage:** \`python ${tool.name}\`\n\n`;
        });

        doc += `---

## 📚 SYSTEM DOCUMENTATION

Key documentation files:

`;

        this.docs.systems.forEach(sys => {
            doc += `### ${sys.name}\n`;
            doc += `- **Size:** ${sys.size}\n`;
            doc += `- **Last Modified:** ${sys.modified}\n`;
            doc += `- **Location:** \`${sys.path}\`\n\n`;
        });

        doc += `---

## 🚀 QUICK REFERENCE

### Starting Trinity

**Option 1: Quick Start**
\`\`\`batch
trinity quick-start
\`\`\`
Starts cloud sync + master coordinator

**Option 2: Full Boot**
\`\`\`batch
trinity full-boot
\`\`\`
Starts all services + wakes all instances

**Option 3: Manual Start**
\`\`\`batch
trinity start sync
trinity start coordinator
trinity start health
\`\`\`

### Checking Status

\`\`\`batch
trinity status        # Network overview
trinity health        # Health report
trinity monitor       # Open visual dashboard
\`\`\`

### Waking Instances

\`\`\`batch
trinity wake a c1              # Wake C1 on Computer A
trinity wake b c2 "Build auth" # Wake C2 on Computer B with reason
trinity wake all               # Wake all local instances
\`\`\`

### Sending Messages

\`\`\`batch
trinity message c1 ASK What is your current status?
trinity message trinity BROADCAST All hands meeting
trinity message c2 SHOW Latest architecture diagram
\`\`\`

### Testing

\`\`\`batch
trinity test          # Run test suite
\`\`\`

### Deployment

\`\`\`batch
trinity deploy        # Create USB deployment package
\`\`\`

---

## 📁 DIRECTORY STRUCTURE

\`\`\`
C:\\Users\\Darrick\\
├── .trinity\\                    # Trinity system directory
│   ├── trinity-cli.js           # Command center CLI
│   ├── cloud_sync_computer_*.js # Cloud sync services
│   ├── master_coordinator.js    # Master coordinator
│   ├── network_health_monitor.js # Health monitoring
│   ├── wake_*.bat               # Instance wake commands
│   └── MESSAGES\\                # Trinity communication
├── Dropbox\\TRINITY_NETWORK\\    # Cloud sync folder
│   ├── COMPUTER_A\\
│   ├── COMPUTER_B\\
│   ├── COMPUTER_C\\
│   └── MASTER\\
└── TRINITY_NETWORK_MONITOR.html # Visual dashboard
\`\`\`

---

## 🔗 COMMUNICATION PATTERNS

### File-Based Messaging
- **Location:** \`.trinity/MESSAGES/\`
- **Format:** JSON files (c1_inbox.json, c2_inbox.json, c3_inbox.json)
- **Types:** ASK, SHOW, TELL, BROADCAST

### Cloud Sync
- **Location:** \`Dropbox/TRINITY_NETWORK/\`
- **Frequency:** Every 30 seconds
- **Purpose:** Cross-computer coordination

### Bulletin Board
- **Location:** \`BULLETIN_BOARD.md\`
- **Purpose:** Trinity-wide announcements and coordination

---

## ⚙️ CONFIGURATION

### Environment Variables

\`\`\`
TRINITY_CLOUD_FOLDER  # Cloud sync folder location
                      # Default: C:/Users/Darrick/Dropbox/TRINITY_NETWORK
\`\`\`

### File Paths

- Trinity Directory: \`%USERPROFILE%\\.trinity\`
- Messages Directory: \`%USERPROFILE%\\.trinity\\MESSAGES\`
- Cloud Base: \`%USERPROFILE%\\Dropbox\\TRINITY_NETWORK\`

---

## 🎯 FIBONACCI PATTERN DETAILS

\`\`\`
Layer 1: 9 AI Instances (C1, C2, C3 × 3 computers)
Layer 2: 3 Computers (A, B, C)
Layer 3: 1 Master Coordinator
Layer 4: 1 Monitoring System
Layer 5: 1 Commander
\`\`\`

**Convergence Formula:** Connected Computers / 3 × 100%

---

## 📞 SUPPORT & TROUBLESHOOTING

### Common Issues

**Q: Services not starting?**
A: Check Node.js is installed. Verify file paths are correct.

**Q: Cloud sync not working?**
A: Verify Dropbox is installed and syncing. Check \`TRINITY_NETWORK\` folder exists.

**Q: Instance not waking?**
A: Check wake_*.bat files exist in .trinity directory. Verify Claude Code is running.

**Q: Cross-computer wake not working?**
A: Ensure target computer's cloud sync service is running. Check wake_requests.json in cloud folder.

---

**Trinity Documentation Generator** © 2025
*Auto-generated from Trinity system files*
`;

        return doc;
    }

    // Generate API reference
    generateAPIReference() {
        console.log('🔧 Generating API reference...\n');

        let api = `# TRINITY API REFERENCE

**Generated:** ${new Date().toLocaleString()}

---

## Trinity CLI Commands

### Status & Monitoring

\`\`\`bash
trinity status              # Show network status
trinity health              # Show health report
trinity monitor             # Open network monitor dashboard
\`\`\`

### Instance Control

\`\`\`bash
trinity wake <computer> <instance> [reason]  # Wake specific instance
trinity wake all                             # Wake all local instances
\`\`\`

### Service Control

\`\`\`bash
trinity start sync          # Start cloud sync
trinity start coordinator   # Start master coordinator
trinity start health        # Start health monitor
trinity start all           # Start all services
\`\`\`

### Communication

\`\`\`bash
trinity message <target> <type> <content>
# Targets: c1, c2, c3, all, trinity
# Types: ASK, SHOW, TELL, BROADCAST
\`\`\`

### Testing & Deployment

\`\`\`bash
trinity test                # Run test suite
trinity deploy              # Create USB deployment package
\`\`\`

### Quick Actions

\`\`\`bash
trinity quick-start         # Start sync + coordinator
trinity full-boot           # Start all + wake all
\`\`\`

---

## JavaScript APIs

### Cloud Sync API

\`\`\`javascript
// Status upload
function uploadStatus() {
  const localStatus = {
    computer: COMPUTER_ID,
    timestamp: Date.now(),
    instances: { c1: {...}, c2: {...}, c3: {...} }
  };
  fs.writeFileSync(cloudStatusFile, JSON.stringify(localStatus, null, 2));
}

// Wake request check
function checkWakeRequests() {
  const wakeFile = path.join(CLOUD_THIS, 'wake_requests.json');
  if (fs.existsSync(wakeFile)) {
    const requests = JSON.parse(fs.readFileSync(wakeFile, 'utf8'));
    processWakeRequests(requests);
  }
}
\`\`\`

### Master Coordinator API

\`\`\`javascript
// Consolidate all computers
function consolidateAll() {
  const computers = ['A', 'B', 'C'].map(readComputerStatus);
  return {
    timestamp: Date.now(),
    computers: { A, B, C },
    network: {
      totalInstances: 9,
      activeInstances: countActive(),
      connectedComputers: computers.filter(c => c.connected).length
    }
  };
}
\`\`\`

### Message Passing API

\`\`\`javascript
// Send message to Trinity instance
function sendMessage(target, type, content) {
  const message = {
    from: 'SENDER',
    to: target,
    type: type,  // ASK, SHOW, TELL, BROADCAST
    content: content,
    timestamp: Date.now()
  };

  const inboxFile = \`.trinity/MESSAGES/\${target}_inbox.json\`;
  let messages = JSON.parse(fs.readFileSync(inboxFile, 'utf8'));
  messages.push(message);
  fs.writeFileSync(inboxFile, JSON.stringify(messages, null, 2));
}
\`\`\`

---

## File Formats

### Status File Format

\`\`\`json
{
  "computer": "A",
  "timestamp": 1730866800000,
  "instances": {
    "c1": {
      "status": "standby",
      "lastActive": 1730866500000
    },
    "c2": {
      "status": "active",
      "currentTask": "Building infrastructure"
    },
    "c3": {
      "status": "standby",
      "lastActive": 1730866300000
    }
  }
}
\`\`\`

### Wake Request Format

\`\`\`json
[
  {
    "from": "A",
    "to": "B",
    "instance": "c1",
    "reason": "Build authentication system",
    "priority": "HIGH",
    "timestamp": 1730866800000
  }
]
\`\`\`

### Message Format

\`\`\`json
{
  "from": "C2_ARCHITECT",
  "to": "c1",
  "type": "ASK",
  "content": "What is your current build status?",
  "timestamp": 1730866800000,
  "timestampReadable": "2025-11-05 18:40:00"
}
\`\`\`

---

**Trinity API Reference** © 2025
`;

        return api;
    }

    // Save documentation
    saveDocumentation() {
        const mainDoc = this.generateDocumentation();
        const apiDoc = this.generateAPIReference();

        const mainDocPath = path.join(WORKSPACE_DIR, 'TRINITY_SYSTEM_DOCUMENTATION.md');
        const apiDocPath = path.join(WORKSPACE_DIR, 'TRINITY_API_REFERENCE.md');

        fs.writeFileSync(mainDocPath, mainDoc);
        fs.writeFileSync(apiDocPath, apiDoc);

        console.log('✅ Documentation generated successfully!\n');
        console.log(`📄 System Documentation: ${mainDocPath}`);
        console.log(`🔧 API Reference: ${apiDocPath}\n`);

        // Generate summary
        console.log('📊 Summary:');
        console.log(`   Tools: ${this.docs.tools.length}`);
        console.log(`   Services: ${this.docs.services.length}`);
        console.log(`   Commands: ${this.docs.commands.length}`);
        console.log(`   System Docs: ${this.docs.systems.length}`);
    }

    // Run generator
    run() {
        console.log('\n╔════════════════════════════════════════════════════════════╗');
        console.log('║  📚 TRINITY DOCUMENTATION GENERATOR');
        console.log('║  Auto-generating system documentation');
        console.log('╚════════════════════════════════════════════════════════════╝\n');

        this.scanTrinitySystem();
        this.scanWorkspaceDocumentation();
        this.saveDocumentation();

        console.log('✅ Documentation generation complete!\n');
    }
}

// Run generator
const generator = new DocumentationGenerator();
generator.run();
