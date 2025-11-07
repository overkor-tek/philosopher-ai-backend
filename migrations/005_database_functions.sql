-- Migration: 005_database_functions
-- Description: Create PostgreSQL functions for question limits
-- Created: 2025-11-07
-- Fixes: Missing reset_monthly_questions() and can_user_ask_question() functions

-- ================================================
-- FUNCTION: reset_monthly_questions
-- Purpose: Reset monthly question counters for users
-- ================================================

CREATE OR REPLACE FUNCTION reset_monthly_questions()
RETURNS void AS $$
BEGIN
    UPDATE users
    SET
        questions_used_this_month = 0,
        reset_date = CURRENT_TIMESTAMP + INTERVAL '1 month'
    WHERE reset_date <= CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- FUNCTION: can_user_ask_question
-- Purpose: Check if user has remaining questions in their quota
-- ================================================

CREATE OR REPLACE FUNCTION can_user_ask_question(user_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_tier VARCHAR(50);
    questions_used INTEGER;
    questions_limit INTEGER;
BEGIN
    -- Get user tier and question usage
    SELECT tier, questions_used_this_month, questions_limit
    INTO user_tier, questions_used, questions_limit
    FROM users
    WHERE id = user_id_param;

    -- Paid tiers have unlimited questions
    IF user_tier IN ('student', 'teacher', 'philosopher', 'whitelabel') THEN
        RETURN true;
    END IF;

    -- Free tier checks limit
    RETURN questions_used < questions_limit;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- NOTES
-- ================================================

-- These functions require the following columns to exist in users table:
--  - questions_used_this_month INTEGER
--  - questions_limit INTEGER
--  - reset_date TIMESTAMP
--  - tier VARCHAR(50)

-- If these columns don't exist, they should be created in migration 002

-- To run this migration:
-- psql $DATABASE_URL -f migrations/005_database_functions.sql

-- To test:
-- SELECT reset_monthly_questions();
-- SELECT can_user_ask_question('user-uuid-here');
