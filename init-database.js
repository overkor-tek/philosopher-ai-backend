// Database Initialization - Auto-runs on server startup
// Creates tables if they don't exist

const { Pool } = require('pg');

async function initializeDatabase(pool) {
    const client = await pool.connect();

    try {
        console.log('🔍 Checking database schema...');

        // Check if users table exists
        const tableCheck = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_name = 'users'
            );
        `);

        if (!tableCheck.rows[0].exists) {
            console.log('📋 Creating database schema...');
            await client.query('BEGIN');

            // Create users table
            await client.query(`
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    password VARCHAR(255) NOT NULL,
                    name VARCHAR(255) NOT NULL,
                    pin_hash VARCHAR(255),
                    subscription_tier VARCHAR(50) DEFAULT 'free',
                    anthropic_api_key VARCHAR(255),
                    manipulation_immunity_score FLOAT DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_login TIMESTAMP,
                    failed_attempts INTEGER DEFAULT 0,
                    locked_until TIMESTAMP,
                    email_verified BOOLEAN DEFAULT false,
                    verification_token VARCHAR(255),
                    reset_token VARCHAR(255),
                    reset_token_expires TIMESTAMP
                )
            `);

            // Create sessions table
            await client.query(`
                CREATE TABLE IF NOT EXISTS sessions (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    session_token VARCHAR(255) UNIQUE NOT NULL,
                    expires_at TIMESTAMP NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    ip_address VARCHAR(50),
                    user_agent TEXT
                )
            `);

            // Create conversations table
            await client.query(`
                CREATE TABLE IF NOT EXISTS conversations (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    title VARCHAR(255),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    archived BOOLEAN DEFAULT false
                )
            `);

            // Create messages table
            await client.query(`
                CREATE TABLE IF NOT EXISTS messages (
                    id SERIAL PRIMARY KEY,
                    conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
                    role VARCHAR(50) NOT NULL,
                    content TEXT NOT NULL,
                    manipulation_detected BOOLEAN DEFAULT false,
                    manipulation_score FLOAT DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Create payments table
            await client.query(`
                CREATE TABLE IF NOT EXISTS payments (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    stripe_payment_id VARCHAR(255) UNIQUE,
                    amount DECIMAL(10, 2) NOT NULL,
                    currency VARCHAR(3) DEFAULT 'USD',
                    status VARCHAR(50) NOT NULL,
                    payment_method VARCHAR(50),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Create indexes
            await client.query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
            await client.query('CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)');
            await client.query('CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token)');
            await client.query('CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id)');
            await client.query('CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id)');
            await client.query('CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id)');

            // Create trigger function
            await client.query(`
                CREATE OR REPLACE FUNCTION update_updated_at_column()
                RETURNS TRIGGER AS $$
                BEGIN
                    NEW.updated_at = CURRENT_TIMESTAMP;
                    RETURN NEW;
                END;
                $$ language 'plpgsql'
            `);

            // Add triggers
            await client.query(`
                DROP TRIGGER IF EXISTS update_users_updated_at ON users;
                CREATE TRIGGER update_users_updated_at
                    BEFORE UPDATE ON users
                    FOR EACH ROW
                    EXECUTE FUNCTION update_updated_at_column()
            `);

            await client.query(`
                DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
                CREATE TRIGGER update_conversations_updated_at
                    BEFORE UPDATE ON conversations
                    FOR EACH ROW
                    EXECUTE FUNCTION update_updated_at_column()
            `);

            await client.query('COMMIT');
            console.log('✅ Database schema created successfully!');
        } else {
            console.log('✅ Database schema already exists');
        }

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Database initialization failed:', error.message);
        throw error;
    } finally {
        client.release();
    }
}

module.exports = { initializeDatabase };
