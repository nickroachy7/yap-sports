#!/bin/bash

# EMERGENCY: Restore all players to active status
# Use this if the inactive marking script went wrong

echo "🚨 EMERGENCY: Restore All Players to Active"
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
echo "⚠️  WARNING: This will mark ALL players in playable positions as active!"
echo ""
echo "🚀 Restoring players..."
echo ""

# Make the API call
RESPONSE=$(curl -s -X POST "$BASE_URL/api/dev/restore-active-players" \
  -H "Content-Type: application/json")

# Check if response is valid JSON
if echo "$RESPONSE" | jq empty 2>/dev/null; then
  echo "✅ Restore complete!"
  echo ""
  
  # Parse and display results
  SUCCESS=$(echo "$RESPONSE" | jq -r '.success')
  
  if [ "$SUCCESS" = "true" ]; then
    RESTORED=$(echo "$RESPONSE" | jq -r '.restored')
    TOTAL_ACTIVE=$(echo "$RESPONSE" | jq -r '.after.totalActive')
    TOTAL_INACTIVE=$(echo "$RESPONSE" | jq -r '.after.totalInactive')
    PLAYABLE_ACTIVE=$(echo "$RESPONSE" | jq -r '.after.playableActive')
    
    echo "📊 Summary:"
    echo "  • Players restored: $RESTORED"
    echo ""
    
    echo "💾 Database Status (AFTER restore):"
    echo "  • Total active players: $TOTAL_ACTIVE"
    echo "  • Total inactive players: $TOTAL_INACTIVE"
    echo "  • Active playable positions: $PLAYABLE_ACTIVE"
    echo ""
    
    echo "✅ Success! All playable position players are now active."
    echo ""
    echo "🔄 Next steps:"
    echo "  1. Restart your dev server (if needed)"
    echo "  2. Try opening a pack - should work now!"
    echo "  3. Use a BETTER detection method to mark retired players"
    
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

