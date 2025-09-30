# BallDontLie API Setup Guide

Complete guide to populate your database with NFL data from the BallDontLie API.

## Prerequisites

1. **BallDontLie API Key**: Ensure `BALLDONTLIE_API_KEY` is set in your `.env.local`
2. **Supabase Admin Access**: Your Supabase credentials must be configured
3. **Database Schema**: Your tables (teams, players, seasons, weeks, sports_events, player_game_stats) must exist

## Quick Start (Automated)

Use the master setup endpoint to sync everything in one go:

```bash
curl -X POST http://localhost:3000/api/admin/setup/initial-sync \
  -H "Content-Type: application/json" \
  -d '{
    "season_year": 2025,
    "sync_teams": true,
    "sync_players": true,
    "sync_player_profiles": true,
    "sync_games": true,
    "sync_stats": true,
    "stats_season_year": 2024
  }'
```

## Manual Setup (Step-by-Step)

If you prefer to sync data manually, follow these steps in order:

### Step 1: Sync NFL Teams (Required First!)
Teams must be synced first as they're referenced by players and games.

```bash
curl -X POST http://localhost:3000/api/admin/sync/teams \
  -H "Content-Type: application/json"
```

**Expected Result:**
- ✅ 32 NFL teams inserted/updated
- Teams table populated with: external_id, abbreviation, name, conference, division

---

### Step 2: Sync Players
Sync NFL players from the BallDontLie API. Players are linked to teams via external_id.

```bash
curl -X POST http://localhost:3000/api/admin/sync/players \
  -H "Content-Type: application/json" \
  -d '{
    "per_page": 100,
    "max_players": 2000,
    "test_mode": false
  }'
```

**Parameters:**
- `per_page`: How many players to fetch per API call (default: 100, max: 100)
- `max_players`: Maximum total players to sync (default: 2000)
- `test_mode`: If true, limits to 200 players for testing

**Expected Result:**
- ✅ ~1,800-2,000 active NFL players
- Players linked to teams
- Fields: first_name, last_name, position, team, external_id

**Note**: Initial sync might take 2-3 minutes due to API pagination.

---

### Step 3: Sync Games/Schedule
Sync game schedule for a specific season. Requires teams and a season/weeks setup.

```bash
curl -X POST http://localhost:3000/api/admin/sync/games \
  -H "Content-Type: application/json" \
  -d '{
    "season_year": 2024,
    "per_page": 100,
    "max_games": 500,
    "test_mode": false
  }'
```

**Parameters:**
- `season_year`: NFL season year (e.g., 2024)
- `per_page`: Games per API call (default: 100)
- `max_games`: Max games to sync (default: 500)
- `test_mode`: If true, limits to 50 games

**Expected Result:**
- ✅ ~285 games for regular season + playoffs
- Games linked to teams and weeks
- Fields: external_game_id, home_team, away_team, starts_at, status, week_number

**Prerequisites:**
- Season and weeks must exist in database (use `/api/admin/sync/season` first if needed)

---

### Step 4: Sync Player Stats
Sync player statistics for specific dates or entire season.

```bash
# Option A: Sync specific dates (recommended for testing)
curl -X POST http://localhost:3000/api/admin/sync/stats \
  -H "Content-Type: application/json" \
  -d '{
    "season_year": 2024,
    "dates": ["2024-09-08", "2024-09-15", "2024-09-22"],
    "per_page": 100,
    "max_stats": 1000
  }'

# Option B: Sync entire season (can take 5-10 minutes)
curl -X POST http://localhost:3000/api/admin/sync/stats \
  -H "Content-Type: application/json" \
  -d '{
    "season_year": 2024,
    "per_page": 100,
    "max_stats": 10000,
    "test_mode": false
  }'
```

**Parameters:**
- `season_year`: Season to sync (default: current)
- `dates`: Array of specific dates to sync (YYYY-MM-DD format)
- `per_page`: Stats per API call (default: 100)
- `max_stats`: Maximum stats records to sync (default: 1000)
- `test_mode`: If true, limits to 100 stats

**Expected Result:**
- ✅ Player stats for specified dates/season
- Fantasy points calculated automatically
- Fields correctly mapped from BallDontLie API

**Note**: Stats can only be synced for players and games already in your database.

---

### Step 5 (Optional): Enhance Player Profiles
Add additional player details (height, weight, college, etc.) from API.

```bash
curl -X POST http://localhost:3000/api/admin/sync/player-profiles \
  -H "Content-Type: application/json" \
  -d '{
    "batch_size": 50,
    "max_players": 500
  }'
```

**Expected Result:**
- ✅ Enhanced player profiles with physical stats and college info

---

## Recommended Initial Setup Order

For a fresh database, use this sequence:

