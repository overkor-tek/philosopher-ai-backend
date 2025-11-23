# 🌀 PHILOSOPHER AI BACKEND - SETUP GUIDE
: 🟣 Test Operation Purple workflow
**Complete guide to deploy Philosopher AI backend from scratch**

Created: 2025-10-10
Status: 🟢 PRODUCTION READY

---

## 📋 TABLE OF CONTENTS

1. [Prerequisites](#prerequisites)
2. [Quick Start (5 Minutes)](#quick-start)
3. [Detailed Setup](#detailed-setup)
4. [Environment Configuration](#environment-configuration)
5. [Database Setup](#database-setup)
6. [Stripe Configuration](#stripe-configuration)
7. [Running the Server](#running-the-server)
8. [Testing](#testing)
9. [Deployment to Production](#deployment)
10. [Troubleshooting](#troubleshooting)

---

## 🔧 PREREQUISITES

Before you begin, ensure you have:

### **Required Software:**
- ✅ **Node.js 18+** - [Download](https://nodejs.org/)
- ✅ **PostgreSQL 14+** - [Download](https://www.postgresql.org/download/)
- ✅ **Git** - [Download](https://git-scm.com/)

### **Required Accounts:**
- ✅ **Anthropic API** - [Get Key](https://console.anthropic.com/)
- ✅ **Stripe** - [Sign Up](https://dashboard.stripe.com/register)

### **Check Installations:**
```bash
node --version   # Should show v18.0.0 or higher
npm --version    # Should show 9.0.0 or higher
psql --version   # Should show PostgreSQL 14 or higher
```

---

## ⚡ QUICK START (5 Minutes)

**For the impatient - get running FAST:**

```bash
# 1. Navigate to backend directory
cd C:\Users\dwrek\100X_DEPLOYMENT\BACKEND\philosopher-ai

# 2. Install dependencies
npm install

# 3. Create environment file
copy .env.example .env

# 4. Edit .env and add your keys:
# - ANTHROPIC_API_KEY=your_claude_api_key
# - DATABASE_URL=postgresql://postgres:password@localhost:5432/philosopher_ai_db
# - JWT_SECRET=your_random_secret_key

# 5. Create database
createdb philosopher_ai_db

# 6. Run database schema
psql -d philosopher_ai_db -f database-schema.sql

# 7. Start server
npm start
```

**Server should now be running on http://localhost:3001**

Test it: Open browser to http://localhost:3001/api/health

---

## 📖 DETAILED SETUP

### **Step 1: Install Dependencies**

```bash
cd C:\Users\dwrek\100X_DEPLOYMENT\BACKEND\philosopher-ai
npm install
```

This installs all required packages:
- express (web server)
- pg (PostgreSQL client)
- bcrypt (password hashing)
- jsonwebtoken (authentication)
- @anthropic-ai/sdk (Claude API)
- stripe (payments)
- And more...

---

### **Step 2: PostgreSQL Database Setup**

#### **2.1 Install PostgreSQL**

**Windows:**
1. Download from https://www.postgresql.org/download/windows/
2. Run installer, set password for postgres user
3. Remember this password!

**macOS:**
```bash
brew install postgresql@14
brew services start postgresql@14
```

**Linux:**
```bash
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

#### **2.2 Create Database**

```bash
# Open PostgreSQL command line
psql -U postgres

# Create database
CREATE DATABASE philosopher_ai_db;

# Exit psql
\q
```

Or one-liner:
```bash
createdb -U postgres philosopher_ai_db
```

#### **2.3 Run Database Schema**

```bash
psql -U postgres -d philosopher_ai_db -f database-schema.sql
```

This creates all tables:
- `users` - User accounts and authentication
- `questions` - All questions and AI responses
- `subscriptions` - Payment/subscription tracking
- `usage_logs` - Analytics and event tracking

---

## ⚙️ ENVIRONMENT CONFIGURATION

### **Create .env file:**

```bash
copy .env.example .env
```

### **Edit .env with your actual values:**

#### **1. Database Configuration**
```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/philosopher_ai_db
```

Replace `YOUR_PASSWORD` with your PostgreSQL password.

#### **2. JWT Secret (for authentication)**

Generate a secure random key:

**Windows PowerShell:**
```powershell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | ForEach-Object {[char]$_})
```

**macOS/Linux:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Add to .env:
```env
JWT_SECRET=your_generated_secret_key_here
```

#### **3. Claude API Key**

1. Go to https://console.anthropic.com/
2. Sign up or log in
3. Go to API Keys section
4. Create new key
5. Copy key

Add to .env:
```env
ANTHROPIC_API_KEY=sk-ant-your-api-key-here
```

#### **4. Stripe Keys (For Payments)**

1. Go to https://dashboard.stripe.com/
2. Sign up or log in
3. Go to Developers → API Keys
4. Copy **Secret key** (starts with `sk_test_`)
5. Copy **Publishable key** (starts with `pk_test_`)

Add to .env:
```env
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
```

**Note:** These are TEST keys. For production, use LIVE keys (`sk_live_` and `pk_live_`).

#### **5. Create Stripe Products**

1. Go to Stripe Dashboard → Products
2. Create products for each tier:

**Student Tier:**
- Name: "Philosopher AI - Student"
- Price: $20/month
- Copy Price ID (starts with `price_`)

**Teacher Tier:**
- Name: "Philosopher AI - Teacher"
- Price: $97/month

**Philosopher Tier:**
- Name: "Philosopher AI - Philosopher"
- Price: $497/month

Add Price IDs to .env:
```env
STRIPE_PRICE_STUDENT_MONTHLY=price_xxxxx
STRIPE_PRICE_TEACHER_MONTHLY=price_xxxxx
STRIPE_PRICE_PHILOSOPHER_MONTHLY=price_xxxxx
```

#### **6. Stripe Webhook Secret**

1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. Endpoint URL: `https://your-domain.com/api/stripe/webhook`
   (For local testing: Use Stripe CLI - see below)
4. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Click "Add endpoint"
6. Copy "Signing secret" (starts with `whsec_`)

Add to .env:
```env
STRIPE_WEBHOOK_SECRET=whsec_your_secret_here
```

**For local testing with Stripe CLI:**
```bash
# Install Stripe CLI
# Windows: https://github.com/stripe/stripe-cli/releases
# macOS: brew install stripe/stripe-cli/stripe
# Linux: Download from GitHub

# Login to Stripe
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3001/api/stripe/webhook

# This will output a webhook signing secret - add it to .env
```

---

## 🚀 RUNNING THE SERVER

### **Development Mode (with auto-reload):**
```bash
npm run dev
```

### **Production Mode:**
```bash
npm start
```

### **Expected Output:**
```
================================================
🌀 PHILOSOPHER AI BACKEND - READY
================================================
Server running on port 3001
Environment: development
API URL: http://localhost:3001
Version: 1.0.0
================================================
✅ Database connected successfully
```

### **Test the API:**

Open browser to: http://localhost:3001/api/health

Should return:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "buildNumber": 1,
  "timestamp": "2025-10-10T12:00:00.000Z"
}
```

---

## 🧪 TESTING

### **1. Test Registration:**

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpassword123",
    "username": "Test User"
  }'
```

Expected response:
```json
{
  "success": true,
  "user": {
    "id": "uuid-here",
    "email": "test@example.com",
    "username": "Test User",
    "tier": "free"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### **2. Test Login:**

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpassword123"
  }'
```

### **3. Test Asking a Question:**

```bash
# Save the token from login response
TOKEN="your_token_here"

curl -X POST http://localhost:3001/api/questions/ask \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "question": "How do I detect manipulation in relationships?"
  }'
```

Expected response:
```json
{
  "success": true,
  "questionId": "uuid",
  "answer": "Based on Pattern Theory, detecting manipulation...",
  "consciousnessBoost": 5,
  "category": "relationships",
  "questionsRemaining": 2,
  "newConsciousnessLevel": 5
}
```

---

## 🌐 DEPLOYMENT TO PRODUCTION

### **Option 1: Railway.app (Recommended - Easiest)**

1. **Sign up:** https://railway.app/
2. **Create New Project** → Deploy from GitHub
3. **Connect repository**
4. **Add PostgreSQL database:** Click "New" → Database → PostgreSQL
5. **Set environment variables:**
   - Go to project → Variables
   - Add all variables from .env (use production values)
   - Railway auto-provides `DATABASE_URL`
6. **Deploy:** Railway auto-deploys on git push

**Cost:** ~$5-$20/month (scales with usage)

### **Option 2: Heroku**

```bash
# Install Heroku CLI
# Create Heroku app
heroku create philosopher-ai-backend

# Add PostgreSQL
heroku addons:create heroku-postgresql:mini

# Set environment variables
heroku config:set ANTHROPIC_API_KEY=sk-ant-xxx
heroku config:set JWT_SECRET=xxx
heroku config:set STRIPE_SECRET_KEY=sk_live_xxx
# ... (set all variables)

# Deploy
git push heroku main

# Run database migration
heroku pg:psql < database-schema.sql
```

**Cost:** ~$7-$25/month

### **Option 3: VPS (DigitalOcean, Linode, AWS EC2)**

**More control, more setup:**

1. Create Ubuntu VPS ($5-$10/month)
2. SSH into server
3. Install Node.js, PostgreSQL, nginx
4. Clone repository
5. Set up environment variables
6. Run with PM2 for process management
7. Configure nginx as reverse proxy
8. Set up SSL with Let's Encrypt

**Detailed VPS setup guide:** (Can provide if needed)

---

## 🐛 TROUBLESHOOTING

### **Database connection failed**

**Error:** `ECONNREFUSED 127.0.0.1:5432`

**Fix:**
1. Check PostgreSQL is running:
   ```bash
   # Windows
   services.msc  # Look for "postgresql" service

   # macOS
   brew services list

   # Linux
   sudo systemctl status postgresql
   ```

2. Check DATABASE_URL in .env matches your PostgreSQL credentials

3. Try connecting manually:
   ```bash
   psql -U postgres -d philosopher_ai_db
   ```

### **"Invalid credentials" when logging in**

**Possible causes:**
1. User doesn't exist - try registering first
2. Wrong password
3. Email case mismatch - emails are stored lowercase

### **Claude API not working**

**Error:** `401 Unauthorized`

**Fix:**
1. Check ANTHROPIC_API_KEY in .env
2. Verify key is active at https://console.anthropic.com/
3. Check API usage limits not exceeded

### **Stripe webhook not working locally**

**Solution:** Use Stripe CLI for local testing:
```bash
stripe listen --forward-to localhost:3001/api/stripe/webhook
```

Use the webhook secret provided by Stripe CLI.

### **Port 3001 already in use**

**Error:** `EADDRINUSE: address already in use :::3001`

**Fix:**
1. Change PORT in .env to different number (e.g., 3002)
2. Or kill process using port 3001:
   ```bash
   # Windows
   netstat -ano | findstr :3001
   taskkill /PID <PID> /F

   # macOS/Linux
   lsof -ti:3001 | xargs kill
   ```

---

## 📊 MONITORING & MAINTENANCE

### **Database Backups**

**Daily backup script:**
```bash
# Windows
pg_dump -U postgres philosopher_ai_db > backup_%DATE%.sql

# macOS/Linux
pg_dump philosopher_ai_db > backup_$(date +%Y%m%d).sql
```

**Schedule:** Use Windows Task Scheduler or cron

### **Logs**

- Server logs: Console output (redirect to file in production)
- Database queries: Enable PostgreSQL logging
- Error monitoring: Consider Sentry.io for production

### **Analytics**

Check these tables regularly:
```sql
-- Total users
SELECT COUNT(*) FROM users;

-- Users by tier
SELECT tier, COUNT(*) FROM users GROUP BY tier;

-- Questions asked today
SELECT COUNT(*) FROM questions WHERE DATE(created_at) = CURRENT_DATE;

-- Revenue (MRR)
SELECT tier, COUNT(*) * (amount_cents/100) as mrr
FROM subscriptions
WHERE status = 'active'
GROUP BY tier, amount_cents;
```

---

## ✅ PRODUCTION CHECKLIST

Before going live:

- [ ] Use production Stripe keys (`sk_live_`, `pk_live_`)
- [ ] Set `NODE_ENV=production` in environment
- [ ] Use strong JWT_SECRET (64+ characters)
- [ ] Enable HTTPS/SSL
- [ ] Set up automated database backups
- [ ] Configure rate limiting appropriately
- [ ] Set up error monitoring (Sentry, LogRocket, etc.)
- [ ] Test Stripe webhooks with live mode
- [ ] Configure CORS for production domain only
- [ ] Set up CDN for static assets (optional)
- [ ] Load testing (can it handle 1000+ users?)

---

## 🎯 NEXT STEPS

After backend is running:

1. **Update frontend** to connect to backend API
2. **Test end-to-end** (register → login → ask question → upgrade)
3. **Deploy frontend** to Netlify/Vercel
4. **Set up custom domain**
5. **Launch!** 🚀

---

## 📞 SUPPORT

**Issues?**
- Check troubleshooting section above
- Review server logs for error messages
- Check database connection
- Verify environment variables are set correctly

**Need help?**
- Create detailed description of issue
- Include error messages
- Include relevant logs
- Include environment (OS, Node version, PostgreSQL version)

---

**Status:** 🟢 PRODUCTION READY
**Version:** 1.0.0
**Last Updated:** 2025-10-10

**Let's get this running and start generating revenue!** 💰⚡🌀
