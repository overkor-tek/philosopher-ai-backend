# 🔧 RECOVERY CHECKLIST - Return from Offline

**Purpose:** Complete system verification after 1-week offline period
**Date:** For use when returning Nov 15, 2025+
**Time:** 15-30 minutes total

---

## ✅ PHASE 1: VERIFY INFRASTRUCTURE (5 minutes)

### Backend Status
- [ ] Check Railway is running: https://railway.app
- [ ] Test health endpoint: `curl https://cloud-funnel-production.up.railway.app/api/v1/health`
- [ ] Expected: `{"status":"healthy","version":"1.0.0"...}`

### Database Status
- [ ] Verify database connected (check health endpoint response)
- [ ] Check Railway environment variables set
- [ ] Expected: DATABASE_URL, JWT_SECRET, etc. all present

### GitHub Status
- [ ] Pull latest changes: `git pull origin main`
- [ ] Check for commits from Computer A
- [ ] Verify last commit is f0dc8df or newer

**If all pass:** Proceed to Phase 2
**If any fail:** See "Troubleshooting" section below

---

## ✅ PHASE 2: TEST KNOWLEDGE API (5 minutes)

### Run Automated Tests
```batch
cd C:\Users\Darrick\100X_BACKUP\100X_DEPLOYMENT\BACKEND\philosopher-ai
TEST_KNOWLEDGE_API.bat
```

### Manual Verification
- [ ] Test 1: Health check returns OK
- [ ] Test 2: POST knowledge returns success
- [ ] Test 3: Search returns results
- [ ] Test 4: Recent returns items
- [ ] Test 5: Stats returns counts

**Expected:** All 5 tests return JSON responses
**If all pass:** Knowledge API is operational ✅
**If any fail:** Check Railway logs: `railway logs`

---

## ✅ PHASE 3: START AUTONOMOUS SYSTEMS (10 minutes)

### Option A: Start Everything
```batch
START_ALL_AUTONOMOUS_SYSTEMS.bat
```

This starts:
- Data Cyclotron (knowledge ingestion)
- Trinity Hub (coordination)
- Health Monitor (system monitoring)

### Option B: Start Cyclotron Only
```batch
START_CYCLOTRON.bat
```

### Verify Operation (Wait 5-10 minutes)
- [ ] No errors in Cyclotron window
- [ ] Stats endpoint shows increasing count
- [ ] Search returns new knowledge items
- [ ] Categories are populated

**Command to check stats:**
```bash
curl https://cloud-funnel-production.up.railway.app/api/v1/knowledge/stats
```

**Expected:** Count increases every 5 minutes

---

## ✅ PHASE 4: VERIFY COORDINATION (5 minutes)

### Check Computer A Status
- [ ] Pull GitHub: `git pull origin main`
- [ ] Check commits since Nov 7: `git log --since="2025-11-07" --oneline`
- [ ] Look for Computer A commits

### Check Dropbox Communication
- [ ] Open CENTRAL_COMMAND/
- [ ] Check for new status files
- [ ] Look for Computer A responses

### Update Status
- [ ] Create new status file: `COMPUTER_1_ONLINE_[DATE].json`
- [ ] Commit and push to GitHub
- [ ] Leave Dropbox message if needed

---

## ✅ PHASE 5: REVIEW NEXT STEPS (5 minutes)

### Read Documentation
- [ ] Review 🎯_START_HERE_RETURN.md
- [ ] Check DORMANT_SYSTEMS_INTEGRATION_CATALOG.md
- [ ] Review Phase 2 integration requirements

### Decide Priority
Choose one:
- [ ] **Option A:** Continue with Cyclotron optimization (30 min)
- [ ] **Option B:** Deploy Trinity Hub (1 hour)
- [ ] **Option C:** Full Phase 2 integration (4-6 hours)
- [ ] **Option D:** Other priority tasks

### Create Session Plan
- [ ] Document chosen priority
- [ ] Estimate time required
- [ ] Create task list
- [ ] Begin work

---

## 🚨 TROUBLESHOOTING

### Backend Not Responding

**Symptoms:** Health endpoint returns 502/503/timeout

