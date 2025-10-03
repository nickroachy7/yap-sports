#!/bin/bash

# Mark Retired Players Script
# This script marks known retired NFL players as inactive in the database

echo "🏈 Yap Sports - Mark Retired Players as Inactive"
echo "================================================"
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
echo "  1. Search for known retired NFL players"
echo "  2. Mark them as inactive in the database"
echo "  3. Show you what was updated"
echo ""

echo "🚀 Running update..."
echo ""

# Make the API call
RESPONSE=$(curl -s -X POST "$BASE_URL/api/dev/mark-retired-players" \
  -H "Content-Type: application/json")

# Check if response is valid JSON
if echo "$RESPONSE" | jq empty 2>/dev/null; then
  echo "✅ Update complete!"
  echo ""
  
  # Parse and display results
  SUCCESS=$(echo "$RESPONSE" | jq -r '.success')
  
  if [ "$SUCCESS" = "true" ]; then
    SEARCHED=$(echo "$RESPONSE" | jq -r '.summary.searched')
    FOUND=$(echo "$RESPONSE" | jq -r '.summary.found')
    UPDATED=$(echo "$RESPONSE" | jq -r '.summary.updated')
    ALREADY_INACTIVE=$(echo "$RESPONSE" | jq -r '.summary.alreadyInactive')
    NOT_FOUND=$(echo "$RESPONSE" | jq -r '.summary.notFound')
    
    TOTAL_ACTIVE=$(echo "$RESPONSE" | jq -r '.playerCounts.totalActive')
    TOTAL_INACTIVE=$(echo "$RESPONSE" | jq -r '.playerCounts.totalInactive')
    
    echo "📊 Summary:"
    echo "  • Players searched: $SEARCHED"
    echo "  • Players found: $FOUND"
    echo "  • Players updated: $UPDATED"
    echo "  • Already inactive: $ALREADY_INACTIVE"
    echo "  • Not found in DB: $NOT_FOUND"
    echo ""
    
    echo "💾 Database Status:"
    echo "  • Total active players: $TOTAL_ACTIVE"
    echo "  • Total inactive players: $TOTAL_INACTIVE"
    echo ""
    
    # Show updated players if any
    if [ "$UPDATED" -gt 0 ]; then
      echo "✅ Players marked as inactive:"
      echo "$RESPONSE" | jq -r '.details.updated[] | "  • \(.name) (\(.position) - \(.team))"'
      echo ""
    else
      echo "✓ All known retired players were already marked inactive!"
      echo ""
    fi
    
    # Show not found players if any
    if [ "$NOT_FOUND" -gt 0 ]; then
      echo "⚠️  Players not found in database:"
      echo "$RESPONSE" | jq -r '.details.notFound[] | "  • \(.)"'
      echo ""
      echo "These players may not be in your database yet, or they may have different spellings."
      echo ""
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

echo "✨ Done! Refresh your dashboard to see the updated collection."
echo ""
echo "💡 Tip: Run this script periodically as players retire during the season."

