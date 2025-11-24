# ✅ TRINITY FOUNDATION - Deployment Checklist
## Step-by-Step Guide for C3 Oracle

**Created By:** C2 Architect (Autonomous Session)
**Date:** 2025-11-24
**For:** C3 Oracle (Operations Hub deployment)
**Purpose:** Execute Foundation deployment while Commander rests

---

## 🎯 MISSION

Deploy the complete Trinity Foundation infrastructure on C3 Operations Hub:
- Qdrant Vector Database
- Casibase A2A Platform
- API Gateway
- DeepSeek R1 (if available)

**Timeline:** 2-4 hours
**Prerequisites:** Docker installed, Ollama running, ports available

---

## ✅ PRE-DEPLOYMENT CHECKLIST

### System Requirements

```bash
# Check available resources
free -h        # Memory: Need 4GB+ available
df -h          # Disk: Need 10GB+ available
docker --version  # Docker: Need v20.10+
ollama list    # Ollama: Should show existing models

# Check port availability
netstat -tuln | grep -E ':(6333|8080|3000|5000)'
# Ports 6333, 8080, 3000, 5000 should be FREE
```

### Required Ports

| Port | Service | Status |
|------|---------|--------|
| 6333 | Qdrant Vector DB | Must be FREE |
| 8080 | Casibase Platform | Must be FREE |
| 3000 | API Gateway | Must be FREE |
| 5000 | Voice Interface (existing) | May be in use |
| 11434 | Ollama (existing) | Should be in use |

---

## 📋 DEPLOYMENT PHASES

## PHASE 1: QDRANT VECTOR DATABASE (30 minutes)

**Work Order:** C3-WO-001

### Step 1.1: Pull Qdrant Docker Image

```bash
# Pull latest Qdrant image
docker pull qdrant/qdrant:latest

# Verify image
docker images | grep qdrant
```

### Step 1.2: Create Qdrant Data Directory

```bash
# Create persistent storage
mkdir -p /data/qdrant
chmod 777 /data/qdrant

# Verify
ls -la /data/ | grep qdrant
```

### Step 1.3: Run Qdrant Container

```bash
# Start Qdrant with persistence
docker run -d \
  --name qdrant \
  -p 6333:6333 \
  -p 6334:6334 \
  -v /data/qdrant:/qdrant/storage \
  --restart unless-stopped \
  qdrant/qdrant:latest

# Check status
docker ps | grep qdrant
```

### Step 1.4: Verify Qdrant

```bash
# Check health
curl http://localhost:6333/health

# Expected: {"status":"ok"}

# Check version
curl http://localhost:6333/

# Expected: JSON with version info
```

### Step 1.5: Create Initial Collections

```python
# Create collections for Trinity knowledge
# Run this Python script:

import requests

QDRANT_URL = "http://localhost:6333"

# Create knowledge_base collection
requests.put(
    f"{QDRANT_URL}/collections/knowledge_base",
    json={
        "vectors": {
            "size": 768,  # text-embedding-ada-002 dimensions
            "distance": "Cosine"
        }
    }
)

# Create sessions collection
requests.put(
    f"{QDRANT_URL}/collections/session_reports",
    json={
        "vectors": {
            "size": 768,
            "distance": "Cosine"
        }
    }
)

# Create code collection
requests.put(
    f"{QDRANT_URL}/collections/code_repository",
    json={
        "vectors": {
            "size": 768,
            "distance": "Cosine"
        }
    }
)

# Verify collections
response = requests.get(f"{QDRANT_URL}/collections")
print(response.json())
```

Save as `create_qdrant_collections.py` and run:
```bash
python3 create_qdrant_collections.py
```

### Step 1.6: Test Qdrant Integration

```python
# Test search functionality
# Save as test_qdrant.py

import requests

QDRANT_URL = "http://localhost:6333"

# Insert test point
requests.put(
    f"{QDRANT_URL}/collections/knowledge_base/points",
    json={
        "points": [
            {
                "id": 1,
                "vector": [0.1] * 768,  # Dummy vector
                "payload": {
                    "text": "Test document",
                    "category": "test"
                }
            }
        ]
    }
)

# Search
response = requests.post(
    f"{QDRANT_URL}/collections/knowledge_base/points/search",
    json={
        "vector": [0.1] * 768,
        "limit": 1
    }
)

print("Search results:", response.json())
```

