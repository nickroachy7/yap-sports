# Data Verification Guide

## 🔍 Verify Your Data Matches BallDontLie API

Use this endpoint to ensure your database data is accurate compared to the BallDontLie API source.

## Quick Verification

### Verify Sample Players & Stats
```bash
curl -X POST http://localhost:3000/api/admin/verify-data \
  -H "Content-Type: application/json" \
  -d '{
    "verify_players": true,
    "verify_stats": true,
    "sample_size": 10
  }' | jq '.summary'
```

Expected output:
```json
{
  "players": {
    "accuracy": "100%",
    "checked": 10,
    "matches": 10,
    "discrepancies": 0
  },
  "stats": {
    "accuracy": "100%",
    "checked": 10,
    "matches": 10,
    "discrepancies": 0
  }
}
```

### Verify Specific Player
```bash
curl -X POST http://localhost:3000/api/admin/verify-data \
  -H "Content-Type: application/json" \
  -d '{
    "verify_players": true,
    "verify_stats": true,
    "player_name": "Patrick Mahomes"
  }' | jq '.'
```

## What Gets Verified

### Player Data Checks
- ✅ External ID matches
- ✅ Position is correct
- ✅ Team assignment is accurate
- ✅ Height/weight match (if available)
- ✅ College information (if available)

### Stats Data Checks
- ✅ Passing yards match
- ✅ Rushing yards match
- ✅ Receiving yards match
- ✅ Receptions match (critical field!)
- ✅ Touchdowns match
- ✅ Game dates are correct

## Interpreting Results

### 100% Accuracy ✅
```json
{
  "players": {
    "accuracy": "100%",
    "matches": 10,
    "discrepancies": 0
  }
}
```
**Perfect!** Your data matches the API exactly.

### <100% Accuracy ⚠️
```json
{
  "players": {
    "accuracy": "80%",
    "matches": 8,
    "discrepancies": 2
  },
  "verification": {
    "players": {
      "discrepancies": [
        {
          "player": "John Doe",
          "differences": [
            {
              "field": "team",
              "db": "KC",
              "api": "DEN"
            }
          ]
        }
      ]
    }
  }
}
```

**Action needed:** Some data is out of sync. Check the `discrepancies` array to see what's wrong.

### Common Discrepancies

#### 1. Player Not Found in API
```json
{
  "player": "Cam Akers",
  "issue": "Not found in API"
}
```
**Meaning:** Player exists in your DB but API doesn't have data.  
**Action:** This is normal for practice squad/backup players. No action needed.

#### 2. Team Mismatch
```json
{
  "field": "team",
  "db": "KC",
  "api": "DEN"
}
```
**Meaning:** Player was traded/signed to new team.  
**Action:** Re-run player sync to update teams.

#### 3. Stats Mismatch
```json
{
  "stat": "receptions",
  "db": 0,
  "api": 7
}
```
**Meaning:** Stats were synced incorrectly or field mapping is wrong.  
**Action:** Re-run stats sync with correct field mapping.

## Fix Common Issues

### Issue: Teams Out of Date
```bash
# Re-sync teams
curl -X POST http://localhost:3000/api/admin/sync/teams
```

### Issue: Player Data Stale
```bash
# Re-sync players
curl -X POST http://localhost:3000/api/admin/sync/players \
  -d '{"max_players": 2000}'
```

### Issue: Stats Don't Match
```bash
# Re-sync stats for specific date
curl -X POST http://localhost:3000/api/admin/sync/stats \
  -d '{
    "season_year": 2024,
    "dates": ["2024-09-08"]
  }'
```

### Issue: Field Mapping Wrong
Check `STATS_FIELD_MAPPING.md` to ensure field names are correct.

## Detailed Verification

### Get Full Report
```bash
curl -X POST http://localhost:3000/api/admin/verify-data \
  -H "Content-Type: application/json" \
  -d '{
    "verify_players": true,
    "verify_stats": true,
    "sample_size": 20
  }' | jq '.' > verification_report.json
```

