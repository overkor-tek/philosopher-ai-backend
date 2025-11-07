// Quick script to run migration 005 on Railway database
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    console.log('🔧 Running Migration 005: Database Functions');
    console.log('=' . repeat(60));

    // Get DATABASE_URL from environment (Railway will provide this)
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
        console.error('❌ ERROR: DATABASE_URL not found in environment');
        console.log('Run with: railway run node run_migration_005.js');
        process.exit(1);
    }

    console.log('✅ Database URL found');

    // Connect to database
    const pool = new Pool({
        connectionString: databaseUrl,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        // Read migration file
        const migrationPath = path.join(__dirname, 'migrations', '005_database_functions.sql');
        console.log(`📄 Reading migration: ${migrationPath}`);

        const sql = fs.readFileSync(migrationPath, 'utf8');

        console.log('🚀 Executing migration...');

        // Run the migration
        await pool.query(sql);

        console.log('✅ Migration 005 completed successfully!');
        console.log('');
        console.log('Functions created:');
        console.log('  - reset_monthly_questions()');
        console.log('  - can_user_ask_question(user_id)');
        console.log('');
        console.log('✅ Production error should be fixed now');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error('Full error:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runMigration();