**Actions:**
1. Check Railway status: https://railway.app/status
2. Check deployment logs: `railway logs`
3. Verify environment variables: `railway variables`
4. Redeploy if needed:
   ```batch
   QUICK_DEPLOY.bat
   ```

### Knowledge API Returns 404

**Symptoms:** /api/v1/knowledge returns "Not Found"

**Actions:**
1. Verify routes in server.js:
   ```bash
   grep -n "knowledgeRoutes" server.js
   ```
   Should show lines 442 and 449

2. Check Railway logs for errors:
   ```bash
   railway logs | grep -i "error\|knowledge"
   ```

3. Redeploy if needed:
   ```batch
   QUICK_DEPLOY.bat
   ```

### Cyclotron Won't Start

**Symptoms:** Python errors or connection failures

**Actions:**
1. Verify Python installed:
   ```bash
   python --version
   ```
   Expected: Python 3.8+

2. Install dependencies:
   ```bash
   cd DORMANT_SYSTEMS
   pip install -r requirements.txt
   ```

3. Check backend URL:
   ```bash
   echo %CYCLOTRON_BACKEND_URL%
   ```
   Expected: https://cloud-funnel-production.up.railway.app

4. Test connection manually:
   ```python
   from cyclotron_backend_connector import CyclotronBackendConnector
   connector = CyclotronBackendConnector('https://cloud-funnel-production.up.railway.app')
   connector.check_health()
   ```

### Database Connection Failed

**Symptoms:** "Unable to connect to database"

**Actions:**
1. Check Railway database status
2. Verify DATABASE_URL environment variable
3. Check database credentials
4. Review Railway logs: `railway logs | grep -i database`

### Git Pull Fails

**Symptoms:** Merge conflicts or authentication errors

**Actions:**
1. If merge conflicts:
   ```bash
   git stash
   git pull origin main
   git stash pop
   ```

2. If authentication failed:
   ```bash
   git config --global user.name "your-name"
   git config --global user.email "your-email"
   ```

---

## 📊 SUCCESS CRITERIA

### ✅ Phase 1 Success
- Backend responds to health checks
- Database connected
- GitHub accessible

### ✅ Phase 2 Success
- All 5 Knowledge API endpoints working
- Can POST, GET, search knowledge
- Stats endpoint returns data

### ✅ Phase 3 Success
- Cyclotron running without errors
- Knowledge count increasing
- Categories populating
- Search returning results

### ✅ Phase 4 Success
- Computer A status known
- GitHub coordination active
- Status files updated

### ✅ Phase 5 Success
- Next priority chosen
- Session plan created
- Ready to continue work

---

## 🎯 QUICK REFERENCE

### Key Commands
```batch
# Test everything
TEST_KNOWLEDGE_API.bat

# Start autonomous systems
START_ALL_AUTONOMOUS_SYSTEMS.bat

# Deploy changes
QUICK_DEPLOY.bat

# Check Railway logs
railway logs

# Check stats
curl https://cloud-funnel-production.up.railway.app/api/v1/knowledge/stats
```

### Key URLs
- Backend: https://cloud-funnel-production.up.railway.app
- Health: https://cloud-funnel-production.up.railway.app/api/v1/health
- Knowledge API: https://cloud-funnel-production.up.railway.app/api/v1/knowledge
- GitHub: https://github.com/overkillkulture/philosopher-ai-backend
- Railway: https://railway.app

### Key Files
- 🎯_START_HERE_RETURN.md (main guide)
- DEPLOY_KNOWLEDGE_API.md (deployment steps)
- DORMANT_SYSTEMS_INTEGRATION_CATALOG.md (systems roadmap)
- 🚨_1_WEEK_OFFLINE_HANDOFF.md (complete handoff)

---

## 📝 NOTES SECTION

Use this section to document findings during recovery:

**Actual Return Date:** _____________

**Backend Status:** _____________

**Knowledge API Status:** _____________

**Cyclotron Status:** _____________

**Computer A Status:** _____________

**Issues Encountered:**
-
-
-

**Resolutions:**
-
-
-

**Next Priority Chosen:** _____________

**Session Start Time:** _____________

---

**Created:** 2025-11-07
**By:** Computer 1 (C2 Architect)
**Version:** 1.0
**Status:** Ready for use Nov 15+

---

C1 × C2 × C3 = Systematic Recovery
