/**
 * PHILOSOPHER KNOWLEDGE API
 * Ancient wisdom synthesis & deep conversations
 * Core mission: Connect dots across traditions, enable profound dialogue
 *
 * Replaces makeshift "questions table" approach with proper knowledge infrastructure
 */

const express = require('express');
const router = express.Router();
const pool = require('../database/db');
const logger = require('../utils/logger');

/**
 * POST /api/v1/knowledge
 * Store knowledge from Data Cyclotron
 */
router.post('/', async (req, res) => {
  try {
    const {
      title,
      content,
      source = 'cyclotron',
      source_url,
      categories = [],
      keywords = [],
      priority_score = 50,
      metadata = {}
    } = req.body;

    // Validate required fields
    if (!title || !content) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['title', 'content']
      });
    }

    // Store in database (using questions table for now, create knowledge table later)
    const result = await pool.query(
      `INSERT INTO questions (
        question_text,
        answer_text,
        category,
        created_at,
        updated_at,
        metadata
      ) VALUES ($1, $2, $3, NOW(), NOW(), $4)
      RETURNING id, question_text as title, created_at`,
      [
        title,
        content,
        categories[0] || 'general',
        JSON.stringify({
          source,
          source_url,
          categories,
          keywords,
          priority_score,
          ...metadata
        })
      ]
    );

    res.status(201).json({
      success: true,
      knowledge: result.rows[0],
      message: 'Knowledge stored successfully'
    });

  } catch (error) {
    console.error('Knowledge storage error:', error);
    res.status(500).json({
      error: 'Failed to store knowledge',
      message: error.message
    });
  }
});

/**
 * GET /api/v1/knowledge/search?q=query&limit=10
 * Search knowledge with natural language
 */
router.get('/search', async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;

    if (!q) {
      return res.status(400).json({
        error: 'Missing search query',
        usage: '/api/v1/knowledge/search?q=your+query'
      });
    }

    // Simple text search (can be enhanced with full-text search)
    const result = await pool.query(
      `SELECT
        id,
        question_text as title,
        answer_text as content,
        category,
        metadata,
        created_at
      FROM questions
      WHERE
        question_text ILIKE $1 OR
        answer_text ILIKE $1
      ORDER BY created_at DESC
      LIMIT $2`,
      [`%${q}%`, limit]
    );

    res.json({
      success: true,
      query: q,
      results: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('Knowledge search error:', error);
    res.status(500).json({
      error: 'Search failed',
      message: error.message
    });
  }
});

/**
 * GET /api/v1/knowledge/category/:category
 * Get knowledge by category
 */
router.get('/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const { limit = 20 } = req.query;

    const result = await pool.query(
      `SELECT
        id,
        question_text as title,
        answer_text as content,
        category,
        metadata,
        created_at
      FROM questions
      WHERE category = $1
      ORDER BY created_at DESC
      LIMIT $2`,
      [category, limit]
    );

    res.json({
      success: true,
      category,
      results: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('Category fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch category',
      message: error.message
    });
  }
});

/**
 * GET /api/v1/knowledge/recent?limit=10
 * Get most recent knowledge
 */
router.get('/recent', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const result = await pool.query(
      `SELECT
        id,
        question_text as title,
        answer_text as content,
        category,
        metadata,
        created_at
      FROM questions
      ORDER BY created_at DESC
      LIMIT $1`,
      [limit]
    );

    res.json({
      success: true,
      results: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('Recent knowledge error:', error);
    res.status(500).json({
      error: 'Failed to fetch recent knowledge',
      message: error.message
    });
  }
});

/**
 * GET /api/v1/knowledge/stats
 * Get knowledge statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const totalResult = await pool.query(
      'SELECT COUNT(*) as total FROM questions'
    );

    const categoryResult = await pool.query(
      `SELECT
        category,
        COUNT(*) as count
      FROM questions
      GROUP BY category
      ORDER BY count DESC`
    );

    const recentResult = await pool.query(
      `SELECT COUNT(*) as count
      FROM questions
      WHERE created_at > NOW() - INTERVAL '24 hours'`
    );

    res.json({
      success: true,
      stats: {
        total: parseInt(totalResult.rows[0].total),
        by_category: categoryResult.rows,
        last_24h: parseInt(recentResult.rows[0].count)
      }
    });

  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({
      error: 'Failed to fetch stats',
      message: error.message
    });
  }
});

module.exports = router;
