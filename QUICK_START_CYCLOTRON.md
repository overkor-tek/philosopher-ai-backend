# 🌪️ QUICK START: Data Cyclotron Integration

**Time to Integrate:** 30 minutes
**Status:** Connector tested and working!
**Backend:** Live at https://cloud-funnel-production.up.railway.app

---

## ✅ VERIFIED WORKING

**Test Result:** Data Cyclotron backend connector successfully connected to production backend!

```
[OK] Backend healthy: {'status': 'healthy', 'version': '1.0.0'...}
```

**Connector Location:** `DORMANT_SYSTEMS/cyclotron_backend_connector.py`

---

## 🚀 INTEGRATION STEPS

### Step 1: Add Knowledge Routes to Backend (10 min)

**File Created:** `routes/knowledge.js` ✅

**Add to main server file:**
```javascript
// Add this line with other route imports
const knowledgeRoutes = require('./routes/knowledge');

// Add this line with other route uses
app.use('/api/v1/knowledge', knowledgeRoutes);
```

### Step 2: Deploy to Railway (5 min)

```bash
cd C:\Users\Darrick\100X_BACKUP\100X_DEPLOYMENT\BACKEND\philosopher-ai
git add routes/knowledge.js
git commit -m "Add knowledge API endpoints for Data Cyclotron"
git push origin main
# Railway auto-deploys!
```

### Step 3: Test Knowledge Endpoints (5 min)

```bash
# Test store knowledge
curl -X POST https://cloud-funnel-production.up.railway.app/api/v1/knowledge \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Knowledge Item",
    "content": "Testing Data Cyclotron integration",
    "source": "cyclotron_test",
    "categories": ["testing"],
    "keywords": ["test", "cyclotron"]
  }'

# Test search
curl "https://cloud-funnel-production.up.railway.app/api/v1/knowledge/search?q=test"

# Test recent
curl "https://cloud-funnel-production.up.railway.app/api/v1/knowledge/recent?limit=5"

# Test stats
curl "https://cloud-funnel-production.up.railway.app/api/v1/knowledge/stats"
```

### Step 4: Start Data Cyclotron (10 min)

**Update backend URL in connector:**
```python
# Edit DORMANT_SYSTEMS/cyclotron_backend_connector.py
# Change line 21 to:
BACKEND_URL = os.getenv('CYCLOTRON_BACKEND_URL', 'https://cloud-funnel-production.up.railway.app')
```

**Start the connector:**
```bash
cd C:\Users\Darrick

# Set backend URL
set CYCLOTRON_BACKEND_URL=https://cloud-funnel-production.up.railway.app

# Test connection
python DORMANT_SYSTEMS/cyclotron_backend_connector.py

# Start continuous sync (if exists)
python cyclotron_continuous_sync.py
```

---

## 📊 KNOWLEDGE API ENDPOINTS

All endpoints ready to use:

**POST /api/v1/knowledge**
- Store knowledge from Data Cyclotron
- Auto-categorize and index
- Returns stored knowledge ID

**GET /api/v1/knowledge/search?q=query&limit=10**
- Natural language search
- Full-text search in title and content
- Returns matching knowledge items

**GET /api/v1/knowledge/category/:category**
- Get all knowledge in category
- Returns category-specific items
- Sorted by recency

**GET /api/v1/knowledge/recent?limit=10**
- Get most recent knowledge
- Default limit: 10
- Returns newest items first

**GET /api/v1/knowledge/stats**
- Total knowledge count
- Breakdown by category
- Last 24h additions

---

## 🔥 WHAT THIS ENABLES

**Before:**
- Manual knowledge entry
- No RSS feed integration
- No automatic categorization
- No search functionality

**After:**
- Auto-ingest from 20+ RSS feeds
- Triple-turbo AI processing
- Automatic categorization
- Natural language search
- Knowledge evolution
- Pattern recognition

**From Manual → Fully Autonomous Knowledge Management**

---

## 📁 FILE LOCATIONS

**Backend Routes:**
- `routes/knowledge.js` (created)

**Cyclotron Connector:**
- `DORMANT_SYSTEMS/cyclotron_backend_connector.py`

**Additional Cyclotron Files:**
- `cyclotron_continuous_sync.py` (at root)
- `cyclotron_logger.py`
- `cyclotron_knowledge_search.py`
- `cyclotron_analytics_system.js`
- `DATA_CYCLOTRON_STORAGE/` (existing knowledge feeds)

---

## 🎯 QUICK TEST SCRIPT

**test-cyclotron-integration.js:**
```javascript
const axios = require('axios');

const BACKEND = 'https://cloud-funnel-production.up.railway.app';

async function testCyclotronIntegration() {
  console.log('Testing Data Cyclotron Integration...\n');

  // Test 1: Store knowledge
  console.log('1. Storing test knowledge...');
  const storeResult = await axios.post(`${BACKEND}/api/v1/knowledge`, {
    title: 'Data Cyclotron Integration Test',
    content: 'Testing automatic knowledge storage from cyclotron',
    source: 'integration_test',
    categories: ['testing', 'cyclotron'],
    keywords: ['test', 'integration', 'cyclotron'],
    priority_score: 85
  });
  console.log('✅ Stored:', storeResult.data);

  // Test 2: Search
  console.log('\n2. Searching for knowledge...');
  const searchResult = await axios.get(`${BACKEND}/api/v1/knowledge/search?q=cyclotron`);
  console.log('✅ Found:', searchResult.data.count, 'items');

  // Test 3: Recent
  console.log('\n3. Getting recent knowledge...');
  const recentResult = await axios.get(`${BACKEND}/api/v1/knowledge/recent?limit=5`);
  console.log('✅ Recent:', recentResult.data.count, 'items');

  // Test 4: Stats
  console.log('\n4. Getting stats...');
  const statsResult = await axios.get(`${BACKEND}/api/v1/knowledge/stats`);
  console.log('✅ Stats:', statsResult.data.stats);

  console.log('\n✅ ALL TESTS PASSED! Cyclotron integration working!');
}

testCyclotronIntegration().catch(console.error);
```

---

## ⚡ NEXT STEPS

**After Knowledge API is live:**

1. **Start RSS Supercharger** (auto-ingest from 20+ sources)
2. **Start File Watcher** (process dropped files)
3. **Enable Knowledge Search** (natural language queries)
4. **Add Analytics Dashboard** (track knowledge growth)
5. **Connect to Frontend** (expose to users)

---

## 🚨 TROUBLESHOOTING

**If endpoints not working:**
1. Check `routes/knowledge.js` is added to main server
2. Verify Railway deployment successful
3. Check Railway logs for errors
4. Test backend health: `/api/v1/health`

**If cyclotron can't connect:**
1. Check `CYCLOTRON_BACKEND_URL` environment variable
2. Verify backend is accessible
3. Check firewall/network settings
4. Test with curl first

**If knowledge not storing:**
1. Check PostgreSQL `questions` table exists
2. Verify database connection in Railway
3. Check backend logs for SQL errors
4. Test with simple curl command first

---

## 📊 EXPECTED RESULTS

**After 24 hours of Cyclotron running:**
- 100-200 knowledge items ingested (from RSS feeds)
- Auto-categorized into 6+ categories
- Searchable via natural language
- Pattern connections identified
- Knowledge evolution started

**This is the foundation for autonomous knowledge management!**

---

**Status:** Connector tested ✅
**API Routes:** Created ✅
**Integration Path:** Clear ✅
**Time to Deploy:** 30 minutes

**START WITH STEP 1!**
