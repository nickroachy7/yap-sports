#!/bin/bash

echo "🔄 Re-syncing 2025 NFL Stats (to fix receptions field)"
echo "This will update all stats with the correct field mapping"
echo ""

# Week 1 (Sept 5-9, 2025)
echo "📅 Syncing Week 1..."
curl -X POST "http://localhost:3000/api/admin/sync/stats" \
  -H "Content-Type: application/json" \
  -d '{
    "season_year": 2025,
    "dates": ["2025-09-05", "2025-09-06", "2025-09-07", "2025-09-08", "2025-09-09"],
    "max_stats": 5000
  }' 2>/dev/null | jq -r '.message'

sleep 2

# Week 2 (Sept 12-16, 2025)
echo "📅 Syncing Week 2..."
curl -X POST "http://localhost:3000/api/admin/sync/stats" \
  -H "Content-Type: application/json" \
  -d '{
    "season_year": 2025,
    "dates": ["2025-09-12", "2025-09-13", "2025-09-14", "2025-09-15", "2025-09-16"],
    "max_stats": 5000
  }' 2>/dev/null | jq -r '.message'

sleep 2

# Week 3 (Sept 19-23, 2025)
echo "📅 Syncing Week 3..."
curl -X POST "http://localhost:3000/api/admin/sync/stats" \
  -H "Content-Type: application/json" \
  -d '{
    "season_year": 2025,
    "dates": ["2025-09-19", "2025-09-20", "2025-09-21", "2025-09-22", "2025-09-23"],
    "max_stats": 5000
  }' 2>/dev/null | jq -r '.message'

sleep 2

# Week 4 (Sept 26-30, 2025)
echo "📅 Syncing Week 4..."
curl -X POST "http://localhost:3000/api/admin/sync/stats" \
  -H "Content-Type: application/json" \
  -d '{
    "season_year": 2025,
    "dates": ["2025-09-26", "2025-09-27", "2025-09-28", "2025-09-29", "2025-09-30"],
    "max_stats": 5000
  }' 2>/dev/null | jq -r '.message'

echo ""
echo "✅ Re-sync complete!"
echo ""
echo "📊 Now test the player modal:"
echo "1. Clear browser cache: sessionStorage.clear()"
echo "2. Click on a WR (like Justin Jefferson)"
echo "3. Check game log - REC column should now show values instead of '-'"
