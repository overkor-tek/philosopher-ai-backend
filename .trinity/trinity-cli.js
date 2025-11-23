#!/usr/bin/env node
/**
 * TRINITY COMMAND CENTER CLI
 * Unified command-line interface for all Trinity operations
 * Quick control without opening multiple files or dashboards
 */

const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');

const TRINITY_DIR = path.join(process.env.USERPROFILE, '.trinity');
const MESSAGES_DIR = path.join(TRINITY_DIR, 'MESSAGES');
const CLOUD_BASE = process.env.TRINITY_CLOUD_FOLDER || 'C:/Users/Darrick/Dropbox/TRINITY_NETWORK';

// CLI Colors
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m'
};

function print(msg, color = 'white') {
    console.log(colors[color] + msg + colors.reset);
}

function printHeader(title) {
    console.log('\n' + colors.bright + colors.cyan + '═'.repeat(60));
    console.log('  ' + title);
    console.log('═'.repeat(60) + colors.reset + '\n');
}

// Command functions
async function showStatus() {
    printHeader('TRINITY NETWORK STATUS');

    try {
        // Read consolidated status
        const consolidatedFile = path.join(CLOUD_BASE, 'MASTER', 'consolidated_status.json');

        if (!fs.existsSync(consolidatedFile)) {
            print('⚠️  Master coordinator not running', 'yellow');
            print('   Run: trinity start coordinator', 'dim');
            return;
        }

        const status = JSON.parse(fs.readFileSync(consolidatedFile, 'utf8'));
        const ageSeconds = Math.floor((Date.now() - status.timestamp) / 1000);

        print(`📊 Network Overview:`, 'cyan');
        print(`   Total Instances: ${status.network.totalInstances}/9`);
        print(`   Active Instances: ${status.network.activeInstances}/9`);
        print(`   Connected Computers: ${status.network.connectedComputers}/3`);
        print(`   Last Update: ${ageSeconds}s ago`);

        print(`\n🖥️  Computer Status:`, 'cyan');
        ['A', 'B', 'C'].forEach(comp => {
            const compData = status.computers[comp];
            if (compData && compData.connected) {
                const emoji = '✅';
                const lastSeen = compData.lastSeen ? `${Math.floor(compData.lastSeen)}s ago` : 'just now';
                print(`   Computer ${comp}: ${emoji} ONLINE (${lastSeen})`, 'green');

                // Show instances
                if (compData.instances) {
                    Object.entries(compData.instances).forEach(([inst, data]) => {
                        const statusEmoji = data.status === 'active' ? '🟢' : '⚪';
                        const statusText = data.status === 'active' ? 'ACTIVE' : 'STANDBY';
                        print(`      ${inst.toUpperCase()}: ${statusEmoji} ${statusText}`, 'dim');
                    });
                }
            } else {
                print(`   Computer ${comp}: ⭕ OFFLINE`, 'red');
            }
        });

        // Fibonacci convergence
        const convergence = Math.floor((status.network.connectedComputers / 3) * 100);
        print(`\n🌀 Fibonacci Convergence: ${convergence}%`, 'magenta');

        const bar = '█'.repeat(Math.floor(convergence / 5)) + '░'.repeat(20 - Math.floor(convergence / 5));
        print(`   [${bar}]`, 'dim');

    } catch (error) {
        print('❌ Error reading status: ' + error.message, 'red');
    }
}

