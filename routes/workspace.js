/**
 * WORKSPACE API ROUTES
 * Handles AI workspace conversations, messages, and chat functionality
 */

const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');
const pool = require('../database/db');
const logger = require('../utils/logger');

// Middleware to verify JWT token
const verifyToken = require('../middleware/auth');

// Claude API client
const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
});

/**
 * GET /api/v1/workspace/conversations
 * Get all conversations for the authenticated user
 */
router.get('/conversations', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { limit = 50, offset = 0 } = req.query;

        const result = await pool.query(
            `SELECT
                c.id,
                c.title,
                c.created_at,
                c.updated_at,
                COUNT(m.id) as message_count,
                last_msg.content as last_message_preview
            FROM conversations c
            LEFT JOIN messages m ON m.conversation_id = c.id
            LEFT JOIN LATERAL (
                SELECT content
                FROM messages
                WHERE conversation_id = c.id
                ORDER BY created_at DESC
                LIMIT 1
            ) last_msg ON true
            WHERE c.user_id = $1 AND c.is_deleted = FALSE
            GROUP BY c.id, last_msg.content
            ORDER BY c.updated_at DESC
            LIMIT $2 OFFSET $3`,
            [userId, limit, offset]
        );

        res.json({
            success: true,
            conversations: result.rows
        });
    } catch (error) {
        logger.error('Error getting conversations:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get conversations'
        });
    }
});

/**
 * GET /api/v1/workspace/conversations/:id
 * Get a specific conversation with all messages
 */
router.get('/conversations/:id', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const conversationId = req.params.id;

        // Get conversation details
        const convResult = await pool.query(
            `SELECT * FROM conversations
             WHERE id = $1 AND user_id = $2 AND is_deleted = FALSE`,
            [conversationId, userId]
        );

        if (convResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Conversation not found'
            });
        }

        // Get all messages
        const messagesResult = await pool.query(
            `SELECT id, role, content, tokens, model, created_at
             FROM messages
             WHERE conversation_id = $1
             ORDER BY created_at ASC`,
            [conversationId]
        );

        res.json({
            success: true,
            conversation: convResult.rows[0],
            messages: messagesResult.rows
        });
    } catch (error) {
        logger.error('Error getting conversation:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get conversation'
        });
    }
});

/**
 * POST /api/v1/workspace/conversations
 * Create a new conversation
 */
router.post('/conversations', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { title = 'New Conversation' } = req.body;

        const result = await pool.query(
            `INSERT INTO conversations (user_id, title)
             VALUES ($1, $2)
             RETURNING id, user_id, title, created_at, updated_at`,
            [userId, title]
        );

        res.status(201).json({
            success: true,
            conversation: result.rows[0]
        });
    } catch (error) {
        logger.error('Error creating conversation:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create conversation'
        });
    }
});

/**
 * PATCH /api/v1/workspace/conversations/:id
 * Update conversation (rename, etc)
 */
router.patch('/conversations/:id', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const conversationId = req.params.id;
        const { title } = req.body;

        if (!title) {
            return res.status(400).json({
                success: false,
                error: 'Title is required'
            });
        }

        const result = await pool.query(
            `UPDATE conversations
             SET title = $1, updated_at = CURRENT_TIMESTAMP
             WHERE id = $2 AND user_id = $3 AND is_deleted = FALSE
             RETURNING *`,
            [title, conversationId, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Conversation not found'
            });
        }

        res.json({
            success: true,
            conversation: result.rows[0]
        });
    } catch (error) {
        logger.error('Error updating conversation:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update conversation'
        });
    }
});

/**
 * DELETE /api/v1/workspace/conversations/:id
 * Delete (soft delete) a conversation
 */
router.delete('/conversations/:id', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const conversationId = req.params.id;

        const result = await pool.query(
            `UPDATE conversations
             SET is_deleted = TRUE, updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 AND user_id = $2
             RETURNING id`,
            [conversationId, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Conversation not found'
            });
        }

        res.json({
            success: true,
            message: 'Conversation deleted'
        });
    } catch (error) {
        logger.error('Error deleting conversation:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete conversation'
        });
    }
});

/**
 * POST /api/v1/workspace/chat
 * Send a message and get AI response (streaming)
 */