```bash
# 1. Sync Teams (30 seconds)
curl -X POST http://localhost:3000/api/admin/sync/teams

# 2. Ensure season exists (if not already created)
curl -X POST http://localhost:3000/api/admin/sync/season \
  -d '{"year": 2024}'

# 3. Sync Players (2-3 minutes)
curl -X POST http://localhost:3000/api/admin/sync/players \
  -d '{"max_players": 2000}'

# 4. Sync Games (1-2 minutes)
curl -X POST http://localhost:3000/api/admin/sync/games \
  -d '{"season_year": 2024, "max_games": 500}'

# 5. Sync Stats for Week 1-4 (2-3 minutes)
curl -X POST http://localhost:3000/api/admin/sync/stats \
  -d '{
    "season_year": 2024,
    "dates": ["2024-09-08","2024-09-15","2024-09-22","2024-09-29"],
    "max_stats": 5000
  }'
```

**Total Time**: ~8-12 minutes for complete setup

---

## Ongoing Sync Strategy

### During NFL Season (Weekly Updates)

**Sunday/Monday After Games:**
```bash
# Sync latest stats from the weekend
curl -X POST http://localhost:3000/api/admin/sync/stats \
  -d '{
    "dates": ["2024-10-06"],
    "max_stats": 2000
  }'
```

**Tuesday (for Monday Night Football):**
```bash
curl -X POST http://localhost:3000/api/admin/sync/stats \
  -d '{
    "dates": ["2024-10-07"],
    "max_stats": 500
  }'
```

### Using Cron Jobs (Automated)

Set up these cron jobs on Vercel or your hosting platform:

```
# Daily sync (checks for updated stats)
POST /api/cron/sync-daily
Schedule: 0 6 * * * (6am daily)

# Game day sync (during NFL season)
POST /api/cron/sync-gameday
Schedule: 0 */2 * * 0,1,4 (every 2 hours on Sun/Mon/Thu)
```

---

## Verification & Testing

### Check Data Sync Status

```bash
# Test API connection
curl -X POST http://localhost:3000/api/dev/test-api

# Check teams count
# (Query Supabase: SELECT COUNT(*) FROM teams;)

# Check players count
# (Query Supabase: SELECT COUNT(*) FROM players;)

# Check games count
# (Query Supabase: SELECT COUNT(*) FROM sports_events;)

# Check stats count
# (Query Supabase: SELECT COUNT(*) FROM player_game_stats;)
```

### View Sample Data

```bash
# Get a player's profile with stats
curl http://localhost:3000/api/players/{PLAYER_ID}/profile

# Get a player's game log
curl http://localhost:3000/api/players/{PLAYER_ID}/game-log
```

---

## Common Issues & Solutions

### Issue: "No teams data received"
**Solution**: Check your BallDontLie API key is valid and not rate-limited.

### Issue: "Failed to fetch teams for player mapping"
**Solution**: Sync teams first before syncing players.

### Issue: "No stats found for the specified criteria"
**Solution**: 
- Check that the date exists in the 2024 season
- Verify games exist for that date
- Ensure players are synced

### Issue: Players showing "N/A" stats in UI
**Solution**: 
- Run stats sync for dates when games were played
- Check that `player_game_stats` table has data
- Verify `external_id` mapping between API and database

### Issue: API rate limiting
**Solution**:
- Reduce `per_page` parameter
- Add delays between syncs
- Use `test_mode: true` for smaller batches

---

## API Limits & Best Practices

### BallDontLie API Limits
- **Free Tier**: 30 requests per minute
- **Response Size**: Max 100 items per page
- **Pagination**: Use cursor-based pagination for large datasets

### Best Practices
1. ✅ Always sync teams first
2. ✅ Use `test_mode: true` when testing
3. ✅ Sync players in off-hours (lower API load)
4. ✅ Sync stats incrementally (by date) rather than entire season
5. ✅ Monitor API response times and adjust `per_page` if needed
6. ✅ Store `raw_stats` for debugging field mapping issues

---

## Data Freshness

| Data Type | Update Frequency | Recommendation |
|-----------|------------------|----------------|
| Teams | Once per season | Manual sync only |
| Players | Weekly (roster changes) | Weekly automated sync |
| Games/Schedule | Once at season start | Manual, update if schedule changes |
| Stats | After each game day | Automated cron job |

---

## Next Steps

After syncing data:

1. ✅ Verify player cards show real stats (not random data)
2. ✅ Check game logs display correctly
3. ✅ Ensure fantasy points are calculated properly
4. ✅ Set up automated cron jobs for weekly updates
5. ✅ Monitor database storage usage

---

## Support & Documentation

- **BallDontLie Docs**: https://docs.balldontlie.io
- **Stats Field Mapping**: See `STATS_FIELD_MAPPING.md`
- **Stats Fix Summary**: See `STATS_MAPPING_FIX_SUMMARY.md`

---

**Last Updated**: 2025-09-30  
**API Version**: BallDontLie SDK v1.2.2