async function wakeInstance(computer, instance, reason = 'Manual wake') {
    printHeader(`WAKE ${instance.toUpperCase()} ON COMPUTER ${computer.toUpperCase()}`);

    if (computer.toUpperCase() === 'A') {
        // Local wake
        const batchFile = path.join(TRINITY_DIR, `wake_${instance.toLowerCase()}.bat`);

        if (!fs.existsSync(batchFile)) {
            print(`❌ Wake script not found: ${batchFile}`, 'red');
            return;
        }

        print(`🚀 Waking ${instance.toUpperCase()} locally...`, 'yellow');

        exec(`"${batchFile}"`, (error) => {
            if (error) {
                print(`❌ Error: ${error.message}`, 'red');
            } else {
                print(`✅ ${instance.toUpperCase()} wake command sent`, 'green');
            }
        });
    } else {
        // Remote wake via cloud
        print(`🌐 Sending remote wake to Computer ${computer.toUpperCase()}...`, 'yellow');

        const wakeFile = path.join(CLOUD_BASE, `COMPUTER_${computer.toUpperCase()}`, 'wake_requests.json');

        let requests = [];
        if (fs.existsSync(wakeFile)) {
            requests = JSON.parse(fs.readFileSync(wakeFile, 'utf8'));
        }

        requests.push({
            from: 'CLI',
            to: computer.toUpperCase(),
            instance: instance.toLowerCase(),
            reason: reason,
            priority: 'HIGH',
            timestamp: Date.now()
        });

        fs.writeFileSync(wakeFile, JSON.stringify(requests, null, 2));
        print(`✅ Remote wake request sent`, 'green');
        print(`   Computer ${computer.toUpperCase()} will process within 30 seconds`, 'dim');
    }
}

async function startService(service) {
    printHeader(`START SERVICE: ${service.toUpperCase()}`);

    const services = {
        sync: {
            file: 'cloud_sync_computer_a.js',
            title: 'Trinity Cloud Sync A'
        },
        coordinator: {
            file: 'master_coordinator.js',
            title: 'Trinity Master Coordinator'
        },
        health: {
            file: 'network_health_monitor.js',
            title: 'Trinity Health Monitor'
        }
    };

    if (!services[service]) {
        print(`❌ Unknown service: ${service}`, 'red');
        print(`   Available: sync, coordinator, health`, 'dim');
        return;
    }

    const serviceFile = path.join(TRINITY_DIR, services[service].file);

    if (!fs.existsSync(serviceFile)) {
        print(`❌ Service file not found: ${serviceFile}`, 'red');
        return;
    }

    print(`🚀 Starting ${services[service].title}...`, 'yellow');

    const child = spawn('cmd.exe', ['/c', 'start', services[service].title, 'cmd', '/k', 'node', serviceFile], {
        detached: true,
        stdio: 'ignore'
    });

    child.unref();

    print(`✅ Service started in new window`, 'green');
    print(`   Window title: ${services[service].title}`, 'dim');
}

async function runTests() {
    printHeader('RUNNING TESTS');

    const testFile = path.join(TRINITY_DIR, 'test_cross_computer_sync.js');

    if (!fs.existsSync(testFile)) {
        print('❌ Test file not found', 'red');
        return;
    }

    print('🧪 Running test suite...', 'yellow');

    const child = spawn('node', [testFile], { stdio: 'inherit' });

    child.on('close', (code) => {
        if (code === 0) {
            print('\n✅ Tests completed successfully', 'green');
        } else {
            print('\n❌ Tests failed', 'red');
        }
    });
}

async function sendMessage(target, type, content) {
    printHeader(`SEND MESSAGE TO ${target.toUpperCase()}`);

    const validTargets = ['c1', 'c2', 'c3', 'all', 'trinity'];
    if (!validTargets.includes(target.toLowerCase())) {
        print(`❌ Invalid target: ${target}`, 'red');
        print(`   Valid targets: c1, c2, c3, all, trinity`, 'dim');
        return;
    }

    const message = {
        from: 'CLI',
        to: target.toLowerCase(),
        type: type.toUpperCase(),
        content: content,
        timestamp: Date.now(),
        timestampReadable: new Date().toLocaleString()
    };

    if (target.toLowerCase() === 'all' || target.toLowerCase() === 'trinity') {
        // Broadcast to all instances
        ['c1', 'c2', 'c3'].forEach(inst => {
            const inboxFile = path.join(MESSAGES_DIR, `${inst}_inbox.json`);
            let messages = [];
            if (fs.existsSync(inboxFile)) {
                messages = JSON.parse(fs.readFileSync(inboxFile, 'utf8'));
            }
            messages.push(message);
            fs.writeFileSync(inboxFile, JSON.stringify(messages, null, 2));
        });
        print(`✅ Message broadcast to all Trinity instances`, 'green');
    } else {
        // Send to specific instance
        const inboxFile = path.join(MESSAGES_DIR, `${target.toLowerCase()}_inbox.json`);
        let messages = [];
        if (fs.existsSync(inboxFile)) {
            messages = JSON.parse(fs.readFileSync(inboxFile, 'utf8'));
        }
        messages.push(message);
        fs.writeFileSync(inboxFile, JSON.stringify(messages, null, 2));
        print(`✅ Message sent to ${target.toUpperCase()}`, 'green');
    }
}