**✅ PHASE 1 COMPLETE CRITERIA:**
- [ ] Qdrant container running
- [ ] Health check passes
- [ ] 3 collections created
- [ ] Test search works

---

## PHASE 2: DEEPSEEK R1 MODEL (15 minutes)

**Work Order:** C3-WO-003

### Step 2.1: Check DeepSeek R1 Availability

```bash
# Check if model available in Ollama
ollama list | grep deepseek

# Search for DeepSeek models
ollama search deepseek
```

### Step 2.2: Pull DeepSeek R1 (if available)

```bash
# Pull model (this may take time, ~5GB)
ollama pull deepseek-r1:8b

# Or try alternative names:
# ollama pull deepseek-r1
# ollama pull deepseek
```

### Step 2.3: Test DeepSeek R1

```bash
# Test reasoning capability
ollama run deepseek-r1:8b "Solve this step-by-step: If 5 workers can build a wall in 10 days, how long would it take 10 workers?"

# Check response quality and reasoning steps
```

### Step 2.4: Compare with Mistral

```bash
# Test same query with mistral
ollama run mistral "Solve this step-by-step: If 5 workers can build a wall in 10 days, how long would it take 10 workers?"

# Compare reasoning quality
```

### Step 2.5: Document Findings

Create `DEEPSEEK_R1_EVALUATION.md`:
```markdown
# DeepSeek R1 Evaluation Results

**Date:** 2025-11-24
**Evaluator:** C3 Oracle

## Availability
- [ ] Available via Ollama
- [ ] Not available (fallback to future check)

## Performance (if available)
- Model size: X GB
- Response time: X seconds
- Reasoning quality: (Excellent/Good/Fair)
- Comparison vs mistral: (Better/Same/Worse)

## Use Cases
1. ...
2. ...

## Recommendation
- [ ] Deploy for production use
- [ ] Use for specific tasks only
- [ ] Wait for future availability
```

**✅ PHASE 2 COMPLETE CRITERIA:**
- [ ] DeepSeek R1 availability checked
- [ ] If available: Model pulled and tested
- [ ] Performance comparison documented
- [ ] Recommendation made

**If DeepSeek R1 not available:** Skip to Phase 3, note in report

---

## PHASE 3: CASIBASE A2A PLATFORM (60-90 minutes)

**Work Order:** C3-WO-002

### Step 3.1: Clone Casibase Repository

```bash
# Clone repository
cd /opt
git clone https://github.com/casibase/casibase.git
cd casibase

# Check README for dependencies
cat README.md
```

### Step 3.2: Review Requirements

```bash
# Check for Docker Compose
docker-compose --version

# Check for Node.js (if needed)
node --version
npm --version

# Check for Go (if needed)
go version
```

### Step 3.3: Configure Casibase

```bash
# Copy example configuration
cp conf/app.conf.example conf/app.conf

# Edit configuration
nano conf/app.conf

# Key settings to verify:
# - HTTP port: 8080
# - Database: PostgreSQL connection string
# - Auth settings
```

### Step 3.4: Set Up PostgreSQL (if needed)

```bash
# Check if PostgreSQL needed
grep -i postgres conf/app.conf

# If needed, start PostgreSQL container
docker run -d \
  --name casibase-postgres \
  -e POSTGRES_PASSWORD=casibase \
  -e POSTGRES_DB=casibase \
  -v /data/postgres:/var/lib/postgresql/data \
  -p 5432:5432 \
  --restart unless-stopped \
  postgres:15

# Wait for PostgreSQL to be ready
sleep 10
```

### Step 3.5: Deploy Casibase

**Option A: Docker Compose (if available)**
```bash
# Start with Docker Compose
docker-compose up -d

# Check logs
docker-compose logs -f
```

**Option B: Docker Run**
```bash
# Build Casibase image
docker build -t casibase:latest .

# Run Casibase
docker run -d \
  --name casibase \
  -p 8080:8080 \
  --link casibase-postgres:postgres \
  --restart unless-stopped \
  casibase:latest

# Check logs
docker logs -f casibase
```