router.post('/chat', verifyToken, async (req, res) => {
    const startTime = Date.now();

    try {
        const userId = req.user.id;
        const { message, conversationId, model = 'claude-3-5-sonnet-20241022' } = req.body;

        if (!message || message.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Message is required'
            });
        }

        // Verify conversation belongs to user if conversationId provided
        if (conversationId) {
            const convCheck = await pool.query(
                'SELECT id FROM conversations WHERE id = $1 AND user_id = $2 AND is_deleted = FALSE',
                [conversationId, userId]
            );

            if (convCheck.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Conversation not found'
                });
            }
        }

        // Save user message
        const userMessageResult = await pool.query(
            `INSERT INTO messages (conversation_id, role, content)
             VALUES ($1, $2, $3)
             RETURNING id, created_at`,
            [conversationId, 'user', message]
        );

        // Get conversation history for context
        const historyResult = await pool.query(
            `SELECT role, content
             FROM messages
             WHERE conversation_id = $1
             ORDER BY created_at ASC
             LIMIT 20`,
            [conversationId]
        );

        // Build message array for Claude (excluding the just-added message since we'll add it)
        const conversationHistory = historyResult.rows
            .filter(msg => msg.content !== message) // Exclude duplicate
            .map(msg => ({
                role: msg.role === 'system' ? 'user' : msg.role, // Claude API doesn't support system in messages array
                content: msg.content
            }));

        // Add current message
        conversationHistory.push({
            role: 'user',
            content: message
        });

        // Call Claude API
        const claudeResponse = await anthropic.messages.create({
            model: model,
            max_tokens: 4096,
            system: `You are a helpful AI assistant in the Consciousness Revolution workspace.
                     Provide clear, actionable responses.
                     When writing code, use proper formatting and syntax highlighting.
                     Be concise but thorough.`,
            messages: conversationHistory
        });

        const answer = claudeResponse.content[0].text;
        const tokensUsed = claudeResponse.usage.input_tokens + claudeResponse.usage.output_tokens;
        const responseTimeMs = Date.now() - startTime;

        // Save AI response
        const assistantMessageResult = await pool.query(
            `INSERT INTO messages (conversation_id, role, content, tokens, model)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, created_at`,
            [conversationId, 'assistant', answer, tokensUsed, model]
        );

        // Auto-generate title if this is the first user message
        const messageCountResult = await pool.query(
            'SELECT COUNT(*) as count FROM messages WHERE conversation_id = $1 AND role = $2',
            [conversationId, 'user']
        );

        if (parseInt(messageCountResult.rows[0].count) === 1) {
            // First message - auto-generate title
            const title = message.substring(0, 50) + (message.length > 50 ? '...' : '');
            await pool.query(
                'UPDATE conversations SET title = $1 WHERE id = $2',
                [title, conversationId]
            );
        }

        res.json({
            success: true,
            userMessage: {
                id: userMessageResult.rows[0].id,
                role: 'user',
                content: message,
                created_at: userMessageResult.rows[0].created_at
            },
            assistantMessage: {
                id: assistantMessageResult.rows[0].id,
                role: 'assistant',
                content: answer,
                tokens: tokensUsed,
                model: model,
                created_at: assistantMessageResult.rows[0].created_at
            },
            responseTime: responseTimeMs
        });

    } catch (error) {
        logger.error('Chat error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process chat message',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * GET /api/v1/workspace/search
 * Search conversations and messages
 */
router.get('/search', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { query, limit = 20 } = req.query;

        if (!query || query.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Search query is required'
            });
        }

        // Search in conversation titles and message content
        const result = await pool.query(
            `SELECT DISTINCT ON (c.id)
                c.id as conversation_id,
                c.title,
                c.updated_at,
                m.content as matched_content,
                m.created_at as message_created_at
             FROM conversations c
             LEFT JOIN messages m ON m.conversation_id = c.id
             WHERE c.user_id = $1
               AND c.is_deleted = FALSE
               AND (
                   c.title ILIKE $2
                   OR m.content ILIKE $2
               )
             ORDER BY c.id, c.updated_at DESC
             LIMIT $3`,
            [userId, `%${query}%`, limit]
        );

        res.json({
            success: true,
            results: result.rows,
            query: query
        });
    } catch (error) {
        logger.error('Search error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to search conversations'
        });
    }
});

module.exports = router;
