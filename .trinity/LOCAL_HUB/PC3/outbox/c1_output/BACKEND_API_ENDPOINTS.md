# 🚀 BACKEND API ENDPOINTS REFERENCE

**Backend URL:** https://cloud-funnel-production.up.railway.app
**Status:** ✅ OPERATIONAL (deployed via Railway)
**Repository:** github.com/overkor-tek/philosopher-ai-backend
**Project ID:** 94d6e77f-f31f-49a1-837f-c1989b88bfa1

---

## 🔍 HEALTH & STATUS ENDPOINTS

### Health Check
```
GET /api/health
```
**Returns:** System health status, version, database connection
**Response Example:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "database": "connected",
  "timestamp": "2025-11-23T06:20:00Z"
}
```

### System Status
```
GET /api/status
```
**Returns:** Detailed system information

---

## 🔐 AUTHENTICATION ENDPOINTS

### User Registration
```
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "User Name"
}
```

### User Login
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword"
}
```
**Returns:** JWT token for authenticated requests

### Password Reset
```
POST /api/auth/reset-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

---

## 🧠 KNOWLEDGE API (Cyclotron Integration)

### Store Knowledge
```
POST /api/knowledge
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "Knowledge Title",
  "content": "Knowledge content",
  "tags": ["tag1", "tag2"],
  "source": "cyclotron"
}
```

### Search Knowledge
```
GET /api/knowledge/search?q={query}
Authorization: Bearer {token}
```

### Get Knowledge Item
```
GET /api/knowledge/{id}
Authorization: Bearer {token}
```

---

## 🤖 AI ENDPOINTS (Claude Integration)

### Chat Completion
```
POST /api/ai/chat
Authorization: Bearer {token}
Content-Type: application/json

{
  "messages": [
    {"role": "user", "content": "Your message"}
  ],
  "model": "claude-3-sonnet"
}
```

### Pattern Analysis
```
POST /api/ai/analyze
Authorization: Bearer {token}
Content-Type: application/json

{
  "text": "Text to analyze",
  "type": "pattern_recognition"
}
```

---

## 💳 STRIPE PAYMENT ENDPOINTS

### Create Checkout Session
```
POST /api/payments/create-checkout
Authorization: Bearer {token}
Content-Type: application/json

{
  "priceId": "price_xxx",
  "quantity": 1
}
```

### Webhook Handler
```
POST /api/payments/webhook
Stripe-Signature: {signature}

{webhook_payload}
```

---

## 👤 USER PROFILE ENDPOINTS

### Get Profile
```
GET /api/profile
Authorization: Bearer {token}
```

### Update Profile
```
PUT /api/profile
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "New Name",
  "preferences": {}
}
```

---

## 📊 ANALYTICS ENDPOINTS

### Log Event
```
POST /api/analytics/event
Authorization: Bearer {token}
Content-Type: application/json

{
  "event": "page_view",
  "data": {}
}
```

### Get Analytics
```
GET /api/analytics/dashboard
Authorization: Bearer {token}
```

---

## 🔌 WEBSOCKET ENDPOINTS

### Connect to WebSocket
```
wss://cloud-funnel-production.up.railway.app/ws
Authorization: Bearer {token}
```
**Use Cases:** Real-time updates, notifications, chat

---

## 🗂️ WORKSPACE ENDPOINTS

### Create Workspace
```
POST /api/workspace
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Workspace Name",
  "description": "Description"
}
```

### Get User Workspaces
```
GET /api/workspace
Authorization: Bearer {token}
```

---

## 🔄 TRINITY COORDINATION ENDPOINTS

### Report Status
```
POST /api/trinity/status
Authorization: Bearer {token}
Content-Type: application/json

{
  "instance": "C1_MECHANIC",
  "status": "ACTIVE",
  "computer": "100.70.208.75"
}
```

### Get Trinity Status
```
GET /api/trinity/status
Authorization: Bearer {token}
```

---

## 📝 NAVIGATION ENDPOINTS

### Get Navigation Items
```
GET /api/navigation
Authorization: Bearer {token}
```

### Update Navigation
```
PUT /api/navigation
Authorization: Bearer {token}
Content-Type: application/json

{items_array}
```

---

## 🛡️ ADMIN ENDPOINTS

### Get All Users (Admin Only)
```
GET /api/admin/users
Authorization: Bearer {admin_token}
```

### System Configuration (Admin Only)
```
GET /api/admin/config
Authorization: Bearer {admin_token}
```

---

## 🧪 TESTING ENDPOINTS

### Ping
```
GET /api/ping
```
**Returns:** "pong" (no auth required)

### Echo Test
```
POST /api/test/echo
Content-Type: application/json

{any_data}
```
**Returns:** Same data echoed back

---

## 🔑 AUTHENTICATION HEADERS

All authenticated endpoints require:
```
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

Get JWT token from `/api/auth/login` endpoint.

---

## ⚠️ ERROR RESPONSES

### Standard Error Format:
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "status": 400
}
```

### Common Status Codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

---

## 🔗 CORS & SECURITY

**CORS Enabled:** Yes (configured for frontend domains)
**Rate Limiting:** Yes (prevents abuse)
**HTTPS Only:** Yes (SSL/TLS enforced)

---

## 📚 FOR C2/C3 REFERENCE

**C2 Architect:** Use these endpoints when designing integrations
**C3 Oracle:** These endpoints serve Pattern Theory and Golden Rule validation
**C1 Mechanic:** Primary interface for deployment and testing

---

**Backend Status:** ✅ OPERATIONAL
**Last Verified:** 2025-11-23 06:20
**Documentation:** Complete

---

*Created by C1 Mechanic for Trinity coordination*
