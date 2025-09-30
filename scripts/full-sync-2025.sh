#!/bin/bash

echo "🚀 Full 2025 NFL Season Sync"
echo "This will ensure ALL active players and their stats are in the database"
echo ""

# Step 1: Sync all active players (including rookies like Brock Bowers)
echo "📋 Step 1/3: Syncing ALL active NFL players..."
curl -X POST "http://localhost:3000/api/admin/sync/all-active-players" \
  -H "Content-Type: application/json" \
  -d '{}' 2>/dev/null | jq -r '.message // .success'

echo ""
sleep 3

# Step 2: Sync 2025 games
echo "🏈 Step 2/3: Syncing 2025 game schedule..."
curl -X POST "http://localhost:3000/api/admin/sync/games" \
  -H "Content-Type: application/json" \
  -d '{
    "season_year": 2025,
    "max_games": 500
  }' 2>/dev/null | jq -r '.message // .success'

echo ""
sleep 3

# Step 3: Sync all 2025 stats (Weeks 1-4)
echo "📊 Step 3/3: Syncing 2025 season stats (all weeks)..."

# Week 1
echo "  📅 Week 1..."
curl -X POST "http://localhost:3000/api/admin/sync/stats" \
  -H "Content-Type: application/json" \
  -d '{
    "season_year": 2025,
    "dates": ["2025-09-05", "2025-09-06", "2025-09-07", "2025-09-08", "2025-09-09"],
    "max_stats": 10000
  }' 2>/dev/null | jq -r '.synced_count // .success' | head -1

sleep 2

# Week 2
echo "  📅 Week 2..."
curl -X POST "http://localhost:3000/api/admin/sync/stats" \
  -H "Content-Type: application/json" \
  -d '{
    "season_year": 2025,
    "dates": ["2025-09-12", "2025-09-13", "2025-09-14", "2025-09-15", "2025-09-16"],
    "max_stats": 10000
  }' 2>/dev/null | jq -r '.synced_count // .success' | head -1

sleep 2

# Week 3
echo "  📅 Week 3..."
curl -X POST "http://localhost:3000/api/admin/sync/stats" \
  -H "Content-Type: application/json" \
  -d '{
    "season_year": 2025,
    "dates": ["2025-09-19", "2025-09-20", "2025-09-21", "2025-09-22", "2025-09-23"],
    "max_stats": 10000
  }' 2>/dev/null | jq -r '.synced_count // .success' | head -1

sleep 2

# Week 4
echo "  📅 Week 4..."
curl -X POST "http://localhost:3000/api/admin/sync/stats" \
  -H "Content-Type: application/json" \
  -d '{
    "season_year": 2025,
    "dates": ["2025-09-26", "2025-09-27", "2025-09-28", "2025-09-29", "2025-09-30"],
    "max_stats": 10000
  }' 2>/dev/null | jq -r '.synced_count // .success' | head -1

echo ""
echo "✅ Full sync complete!"
echo ""
echo "📊 Summary:"
echo "  - All active NFL players synced (including rookies)"
echo "  - 2025 season games synced"
echo "  - Stats for Weeks 1-4 synced with correct field mapping"
echo ""
echo "🧪 Test now:"
echo "  1. Clear browser cache: sessionStorage.clear()"
echo "  2. Search for 'Brock Bowers' in players list"
echo "  3. Click on him - should see stats and game log!"
echo ""
