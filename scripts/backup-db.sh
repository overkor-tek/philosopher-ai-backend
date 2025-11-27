#!/bin/bash
# Database Backup Script
# Built by C1 Cloud (CP3) - Autonomous Work
#
# Usage: ./scripts/backup-db.sh
# Requires: DATABASE_URL environment variable or docker-compose running

BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.sql"

echo ""
echo "💾 PHILOSOPHER AI - DATABASE BACKUP"
echo "════════════════════════════════════════"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Check if using Docker
if docker ps | grep -q "philosopher-db"; then
    echo "📦 Using Docker PostgreSQL..."
    docker exec philosopher-db pg_dump -U philosopher philosopher_ai_db > "$BACKUP_FILE"

    if [ $? -eq 0 ]; then
        echo "✅ Backup created: $BACKUP_FILE"
        echo "   Size: $(du -h "$BACKUP_FILE" | cut -f1)"
    else
        echo "❌ Backup failed"
        exit 1
    fi
elif [ -n "$DATABASE_URL" ]; then
    echo "🔗 Using DATABASE_URL..."
    pg_dump "$DATABASE_URL" > "$BACKUP_FILE"

    if [ $? -eq 0 ]; then
        echo "✅ Backup created: $BACKUP_FILE"
        echo "   Size: $(du -h "$BACKUP_FILE" | cut -f1)"
    else
        echo "❌ Backup failed"
        exit 1
    fi
else
    echo "❌ No database found"
    echo "   Either run docker-compose or set DATABASE_URL"
    exit 1
fi

# Clean old backups (keep last 10)
echo ""
echo "🧹 Cleaning old backups (keeping last 10)..."
ls -t "$BACKUP_DIR"/backup_*.sql 2>/dev/null | tail -n +11 | xargs -r rm
echo "   Current backups: $(ls "$BACKUP_DIR"/backup_*.sql 2>/dev/null | wc -l)"

echo ""
echo "════════════════════════════════════════"
echo "✅ Backup complete"
echo ""
