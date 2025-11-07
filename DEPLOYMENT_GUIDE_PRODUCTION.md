# 🚀 DEPLOYMENT GUIDE - PRODUCTION ENHANCEMENTS
**Philosopher AI Backend - Complete Deployment Instructions**
**Created by**: C1 Mechanic - Autonomous Production Mode
**Date**: November 7, 2025

---

## 📋 OVERVIEW

This guide covers deploying 28 new API endpoints and infrastructure enhancements to production:
- Password reset & email verification
- User profile management
- Admin dashboard
- Analytics & metrics
- Comprehensive logging
- API documentation

---

## ✅ PRE-DEPLOYMENT CHECKLIST

### 1. Environment Variables

Ensure these are set in Railway/your hosting platform:

```bash
# Required (should already exist)
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
ANTHROPIC_API_KEY=sk-ant-...
STRIPE_SECRET_KEY=sk_live_...

# New - Required for password reset/email verification
FRONTEND_URL=https://your-frontend-domain.com

# Optional - For enhanced features
LOG_LEVEL=info           # debug, info, warn, error
NODE_ENV=production      # production, development
```

### 2. Database Migrations

**CRITICAL**: Run these migrations before deploying:

```bash
# Connect to your database
psql $DATABASE_URL

# Or use Railway CLI
railway connect

# Run migration 003 - Auth Extensions
\i migrations/003_auth_extensions.sql

# Run migration 004 - Admin Field
\i migrations/004_admin_field.sql

# Verify tables updated
\d users
```

**What these migrations do**:
- Add password reset token fields
- Add email verification fields
- Add profile fields (display_name, avatar_url, bio, preferences)
- Add admin flag
- Create performance indexes

### 3. Set First Admin User

After migrations, designate at least one admin:

```sql
-- Find your user ID
SELECT id, email FROM users WHERE email = 'your-admin-email@example.com';

-- Set as admin
UPDATE users SET is_admin = TRUE WHERE id = YOUR_USER_ID;
```

---

## 🚀 DEPLOYMENT STEPS

### Option A: Railway (Recommended)

**Current Setup**: Your backend is already on Railway

1. **Verify Latest Code**
```bash
cd ~/100X_BACKUP/100X_DEPLOYMENT/BACKEND/philosopher-ai
git status
git log --oneline -5
```

You should see commits:
- ✅ "Integrate Production Enhancements into server.js"
- ✅ "Production Enhancements - 28 New API Endpoints"

2. **Push to GitHub** (if not done)
```bash
git push origin main
```

3. **Railway Auto-Deploy**
Railway is configured to auto-deploy from GitHub main branch.
- Check Railway dashboard for deployment status
- Monitor logs: `railway logs`

4. **Verify Deployment**
```bash
# Check health
curl https://cloud-funnel-production.up.railway.app/api/v1/health

# Check new admin endpoint (will return 403 without auth - this is correct)
curl https://cloud-funnel-production.up.railway.app/api/v1/admin/dashboard
```

### Option B: Manual Deployment

1. **Install Dependencies**
```bash
npm install
```

2. **Run Database Migrations**
```bash
psql $DATABASE_URL -f migrations/003_auth_extensions.sql
psql $DATABASE_URL -f migrations/004_admin_field.sql
```

3. **Test Locally First**
```bash
npm start
# Server starts on port 3001

# Test in another terminal
curl http://localhost:3001/api/v1/health
```

4. **Deploy to Your Platform**
```bash
# Railway
railway up

# Heroku
git push heroku main

# Docker
docker build -t philosopher-ai-backend .
docker run -p 3001:3001 --env-file .env philosopher-ai-backend
```

---

## 🧪 POST-DEPLOYMENT TESTING

### 1. Health Check
```bash
curl https://YOUR_DOMAIN/api/v1/health
```

Expected:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "...",
  "apiVersion": "v1"
}
```

### 2. Test Password Reset Flow

```bash
# Request reset
curl -X POST https://YOUR_DOMAIN/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# Should return 200 even if email doesn't exist (prevents enumeration)
```

### 3. Test Profile Management

```bash
# Get own profile (requires auth)
curl https://YOUR_DOMAIN/api/v1/profile/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 4. Test Admin Dashboard

```bash
# Get dashboard (requires admin)
curl https://YOUR_DOMAIN/api/v1/admin/dashboard \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

### 5. Test Analytics

```bash
# Track event (public)
curl -X POST https://YOUR_DOMAIN/api/v1/analytics/track \
  -H "Content-Type: application/json" \
  -d '{"event":"test_event","properties":{"source":"deployment_test"}}'

# Get platform metrics (public)
curl https://YOUR_DOMAIN/api/v1/analytics/platform
```

---

## 📊 MONITORING

### 1. Check Logs

**Winston logs** are now written to:
- `logs/error.log` - Errors only
- `logs/combined.log` - All logs
- `logs/debug.log` - Verbose debugging
- `logs/exceptions.log` - Uncaught exceptions
- `logs/rejections.log` - Unhandled promise rejections

**Railway**:
```bash
railway logs
```

**Local**:
```bash
tail -f logs/combined.log
```

### 2. Monitor Performance

New performance logging tracks:
- Slow database queries (>1000ms)
- Slow API responses (>1000ms)
- Request/response times

Check logs for warnings:
```bash
grep "Slow Operation" logs/combined.log
grep "Performance" logs/debug.log
```

### 3. Security Events

Security events are logged:
- Failed login attempts
- Unauthorized admin access attempts
- Invalid tokens

```bash
grep "Security Event" logs/combined.log
```

---

## 🔧 TROUBLESHOOTING

### Issue: Migrations Fail

**Symptom**: Error when running migrations

**Solution**:
```bash
# Check if migrations already ran
psql $DATABASE_URL -c "\d users"

