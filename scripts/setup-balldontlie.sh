#!/bin/bash

# BallDontLie API Setup Script
# This script syncs NFL data from BallDontLie API to your database

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${API_BASE_URL:-http://localhost:3000}"
SEASON_YEAR="${SEASON_YEAR:-2024}"
TEST_MODE="${TEST_MODE:-false}"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}   BallDontLie API Initial Setup${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "Base URL: ${YELLOW}${BASE_URL}${NC}"
echo -e "Season Year: ${YELLOW}${SEASON_YEAR}${NC}"
echo -e "Test Mode: ${YELLOW}${TEST_MODE}${NC}"
echo ""

# Function to check if API is running
check_api() {
    echo -e "${BLUE}Checking API connection...${NC}"
    if curl -s -f "${BASE_URL}/api/dev/test-api" -X POST > /dev/null; then
        echo -e "${GREEN}✓ API is running${NC}"
        return 0
    else
        echo -e "${RED}✗ API is not accessible at ${BASE_URL}${NC}"
        echo -e "${YELLOW}Make sure your development server is running (npm run dev)${NC}"
        exit 1
    fi
}

# Function to run a sync step
run_sync() {
    local step_name=$1
    local endpoint=$2
    local data=$3
    
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Running: ${step_name}${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    response=$(curl -s -X POST "${BASE_URL}${endpoint}" \
        -H "Content-Type: application/json" \
        -d "${data}")
    
    # Check if response contains error
    if echo "$response" | jq -e '.error' > /dev/null 2>&1; then
        error=$(echo "$response" | jq -r '.error')
        echo -e "${RED}✗ Failed: ${error}${NC}"
        echo -e "${YELLOW}Response:${NC}"
        echo "$response" | jq '.'
        return 1
    else
        echo -e "${GREEN}✓ Success!${NC}"
        # Show relevant stats
        if echo "$response" | jq -e '.stats' > /dev/null 2>&1; then
            echo "$response" | jq '.stats'
        else
            echo "$response" | jq -c '{success, message}'
        fi
        return 0
    fi
}

# Check API before starting
check_api

# Option 1: Use master setup endpoint (recommended)
if [ "$1" == "--master" ] || [ "$1" == "-m" ]; then
    echo ""
    echo -e "${GREEN}Using master setup endpoint (all-in-one)${NC}"
    echo ""
    
    run_sync "Master Initial Sync" "/api/admin/setup/initial-sync" \
        "{\"season_year\": ${SEASON_YEAR}, \"test_mode\": ${TEST_MODE}}"
    
    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}   Setup Complete! 🎉${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    exit 0
fi

# Option 2: Step-by-step sync (default)
echo ""
echo -e "${YELLOW}Running step-by-step sync...${NC}"
echo -e "${YELLOW}(Use --master flag for faster all-in-one sync)${NC}"

# Step 1: Teams
run_sync "Step 1: NFL Teams" "/api/admin/sync/teams" "{}" || exit 1
sleep 2

# Step 2: Players
max_players=$([ "$TEST_MODE" = "true" ] && echo "200" || echo "2000")
run_sync "Step 2: NFL Players" "/api/admin/sync/players" \
    "{\"max_players\": ${max_players}, \"test_mode\": ${TEST_MODE}}" || exit 1
sleep 2

# Step 3: Games
max_games=$([ "$TEST_MODE" = "true" ] && echo "50" || echo "500")
run_sync "Step 3: NFL Games" "/api/admin/sync/games" \
    "{\"season_year\": ${SEASON_YEAR}, \"max_games\": ${max_games}, \"test_mode\": ${TEST_MODE}}" || exit 1
sleep 2

# Step 4: Stats
max_stats=$([ "$TEST_MODE" = "true" ] && echo "100" || echo "5000")
stats_dates="[\"${SEASON_YEAR}-09-08\",\"${SEASON_YEAR}-09-15\",\"${SEASON_YEAR}-09-22\",\"${SEASON_YEAR}-09-29\"]"
run_sync "Step 4: Player Stats" "/api/admin/sync/stats" \
    "{\"season_year\": ${SEASON_YEAR}, \"dates\": ${stats_dates}, \"max_stats\": ${max_stats}, \"test_mode\": ${TEST_MODE}}" || {
    echo -e "${YELLOW}⚠️  Stats sync failed, but that's okay for initial setup${NC}"
}

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}   Setup Complete! 🎉${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Check your database to verify data was synced"
echo "2. View player profiles in your app"
echo "3. Set up cron jobs for ongoing sync (see BALLDONTLIE_SETUP_GUIDE.md)"
echo ""
echo -e "${YELLOW}For detailed documentation, see:${NC}"
echo "  📖 BALLDONTLIE_SETUP_GUIDE.md"
echo "  📊 STATS_FIELD_MAPPING.md"
echo ""

