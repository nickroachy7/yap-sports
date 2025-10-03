#!/bin/bash

# Cleanup Retired Player Cards Script
# This script removes cards for retired NFL players from your collection

echo "🧹 Yap Sports - Cleanup Retired Player Cards"
echo "============================================"
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
echo "  1. Find all cards for retired NFL players"
echo "  2. Mark them as 'sold' in your collection"
echo "  3. Refund coins based on their sell value"
echo "  4. Show you what was removed"
echo ""

# Check for auth token
if [ -z "$AUTH_TOKEN" ]; then
  echo "❌ Error: AUTH_TOKEN environment variable not set"
  echo ""
  echo "Usage:"
  echo "  export AUTH_TOKEN='your-supabase-jwt-token'"
  echo "  ./cleanup-retired-cards.sh"
  echo ""
  echo "Or for production:"
  echo "  export AUTH_TOKEN='your-token'"
  echo "  ./cleanup-retired-cards.sh https://your-domain.com"
  exit 1
fi

echo "🔑 Auth token found: ${AUTH_TOKEN:0:20}..."
echo ""

# Optional: Team ID filter
if [ -n "$TEAM_ID" ]; then
  echo "🎯 Cleaning up team: $TEAM_ID"
  BODY="{\"teamId\": \"$TEAM_ID\"}"
else
  echo "🌍 Cleaning up all teams"
  BODY="{}"
fi

echo ""
echo "🚀 Running cleanup..."
echo ""

# Make the API call
RESPONSE=$(curl -s -X POST "$BASE_URL/api/dev/cleanup-retired-cards" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$BODY")

# Check if response is valid JSON
if echo "$RESPONSE" | jq empty 2>/dev/null; then
  echo "✅ Cleanup complete!"
  echo ""
  
  # Parse and display results
  SUCCESS=$(echo "$RESPONSE" | jq -r '.success')
  
  if [ "$SUCCESS" = "true" ]; then
    CARDS_REMOVED=$(echo "$RESPONSE" | jq -r '.cardsRemoved')
    COINS_REFUNDED=$(echo "$RESPONSE" | jq -r '.coinsRefunded')
    MESSAGE=$(echo "$RESPONSE" | jq -r '.message')
    
    echo "📊 Results:"
    echo "  • Cards removed: $CARDS_REMOVED"
    echo "  • Coins refunded: 🪙 $COINS_REFUNDED"
    echo "  • Message: $MESSAGE"
    echo ""
    
    # Show removed cards if any
    if [ "$CARDS_REMOVED" -gt 0 ]; then
      echo "🗑️  Removed players:"
      echo "$RESPONSE" | jq -r '.removedCards[] | "  • \(.player_name) (\(.position) - \(.team)) - 🪙 \(.sell_value)"'
      echo ""
      echo "💰 Total coins refunded to your team(s): 🪙 $COINS_REFUNDED"
    else
      echo "🎉 Your collection is already clean! No retired players found."
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
echo "✨ Done! Refresh your dashboard to see the updated collection."