### View Samples
```bash
# See sample comparisons
cat verification_report.json | jq '.verification.players.samples'
cat verification_report.json | jq '.verification.stats.samples'
```

### View All Discrepancies
```bash
# See what doesn't match
cat verification_report.json | jq '.verification.players.discrepancies'
cat verification_report.json | jq '.verification.stats.discrepancies'
```

## Automated Verification

### Daily Verification Cron
Add to your cron jobs:

```json
{
  "crons": [
    {
      "path": "/api/admin/verify-data",
      "schedule": "0 2 * * *"
    }
  ]
}
```

This runs verification at 2am daily and alerts you to discrepancies.

### Verification Script
Create `scripts/verify-data.sh`:

```bash
#!/bin/bash

echo "🔍 Verifying data accuracy..."

response=$(curl -s -X POST http://localhost:3000/api/admin/verify-data \
  -H "Content-Type: application/json" \
  -d '{"verify_players": true, "verify_stats": true, "sample_size": 20}')

player_accuracy=$(echo "$response" | jq -r '.summary.players.accuracy')
stats_accuracy=$(echo "$response" | jq -r '.summary.stats.accuracy')

echo "Player Data: $player_accuracy accurate"
echo "Stats Data: $stats_accuracy accurate"

# Alert if below 95%
if [[ "$player_accuracy" < "95%" ]] || [[ "$stats_accuracy" < "95%" ]]; then
  echo "⚠️  WARNING: Data accuracy below 95%!"
  echo "$response" | jq '.verification.players.discrepancies'
  echo "$response" | jq '.verification.stats.discrepancies'
  exit 1
fi

echo "✅ Data verification passed!"
```

## What to Do With Results

### ✅ If Accuracy is 95%+ 
Your data is good! Minor discrepancies are normal (player trades, etc.)

### ⚠️ If Accuracy is 80-95%
Review discrepancies and decide if re-sync is needed.

### ❌ If Accuracy is <80%
Definitely re-sync:
1. Teams
2. Players
3. Stats

Then verify again.

## Sample Verification Response

```json
{
  "success": true,
  "timestamp": "2025-09-30T10:00:00.000Z",
  "summary": {
    "players": {
      "accuracy": "95%",
      "checked": 20,
      "matches": 19,
      "discrepancies": 1
    },
    "stats": {
      "accuracy": "100%",
      "checked": 20,
      "matches": 20,
      "discrepancies": 0
    }
  },
  "verification": {
    "players": {
      "total_checked": 20,
      "matches": 19,
      "discrepancies": [
        {
          "player": "Cam Akers",
          "issue": "Not found in API"
        }
      ],
      "samples": [
        {
          "player": "Patrick Mahomes",
          "db": {
            "external_id": "12345",
            "position": "QB",
            "team": "KC",
            "height": "6' 3\"",
            "college": "Texas Tech"
          },
          "api": {
            "id": 12345,
            "position": "QB",
            "team": "KC",
            "height": "6' 3\"",
            "college": "Texas Tech"
          }
        }
      ]
    },
    "stats": {
      "total_checked": 20,
      "matches": 20,
      "discrepancies": [],
      "samples": [
        {
          "player": "Patrick Mahomes",
          "date": "2024-09-08",
          "db_stats": {
            "passing_yards": 291,
            "rushing_yards": 18,
            "touchdowns": 2,
            "fantasy_points": 23.04
          },
          "api_stats": {
            "passing_yards": 291,
            "rushing_yards": 18,
            "touchdowns": 2
          }
        }
      ]
    }
  }
}
```

## Troubleshooting

### "Error checking API"
- Check API key is valid
- Check rate limiting (add delays)
- Try with smaller sample_size

### "Stats not found in API for this date"
- Game may have been postponed
- Date format might be wrong
- Check the actual game date in BallDontLie

### All Players Show "Not found in API"
- API key issue
- Wrong sport/league
- Player names don't match search format

---

**Run verification after every sync** to ensure data quality! 🔍