async function showHealth() {
    printHeader('NETWORK HEALTH');

    const healthFile = path.join(CLOUD_BASE, 'MASTER', 'health_report.json');

    if (!fs.existsSync(healthFile)) {
        print('⚠️  Health monitor not running', 'yellow');
        print('   Run: trinity start health', 'dim');
        return;
    }

    const health = JSON.parse(fs.readFileSync(healthFile, 'utf8'));
    const ageSeconds = Math.floor((Date.now() - health.timestamp) / 1000);

    const healthEmoji = {
        'EXCELLENT': '🟢',
        'GOOD': '🟡',
        'WARNING': '🟠',
        'DEGRADED': '🔴',
        'CRITICAL': '💀',
        'ERROR': '❌'
    };

    print(`${healthEmoji[health.metrics.overallHealth]} Overall Health: ${health.metrics.overallHealth}`, 'green');
    print(`   Last Check: ${ageSeconds}s ago\n`);

    print(`📈 Metrics:`, 'cyan');
    print(`   Computers Online: ${health.metrics.computersOnline}/3`);
    print(`   Instances Active: ${health.metrics.instancesActive}/9`);
    print(`   Sync Healthy: ${health.metrics.syncHealthy ? 'YES' : 'NO'}`);

    if (health.alerts && health.alerts.length > 0) {
        print(`\n🚨 Active Alerts: ${health.alerts.length}`, 'yellow');
        health.alerts.forEach(alert => {
            const emoji = alert.level === 'CRITICAL' ? '💀' : alert.level === 'WARNING' ? '⚠️' : 'ℹ️';
            print(`   ${emoji} ${alert.message}`, alert.level === 'CRITICAL' ? 'red' : 'yellow');
        });
    } else {
        print(`\n✅ No alerts - all systems nominal`, 'green');
    }
}

async function showHelp() {
    printHeader('TRINITY COMMAND CENTER CLI');

    console.log(colors.cyan + 'Status & Monitoring:' + colors.reset);
    console.log('  trinity status              Show network status');
    console.log('  trinity health              Show health report');
    console.log('  trinity monitor             Open network monitor dashboard');
    console.log('');

    console.log(colors.cyan + 'Instance Control:' + colors.reset);
    console.log('  trinity wake <computer> <instance>  Wake instance (e.g., trinity wake a c1)');
    console.log('  trinity wake all            Wake all instances on Computer A');
    console.log('');

    console.log(colors.cyan + 'Service Control:' + colors.reset);
    console.log('  trinity start sync          Start cloud sync');
    console.log('  trinity start coordinator   Start master coordinator');
    console.log('  trinity start health        Start health monitor');
    console.log('  trinity start all           Start all services');
    console.log('');

    console.log(colors.cyan + 'Communication:' + colors.reset);
    console.log('  trinity message <target> <type> <content>  Send message');
    console.log('                              (target: c1, c2, c3, all, trinity)');
    console.log('                              (type: ASK, SHOW, TELL, BROADCAST)');
    console.log('');

    console.log(colors.cyan + 'Testing & Deployment:' + colors.reset);
    console.log('  trinity test                Run test suite');
    console.log('  trinity deploy              Create USB deployment package');
    console.log('');

    console.log(colors.cyan + 'Quick Actions:' + colors.reset);
    console.log('  trinity quick-start         Start sync + coordinator');
    console.log('  trinity full-boot           Start all services + wake all instances');
    console.log('');
}

