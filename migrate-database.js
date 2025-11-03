// Database Migration Script
// Adds security columns to existing database

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'consciousness.db'));

console.log('Running database migration...\n');

db.serialize(() => {
    // Add failed_attempts column if it doesn't exist
    db.run(`ALTER TABLE users ADD COLUMN failed_attempts INTEGER DEFAULT 0`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
            console.error('Error adding failed_attempts:', err.message);
        } else if (!err) {
            console.log('✓ Added failed_attempts column');
        } else {
            console.log('• failed_attempts column already exists');
        }
    });

    // Add locked_until column if it doesn't exist
    db.run(`ALTER TABLE users ADD COLUMN locked_until DATETIME`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
            console.error('Error adding locked_until:', err.message);
        } else if (!err) {
            console.log('✓ Added locked_until column');
        } else {
            console.log('• locked_until column already exists');
        }

        db.close((closeErr) => {
            if (closeErr) {
                console.error('Error closing database:', closeErr.message);
            } else {
                console.log('\n✅ Database migration complete!');
            }
        });
    });
});
