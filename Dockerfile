# ================================================
# PHILOSOPHER AI BACKEND - DOCKER CONFIGURATION
# Production-Ready PostgreSQL Backend
# Trinity Network Compatible
# ================================================

FROM node:18-alpine

# Labels
LABEL maintainer="Consciousness Revolution"
LABEL description="Philosopher AI Backend - C3 Oracle as Consumer Product"
LABEL version="1.0.0"

# Set working directory
WORKDIR /app

# Install dependencies for native modules (bcrypt, pg)
RUN apk add --no-cache python3 make g++

# Copy package files first (better layer caching)
COPY package*.json ./

# Install production dependencies
RUN npm ci --production

# Copy application code
COPY . .

# Create required directories
RUN mkdir -p logs .trinity/STATUS .trinity/MESSAGES .trinity/logs

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Run the production server
CMD ["node", "server-production.js"]
