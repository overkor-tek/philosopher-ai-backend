#!/bin/bash
# Quick API Test Script
# Built by C1 Cloud (CP3) - Autonomous Work
#
# Usage: ./scripts/test-api.sh [base_url]
# Default: http://localhost:3001

BASE_URL="${1:-http://localhost:3001}"

echo ""
echo "🧪 PHILOSOPHER AI BACKEND - API TEST"
echo "════════════════════════════════════════"
echo "Target: $BASE_URL"
echo ""

# Test 1: Health Check
echo "1️⃣  Testing /api/health..."
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/health")
if [ "$HEALTH" = "200" ]; then
    echo "   ✅ Health check passed (200)"
else
    echo "   ❌ Health check failed ($HEALTH)"
fi

# Test 2: Detailed Health
echo "2️⃣  Testing /api/v1/health..."
V1_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/health")
if [ "$V1_HEALTH" = "200" ]; then
    echo "   ✅ V1 Health check passed (200)"
else
    echo "   ❌ V1 Health check failed ($V1_HEALTH)"
fi

# Test 3: 404 handling
echo "3️⃣  Testing 404 handling..."
NOT_FOUND=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/nonexistent")
if [ "$NOT_FOUND" = "404" ]; then
    echo "   ✅ 404 handling correct"
else
    echo "   ⚠️  Unexpected response ($NOT_FOUND)"
fi

# Test 4: Auth endpoint exists
echo "4️⃣  Testing /api/v1/auth/login exists..."
AUTH=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/v1/auth/login" -H "Content-Type: application/json" -d '{}')
if [ "$AUTH" = "400" ] || [ "$AUTH" = "401" ]; then
    echo "   ✅ Auth endpoint responding ($AUTH - expected for empty request)"
else
    echo "   ⚠️  Unexpected response ($AUTH)"
fi

# Summary
echo ""
echo "════════════════════════════════════════"
echo "📊 Full health response:"
curl -s "$BASE_URL/api/health" | head -c 500
echo ""
echo "════════════════════════════════════════"
echo ""
