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
                    password_hash VARCHAR(255) NOT NULL,
                    name VARCHAR(255),
                    username VARCHAR(255),
                    signup_source VARCHAR(50) DEFAULT 'direct',
                    tier VARCHAR(50) DEFAULT 'free',
                    pin_hash VARCHAR(255),
                    subscription_tier VARCHAR(50) DEFAULT 'free',
                    anthropic_api_key VARCHAR(255),
                    manipulation_immunity_score FLOAT DEFAULT 0,
                    is_active BOOLEAN DEFAULT true,
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

            // Create knowledge table (Data Cyclotron)
            await client.query(`
                CREATE TABLE IF NOT EXISTS knowledge (
                    id SERIAL PRIMARY KEY,
                    title VARCHAR(500) NOT NULL,
                    content TEXT NOT NULL,
                    source VARCHAR(255) DEFAULT 'cyclotron',
                    source_url TEXT,
                    categories TEXT[],
                    keywords TEXT[],
                    priority_score INTEGER DEFAULT 50,
                    metadata JSONB DEFAULT '{}',
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
            await client.query('CREATE INDEX IF NOT EXISTS idx_knowledge_source ON knowledge(source)');
            await client.query('CREATE INDEX IF NOT EXISTS idx_knowledge_created_at ON knowledge(created_at)');
            await client.query('CREATE INDEX IF NOT EXISTS idx_knowledge_priority ON knowledge(priority_score)');
            await client.query('CREATE INDEX IF NOT EXISTS idx_knowledge_categories ON knowledge USING GIN(categories)');
            await client.query('CREATE INDEX IF NOT EXISTS idx_knowledge_keywords ON knowledge USING GIN(keywords)');

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

            await client.query(`
                DROP TRIGGER IF EXISTS update_knowledge_updated_at ON knowledge;
                CREATE TRIGGER update_knowledge_updated_at
                    BEFORE UPDATE ON knowledge
                    FOR EACH ROW
                    EXECUTE FUNCTION update_updated_at_column()
            `);

            await client.query('COMMIT');
            console.log('✅ Database schema created successfully!');
        } else {
            console.log('✅ Database schema already exists');
        }

        // Separately check and create knowledge table (for migrations)
        const knowledgeCheck = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_name = 'knowledge'
            );
        `);

        if (!knowledgeCheck.rows[0].exists) {
            console.log('📋 Creating knowledge table (migration)...');
            await client.query('BEGIN');

            // Create knowledge table
            await client.query(`
                CREATE TABLE IF NOT EXISTS knowledge (
                    id SERIAL PRIMARY KEY,
                    title VARCHAR(500) NOT NULL,
                    content TEXT NOT NULL,
                    source VARCHAR(255) DEFAULT 'cyclotron',
                    source_url TEXT,
                    categories TEXT[],
                    keywords TEXT[],
                    priority_score INTEGER DEFAULT 50,
                    metadata JSONB DEFAULT '{}',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Create indexes
            await client.query('CREATE INDEX IF NOT EXISTS idx_knowledge_source ON knowledge(source)');
            await client.query('CREATE INDEX IF NOT EXISTS idx_knowledge_created_at ON knowledge(created_at)');
            await client.query('CREATE INDEX IF NOT EXISTS idx_knowledge_priority ON knowledge(priority_score)');
            await client.query('CREATE INDEX IF NOT EXISTS idx_knowledge_categories ON knowledge USING GIN(categories)');
            await client.query('CREATE INDEX IF NOT EXISTS idx_knowledge_keywords ON knowledge USING GIN(keywords)');

            // Add trigger
            await client.query(`
                DROP TRIGGER IF EXISTS update_knowledge_updated_at ON knowledge;
                CREATE TRIGGER update_knowledge_updated_at
                    BEFORE UPDATE ON knowledge
                    FOR EACH ROW
                    EXECUTE FUNCTION update_updated_at_column()
            `);

            await client.query('COMMIT');
            console.log('✅ Knowledge table created successfully!');
        }

        // Separately check and create Trinity tables (for multi-instance coordination)
        const trinityInstancesCheck = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_name = 'trinity_instances'
            );
        `);

        if (!trinityInstancesCheck.rows[0].exists) {
            console.log('📋 Creating Trinity coordination tables (migration)...');
            await client.query('BEGIN');

            // Trinity instances table (tracks active AI instances)
            await client.query(`
                CREATE TABLE IF NOT EXISTS trinity_instances (
                    id SERIAL PRIMARY KEY,
                    instance_id VARCHAR(255) UNIQUE NOT NULL,
                    role VARCHAR(50) NOT NULL,
                    computer_name VARCHAR(255),
                    status VARCHAR(50) DEFAULT 'active',
                    focus TEXT,
                    last_heartbeat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    metadata JSONB DEFAULT '{}'
                )
            `);

            // Trinity tasks table (task claiming and coordination)
            await client.query(`
                CREATE TABLE IF NOT EXISTS trinity_tasks (
                    id SERIAL PRIMARY KEY,
                    task_name VARCHAR(500) NOT NULL,
                    description TEXT,
                    assigned_to VARCHAR(255),
                    role_target VARCHAR(50),
                    status VARCHAR(50) DEFAULT 'available',
                    priority INTEGER DEFAULT 50,
                    estimated_hours INTEGER,
                    claimed_at TIMESTAMP,
                    completed_at TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    metadata JSONB DEFAULT '{}'
                )
            `);

            // Trinity state table (shared state/status)
            await client.query(`
                CREATE TABLE IF NOT EXISTS trinity_state (
                    id SERIAL PRIMARY KEY,
                    key VARCHAR(255) UNIQUE NOT NULL,
                    value JSONB NOT NULL,
                    updated_by VARCHAR(255),
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Create indexes
            await client.query('CREATE INDEX IF NOT EXISTS idx_trinity_instances_role ON trinity_instances(role)');
            await client.query('CREATE INDEX IF NOT EXISTS idx_trinity_instances_status ON trinity_instances(status)');
            await client.query('CREATE INDEX IF NOT EXISTS idx_trinity_tasks_status ON trinity_tasks(status)');
            await client.query('CREATE INDEX IF NOT EXISTS idx_trinity_tasks_assigned ON trinity_tasks(assigned_to)');
            await client.query('CREATE INDEX IF NOT EXISTS idx_trinity_state_key ON trinity_state(key)');

            // Add triggers
            await client.query(`
                DROP TRIGGER IF EXISTS update_trinity_tasks_updated_at ON trinity_tasks;
                CREATE TRIGGER update_trinity_tasks_updated_at
                    BEFORE UPDATE ON trinity_tasks
                    FOR EACH ROW
                    EXECUTE FUNCTION update_updated_at_column()
            `);

            await client.query('COMMIT');
            console.log('✅ Trinity coordination tables created successfully!');
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