async function quickStart() {
    printHeader('QUICK START');
    print('🚀 Starting essential services...\n', 'yellow');

    await startService('sync');
    await new Promise(resolve => setTimeout(resolve, 1000));

    await startService('coordinator');

    print('\n✅ Quick start complete!', 'green');
    print('   Cloud Sync + Master Coordinator running', 'dim');
    print('   Run "trinity status" to verify', 'dim');
}

async function fullBoot() {
    printHeader('FULL BOOT');
    print('🚀 Full Trinity boot sequence...\n', 'yellow');

    // Start all services
    await startService('sync');
    await new Promise(resolve => setTimeout(resolve, 1000));
    await startService('coordinator');
    await new Promise(resolve => setTimeout(resolve, 1000));
    await startService('health');

    print('\n🔄 Waiting for services to initialize...', 'yellow');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Wake all instances
    print('\n🚀 Waking all Trinity instances...', 'yellow');
    const batchFile = path.join(TRINITY_DIR, 'wake_all.bat');
    if (fs.existsSync(batchFile)) {
        exec(`"${batchFile}"`, () => {
            print('\n✅ Full boot complete!', 'green');
            print('   All services running + All instances waking', 'dim');
            print('   Run "trinity status" to verify', 'dim');
        });
    }
}

async function openMonitor() {
    printHeader('OPENING NETWORK MONITOR');

    const monitorFile = path.join(process.env.USERPROFILE, 'TRINITY_NETWORK_MONITOR.html');

    if (!fs.existsSync(monitorFile)) {
        print('❌ Monitor file not found', 'red');
        return;
    }

    print('🌐 Opening network monitor dashboard...', 'yellow');
    exec(`start "" "${monitorFile}"`);
    print('✅ Dashboard opened in browser', 'green');
}

async function createDeployment() {
    printHeader('CREATE USB DEPLOYMENT');

    const deployScript = path.join(TRINITY_DIR, 'DEPLOY_TO_USB.bat');

    if (!fs.existsSync(deployScript)) {
        print('❌ Deployment script not found', 'red');
        return;
    }

    print('📦 Running USB deployment packager...', 'yellow');
    exec(`"${deployScript}"`);
}

// Main CLI router
async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        await showHelp();
        return;
    }

    const command = args[0].toLowerCase();

    switch (command) {
        case 'status':
            await showStatus();
            break;

        case 'health':
            await showHealth();
            break;

        case 'wake':
            if (args[1] === 'all') {
                const batchFile = path.join(TRINITY_DIR, 'wake_all.bat');
                exec(`"${batchFile}"`);
                print('✅ Waking all instances...', 'green');
            } else if (args.length >= 3) {
                await wakeInstance(args[1], args[2], args.slice(3).join(' ') || 'Manual wake');
            } else {
                print('❌ Usage: trinity wake <computer> <instance>', 'red');
                print('   Example: trinity wake a c1', 'dim');
                print('   Or: trinity wake all', 'dim');
            }
            break;

        case 'start':
            if (args[1] === 'all') {
                await quickStart();
            } else if (args[1]) {
                await startService(args[1]);
            } else {
                print('❌ Usage: trinity start <service>', 'red');
                print('   Services: sync, coordinator, health, all', 'dim');
            }
            break;

        case 'message':
            if (args.length >= 4) {
                await sendMessage(args[1], args[2], args.slice(3).join(' '));
            } else {
                print('❌ Usage: trinity message <target> <type> <content>', 'red');
                print('   Example: trinity message c1 ASK What is your status?', 'dim');
            }
            break;

        case 'test':
            await runTests();
            break;

        case 'monitor':
            await openMonitor();
            break;

        case 'deploy':
            await createDeployment();
            break;

        case 'quick-start':
            await quickStart();
            break;

        case 'full-boot':
            await fullBoot();
            break;

        case 'help':
        case '--help':
        case '-h':
            await showHelp();
            break;

        default:
            print(`❌ Unknown command: ${command}`, 'red');
            print('   Run "trinity help" for usage', 'dim');
    }
}

// Run CLI
main().catch(error => {
    console.error(colors.red + '❌ Error: ' + error.message + colors.reset);
    process.exit(1);
});
