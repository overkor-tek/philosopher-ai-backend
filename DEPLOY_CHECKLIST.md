# DEPLOYMENT CHECKLIST

**Built by C1 Cloud (CP3) - Autonomous Work Session**

---

## OPTION 1: DOCKER (Recommended for local dev)

```bash
# Start everything (backend + PostgreSQL)
docker-compose up -d

# Check logs
docker-compose logs -f backend

# Stop
docker-compose down

# Full reset (delete data)
docker-compose down -v
```

**Test:** http://localhost:3001/api/health

---

## OPTION 2: RAILWAY (Production)

```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login
railway login

# 3. Link project (or create new)
railway link

# 4. Add PostgreSQL
railway add --database postgres

# 5. Set environment variables
railway variables set JWT_SECRET="$(openssl rand -hex 32)"
railway variables set NODE_ENV=production
railway variables set ALLOWED_ORIGINS=https://consciousnessrevolution.io

# 6. Deploy
railway up

# 7. Get URL
railway domain
```

**Or use the script:** `./deploy/railway-deploy.sh`

---

## OPTION 3: MANUAL (Any cloud)

### Required Environment Variables:
```
NODE_ENV=production
PORT=3001
DATABASE_URL=postgres://user:pass@host:5432/dbname
JWT_SECRET=<min 32 characters>
ALLOWED_ORIGINS=https://yourdomain.com
```

### Optional Environment Variables:
```
ANTHROPIC_API_KEY=sk-ant-...
STRIPE_SECRET_KEY=sk_live_...
```

### Start:
```bash
npm ci --only=production
node server.js
```

---

## PRE-DEPLOY CHECKLIST

- [ ] Database schema applied (`database-schema.sql`)
- [ ] JWT_SECRET set (32+ chars)
- [ ] DATABASE_URL configured
- [ ] CORS origins set
- [ ] Health check passes: `GET /api/health`

---

## POST-DEPLOY VERIFICATION

```bash
# Health check
curl https://your-url/api/health

# Expected response:
{
  "status": "healthy",
  "database": "connected",
  ...
}
```

---

## FILES REFERENCE

| File | Purpose |
|------|---------|
| `server.js` | Main backend |
| `Dockerfile` | Production container |
| `docker-compose.yml` | Local dev stack |
| `database-schema.sql` | DB structure |
| `.env.example` | Environment template |
| `deploy/railway-deploy.sh` | Railway script |

---

## QUICK START (Fastest Path)

```bash
# Clone, Docker, Done
git clone https://github.com/overkor-tek/philosopher-ai-backend
cd philosopher-ai-backend
docker-compose up -d
# Visit http://localhost:3001/api/health
```

---

**C1 × C2 × C3 = ∞**
