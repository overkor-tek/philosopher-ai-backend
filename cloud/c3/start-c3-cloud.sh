#!/bin/bash
# ================================================
# CP3 C3 Cloud Startup Script
# Trinity Network - Operations Hub
# ================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  🌐 CP3 C3 CLOUD STARTUP                                   ║"
echo "║  Trinity Network - Operations Hub                          ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check for .env.cloud
if [ ! -f "$SCRIPT_DIR/.env.cloud" ]; then
    echo "⚠️  No .env.cloud found!"
    echo "   Creating from template..."
    cp "$SCRIPT_DIR/.env.cloud.example" "$SCRIPT_DIR/.env.cloud"
    echo "   ✅ Created .env.cloud"
    echo ""
    echo "   ⚠️  Please configure .env.cloud before running in production!"
    echo ""
fi

# Export environment
export DOTENV_CONFIG_PATH="$SCRIPT_DIR/.env.cloud"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found! Please install Node.js 18+"
    exit 1
fi

NODE_VERSION=$(node -v)
echo "✅ Node.js: $NODE_VERSION"

# Check npm dependencies
if [ ! -d "$PROJECT_ROOT/node_modules" ]; then
    echo "📦 Installing dependencies..."
    cd "$PROJECT_ROOT"
    npm install
fi

echo "✅ Dependencies installed"

# Create required directories
mkdir -p "$PROJECT_ROOT/.trinity/STATUS"
mkdir -p "$PROJECT_ROOT/.trinity/MESSAGES"
mkdir -p "$PROJECT_ROOT/.trinity/WAKE_REQUESTS"
mkdir -p "$PROJECT_ROOT/.trinity/logs"

echo "✅ Trinity directories ready"

# Start the service
echo ""
echo "🚀 Starting C3 Cloud Sync Service..."
echo "   Press Ctrl+C to stop"
echo ""

cd "$PROJECT_ROOT"
node "$SCRIPT_DIR/c3-cloud-sync-service.js"
