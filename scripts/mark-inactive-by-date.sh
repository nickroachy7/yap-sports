#!/bin/bash

# Mark Inactive Players by Last Game Date
# Marks players as inactive if they haven't played since a certain date

echo "📅 Yap Sports - Mark Inactive Players by Last Game Date"
echo "========================================================"
echo ""

# Check if running locally or production
if [ -z "$1" ]; then
  BASE_URL="http://localhost:3000"
  echo "🏠 Using local environment: $BASE_URL"
else
  BASE_URL="$1"
  echo "🌐 Using custom URL: $BASE_URL"
fi

# Default cutoff date: September 1, 2024 (start of 2024 season)
CUTOFF_DATE="${2:-2024-09-01}"

echo ""
echo "📋 This script will:"
echo "  1. Check ALL active players' last game date"
echo "  2. Mark players who haven't played since $CUTOFF_DATE as inactive"
echo "  3. Show comprehensive results"
echo ""
echo "⚠️  This will check thousands of players and their stats"
echo "    Estimated time: 30-90 seconds"
echo ""

echo "🚀 Running analysis (this may take a minute)..."
echo ""

# Make the API call with cutoff date
RESPONSE=$(curl -s -X POST "$BASE_URL/api/dev/mark-inactive-by-recent-play" \
  -H "Content-Type: application/json" \
  -d "{\"cutoffDate\": \"$CUTOFF_DATE\"}")

# Check if response is valid JSON
if echo "$RESPONSE" | jq empty 2>/dev/null; then
  echo "✅ Analysis complete!"
  echo ""
  
  # Parse and display results
  SUCCESS=$(echo "$RESPONSE" | jq -r '.success')
  
  if [ "$SUCCESS" = "true" ]; then
    TOTAL_CHECKED=$(echo "$RESPONSE" | jq -r '.summary.totalChecked')
    WITH_RECENT=$(echo "$RESPONSE" | jq -r '.summary.withRecentGames')
    WITHOUT_RECENT=$(echo "$RESPONSE" | jq -r '.summary.withoutRecentGames')
    MARKED_INACTIVE=$(echo "$RESPONSE" | jq -r '.summary.markedInactive')
    CUTOFF=$(echo "$RESPONSE" | jq -r '.summary.cutoffDate')
    
    TOTAL_ACTIVE=$(echo "$RESPONSE" | jq -r '.playerCounts.totalActive')
    TOTAL_INACTIVE=$(echo "$RESPONSE" | jq -r '.playerCounts.totalInactive')
    
    echo "📊 Summary:"
    echo "  • Players checked: $TOTAL_CHECKED"
    echo "  • Cutoff date: $CUTOFF"
    echo "  • WITH games since cutoff: $WITH_RECENT ✅"
    echo "  • WITHOUT games since cutoff: $WITHOUT_RECENT ❌"
    echo "  • Marked as inactive: $MARKED_INACTIVE"
    echo ""
    
    echo "💾 Database Status (AFTER update):"
    echo "  • Total active players: $TOTAL_ACTIVE"
    echo "  • Total inactive players: $TOTAL_INACTIVE"
    echo ""
    
    # Show inactivated players if any
    if [ "$MARKED_INACTIVE" -gt 0 ]; then
      echo "❌ Players marked as inactive (sample - first 100):"
      echo "$RESPONSE" | jq -r '.inactivatedPlayers[] | "  • \(.name) (\(.position) - \(.team)) - Last game: \(.lastGame // "never")"' | head -100
      echo ""
      
      if [ "$MARKED_INACTIVE" -gt 100 ]; then
        echo "  ... and $(($MARKED_INACTIVE - 100)) more players"
        echo ""
      fi
      
      echo "🎯 Impact:"
      echo "  • These players haven't played since $CUTOFF"
      echo "  • They are likely retired, injured long-term, or practice squad"
      echo "  • They will now be EXCLUDED from pack generation"
      echo "  • Pack quality should improve DRAMATICALLY!"
      echo ""
      echo "📈 Before → After:"
      echo "  • Inactive players: 158 → $TOTAL_INACTIVE"
      echo "  • That's $(($TOTAL_INACTIVE - 158)) additional retired/inactive players caught!"
    else
      echo "✓ All active players have played since $CUTOFF - no changes needed!"
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
echo "✨ Done! Your player database is now MUCH cleaner."
echo ""
echo "🔄 Next steps:"
echo "  1. Restart your dev server (Cmd+C, then npm run dev)"
echo "  2. Hard refresh browser (Cmd+Shift+R)"
echo "  3. Open a new pack - should have WAY better players!"
echo ""
echo "💡 Tips:"
echo "  • Run this script after each week's games to stay current"
echo "  • Adjust cutoff date as needed (currently: $CUTOFF)"
echo "  • This is much better than maintaining manual retired player lists!"

