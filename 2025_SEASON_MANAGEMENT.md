# 2025 NFL Season Management Guide

## 🎯 Overview

Your app is now configured to handle **BOTH**:
- ✅ **2024 Historical Data** - For player baselines and past performance
- ✅ **2025 Current Season** - Live stats as games are played

---

## 📊 What Gets Synced

### Initial Setup (One Time)

When you run `./scripts/setup-balldontlie.sh --master`, you get:

**Season Structure:**
- 2025 NFL Season created
- 22 weeks (18 regular + 4 playoffs)
- Week dates and status tracking

**2024 Historical Stats (8 weeks):**
```
Week 1: 2024-09-08
Week 2: 2024-09-15
Week 3: 2024-09-22
Week 4: 2024-09-29
Week 5: 2024-10-06
Week 6: 2024-10-13
Week 7: 2024-10-20
Week 8: 2024-10-27
```

**2025 Current Season Stats (Weeks 1-4):**
```
Week 1: 2025-09-05
Week 2: 2025-09-12
Week 3: 2025-09-19
Week 4: 2025-09-26
```

---

## 🔄 Weekly Updates (During 2025 Season)

### Option 1: Automatic Weekly Sync (Recommended)

Run this every Monday/Tuesday after games:

```bash
curl -X POST http://localhost:3000/api/admin/sync/weekly-2025 \
  -H "Content-Type: application/json" \
  -d '{"auto_detect_week": true}'
```

This will:
- ✅ Auto-detect which week just completed
- ✅ Sync stats for that week
- ✅ Update player totals

### Option 2: Manual Weekly Sync

Specify exact dates:

```bash
# Week 5 - Oct 3, 2025
curl -X POST http://localhost:3000/api/admin/sync/weekly-2025 \
  -H "Content-Type: application/json" \
  -d '{"week_dates": ["2025-10-03"]}'
```

### Option 3: Use Existing Stats Endpoint

```bash
curl -X POST http://localhost:3000/api/admin/sync/stats \
  -H "Content-Type: application/json" \
  -d '{
    "season_year": 2025,
    "dates": ["2025-10-03"]
  }'
```

---

## 📅 2025 NFL Season Schedule

### Regular Season (Weeks 1-18)

| Week | Date | Sync After |
|------|------|------------|
| 1 | Sept 5, 2025 | Monday Sept 8 |
| 2 | Sept 12, 2025 | Monday Sept 15 |
| 3 | Sept 19, 2025 | Monday Sept 22 |
| 4 | Sept 26, 2025 | Monday Sept 29 |
| 5 | Oct 3, 2025 | Monday Oct 6 |
| 6 | Oct 10, 2025 | Monday Oct 13 |
| 7 | Oct 17, 2025 | Monday Oct 20 |
| 8 | Oct 24, 2025 | Monday Oct 27 |
| 9 | Oct 31, 2025 | Monday Nov 3 |
| 10 | Nov 7, 2025 | Monday Nov 10 |
| 11 | Nov 14, 2025 | Monday Nov 17 |
| 12 | Nov 21, 2025 | Monday Nov 24 |
| 13 | Nov 28, 2025 (Thanksgiving) | Monday Dec 1 |
| 14 | Dec 5, 2025 | Monday Dec 8 |
| 15 | Dec 12, 2025 | Monday Dec 15 |
| 16 | Dec 19, 2025 | Monday Dec 22 |
| 17 | Dec 26, 2025 | Monday Dec 29 |
| 18 | Jan 2, 2026 | Monday Jan 5 |

### Playoffs (Weeks 19-22)

| Round | Week | Dates | Sync After |
|-------|------|-------|------------|
| Wild Card | 19 | Jan 9-12, 2026 | Tuesday Jan 13 |
| Divisional | 20 | Jan 16-19, 2026 | Tuesday Jan 20 |
| Conference | 21 | Jan 24-25, 2026 | Tuesday Jan 27 |
| Super Bowl | 22 | Feb 8, 2026 | Monday Feb 9 |

---

## 🤖 Automation Options

### Option 1: Vercel Cron Job

Update your `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/admin/sync/weekly-2025",
      "schedule": "0 8 * * 1"
    }
  ]
}
```

This runs every Monday at 8am.

### Option 2: GitHub Actions

Create `.github/workflows/weekly-sync.yml`:

```yaml
name: Weekly NFL Stats Sync

on:
  schedule:
    - cron: '0 8 * * 1'  # Every Monday at 8am
  workflow_dispatch:  # Manual trigger

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Sync 2025 NFL Stats
        run: |
          curl -X POST https://your-app.vercel.app/api/admin/sync/weekly-2025 \
            -H "Content-Type: application/json" \
            -d '{"auto_detect_week": true}'
```

### Option 3: Manual Reminder

Set a calendar reminder:
- **When**: Every Monday at 9am (during NFL season)
- **What**: Run weekly sync command
- **Duration**: Sept 2025 - Feb 2026

---

## 📊 How Stats Are Stored

### Database Structure

```sql
-- Stats are stored with season year
SELECT 
  season_year,
  COUNT(*) as stat_records
FROM player_game_stats
GROUP BY season_year;

-- Example result:
-- season_year | stat_records
-- 2024        | 8,543
-- 2025        | 1,234  (grows weekly)
```

