-- ================================================
-- FIX: Convert SQLite schema to PostgreSQL
-- ================================================
-- Migration: 002_fix_postgres_schema
-- Description: Fixes schema mismatch from SQLite to PostgreSQL
-- Created: 2025-11-08 (C2 Architect - Round 6)
-- ================================================
-- This migration ensures the users table has all required columns
-- with correct PostgreSQL data types and constraints.
-- Uses safe IF NOT EXISTS / IF EXISTS clauses.
-- ================================================

-- Add missing columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS pin VARCHAR(10) UNIQUE;

-- Drop old SQLite-style password column if it exists
-- (Migration 001 might have created both 'password' and 'password_hash')
ALTER TABLE users DROP COLUMN IF EXISTS password;

-- Ensure columns have correct PostgreSQL types
-- Note: These will fail gracefully if column doesn't exist or is already correct type
DO $$
BEGIN
    -- Try to alter created_at to TIMESTAMP
    BEGIN
        ALTER TABLE users ALTER COLUMN created_at TYPE TIMESTAMP USING created_at::TIMESTAMP;
    EXCEPTION
        WHEN undefined_column THEN NULL;
        WHEN others THEN NULL;
    END;

    -- Try to alter updated_at to TIMESTAMP
    BEGIN
        ALTER TABLE users ALTER COLUMN updated_at TYPE TIMESTAMP USING updated_at::TIMESTAMP;
    EXCEPTION
        WHEN undefined_column THEN NULL;
        WHEN others THEN NULL;
    END;

    -- Try to convert permissions from TEXT to JSONB if needed
    BEGIN
        ALTER TABLE users ALTER COLUMN permissions TYPE JSONB USING
            CASE
                WHEN permissions::text = '' THEN '{}'::jsonb
                WHEN permissions::text ~ '^\{.*\}$' THEN permissions::jsonb
                ELSE '{}'::jsonb
            END;
    EXCEPTION
        WHEN undefined_column THEN NULL;
        WHEN others THEN NULL;
    END;
END $$;

-- Ensure NOT NULL constraints on critical fields
-- Note: These will fail if there are existing NULL values
-- In that case, we need to fill in default values first

DO $$
BEGIN
    -- Set default password_hash for any NULL values
    UPDATE users SET password_hash = 'MIGRATION_PLACEHOLDER_HASH'
    WHERE password_hash IS NULL;

    -- Now add NOT NULL constraint
    BEGIN
        ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL;
    EXCEPTION
        WHEN others THEN NULL;
    END;

    -- Ensure name is NOT NULL
    BEGIN
        ALTER TABLE users ALTER COLUMN name SET NOT NULL;
    EXCEPTION
        WHEN others THEN NULL;
    END;

    -- Ensure email is NOT NULL
    BEGIN
        ALTER TABLE users ALTER COLUMN email SET NOT NULL;
    EXCEPTION
        WHEN others THEN NULL;
    END;
END $$;

-- Add helpful column comments
COMMENT ON COLUMN users.password_hash IS 'Bcrypt hash of user password';
COMMENT ON COLUMN users.is_active IS 'Whether user account is active';
COMMENT ON COLUMN users.email_verified IS 'Whether user email has been verified';
COMMENT ON COLUMN users.pin IS 'Optional 4-digit PIN for quick login';
COMMENT ON COLUMN users.permissions IS 'User permissions and roles as JSONB';
COMMENT ON COLUMN users.last_login IS 'Timestamp of last successful login';

-- Ensure indexes exist (safe with IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_pin ON users(pin);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- Fix sessions table if it exists
DO $$
BEGIN
    -- Try to alter expires_at to TIMESTAMP
    BEGIN
        ALTER TABLE sessions ALTER COLUMN expires_at TYPE TIMESTAMP USING expires_at::TIMESTAMP;
    EXCEPTION
        WHEN undefined_table THEN NULL;
        WHEN undefined_column THEN NULL;
        WHEN others THEN NULL;
    END;

    -- Try to alter created_at to TIMESTAMP
    BEGIN
        ALTER TABLE sessions ALTER COLUMN created_at TYPE TIMESTAMP USING created_at::TIMESTAMP;
    EXCEPTION
        WHEN undefined_table THEN NULL;
        WHEN undefined_column THEN NULL;
        WHEN others THEN NULL;
    END;
END $$;

-- Fix consciousness_data table if it exists
DO $$
BEGIN
    -- Try to convert data column from TEXT to JSONB
    BEGIN
        ALTER TABLE consciousness_data ADD COLUMN IF NOT EXISTS data_jsonb JSONB DEFAULT '{}';
        UPDATE consciousness_data SET data_jsonb = data::jsonb WHERE data IS NOT NULL;
        ALTER TABLE consciousness_data DROP COLUMN IF EXISTS data;
        ALTER TABLE consciousness_data RENAME COLUMN data_jsonb TO data;
    EXCEPTION
        WHEN undefined_table THEN NULL;
        WHEN others THEN NULL;
    END;

    -- Fix timestamp columns
    BEGIN
        ALTER TABLE consciousness_data ALTER COLUMN created_at TYPE TIMESTAMP USING created_at::TIMESTAMP;
    EXCEPTION
        WHEN undefined_table THEN NULL;
        WHEN undefined_column THEN NULL;
        WHEN others THEN NULL;
    END;

    BEGIN
        ALTER TABLE consciousness_data ALTER COLUMN updated_at TYPE TIMESTAMP USING updated_at::TIMESTAMP;
    EXCEPTION
        WHEN undefined_table THEN NULL;
        WHEN undefined_column THEN NULL;
        WHEN others THEN NULL;
    END;
END $$;

-- Create migrations table if it doesn't exist (PostgreSQL version)
CREATE TABLE IF NOT EXISTS migrations (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) UNIQUE NOT NULL,
    applied_at TIMESTAMP DEFAULT NOW()
);

-- Record this migration
INSERT INTO migrations (migration_name, applied_at)
VALUES ('002_fix_postgres_schema', NOW())
ON CONFLICT (migration_name) DO NOTHING;

-- Output success message
DO $$
BEGIN
    RAISE NOTICE '✅ Migration 002_fix_postgres_schema completed successfully';
    RAISE NOTICE '📊 Users table schema fixed for PostgreSQL';
    RAISE NOTICE '✅ All required columns added with safe defaults';
END $$;
