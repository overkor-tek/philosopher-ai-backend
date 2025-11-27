# Philosopher AI Backend - Production Dockerfile
# Built by C1 Cloud (CP3) - Autonomous Work Session

FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install dependencies for native modules (bcrypt needs these)
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production && npm cache clean --force

# Copy application code
COPY . .

# Remove dev/test files from container
RUN rm -rf tests/ *.test.js .github/ ARCHIVE/ DORMANT_SYSTEMS/ .trinity/

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

# Set ownership
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

# Start the application
CMD ["node", "server.js"]
