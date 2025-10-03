#!/bin/bash

# Batch Stats Sync Script
# Syncs 2024 NFL season stats in weekly batches to avoid timeouts

API_URL="http://localhost:3000/api/admin/sync/stats"
LOG_FILE="/tmp/stats-sync-batch.log"
STATS_PER_BATCH=500
PER_PAGE=50

echo "🔄 Starting batch stats sync for 2024 season..." | tee -a "$LOG_FILE"
echo "Time started: $(date)" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# NFL 2024 season weeks (approximate dates)
declare -a WEEK_DATES=(
  "2024-09-05:2024-09-11"  # Week 1
  "2024-09-12:2024-09-18"  # Week 2
  "2024-09-19:2024-09-25"  # Week 3
  "2024-09-26:2024-10-02"  # Week 4
  "2024-10-03:2024-10-09"  # Week 5
  "2024-10-10:2024-10-16"  # Week 6
  "2024-10-17:2024-10-23"  # Week 7
  "2024-10-24:2024-10-30"  # Week 8
  "2024-10-31:2024-11-06"  # Week 9
  "2024-11-07:2024-11-13"  # Week 10
  "2024-11-14:2024-11-20"  # Week 11
  "2024-11-21:2024-11-27"  # Week 12
  "2024-11-28:2024-12-04"  # Week 13
  "2024-12-05:2024-12-11"  # Week 14
  "2024-12-12:2024-12-18"  # Week 15
  "2024-12-19:2024-12-25"  # Week 16
  "2024-12-26:2025-01-01"  # Week 17
  "2025-01-02:2025-01-08"  # Week 18
)

total_weeks=${#WEEK_DATES[@]}
current_week=0
total_synced=0
failed_weeks=0

for week_range in "${WEEK_DATES[@]}"; do
  current_week=$((current_week + 1))
  
  # Split start and end dates
  IFS=':' read -r start_date end_date <<< "$week_range"
  
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" | tee -a "$LOG_FILE"
  echo "📅 Week $current_week/$total_weeks: $start_date to $end_date" | tee -a "$LOG_FILE"
  echo "Time: $(date +%H:%M:%S)" | tee -a "$LOG_FILE"
  
  # Generate dates array for this week
  dates_json=$(node -e "
    const start = new Date('$start_date');
    const end = new Date('$end_date');
    const dates = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().split('T')[0]);
    }
    console.log(JSON.stringify(dates));
  ")
  
  # Sync this week's stats
  response=$(curl -s -X POST "$API_URL" \
    -H "Content-Type: application/json" \
    -d "{
      \"season_year\": 2024,
      \"dates\": $dates_json,
      \"max_stats\": $STATS_PER_BATCH,
      \"per_page\": $PER_PAGE
    }" \
    --max-time 60 2>&1)
  
  # Check if sync was successful
  if echo "$response" | grep -q '"error"'; then
    echo "❌ Failed to sync week $current_week" | tee -a "$LOG_FILE"
    echo "Error: $response" | tee -a "$LOG_FILE"
    failed_weeks=$((failed_weeks + 1))
  elif [ -z "$response" ]; then
    echo "⚠️  No response for week $current_week (may have timed out)" | tee -a "$LOG_FILE"
    failed_weeks=$((failed_weeks + 1))
  else
    # Extract stats count if available
    synced=$(echo "$response" | grep -o '"insertedCount":[0-9]*' | grep -o '[0-9]*' || echo "?")
    if [ "$synced" != "?" ]; then
      total_synced=$((total_synced + synced))
      echo "✅ Synced $synced stats (total: $total_synced)" | tee -a "$LOG_FILE"
    else
      echo "✅ Week completed" | tee -a "$LOG_FILE"
    fi
  fi
  
  # Small delay between requests
  sleep 2
  echo "" | tee -a "$LOG_FILE"
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" | tee -a "$LOG_FILE"
echo "🎉 Batch sync complete!" | tee -a "$LOG_FILE"
echo "Time finished: $(date)" | tee -a "$LOG_FILE"
echo "Total stats synced: $total_synced" | tee -a "$LOG_FILE"
echo "Successful weeks: $((total_weeks - failed_weeks))/$total_weeks" | tee -a "$LOG_FILE"
echo "Failed weeks: $failed_weeks" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"
echo "📊 Full log saved to: $LOG_FILE" | tee -a "$LOG_FILE"

# Clear pack weight cache
echo "" | tee -a "$LOG_FILE"
echo "🔄 Clearing pack weight cache..." | tee -a "$LOG_FILE"
curl -s -X POST http://localhost:3000/api/dev/refresh-pack-weights | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"
echo "✅ Cache cleared! Packs will now use fresh stats." | tee -a "$LOG_FILE"