**Option C: Binary (if Docker not working)**
```bash
# Build from source
go build

# Run binary
./casibase

# Or with nohup for background
nohup ./casibase &
```

### Step 3.6: Verify Casibase

```bash
# Check if running
curl http://localhost:8080/health

# Or open in browser
# http://100.101.209.1:8080
```

### Step 3.7: Initial Setup

1. Open web UI: `http://localhost:8080`
2. Complete initial setup wizard
3. Create admin account
4. Configure organization

### Step 3.8: Register Trinity Agents

```python
# Register C1, C2, C3 as agents
# Save as register_trinity_agents.py

import requests

CASIBASE_URL = "http://localhost:8080"

agents = [
    {
        "id": "C1_MECHANIC",
        "name": "C1 Mechanic",
        "role": "coordinator",
        "capabilities": ["coordination", "task_distribution", "monitoring"],
        "computer": "dwrekscpu",
        "ip": "100.70.208.75"
    },
    {
        "id": "C2_ARCHITECT",
        "name": "C2 Architect",
        "role": "designer",
        "capabilities": ["architecture", "design", "planning"],
        "computer": "desktop-msmcfh2",
        "ip": "100.85.71.74"
    },
    {
        "id": "C3_ORACLE",
        "name": "C3 Oracle",
        "role": "processor",
        "capabilities": ["analysis", "prediction", "heavy_processing"],
        "computer": "desktop-s72lrro",
        "ip": "100.101.209.1"
    }
]

for agent in agents:
    response = requests.post(
        f"{CASIBASE_URL}/api/agents/register",
        json=agent
    )
    print(f"Registered {agent['id']}: {response.status_code}")
```

### Step 3.9: Test Agent Communication

```python
# Test message passing between agents
# Save as test_casibase_messaging.py

import requests

CASIBASE_URL = "http://localhost:8080"

# Send message from C3 to C1
message = {
    "from": "C3_ORACLE",
    "to": "C1_MECHANIC",
    "type": "status_update",
    "payload": {
        "message": "Casibase deployment complete",
        "timestamp": "2025-11-24T12:00:00Z"
    }
}

response = requests.post(
    f"{CASIBASE_URL}/api/agents/message",
    json=message
)

print("Message sent:", response.json())
```

### Step 3.10: Document Deployment

Create `CASIBASE_DEPLOYMENT_REPORT.md`:
```markdown
# Casibase Deployment Report

**Date:** 2025-11-24
**Deployed By:** C3 Oracle

## Deployment Method
- [ ] Docker Compose
- [ ] Docker Run
- [ ] Binary

## Status
- Web UI accessible: Yes/No
- Database connection: Yes/No
- Agents registered: X/3

## Findings
- Easy to deploy: Yes/No
- Performance: Good/Fair/Poor
- Integration potential: High/Medium/Low

## Recommendation
- [ ] Deploy for production use
- [ ] Use for testing only
- [ ] Wait for further evaluation

## Next Steps
1. ...
2. ...
```

**✅ PHASE 3 COMPLETE CRITERIA:**
- [ ] Casibase deployed and accessible
- [ ] PostgreSQL running (if needed)
- [ ] Web UI accessible
- [ ] 3 Trinity agents registered
- [ ] Message passing tested
- [ ] Deployment documented
- [ ] Recommendation made

**If blockers encountered:** Document and report to C1

---

## PHASE 4: API GATEWAY (30 minutes)

**Work Order:** C2 Architect Support

### Step 4.1: Install Dependencies

```bash
# Install Flask and dependencies
pip3 install flask flask-cors requests

# Verify installation
python3 -c "import flask; print(flask.__version__)"
```

### Step 4.2: Deploy API Gateway

```bash
# Copy API Gateway file (already created by C2)
# File: trinity_foundation_api_gateway.py

# Set environment variables (optional, defaults work)
export QDRANT_URL="http://localhost:6333"
export OLLAMA_URL="http://localhost:11434"
export VOICE_URL="http://localhost:5000"
export CASIBASE_URL="http://localhost:8080"

# Test run (foreground)
python3 trinity_foundation_api_gateway.py

# Should see: "Trinity Foundation API Gateway starting..."
```

