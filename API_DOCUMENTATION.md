# API Documentation - Philosopher AI Backend
**Generated:** 2025-11-04 06:58:12

---

## Overview

**Base URL:** `http://localhost:3002`
**API Version:** v1
**Total Endpoints:** 18

---

## Table of Contents

- [Health & Status](#health--status)
- [Authentication](#authentication)
- [Philosopher AI](#philosopher-ai)
- [Payment & Subscriptions](#payment--subscriptions)
- [Knowledge Base](#knowledge-base)

---

## Health & Status

### `GET /health`

Week 3: API version indicator

**Response:**

Status: 400, 409

```json
{
        status: 'healthy',
        version: process.env.PLATFORM_VERSION || '1.0.0',
        buildNumber: process.env.PLATFORM_BUILD_NUMBER || 1,
        timestamp: new Date().toISOString(),
        apiVersion: 'v1'  // Week 3: API version indicator
    }
```

**Example Request:**

```bash
curl -X GET http://localhost<3002>/health
```

---

## Authentication

### `POST /auth/register`

Validation

**Response:**

Status: 400, 409, 201

```json
{"success": true, "data": {}}
```

**Example Request:**

```bash
curl -X POST http://localhost<3002>/auth/register \
  -H "Content-Type: application/json" \
  -d '{"key": "value"}'
```

---

### `POST /auth/login`

Get user

**Response:**

Status: 400, 401, 500

```json
{
            success: true,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                tier: user.tier,
                consciousnessLevel: user.consciousness_level
            }
```

**Example Request:**

```bash
curl -X POST http://localhost<3002>/auth/login \
  -H "Content-Type: application/json" \
  -d '{"key": "value"}'
```

---

### `POST /auth/logout`

Verify token (Week 3: Check if session is valid)

**🔒 Auth Required**

**Response:**

Status: 200

```json
{ success: true, message: 'Logged out successfully' }
```

**Example Request:**

```bash
curl -X POST http://localhost<3002>/auth/logout \
  -H "Content-Type: application/json" \
  -d '{"key": "value"}'
```

---

### `GET /auth/verify`

Get current user

**🔒 Auth Required**

**Response:**

Status: 200

```json
{
        valid: true,
        user: {
            id: req.user.id,
            email: req.user.email,
            username: req.user.username,
            tier: req.user.tier
        }
```

**Example Request:**

```bash
curl -X GET http://localhost<3002>/auth/verify
```

---

### `GET /auth/me`

================================================

**🔒 Auth Required**

**Response:**

Status: 400

```json
{
        user: {
            id: req.user.id,
            email: req.user.email,
            username: req.user.username,
            tier: req.user.tier,
            consciousnessLevel: req.user.consciousness_level,
            questionsUsed: req.user.questions_used_this_month,
            questionsLimit: req.user.questions_limit
        }
```

**Example Request:**

```bash
curl -X GET http://localhost<3002>/auth/me
```

---

## Philosopher AI

### `POST /questions/ask`

Check if user can ask question (tier limits)

**🔒 Auth Required | ⏱️ Rate Limited**

**Response:**

Status: 400, 403

```json
{"success": true, "data": {}}
```

**Example Request:**

```bash
curl -X POST http://localhost<3002>/questions/ask \
  -H "Content-Type: application/json" \
  -d '{"key": "value"}'
```

---

### `GET /questions/history`

Get usage stats

**🔒 Auth Required**

**Response:**

Status: 500

```json
{
            questions: result.rows,
            total: result.rowCount
        }
```

**Example Request:**

```bash
curl -X GET http://localhost<3002>/questions/history
```

---

### `GET /usage/stats`

================================================

**🔒 Auth Required**

**Response:**

Status: 500, 400

```json
{
            tier: stats.tier,
            questionsUsed: stats.questions_used_this_month,
            questionsLimit: stats.questions_limit,
            questionsRemaining: Math.max(0, stats.questions_limit - stats.questions_used_this_month),
            consciousnessLevel: stats.consciousness_level,
            resetDate: stats.reset_date,
            canAskQuestion: stats.questions_used_this_month < stats.questions_limit || stats.tier !== 'free'
        }
```

**Example Request:**

```bash
curl -X GET http://localhost<3002>/usage/stats
```

---

## Payment & Subscriptions

### `POST /stripe/create-checkout`

Validate items

**🔒 Auth Required**

**Response:**

Status: 400, 500

```json
{
            id: session.id,
            url: session.url
        }
```

**Example Request:**

```bash
curl -X POST http://localhost<3002>/stripe/create-checkout \
  -H "Content-Type: application/json" \
  -d '{"key": "value"}'
```

---

### `POST /subscriptions/create-checkout`

Create or get Stripe customer

**🔒 Auth Required**

**Response:**

Status: 500

```json
{
            sessionId: session.id,
            url: session.url
        }
```

**Example Request:**

```bash
curl -X POST http://localhost<3002>/subscriptions/create-checkout \
  -H "Content-Type: application/json" \
  -d '{"key": "value"}'
```

---

### `POST /stripe/webhook`

Handle the event

**Response:**

Status: 400

```json
{"success": true, "data": {}}
```

**Example Request:**

```bash
curl -X POST http://localhost<3002>/stripe/webhook \
  -H "Content-Type: application/json" \
  -d '{"key": "value"}'
```

---

### `GET /subscriptions/current`

================================================

**🔒 Auth Required**

**Response:**

Status: 500, 400, 201

```json
{ subscription: null, tier: 'free' }
```

**Example Request:**

```bash
curl -X GET http://localhost<3002>/subscriptions/current
```

---

## Knowledge Base

### `POST /knowledge`

Validation

**Response:**

Status: 400, 201, 500

```json
{"success": true, "data": {}}
```

**Example Request:**

```bash
curl -X POST http://localhost<3002>/knowledge \
  -H "Content-Type: application/json" \
  -d '{"key": "value"}'
```

---

### `GET /knowledge/search`

Full-text search across title, content, keywords, and categories

**Response:**

Status: 400, 500

```json
{"success": true, "data": {}}
```

**Example Request:**

```bash
curl -X GET http://localhost<3002>/knowledge/search
```

---

### `GET /knowledge/category/:category`

Get recent knowledge items

**Path Parameters:**

| Name | Type | Required |
|------|------|----------|
| `category` | string | Yes |

**Response:**

Status: 500

```json
{"success": true, "data": {}}
```

**Example Request:**

```bash
curl -X GET http://localhost<3002>/knowledge/category/<category>
```

---

### `GET /knowledge/recent`

Get Data Cyclotron metrics

**Response:**

Status: 500

```json
{
            statistics: statsResult.rows[0],
            top_categories: categoriesResult.rows,
            sources: sourcesResult.rows,
            recent_activity: recentResult.rows[0]
        }
```

**Example Request:**

```bash
curl -X GET http://localhost<3002>/knowledge/recent
```

---

### `GET /metrics`

Get overall statistics

**Response:**

Status: 500

```json
{
            statistics: statsResult.rows[0],
            top_categories: categoriesResult.rows,
            sources: sourcesResult.rows,
            recent_activity: recentResult.rows[0]
        }
```

**Example Request:**

```bash
curl -X GET http://localhost<3002>/metrics
```

---

