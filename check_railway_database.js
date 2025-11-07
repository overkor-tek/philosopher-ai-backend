#!/usr/bin/env node
/**
 * Check Railway Database Schema
 * Verifies what's actually in the database
 */

require('dotenv').config({ path: '.env.production' });
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function checkDatabase() {
    console.log('🔍 Checking Railway Database Schema...\n');

    try {
        // Check if users table exists
        const tableCheck = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_name = 'users'
            );
        `);

        console.log(`Users table exists: ${tableCheck.rows[0].exists}`);

        if (tableCheck.rows[0].exists) {
            // Get column names
            const columns = await pool.query(`
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns
                WHERE table_name = 'users'
                ORDER BY ordinal_position;
            `);

            console.log('\n📋 Users Table Columns:');
            console.log('=====================================');
            columns.rows.forEach(col => {
                console.log(`  ${col.column_name} (${col.data_type})`);
            });

            // Check for specific columns
            const hasPassword = columns.rows.some(c => c.column_name === 'password');
            const hasPasswordHash = columns.rows.some(c => c.column_name === 'password_hash');
            const hasUsername = columns.rows.some(c => c.column_name === 'username');
            const hasSignupSource = columns.rows.some(c => c.column_name === 'signup_source');
            const hasTier = columns.rows.some(c => c.column_name === 'tier');

            console.log('\n🔍 Critical Columns:');
            console.log(`  password: ${hasPassword ? '✓ EXISTS' : '✗ MISSING'}`);
            console.log(`  password_hash: ${hasPasswordHash ? '✓ EXISTS' : '✗ MISSING'}`);
            console.log(`  username: ${hasUsername ? '✓ EXISTS' : '✗ MISSING'}`);
            console.log(`  signup_source: ${hasSignupSource ? '✓ EXISTS' : '✗ MISSING'}`);
            console.log(`  tier: ${hasTier ? '✓ EXISTS' : '✗ MISSING'}`);

            if (hasPassword && !hasPasswordHash) {
                console.log('\n🔴 PROBLEM: Table has "password" but needs "password_hash"');
                console.log('   Solution: ALTER TABLE users RENAME COLUMN password TO password_hash;');
            } else if (hasPasswordHash) {
                console.log('\n✅ Correct: Table has password_hash column');
            }

            // Check row count
            const count = await pool.query('SELECT COUNT(*) FROM users');
            console.log(`\n📊 Users in database: ${count.rows[0].count}`);
        } else {
            console.log('\n⚠️  Users table does NOT exist');
            console.log('   init-database.js needs to run on startup');
        }

        // Check other tables
        const tables = await pool.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            ORDER BY table_name;
        `);

        console.log('\n📁 All Tables in Database:');
        if (tables.rows.length === 0) {
            console.log('  (No tables found - database is empty!)');
        } else {
            tables.rows.forEach(t => {
                console.log(`  - ${t.table_name}`);
            });
        }

    } catch (error) {
        console.error('\n❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkDatabase();