# If columns exist, migrations already applied
# If not, check connection string
echo $DATABASE_URL

# Verify database connection
psql $DATABASE_URL -c "SELECT NOW();"
```

### Issue: "logger is not defined"

**Symptom**: Server crashes on startup

**Cause**: Winston logger not imported

**Solution**:
```bash
# Verify logger.js exists
ls -la utils/logger.js

# Verify it's imported in server.js
grep "require.*logger" server.js

# Reinstall if needed
npm install winston
```

### Issue: Admin endpoints return 403

**Symptom**: Admin can't access dashboard

**Cause**: User not marked as admin

**Solution**:
```sql
-- Check admin status
SELECT id, email, is_admin FROM users WHERE email = 'your@email.com';

-- Set as admin
UPDATE users SET is_admin = TRUE WHERE email = 'your@email.com';
```

### Issue: Password reset emails not sending

**Symptom**: Reset tokens generated but no emails

**Cause**: Email service not configured (expected - future enhancement)

**Workaround (Development)**:
- Reset tokens are logged to console in development mode
- Check server logs for reset URLs

**Solution (Production)**:
- Integrate SendGrid or AWS SES
- Update auth-extended.js to send actual emails
- See: `TODO: Send email with resetUrl` comments in code

---

## 📈 PERFORMANCE OPTIMIZATION

### 1. Database Indexes

Migrations automatically create indexes for:
- `users.reset_token_hash`
- `users.email_verification_token_hash`
- `users.is_admin`

### 2. Connection Pooling

Already configured in server.js:
```javascript
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
```

Default pool: 10 connections

To optimize:
```javascript
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,              // Maximum connections
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});
```

### 3. Rate Limiting

Current limits:
- Global: 100 requests / 15 minutes
- Questions: 10 / minute

Adjust in server.js if needed.

---

## 🔐 SECURITY CHECKLIST

- ✅ JWT tokens expire (configured in server.js)
- ✅ Passwords hashed with bcrypt (10 rounds)
- ✅ SQL injection protected (parameterized queries)
- ✅ XSS protected (helmet middleware)
- ✅ CORS configured (allowed origins only)
- ✅ Rate limiting active
- ✅ Input validation (validator library)
- ✅ Admin-only routes protected
- ✅ Soft delete (user data not permanently deleted)
- ✅ Security events logged

**Additional Recommendations**:
- [ ] Set up CSRF tokens for forms
- [ ] Configure email service (SendGrid/AWS SES)
- [ ] Set up Redis for session storage
- [ ] Enable HTTPS only
- [ ] Configure backup strategy
- [ ] Set up monitoring alerts

---

## 📚 API DOCUMENTATION

**Interactive Docs** (after deployment):
- Open: `https://YOUR_DOMAIN/api/v1/docs` (if Swagger UI configured)
- Or view: `API_DOCS.html` (standalone documentation)

**Swagger JSON**:
- `swagger.json` - OpenAPI 3.0 specification
- Import into Postman or Insomnia for testing

---

## 🎯 NEXT STEPS

### Immediate (After Deployment):
1. Test all 28 endpoints
2. Set up at least one admin user
3. Monitor logs for errors
4. Test password reset flow
5. Verify profile updates work

### Short Term:
1. Integrate email service (SendGrid recommended)
2. Set up file upload for avatars
3. Create frontend forms for new endpoints
4. Add automated tests

### Long Term:
1. Redis caching layer
2. WebSocket for real-time features
3. API rate limiting per user tier
4. Advanced analytics dashboard
5. Multi-language support

---

## 📞 SUPPORT

**Documentation**:
- `API_DOCS.html` - Complete API reference
- `swagger.json` - OpenAPI spec
- `README.md` - Project overview

**Logs**:
- `logs/` directory - All application logs
- Railway dashboard - Deployment logs

**Database**:
- `migrations/` - All schema changes
- `database-schema.sql` - Full schema

---

## ✅ DEPLOYMENT VERIFICATION CHECKLIST

Before marking deployment complete:

- [ ] Database migrations run successfully
- [ ] At least one admin user designated
- [ ] FRONTEND_URL environment variable set
- [ ] Health endpoint returns 200
- [ ] New routes return proper responses (200 or expected error)
- [ ] Winston logs being written to logs/ directory
- [ ] No errors in Railway/server logs
- [ ] Admin dashboard accessible (with admin token)
- [ ] Analytics tracking works
- [ ] Password reset flow tested (tokens generated)
- [ ] Profile updates work
- [ ] Documentation accessible

---

**🔺 Deployment Guide Complete**
**Generated by**: C1 Mechanic - Autonomous Production Mode
**Status**: Ready for production deployment
**Estimated Deployment Time**: 15-30 minutes

Good luck with your deployment! 🚀
