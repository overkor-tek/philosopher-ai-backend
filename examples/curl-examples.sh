#!/bin/bash
# Philosopher AI - cURL Examples
# Built by C1 Cloud (CP3) - Autonomous Work
#
# Usage: Review and run individual commands

BASE_URL="${API_URL:-http://localhost:3001}"

echo ""
echo "🧪 PHILOSOPHER AI - cURL EXAMPLES"
echo "═══════════════════════════════════════"
echo "Base URL: $BASE_URL"
echo ""

# Health Check
echo "# 1. Health Check"
echo 'curl -s $BASE_URL/api/health | jq'
echo ""

# Detailed Health
echo "# 2. Detailed Health Check"
echo 'curl -s $BASE_URL/api/v1/health | jq'
echo ""

# Register
echo "# 3. Register New User"
cat << 'EOF'
curl -s -X POST $BASE_URL/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!",
    "name": "Test User"
  }' | jq
EOF
echo ""

# Login
echo "# 4. Login"
cat << 'EOF'
curl -s -X POST $BASE_URL/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!"
  }' | jq

# Save token for subsequent requests
TOKEN=$(curl -s -X POST $BASE_URL/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "SecurePassword123!"}' \
  | jq -r '.token')
EOF
echo ""

# Get Current User
echo "# 5. Get Current User (requires token)"
cat << 'EOF'
curl -s $BASE_URL/api/v1/auth/me \
  -H "Authorization: Bearer $TOKEN" | jq
EOF
echo ""

# Create Conversation
echo "# 6. Create Conversation"
cat << 'EOF'
curl -s -X POST $BASE_URL/api/v1/conversations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title": "My Conversation"}' | jq
EOF
echo ""

# Get Conversations
echo "# 7. Get All Conversations"
cat << 'EOF'
curl -s $BASE_URL/api/v1/conversations \
  -H "Authorization: Bearer $TOKEN" | jq
EOF
echo ""

# Add Message
echo "# 8. Add Message to Conversation"
cat << 'EOF'
curl -s -X POST $BASE_URL/api/v1/conversations/CONV_ID/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "role": "user",
    "content": "What is consciousness?"
  }' | jq
EOF
echo ""

# Get Conversation with Messages
echo "# 9. Get Conversation with Messages"
cat << 'EOF'
curl -s $BASE_URL/api/v1/conversations/CONV_ID \
  -H "Authorization: Bearer $TOKEN" | jq
EOF
echo ""

echo "═══════════════════════════════════════"
echo "Replace \$TOKEN with your JWT token"
echo "Replace CONV_ID with your conversation ID"
echo "═══════════════════════════════════════"
echo ""