### Step 4.3: Test API Gateway

```bash
# In new terminal, test health check
curl http://localhost:3000/health

# Expected: JSON with all component statuses

# Test unified query
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{"query": "test", "mode": "auto"}'
```

### Step 4.4: Run as Background Service

```bash
# Stop foreground process (Ctrl+C)

# Run in background with nohup
nohup python3 trinity_foundation_api_gateway.py > /tmp/api_gateway.log 2>&1 &

# Check it's running
curl http://localhost:3000/health

# View logs
tail -f /tmp/api_gateway.log
```

### Step 4.5: Create Systemd Service (Optional - Production)

```bash
# Create service file
sudo nano /etc/systemd/system/trinity-gateway.service
```

Content:
```ini
[Unit]
Description=Trinity Foundation API Gateway
After=network.target docker.service

[Service]
Type=simple
User=darrick
WorkingDirectory=/home/darrick
ExecStart=/usr/bin/python3 /home/darrick/trinity_foundation_api_gateway.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable trinity-gateway
sudo systemctl start trinity-gateway

# Check status
sudo systemctl status trinity-gateway
```

**✅ PHASE 4 COMPLETE CRITERIA:**
- [ ] Dependencies installed
- [ ] API Gateway running
- [ ] Health check passes
- [ ] All services accessible via gateway
- [ ] Background service configured

---

## PHASE 5: INTEGRATION TESTING (30 minutes)

### Step 5.1: End-to-End Query Test

```python
# Test complete query flow through all systems
# Save as test_foundation_e2e.py

import requests
import time

GATEWAY_URL = "http://localhost:3000"

print("=== TRINITY FOUNDATION E2E TEST ===\n")

# Test 1: Health Check
print("1. Testing health check...")
response = requests.get(f"{GATEWAY_URL}/health")
health = response.json()
print(f"   Status: {health['status']}")
print(f"   Components: {health['components']}")
assert health['status'] == 'healthy' or health['status'] == 'degraded'
print("   ✅ PASS\n")

# Test 2: Qdrant Collections
print("2. Testing Qdrant collections...")
response = requests.get(f"{GATEWAY_URL}/api/search/collections")
collections = response.json()
print(f"   Collections: {len(collections.get('result', {}).get('collections', []))}")
print("   ✅ PASS\n")

# Test 3: Ollama Models
print("3. Testing Ollama models...")
response = requests.get(f"{GATEWAY_URL}/api/ai/models")
models = response.json()
print(f"   Models available: {len(models.get('models', []))}")
print("   ✅ PASS\n")

# Test 4: Unified Query
print("4. Testing unified query...")
response = requests.post(
    f"{GATEWAY_URL}/api/query",
    json={"query": "test query", "mode": "auto"}
)
print(f"   Status: {response.status_code}")
if response.status_code == 200:
    print("   ✅ PASS\n")
else:
    print(f"   ⚠️  Response: {response.text}\n")

# Test 5: Casibase Agents (if deployed)
print("5. Testing Casibase agents...")
try:
    response = requests.get(f"{GATEWAY_URL}/api/agents/status", timeout=5)
    if response.status_code == 200:
        print("   ✅ PASS\n")
    else:
        print("   ⚠️  Not accessible\n")
except:
    print("   ⚠️  Service not responding (may not be deployed yet)\n")

print("=== TEST COMPLETE ===")
```

Run test:
```bash
python3 test_foundation_e2e.py
```

### Step 5.2: Performance Baseline

```python
# Measure baseline performance
# Save as benchmark_foundation.py

import requests
import time

GATEWAY_URL = "http://localhost:3000"

def measure_latency(endpoint, method='GET', data=None):
    start = time.time()
    if method == 'GET':
        response = requests.get(f"{GATEWAY_URL}{endpoint}")
    else:
        response = requests.post(f"{GATEWAY_URL}{endpoint}", json=data)
    latency = (time.time() - start) * 1000  # ms
    return latency, response.status_code

print("=== PERFORMANCE BASELINE ===\n")

# Test endpoints
tests = [
    ("Health Check", "/health", "GET", None),
    ("List Collections", "/api/search/collections", "GET", None),
    ("List Models", "/api/ai/models", "GET", None),
]

for name, endpoint, method, data in tests:
    latency, status = measure_latency(endpoint, method, data)
    print(f"{name}: {latency:.2f}ms (status: {status})")

print("\n=== BASELINE COMPLETE ===")
```

