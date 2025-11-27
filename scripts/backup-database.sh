#!/bin/bash
# ================================================
# DATABASE BACKUP SCRIPT
# Philosopher AI Backend
# ================================================
# Usage: ./scripts/backup-database.sh
# Requires: pg_dump, DATABASE_URL environment variable
# ================================================

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backup_${TIMESTAMP}.sql"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 Database Backup Script"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check for DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ DATABASE_URL not set${NC}"
    echo "Set DATABASE_URL environment variable or use .env file"
    exit 1
fi

# Check for pg_dump
if ! command -v pg_dump &> /dev/null; then
    echo -e "${RED}❌ pg_dump not found${NC}"
    echo "Install PostgreSQL client tools"
    exit 1
fi

# Create backup directory
mkdir -p "$BACKUP_DIR"
echo -e "${GREEN}✅ Backup directory: $BACKUP_DIR${NC}"

# Create backup
echo ""
echo "🔄 Creating backup..."
pg_dump "$DATABASE_URL" --format=plain --no-owner --no-acl > "$BACKUP_DIR/$BACKUP_FILE"

if [ $? -eq 0 ]; then
    # Compress backup
    gzip "$BACKUP_DIR/$BACKUP_FILE"
    BACKUP_FILE="${BACKUP_FILE}.gz"

    # Get file size
    SIZE=$(du -h "$BACKUP_DIR/$BACKUP_FILE" | cut -f1)

    echo -e "${GREEN}✅ Backup created: $BACKUP_FILE ($SIZE)${NC}"
else
    echo -e "${RED}❌ Backup failed${NC}"
    exit 1
fi

# Cleanup old backups
echo ""
echo "🧹 Cleaning up old backups (older than $RETENTION_DAYS days)..."
find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true

# Count remaining backups
BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/backup_*.sql.gz 2>/dev/null | wc -l)
echo -e "${GREEN}✅ $BACKUP_COUNT backup(s) retained${NC}"

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Backup complete!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Backup location: $BACKUP_DIR/$BACKUP_FILE"
echo ""
echo "To restore:"
echo "  gunzip -c $BACKUP_DIR/$BACKUP_FILE | psql \$DATABASE_URL"
echo ""
