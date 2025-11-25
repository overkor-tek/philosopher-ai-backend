-- ============================================
-- PHILOSOPHER KNOWLEDGE SYSTEM
-- Dedicated knowledge table for wisdom synthesis
-- ============================================
-- C1 Mechanic - Core Mission Infrastructure
-- Purpose: Enable philosopher to synthesize ancient wisdom
--          and connect dots across traditions
-- ============================================

-- Drop existing table if recreating
-- DROP TABLE IF EXISTS knowledge CASCADE;

-- Main knowledge table
CREATE TABLE IF NOT EXISTS knowledge (
    id SERIAL PRIMARY KEY,

    -- Content
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    summary TEXT,

    -- Source tracking
    source VARCHAR(100) NOT NULL DEFAULT 'manual',  -- manual, cyclotron, import, etc
    source_url TEXT,
    source_author VARCHAR(200),
    source_date DATE,
    source_quality_score INTEGER DEFAULT 80,  -- 0-100, curated content = high score

    -- Classification
    primary_tradition VARCHAR(100),  -- stoicism, buddhism, taoism, etc
    secondary_traditions TEXT[],     -- related traditions
    philosophical_domain VARCHAR(100),  -- ethics, metaphysics, epistemology, etc
    themes TEXT[],  -- death, virtue, nature, consciousness, etc
    concepts TEXT[], -- ego, impermanence, logos, etc

    -- Metadata
    language VARCHAR(10) DEFAULT 'en',
    original_language VARCHAR(10),
    translation_quality INTEGER DEFAULT 100,

    -- Wisdom metrics
    depth_score INTEGER DEFAULT 50,  -- How profound (0-100)
    practical_score INTEGER DEFAULT 50,  -- How actionable (0-100)
    universality_score INTEGER DEFAULT 50,  -- How universal (0-100)
    cross_tradition_links INTEGER DEFAULT 0,  -- How many connections found

    -- Pattern recognition
    archetypal_pattern VARCHAR(100),  -- hero's journey, transformation, paradox, etc
    logical_structure VARCHAR(50),  -- syllogism, koan, parable, etc
    cognitive_level VARCHAR(50),  -- surface, intermediate, deep, transcendent

    -- User engagement
    times_queried INTEGER DEFAULT 0,
    times_helpful INTEGER DEFAULT 0,
    times_unhelpful INTEGER DEFAULT 0,
    avg_session_depth FLOAT DEFAULT 0.0,  -- How deep conversations go

    -- Vector embeddings (for semantic search - future)
    embedding_vector FLOAT[],  -- Will use pgvector extension

    -- Full text search
    search_vector tsvector,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_queried_at TIMESTAMP WITH TIME ZONE,

    -- Soft delete
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- Versioning (for knowledge that evolves)
    version INTEGER DEFAULT 1,
    parent_id INTEGER REFERENCES knowledge(id),

    -- JSON metadata for flexibility
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Constraints
    CONSTRAINT valid_scores CHECK (
        source_quality_score BETWEEN 0 AND 100 AND
        depth_score BETWEEN 0 AND 100 AND
        practical_score BETWEEN 0 AND 100 AND
        universality_score BETWEEN 0 AND 100
    )
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Primary search indexes
CREATE INDEX IF NOT EXISTS idx_knowledge_search_vector ON knowledge USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_knowledge_title ON knowledge (title);
CREATE INDEX IF NOT EXISTS idx_knowledge_content_text ON knowledge USING GIN (to_tsvector('english', content));

-- Classification indexes
CREATE INDEX IF NOT EXISTS idx_knowledge_tradition ON knowledge (primary_tradition);
CREATE INDEX IF NOT EXISTS idx_knowledge_domain ON knowledge (philosophical_domain);
CREATE INDEX IF NOT EXISTS idx_knowledge_themes ON knowledge USING GIN (themes);
CREATE INDEX IF NOT EXISTS idx_knowledge_concepts ON knowledge USING GIN (concepts);

-- Source tracking indexes
CREATE INDEX IF NOT EXISTS idx_knowledge_source ON knowledge (source);
CREATE INDEX IF NOT EXISTS idx_knowledge_quality ON knowledge (source_quality_score DESC);

-- Wisdom metrics indexes (for finding best content)
CREATE INDEX IF NOT EXISTS idx_knowledge_depth ON knowledge (depth_score DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_universal ON knowledge (universality_score DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_cross_links ON knowledge (cross_tradition_links DESC);

-- Engagement indexes
CREATE INDEX IF NOT EXISTS idx_knowledge_popularity ON knowledge (times_queried DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_helpful ON knowledge (times_helpful DESC);

-- Pattern recognition indexes
CREATE INDEX IF NOT EXISTS idx_knowledge_pattern ON knowledge (archetypal_pattern);
CREATE INDEX IF NOT EXISTS idx_knowledge_structure ON knowledge (logical_structure);
CREATE INDEX IF NOT EXISTS idx_knowledge_level ON knowledge (cognitive_level);

-- Temporal indexes
CREATE INDEX IF NOT EXISTS idx_knowledge_created ON knowledge (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_updated ON knowledge (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_queried ON knowledge (last_queried_at DESC NULLS LAST);

-- Soft delete index
CREATE INDEX IF NOT EXISTS idx_knowledge_not_deleted ON knowledge (deleted_at) WHERE deleted_at IS NULL;

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_knowledge_tradition_quality
    ON knowledge (primary_tradition, source_quality_score DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_knowledge_domain_depth
    ON knowledge (philosophical_domain, depth_score DESC)
    WHERE deleted_at IS NULL;

-- ============================================
-- FULL TEXT SEARCH TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION knowledge_search_vector_update() RETURNS trigger AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.summary, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(array_to_string(NEW.themes, ' '), '')), 'D');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER knowledge_search_vector_trigger
    BEFORE INSERT OR UPDATE ON knowledge
    FOR EACH ROW
    EXECUTE FUNCTION knowledge_search_vector_update();

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION knowledge_updated_at() RETURNS trigger AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER knowledge_updated_at_trigger
    BEFORE UPDATE ON knowledge
    FOR EACH ROW
    EXECUTE FUNCTION knowledge_updated_at();

-- ============================================
-- CROSS-TRADITION CONNECTIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS knowledge_connections (
    id SERIAL PRIMARY KEY,
    source_id INTEGER NOT NULL REFERENCES knowledge(id) ON DELETE CASCADE,
    target_id INTEGER NOT NULL REFERENCES knowledge(id) ON DELETE CASCADE,

    connection_type VARCHAR(50) NOT NULL,  -- parallel, contrast, evolution, synthesis
    connection_strength INTEGER DEFAULT 50,  -- 0-100

    description TEXT,
    discovered_by VARCHAR(50) DEFAULT 'system',  -- system, user, curator

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    verified BOOLEAN DEFAULT FALSE,

    metadata JSONB DEFAULT '{}'::jsonb,

    CONSTRAINT no_self_connection CHECK (source_id != target_id),
    CONSTRAINT unique_connection UNIQUE (source_id, target_id, connection_type)
);

CREATE INDEX IF NOT EXISTS idx_connections_source ON knowledge_connections (source_id);
CREATE INDEX IF NOT EXISTS idx_connections_target ON knowledge_connections (target_id);
CREATE INDEX IF NOT EXISTS idx_connections_type ON knowledge_connections (connection_type);
CREATE INDEX IF NOT EXISTS idx_connections_strength ON knowledge_connections (connection_strength DESC);

-- ============================================
-- KNOWLEDGE CATEGORIES / TRADITIONS
-- ============================================

CREATE TABLE IF NOT EXISTS wisdom_traditions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    origin_region VARCHAR(100),
    time_period VARCHAR(100),
    key_figures TEXT[],
    core_concepts TEXT[],
    related_traditions TEXT[],
    resource_urls TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed with major traditions
INSERT INTO wisdom_traditions (name, description, origin_region, time_period, key_figures, core_concepts) VALUES
('Stoicism', 'Ancient Greek philosophy emphasizing virtue, wisdom, and emotional resilience', 'Greece/Rome', '300 BCE - 200 CE', ARRAY['Marcus Aurelius', 'Epictetus', 'Seneca', 'Zeno'], ARRAY['virtue', 'logos', 'apatheia', 'prohairesis', 'amor fati']),
('Buddhism', 'Eastern philosophy on suffering, impermanence, and enlightenment', 'India/Tibet/East Asia', '500 BCE - Present', ARRAY['Buddha', 'Nagarjuna', 'Dogen', 'Dalai Lama'], ARRAY['dukkha', 'anicca', 'anatta', 'nirvana', 'mindfulness', 'compassion']),
('Taoism', 'Chinese philosophy of natural flow and harmony', 'China', '400 BCE - Present', ARRAY['Laozi', 'Zhuangzi', 'Liezi'], ARRAY['tao', 'wu wei', 'yin-yang', 'spontaneity', 'naturalness']),
('Existentialism', 'Modern philosophy of meaning, freedom, and authenticity', 'Europe', '1800s - 1900s', ARRAY['Kierkegaard', 'Nietzsche', 'Sartre', 'Camus', 'Heidegger'], ARRAY['existence', 'freedom', 'authenticity', 'absurdity', 'responsibility']),
('Confucianism', 'Chinese philosophy of social harmony and moral cultivation', 'China', '500 BCE - Present', ARRAY['Confucius', 'Mencius', 'Xunzi'], ARRAY['ren', 'li', 'filial piety', 'harmony', 'virtue']),
('Platonism', 'Ancient Greek philosophy of forms and ideals', 'Greece', '400 BCE - Present', ARRAY['Plato', 'Socrates', 'Plotinus'], ARRAY['forms', 'ideal', 'truth', 'beauty', 'good']),
('Vedanta', 'Hindu philosophy of self and ultimate reality', 'India', '800 BCE - Present', ARRAY['Adi Shankara', 'Ramana Maharshi'], ARRAY['atman', 'brahman', 'maya', 'moksha', 'self-inquiry']),
('Sufism', 'Islamic mystical tradition of divine love', 'Middle East/Persia', '800 CE - Present', ARRAY['Rumi', 'Al-Ghazali', 'Ibn Arabi'], ARRAY['fana', 'divine love', 'remembrance', 'unity']),
('Skepticism', 'Ancient philosophy questioning certainty', 'Greece', '300 BCE - Present', ARRAY['Pyrrho', 'Sextus Empiricus'], ARRAY['epoche', 'ataraxia', 'suspension of judgment']),
('Cynicism', 'Ancient philosophy of virtue through simplicity', 'Greece', '400 BCE - 200 CE', ARRAY['Diogenes', 'Crates'], ARRAY['virtue', 'asceticism', 'honesty', 'self-sufficiency'])
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- KNOWLEDGE QUERIES / CONVERSATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS knowledge_queries (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,

    query_text TEXT NOT NULL,
    query_type VARCHAR(50),  -- search, synthesis, pattern, connection, deep_dive

    knowledge_ids INTEGER[],  -- Array of knowledge IDs returned
    response_text TEXT,

    conversation_depth INTEGER DEFAULT 1,  -- How many follow-ups
    session_id VARCHAR(100),  -- Group related queries

    satisfaction_score INTEGER,  -- User feedback 1-5

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    response_time_ms INTEGER,

    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_queries_user ON knowledge_queries (user_id);
CREATE INDEX IF NOT EXISTS idx_queries_session ON knowledge_queries (session_id);
CREATE INDEX IF NOT EXISTS idx_queries_created ON knowledge_queries (created_at DESC);

-- ============================================
-- SEED DATA: Example Ancient Wisdom
-- ============================================

-- Marcus Aurelius - Stoicism
INSERT INTO knowledge (
    title, content, summary,
    source, source_author, source_quality_score,
    primary_tradition, philosophical_domain, themes, concepts,
    depth_score, practical_score, universality_score,
    archetypal_pattern, logical_structure, cognitive_level
) VALUES (
    'On the Impermanence of Life',
    'You could leave life right now. Let that determine what you do and say and think. If the gods exist, then to abandon human beings is not frightening; the gods would never subject you to harm. And if they don't exist, or don't care what happens to us, what would be the point of living in a world without gods or Providence? But they do exist, they do care, and they have put all the tools we need at our disposal.',
    'Accept mortality and focus on virtue, trusting in divine providence or natural order',
    'manual', 'Marcus Aurelius', 95,
    'Stoicism', 'ethics',
    ARRAY['death', 'virtue', 'providence', 'mortality'],
    ARRAY['memento mori', 'providence', 'virtue', 'indifference'],
    90, 85, 95,
    'transformation', 'syllogism', 'deep'
);

-- Buddha - Buddhism
INSERT INTO knowledge (
    title, content, summary,
    source, source_author, source_quality_score,
    primary_tradition, philosophical_domain, themes, concepts,
    depth_score, practical_score, universality_score,
    archetypal_pattern, logical_structure, cognitive_level
) VALUES (
    'The Nature of Suffering',
    'All conditioned things are impermanent. When one sees this with wisdom, one turns away from suffering. This is the path to purification. All conditioned things are suffering. When one sees this with wisdom, one turns away from suffering. This is the path to purification. All things are not-self. When one sees this with wisdom, one turns away from suffering. This is the path to purification.',
    'Understanding impermanence, suffering, and non-self leads to liberation',
    'manual', 'Buddha', 95,
    'Buddhism', 'metaphysics',
    ARRAY['suffering', 'impermanence', 'liberation', 'wisdom'],
    ARRAY['dukkha', 'anicca', 'anatta', 'nirvana'],
    95, 80, 90,
    'transformation', 'repetition', 'transcendent'
);

-- Laozi - Taoism
INSERT INTO knowledge (
    title, content, summary,
    source, source_author, source_quality_score,
    primary_tradition, philosophical_domain, themes, concepts,
    depth_score, practical_score, universality_score,
    archetypal_pattern, logical_structure, cognitive_level
) VALUES (
    'The Way of Non-Action',
    'The Tao does nothing, yet nothing is left undone. If rulers could follow this, all things would transform themselves. The highest good is like water, which benefits all things and does not compete. It stays in places that others reject, and so is close to the Tao. Do not try to shine like jade; be common like stone.',
    'Natural action (wu wei) is more effective than forced effort',
    'manual', 'Laozi', 95,
    'Taoism', 'ethics',
    ARRAY['nature', 'action', 'humility', 'flow'],
    ARRAY['wu wei', 'tao', 'naturalness', 'humility'],
    90, 75, 85,
    'paradox', 'parable', 'deep'
);

-- Cross-tradition connection
INSERT INTO knowledge_connections (source_id, target_id, connection_type, connection_strength, description) VALUES
(1, 2, 'parallel', 85, 'Both traditions emphasize acceptance of impermanence and mortality as path to peace'),
(1, 3, 'parallel', 75, 'Both advocate for aligning with natural order rather than forcing outcomes'),
(2, 3, 'parallel', 90, 'Buddhism and Taoism share core concepts of non-attachment and natural flow');

-- ============================================
-- UTILITY FUNCTIONS
-- ============================================

-- Function to find similar knowledge by themes
CREATE OR REPLACE FUNCTION find_similar_knowledge(
    knowledge_id_param INTEGER,
    limit_param INTEGER DEFAULT 5
) RETURNS TABLE (
    id INTEGER,
    title VARCHAR,
    similarity_score FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        k2.id,
        k2.title,
        (
            -- Calculate similarity based on shared themes and concepts
            (SELECT COUNT(*) FROM unnest(k1.themes) theme WHERE theme = ANY(k2.themes)) * 2.0 +
            (SELECT COUNT(*) FROM unnest(k1.concepts) concept WHERE concept = ANY(k2.concepts)) * 1.5 +
            CASE WHEN k1.primary_tradition = k2.primary_tradition THEN 1.0 ELSE 0.0 END +
            CASE WHEN k1.philosophical_domain = k2.philosophical_domain THEN 0.5 ELSE 0.0 END
        ) AS similarity_score
    FROM knowledge k1, knowledge k2
    WHERE k1.id = knowledge_id_param
        AND k2.id != knowledge_id_param
        AND k2.deleted_at IS NULL
    ORDER BY similarity_score DESC
    LIMIT limit_param;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE knowledge IS 'Curated philosophical and spiritual wisdom for deep conversations';
COMMENT ON COLUMN knowledge.depth_score IS 'How profound and layered the wisdom is (0-100)';
COMMENT ON COLUMN knowledge.practical_score IS 'How actionable and applicable to life (0-100)';
COMMENT ON COLUMN knowledge.universality_score IS 'How broadly applicable across cultures (0-100)';
COMMENT ON COLUMN knowledge.cross_tradition_links IS 'Number of connections to other traditions found';
COMMENT ON TABLE knowledge_connections IS 'Patterns and connections between different wisdom teachings';
COMMENT ON TABLE wisdom_traditions IS 'Major philosophical and spiritual traditions throughout history';
COMMENT ON TABLE knowledge_queries IS 'Track how users interact with knowledge for learning and improvement';

-- ============================================
-- COMPLETE
-- ============================================

-- Verify tables created
SELECT
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE tablename IN ('knowledge', 'knowledge_connections', 'wisdom_traditions', 'knowledge_queries')
ORDER BY tablename;