### Player Stats Calculation

When you view a player:
- **Season Stats**: Calculates from all games in current season (2025)
- **Historical Baseline**: Uses 2024 data for comparison
- **Trending**: Compares 2025 performance to 2024 baseline

Example:
```json
{
  "player": "Patrick Mahomes",
  "current_season_2025": {
    "games_played": 4,
    "total_points": 142.3,
    "avg_per_game": 35.6
  },
  "last_season_2024": {
    "games_played": 16,
    "total_points": 387.2,
    "avg_per_game": 24.2
  },
  "trend": "+11.4 pts/game vs last season"
}
```

---

## ⚠️ Important Notes

### "No API data found" Warnings

During player profile enhancement, you'll see:
```
Searching for: Cam Akers
No API data found for Cam Akers
```

**This is NORMAL!** It means:
- ✅ BallDontLie doesn't have enhanced data for that specific player
- ✅ Basic player data still works fine
- ✅ Stats will still sync if they played games
- ✅ Not an error - just means no height/weight/college data

Typically happens for:
- Practice squad players
- Recently signed players
- Players with unusual name spellings
- Less prominent players

### What To Do
- ❌ Don't worry about these warnings
- ✅ Players will still have basic info (name, position, team)
- ✅ Stats will still sync if they played
- ✅ ~1,000 major players get enhanced data

---

## 🔍 Verify 2025 Data

### Check Database

```sql
-- Count 2025 stats
SELECT COUNT(*) FROM player_game_stats
WHERE stat_json->>'game_date' LIKE '2025%';

-- Check which weeks have data
SELECT 
  DISTINCT(stat_json->>'game_date') as game_date,
  COUNT(*) as stat_records
FROM player_game_stats
WHERE stat_json->>'game_date' LIKE '2025%'
GROUP BY game_date
ORDER BY game_date;
```

### Check API

```bash
# Get player profile (should show 2025 stats)
curl http://localhost:3000/api/players/{PLAYER_ID}/profile | jq '.stats'

# Get player game log (should show 2025 games)
curl http://localhost:3000/api/players/{PLAYER_ID}/game-log | jq '.gameLogEntries'
```

---

## 🎯 Quick Commands Reference

### Initial Setup
```bash
# Run once to set everything up
./scripts/setup-balldontlie.sh --master
```

### Weekly During Season
```bash
# Auto-detect and sync current week
curl -X POST http://localhost:3000/api/admin/sync/weekly-2025 \
  -d '{"auto_detect_week": true}'

# Or specify exact date
curl -X POST http://localhost:3000/api/admin/sync/weekly-2025 \
  -d '{"week_dates": ["2025-10-03"]}'
```

### Manual Stats Sync
```bash
# Sync specific 2025 week
curl -X POST http://localhost:3000/api/admin/sync/stats \
  -d '{"season_year": 2025, "dates": ["2025-10-03"]}'

# Sync multiple weeks at once
curl -X POST http://localhost:3000/api/admin/sync/stats \
  -d '{
    "season_year": 2025,
    "dates": ["2025-10-03", "2025-10-10", "2025-10-17"]
  }'
```

---

## 📈 Season Progression

### September 2025 (Setup)
- ✅ Run initial setup
- ✅ Get 2024 historical data
- ✅ Get first 2025 games

### October-December 2025 (Regular Season)
- 🔄 Weekly sync after Monday Night Football
- 📊 Stats accumulate each week
- 📈 Player rankings update

### January-February 2026 (Playoffs)
- 🔄 Sync after each playoff round
- 🏆 Super Bowl stats
- 📊 Final season totals

### March 2026+ (Offseason)
- 📝 2025 data is now historical
- 🎯 Prepare for 2026 season setup
- 🔄 Keep 2025 data for comparisons

---

## 🆘 Troubleshooting

### No 2025 Stats Showing

**Check if games have been played:**
```bash
# Are there 2025 games in the schedule?
curl http://localhost:3000/api/admin/sync/games \
  -d '{"season_year": 2025}' | jq '.stats.processed'
```

**Try manual sync:**
```bash
curl -X POST http://localhost:3000/api/admin/sync/stats \
  -d '{"season_year": 2025, "dates": ["2025-09-05"]}'
```

### Stats Not Updating

1. **Check game was actually played:**
   - Games must be completed (status: "Final")
   - Check BallDontLie API has the stats

2. **Re-sync specific date:**
   ```bash
   curl -X POST http://localhost:3000/api/admin/sync/stats \
     -d '{"season_year": 2025, "dates": ["2025-10-03"]}'
   ```

3. **Clear cache and refresh:**
   - Clear browser cache
   - Restart dev server
   - Re-query player API

---

## ✅ Summary

**Setup (One Time):**
- Creates 2025 season structure
- Syncs 2024 historical data (8 weeks)
- Syncs initial 2025 data (4 weeks)

**Ongoing (Weekly):**
- Auto-sync new week's stats every Monday
- Updates player totals automatically
- Tracks season progression

**Result:**
- Players show both 2024 and 2025 stats
- Can compare current season to last season
- Real-time updates as season progresses

---

**Last Updated**: 2025-09-30  
**Season**: 2025 NFL  
**Next Sync**: After Week 1 games (Monday, Sept 8, 2025)

