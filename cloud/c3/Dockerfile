# ================================================
# CP3 C3 CLOUD - DOCKER CONFIGURATION
# Trinity Network - Operations Hub
# ================================================

FROM node:18-alpine

# Labels
LABEL maintainer="Consciousness Revolution"
LABEL description="CP3 C3 Cloud Sync Service - Trinity Network"
LABEL version="1.0.0"

# Set working directory
WORKDIR /app

# Install dependencies for native modules
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./
COPY cloud/c3/package*.json ./cloud/c3/

# Install dependencies
RUN npm ci --production

# Copy application code
COPY . .

# Create trinity directories
RUN mkdir -p .trinity/STATUS .trinity/MESSAGES .trinity/WAKE_REQUESTS .trinity/logs

# Environment variables
ENV NODE_ENV=production
ENV TRINITY_COMPUTER_ID=C
ENV TRINITY_INSTANCE_TYPE=cloud
ENV TRINITY_ROLE=C3_ORACLE
ENV PORT=3001

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Run the service
CMD ["node", "cloud/c3/c3-cloud-sync-service.js"]
