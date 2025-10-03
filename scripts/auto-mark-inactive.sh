#!/bin/bash

# Auto-Mark Inactive Players Script
# Automatically marks ALL players without 2025 stats as inactive

echo "🤖 Yap Sports - Auto-Mark Inactive Players"
echo "==========================================="
echo ""

# Check if running locally or production
if [ -z "$1" ]; then
  BASE_URL="http://localhost:3000"
  echo "🏠 Using local environment: $BASE_URL"
else
  BASE_URL="$1"
  echo "🌐 Using custom URL: $BASE_URL"
fi

echo ""
echo "📋 This script will:"
echo "  1. Check ALL active players for 2025 season stats"
echo "  2. Mark players WITHOUT 2025 stats as inactive"
echo "  3. Show you comprehensive results"
echo ""
echo "⚠️  This will check thousands of players - may take 30-60 seconds"
echo ""

echo "🚀 Running auto-detection..."
echo ""

# Make the API call
RESPONSE=$(curl -s -X POST "$BASE_URL/api/dev/auto-mark-inactive-players" \
  -H "Content-Type: application/json")

# Check if response is valid JSON
if echo "$RESPONSE" | jq empty 2>/dev/null; then
  echo "✅ Detection complete!"
  echo ""
  
  # Parse and display results
  SUCCESS=$(echo "$RESPONSE" | jq -r '.success')
  
  if [ "$SUCCESS" = "true" ]; then
    TOTAL_CHECKED=$(echo "$RESPONSE" | jq -r '.summary.totalChecked')
    WITH_STATS=$(echo "$RESPONSE" | jq -r '.summary.withStats')
    WITHOUT_STATS=$(echo "$RESPONSE" | jq -r '.summary.withoutStats')
    MARKED_INACTIVE=$(echo "$RESPONSE" | jq -r '.summary.markedInactive')
    
    TOTAL_ACTIVE=$(echo "$RESPONSE" | jq -r '.playerCounts.totalActive')
    TOTAL_INACTIVE=$(echo "$RESPONSE" | jq -r '.playerCounts.totalInactive')
    
    echo "📊 Summary:"
    echo "  • Players checked: $TOTAL_CHECKED"
    echo "  • WITH 2025 stats: $WITH_STATS ✅"
    echo "  • WITHOUT 2025 stats: $WITHOUT_STATS ❌"
    echo "  • Marked as inactive: $MARKED_INACTIVE"
    echo ""
    
    echo "💾 Database Status:"
    echo "  • Total active players: $TOTAL_ACTIVE"
    echo "  • Total inactive players: $TOTAL_INACTIVE"
    echo ""
    
    # Show inactivated players if any
    if [ "$MARKED_INACTIVE" -gt 0 ]; then
      echo "❌ Sample of players marked as inactive (no 2025 stats):"
      echo "$RESPONSE" | jq -r '.inactivatedPlayers[] | "  • \(.name) (\(.position) - \(.team))"' | head -50
      echo ""
      
      if [ "$MARKED_INACTIVE" -gt 50 ]; then
        echo "  ... and $(($MARKED_INACTIVE - 50)) more players"
        echo ""
      fi
      
      echo "🎯 Impact:"
      echo "  • These players had NO fantasy stats for 2025"
      echo "  • They are likely retired, injured, or benched"
      echo "  • They will now be EXCLUDED from pack generation"
      echo "  • Pack quality should improve dramatically!"
    else
      echo "✓ All active players have 2025 stats - no changes needed!"
    fi
    
  else
    ERROR=$(echo "$RESPONSE" | jq -r '.error')
    echo "❌ Error: $ERROR"
    echo ""
    echo "Full response:"
    echo "$RESPONSE" | jq '.'
  fi
else
  echo "❌ Invalid response from server:"
  echo "$RESPONSE"
  exit 1
fi

echo ""
echo "✨ Done! Refresh your dashboard to see only active players."
echo ""
echo "💡 Tip: Run this script weekly to keep your player database clean!"

