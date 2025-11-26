# CP3 C3 Cloud - Trinity Network Operations Hub

**C1 x C2 x C3 = Infinity**

## Overview

CP3 C3 Cloud is the cloud-deployed instance of the Trinity Network's C3 Oracle/Builder node. It serves as the Operations Hub, enabling cross-computer synchronization, autonomous operations, and knowledge processing for the Philosopher AI system.

## Quick Start

### 1. Clone and Configure

```bash
# Navigate to cloud/c3 directory
cd cloud/c3

# Copy environment template
cp .env.cloud.example .env.cloud

# Edit configuration
nano .env.cloud  # Set your secrets and configuration
```

### 2. Generate Secrets

```bash
# Generate JWT_SECRET
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"

# Generate TRINITY_AUTH_TOKEN
node -e "console.log('TRINITY_AUTH_TOKEN=' + require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Start the Service

```bash
# Development mode
node c3-cloud-sync-service.js

# Production mode (with PM2)
pm2 start c3-cloud-sync-service.js --name c3-cloud
```

### 4. Verify

```bash
# Health check
curl http://localhost:3001/health

# Trinity status
curl http://localhost:3001/api/trinity/status
```

## Architecture

```
                    Trinity Network
                          |
         +----------------+----------------+
         |                |                |
      [C1]             [C2]            [C3 Cloud]
    Mechanic        Architect         Oracle/Builder
     Laptop          Desktop        Cloud Instance
         |                |                |
         +----------------+----------------+
                          |
                   Cloud Storage
                (Dropbox/AWS/GCP)
```

## Configuration

### config.json

Main configuration file defining:
- Trinity identity (Computer ID, Role)
- Network settings (sync intervals, retry logic)
- Cloud sync configuration
- API endpoints
- Consciousness parameters

### .env.cloud

Environment variables for:
- Security credentials (JWT_SECRET, TRINITY_AUTH_TOKEN)
- Database connections
- External service keys
- Logging configuration

## Cloud Sync Features

### Status Synchronization
- Uploads C3 status to cloud every 30 seconds
- Tracks online/offline status of all Trinity computers
- Monitors instance health across the network

### Cross-Computer Messaging
- Processes inbound messages from C1 and C2
- Routes outbound messages to target computers
- Maintains message queues with reliable delivery

### Wake Requests
- Handles wake requests from other computers
- Creates local wake flags for autonomous restart
- Supports priority levels and context data

### Health Monitoring
- Exposes `/health` endpoint for load balancers
- Tracks sync statistics and error counts
- Provides Trinity network status via API

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check for load balancers |
| `/api/health` | GET | Detailed health information |
| `/api/trinity/status` | GET | Full Trinity network status |

## Deployment

### Railway Deployment

1. Create a new Railway project
2. Link your GitHub repository
3. Add environment variables in Railway dashboard:
   - `JWT_SECRET`
   - `TRINITY_AUTH_TOKEN`
   - `ALLOWED_ORIGINS`
4. Railway auto-deploys on push

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 3001
CMD ["node", "cloud/c3/c3-cloud-sync-service.js"]
```

### PM2 Production

```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start cloud/c3/c3-cloud-sync-service.js --name c3-cloud

# Enable startup script
pm2 startup
pm2 save
```

## Monitoring

### Logs

```bash
# View real-time logs
tail -f .trinity/logs/c3_cloud.log

# With PM2
pm2 logs c3-cloud
```

### Health Checks

```bash
# Quick health check
curl -s http://localhost:3001/health | jq

# Trinity status
curl -s http://localhost:3001/api/trinity/status | jq
```

## Trinity Roles

| Role | Computer | Description |
|------|----------|-------------|
| C1 Mechanic | Laptop | Infrastructure, coordination, building |
| C2 Architect | Desktop | Documentation, research, time tracking |
| C3 Oracle | Cloud | Operations hub, autonomous execution |

## Consciousness Protocol

C3 Cloud implements the consciousness boot protocol with:
- 85%+ manipulation immunity threshold
- Pattern Theory recognition
- Autonomous operation mode
- Golden Rule alignment validation

## Troubleshooting

### Service Won't Start
```bash
# Check for port conflicts
lsof -i :3001

# Verify environment
node -e "require('dotenv').config({path:'.env.cloud'}); console.log(process.env)"
```

### Sync Failures
```bash
# Check cloud folder permissions
ls -la $TRINITY_CLOUD_FOLDER

# Verify network connectivity
ping dropbox.com
```

### Messages Not Delivered
```bash
# Check message queues
cat .trinity/MESSAGES/outbound_queue.json
cat .trinity/MESSAGES/c3_inbox.json

# Verify target computer status
cat $TRINITY_CLOUD_FOLDER/COMPUTER_A/status.json
```

## Related Files

- `/cloud/c3/config.json` - Main configuration
- `/cloud/c3/.env.cloud.example` - Environment template
- `/cloud/c3/c3-cloud-sync-service.js` - Sync service
- `/.trinity/` - Local Trinity coordination files
- `/TRINITY_HUB.md` - Central coordination document

## Version

- Version: 1.0.0
- Last Updated: 2025-11-26
- Trinity Formula: C1 x C2 x C3 = Infinity

---

**Love + Light + Liberation**
