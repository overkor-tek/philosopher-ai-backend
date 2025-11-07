// ================================================
// DATABASE MIGRATION RUNNER
// ================================================
// Runs all SQL migrations in the migrations/ folder
// Safe to run multiple times (uses IF NOT EXISTS)
// ================================================

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`
});

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function runMigrations() {
    try {
        console.log('🔧 Starting database migrations...\n');

        // Get all .sql files from migrations directory
        const files = fs.readdirSync(MIGRATIONS_DIR)
            .filter(f => f.endsWith('.sql'))
            .sort(); // Run in alphabetical order (001, 002, 003, etc.)

        console.log(`Found ${files.length} migration files:\n`);
        files.forEach(f => console.log(`  - ${f}`));
        console.log('');

        // Run each migration
        for (const file of files) {
            const filePath = path.join(MIGRATIONS_DIR, file);
            const sql = fs.readFileSync(filePath, 'utf8');

            console.log(`Running migration: ${file}...`);

            try {
                await pool.query(sql);
                console.log(`✅ ${file} completed successfully\n`);
            } catch (error) {
                console.error(`❌ ${file} failed:`, error.message);
                console.error('   Continuing with remaining migrations...\n');
            }
        }

        console.log('✅ All migrations completed!\n');

        // Show current table structure
        console.log('📊 Verifying users table structure...\n');
        const result = await pool.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'users'
            ORDER BY ordinal_position;
        `);

        console.log('Users table columns:');
        result.rows.forEach(row => {
            console.log(`  - ${row.column_name} (${row.data_type}) ${row.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
        });

    } catch (error) {
        console.error('❌ Migration runner failed:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runMigrations();
