#!/usr/bin/env node
/**
 * System Validation Script
 * Built by C1 Cloud (CP3) - Autonomous Work
 *
 * Validates all system components before deployment
 * Run: node scripts/validate-system.js
 */

const fs = require('fs');
const path = require('path');

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

const ok = (msg) => console.log(`  ${colors.green}✓${colors.reset} ${msg}`);
const fail = (msg) => console.log(`  ${colors.red}✗${colors.reset} ${msg}`);
const warn = (msg) => console.log(`  ${colors.yellow}!${colors.reset} ${msg}`);
const section = (msg) => console.log(`\n${colors.cyan}${msg}${colors.reset}`);

let passed = 0;
let failed = 0;
let warnings = 0;

function check(condition, passMsg, failMsg) {
  if (condition) {
    ok(passMsg);
    passed++;
    return true;
  } else {
    fail(failMsg);
    failed++;
    return false;
  }
}

function checkWarn(condition, passMsg, warnMsg) {
  if (condition) {
    ok(passMsg);
    passed++;
  } else {
    warn(warnMsg);
    warnings++;
  }
}

async function validateSystem() {
  console.log(`\n${colors.cyan}═══════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}  PHILOSOPHER AI - SYSTEM VALIDATION${colors.reset}`);
  console.log(`${colors.cyan}═══════════════════════════════════════════${colors.reset}`);

  // 1. Core Files
  section('[1/6] Core Files');

  const coreFiles = [
    'server.js',
    'package.json',
    'package-lock.json',
    'database-schema.sql'
  ];

  for (const file of coreFiles) {
    check(
      fs.existsSync(path.join(process.cwd(), file)),
      `${file} exists`,
      `${file} MISSING`
    );
  }

  // 2. Configuration
  section('[2/6] Configuration');

  const configFiles = [
    'Dockerfile',
    'docker-compose.yml',
    'ecosystem.config.js',
    'Makefile',
    '.env.example'
  ];

  for (const file of configFiles) {
    checkWarn(
      fs.existsSync(path.join(process.cwd(), file)),
      `${file} exists`,
      `${file} not found (optional)`
    );
  }

  // 3. Utils
  section('[3/6] Utilities');

  const utils = [
    'utils/db.js',
    'utils/validators.js',
    'utils/response.js',
    'utils/cache.js',
    'utils/crypto.js',
    'utils/retry.js',
    'utils/index.js'
  ];

  for (const file of utils) {
    check(
      fs.existsSync(path.join(process.cwd(), file)),
      file.replace('utils/', ''),
      `${file} MISSING`
    );
  }

  // 4. Middleware
  section('[4/6] Middleware');

  const middleware = [
    'middleware/auth.js',
    'middleware/asyncHandler.js',
    'middleware/rateLimiter.js',
    'middleware/security.js',
    'middleware/index.js'
  ];

  for (const file of middleware) {
    check(
      fs.existsSync(path.join(process.cwd(), file)),
      file.replace('middleware/', ''),
      `${file} MISSING`
    );
  }

  // 5. Scripts
  section('[5/6] Scripts');

  const scripts = [
    'scripts/startup-check.js',
    'scripts/validate-env.js',
    'scripts/generate-secret.js',
    'scripts/seed-db.js'
  ];

  for (const file of scripts) {
    checkWarn(
      fs.existsSync(path.join(process.cwd(), file)),
      file.replace('scripts/', ''),
      `${file} not found`
    );
  }

  // 6. Package Dependencies
  section('[6/6] Dependencies');

  try {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const deps = Object.keys(pkg.dependencies || {});

    const required = ['express', 'pg', 'bcrypt', 'jsonwebtoken', 'cors', 'helmet'];

    for (const dep of required) {
      check(
        deps.includes(dep),
        `${dep} in dependencies`,
        `${dep} MISSING from dependencies`
      );
    }

    // Check node_modules exists
    checkWarn(
      fs.existsSync('node_modules'),
      'node_modules installed',
      'Run npm install'
    );

  } catch (e) {
    fail('Could not read package.json');
    failed++;
  }

  // Summary
  console.log(`\n${colors.cyan}═══════════════════════════════════════════${colors.reset}`);
  console.log(`  Results: ${colors.green}${passed} passed${colors.reset}, ${colors.red}${failed} failed${colors.reset}, ${colors.yellow}${warnings} warnings${colors.reset}`);
  console.log(`${colors.cyan}═══════════════════════════════════════════${colors.reset}\n`);

  if (failed > 0) {
    console.log(`${colors.red}System validation FAILED${colors.reset}`);
    console.log('Fix the issues above before proceeding.\n');
    process.exit(1);
  } else if (warnings > 0) {
    console.log(`${colors.yellow}System validation PASSED with warnings${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`${colors.green}System validation PASSED${colors.reset}\n`);
    process.exit(0);
  }
}

validateSystem().catch(err => {
  console.error('Validation error:', err.message);
  process.exit(1);
});