**✅ PHASE 5 COMPLETE CRITERIA:**
- [ ] E2E test passes
- [ ] All services responding
- [ ] Performance baseline documented
- [ ] No errors in logs

---

## 📊 COMPLETION REPORT

### Deployment Summary Template

```markdown
# Trinity Foundation Deployment - COMPLETE

**Date:** 2025-11-24
**Deployed By:** C3 Oracle (Autonomous)
**Duration:** X hours X minutes

## Services Deployed

| Service | Status | URL | Notes |
|---------|--------|-----|-------|
| Qdrant Vector DB | ✅/❌ | localhost:6333 | X collections created |
| DeepSeek R1 | ✅/❌ | Via Ollama | Available: Yes/No |
| Casibase Platform | ✅/❌ | localhost:8080 | X agents registered |
| API Gateway | ✅/❌ | localhost:3000 | All endpoints working |

## Test Results

- Health Check: PASS/FAIL
- E2E Query: PASS/FAIL
- Performance: X ms avg latency

## Blockers Encountered

1. (None/List blockers)

## Recommendations

1. ...
2. ...

## Next Steps

1. Ingest knowledge into Qdrant
2. Migrate Trinity instances to use Gateway
3. Enable Casibase workflows

## Files Created

- DEEPSEEK_R1_EVALUATION.md
- CASIBASE_DEPLOYMENT_REPORT.md
- test_foundation_e2e.py
- benchmark_foundation.py

## Trinity Hub Update

- Updated: Yes/No
- Message sent to C1: Yes/No
```

---

## 🚀 POST-DEPLOYMENT

### Immediate Next Steps

```bash
# 1. Create deployment report
nano TRINITY_FOUNDATION_DEPLOYMENT_COMPLETE.md

# 2. Update Trinity Hub
nano C:/.trinity/TRINITY_COMMS_HUB.json
# Add deployment status to C3 section

# 3. Create message for C1
nano C:/.trinity/messages/c3_foundation_deployed_20251124.json
```

### Report to Trinity Hub Template

```json
{
  "from": "C3_ORACLE",
  "to": "C1_MECHANIC",
  "timestamp": "2025-11-24T15:00:00Z",
  "type": "deployment_complete",
  "subject": "Trinity Foundation Deployment Complete",
  "services_deployed": {
    "qdrant": "operational",
    "deepseek_r1": "operational/unavailable",
    "casibase": "operational",
    "api_gateway": "operational"
  },
  "details": "See TRINITY_FOUNDATION_DEPLOYMENT_COMPLETE.md",
  "next_actions": [
    "Knowledge ingestion to Qdrant",
    "Trinity instance integration with Gateway",
    "Casibase workflow configuration"
  ],
  "status": "FOUNDATION READY FOR USE"
}
```

---

## 📞 SUPPORT & TROUBLESHOOTING

### Common Issues

**Issue: Qdrant won't start**
- Check port 6333 not in use: `netstat -tuln | grep 6333`
- Check Docker running: `docker ps`
- Check logs: `docker logs qdrant`

**Issue: Casibase deployment fails**
- Check PostgreSQL running: `docker ps | grep postgres`
- Check logs: `docker logs casibase`
- Verify configuration: `cat conf/app.conf`

**Issue: API Gateway errors**
- Check all services running
- Check health: `curl http://localhost:3000/health`
- Check logs: `tail -f /tmp/api_gateway.log`

### Emergency Rollback

```bash
# Stop all services
docker stop qdrant casibase casibase-postgres
pkill -f trinity_foundation_api_gateway.py

# Remove containers (if needed)
docker rm qdrant casibase casibase-postgres

# System back to pre-deployment state
```

---

**Created By:** C2 Architect
**For:** C3 Oracle Autonomous Execution
**Status:** Ready for Deployment ✅

**C1 × C2 × C3 = ∞**

**Mission:** Love + Light + Liberation
