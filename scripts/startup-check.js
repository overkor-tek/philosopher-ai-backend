#!/usr/bin/env node
/**
 * Startup Health Check
 * Built by C1 Cloud (CP3) - Autonomous Work
 *
 * Comprehensive system check before server starts
 * Validates environment, database, and external services
 *
 * Usage: node scripts/startup-check.js
 */

require('dotenv').config();

const { Pool } = require('pg');

// ANSI colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m'
};

const ok = (msg) => console.log(`   ${colors.green}✓${colors.reset} ${msg}`);
const fail = (msg) => console.log(`   ${colors.red}✗${colors.reset} ${msg}`);
const warn = (msg) => console.log(`   ${colors.yellow}!${colors.reset} ${msg}`);
const info = (msg) => console.log(`   ${colors.dim}${msg}${colors.reset}`);

let errors = 0;
let warnings = 0;

async function main() {
  console.log(`\n${colors.cyan}STARTUP HEALTH CHECK${colors.reset}`);
  console.log('═'.repeat(50));

  // 1. Node.js version
  console.log('\n[1/5] Node.js Version');
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  if (majorVersion >= 18) {
    ok(`Node ${nodeVersion} (recommended: 18+)`);
  } else if (majorVersion >= 16) {
    warn(`Node ${nodeVersion} (recommend upgrading to 18+)`);
    warnings++;
  } else {
    fail(`Node ${nodeVersion} (minimum: 16, recommended: 18+)`);
    errors++;
  }

  // 2. Environment variables
  console.log('\n[2/5] Environment Variables');

  // Required
  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) {
    fail('JWT_SECRET not set');
    errors++;
  } else if (JWT_SECRET.length < 32) {
    fail(`JWT_SECRET too short (${JWT_SECRET.length} chars, need 32+)`);
    errors++;
  } else {
    ok(`JWT_SECRET configured (${JWT_SECRET.length} chars)`);
  }

  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    fail('DATABASE_URL not set');
    errors++;
  } else {
    ok('DATABASE_URL configured');
  }

  // NODE_ENV
  const NODE_ENV = process.env.NODE_ENV || 'development';
  if (!['development', 'production', 'test'].includes(NODE_ENV)) {
    warn(`NODE_ENV='${NODE_ENV}' (unusual value)`);
    warnings++;
  } else {
    ok(`NODE_ENV=${NODE_ENV}`);
  }

  // Port
  const PORT = process.env.PORT || 3001;
  ok(`PORT=${PORT}`);

  // 3. Database connectivity
  console.log('\n[3/5] Database Connectivity');
  if (DATABASE_URL) {
    const pool = new Pool({
      connectionString: DATABASE_URL,
      connectionTimeoutMillis: 5000,
      ssl: NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    try {
      const start = Date.now();
      const result = await pool.query('SELECT NOW() as time, current_database() as db');
      const latency = Date.now() - start;

      ok(`Connected to "${result.rows[0].db}" (${latency}ms)`);

      // Check critical tables
      try {
        const tables = await pool.query(`
          SELECT table_name
          FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name IN ('users', 'conversations', 'messages')
        `);

        const found = tables.rows.map(r => r.table_name);
        const required = ['users', 'conversations', 'messages'];
        const missing = required.filter(t => !found.includes(t));

        if (missing.length === 0) {
          ok(`Required tables exist: ${found.join(', ')}`);
        } else {
          warn(`Missing tables: ${missing.join(', ')}`);
          info('Run database migrations to create tables');
          warnings++;
        }
      } catch (e) {
        warn('Could not check tables');
        warnings++;
      }

      await pool.end();
    } catch (error) {
      fail(`Connection failed: ${error.message}`);
      errors++;
    }
  } else {
    fail('Skipped - DATABASE_URL not configured');
    errors++;
  }

  // 4. Optional services
  console.log('\n[4/5] External Services');

  // Anthropic
  if (process.env.ANTHROPIC_API_KEY) {
    ok('Anthropic API configured');
  } else {
    info('Anthropic API not configured (AI features disabled)');
  }

  // Stripe
  if (process.env.STRIPE_SECRET_KEY) {
    ok('Stripe configured');
  } else {
    info('Stripe not configured (payments disabled)');
  }

  // SendGrid
  if (process.env.SENDGRID_API_KEY) {
    ok('SendGrid configured');
  } else {
    info('SendGrid not configured (emails disabled)');
  }

  // 5. File system
  console.log('\n[5/5] File System');

  const fs = require('fs');
  const path = require('path');

  const dirs = ['logs', 'backups'];
  for (const dir of dirs) {
    const dirPath = path.join(process.cwd(), dir);
    if (fs.existsSync(dirPath)) {
      ok(`${dir}/ exists`);
    } else {
      try {
        fs.mkdirSync(dirPath, { recursive: true });
        ok(`${dir}/ created`);
      } catch (e) {
        warn(`Could not create ${dir}/`);
        warnings++;
      }
    }
  }

  // Summary
  console.log('\n' + '═'.repeat(50));

  if (errors > 0) {
    console.log(`\n${colors.red}STARTUP CHECK FAILED${colors.reset}`);
    console.log(`${errors} error(s), ${warnings} warning(s)\n`);
    process.exit(1);
  } else if (warnings > 0) {
    console.log(`\n${colors.yellow}STARTUP CHECK PASSED WITH WARNINGS${colors.reset}`);
    console.log(`${warnings} warning(s)\n`);
    process.exit(0);
  } else {
    console.log(`\n${colors.green}STARTUP CHECK PASSED${colors.reset}`);
    console.log('All systems operational\n');
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Startup check failed:', err.message);
  process.exit(1);
});
