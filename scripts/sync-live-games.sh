#!/bin/bash

# Sync Live Games Script
# Usage: ./sync-live-games.sh [DATE]
# Example: ./sync-live-games.sh 2025-10-03

# Get date parameter or use today
DATE=${1:-$(date +%Y-%m-%d)}

echo "🏈 Syncing live NFL games for $DATE"
echo "=================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Base URL (change for production)
BASE_URL=${BASE_URL:-"http://localhost:3000"}

echo "${YELLOW}Step 1: Syncing game statuses...${NC}"
GAMES_RESPONSE=$(curl -s -X POST "$BASE_URL/api/admin/sync/games" \
  -H "Content-Type: application/json" \
  -d "{\"dates\": [\"$DATE\"], \"per_page\": 25}")

GAMES_SUCCESS=$(echo $GAMES_RESPONSE | grep -o '"success":true' | wc -l)

if [ $GAMES_SUCCESS -gt 0 ]; then
  echo "${GREEN}✓ Games synced successfully${NC}"
  echo $GAMES_RESPONSE | jq -r '.stats // empty' 2>/dev/null || echo "Stats: $(echo $GAMES_RESPONSE | grep -o '"processed":[0-9]*')"
else
  echo "${RED}✗ Games sync failed${NC}"
  echo $GAMES_RESPONSE | jq -r '.error // .message // empty' 2>/dev/null || echo $GAMES_RESPONSE
fi

echo ""
echo "${YELLOW}Step 2: Syncing player stats...${NC}"
STATS_RESPONSE=$(curl -s -X POST "$BASE_URL/api/admin/sync/stats" \
  -H "Content-Type: application/json" \
  -d "{\"dates\": [\"$DATE\"], \"per_page\": 100, \"max_stats\": 2000}")

STATS_SUCCESS=$(echo $STATS_RESPONSE | grep -o '"success":true' | wc -l)

if [ $STATS_SUCCESS -gt 0 ]; then
  echo "${GREEN}✓ Stats synced successfully${NC}"
  echo $STATS_RESPONSE | jq -r '.stats // empty' 2>/dev/null || echo "Stats: $(echo $STATS_RESPONSE | grep -o '"processed":[0-9]*')"
else
  echo "${RED}✗ Stats sync failed${NC}"
  echo $STATS_RESPONSE | jq -r '.error // .message // empty' 2>/dev/null || echo $STATS_RESPONSE
fi

echo ""
echo "=================================="
echo "${GREEN}✓ Sync complete for $DATE${NC}"
echo ""
echo "Next sync recommended in 15 minutes"
echo "Press Ctrl+C to stop, or wait..."
sleep 900 # 15 minutes
exec $0 $DATE # Re-run script

