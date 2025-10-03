# NFL Data Cleanup & Sync Plan

## 🔍 Current State Analysis

### Database Statistics
- ✅ **32 NFL Teams** - Properly synced
- ⚠️ **10,949 Active Players** - TOO MANY (should be ~1,700)
- ⚠️ **556 Games** - All marked as "scheduled", dates show 2026
- ✅ **14,191 Stats Records** - Properly linked
- ❌ **13,691 Stats Missing External Refs** - Need external_game_id & external_player_id

### Critical Issues

#### 1. Player Data Quality
- **Problem**: 10,949 "active" players (avg 342 per team)
- **Expected**: ~1,700 active roster players (53 per team)
- **Root Cause**: Historical players not marked as inactive
- **Solution**: Filter by current roster + recent activity

#### 2. Game Data Issues
- **Problem**: Games dated 2026-01-04 with status "scheduled"
- **Expected**: 2025 season games with proper dates and "Final" status
- **Root Cause**: Stale or test data
- **Solution**: Re-sync from BallDontLie API

#### 3. Stats External References
- **Problem**: 13,691/14,191 stats missing `external_game_id` and `external_player_id`
- **Impact**: Cannot re-sync or validate stats against API
- **Solution**: Backfill from linked player.external_id and sports_event.external_game_id

#### 4. Missing season_type
- **Problem**: All games have NULL season_type
- **Expected**: "regular" or "postseason"
- **Solution**: Populate from API data during game sync

## 🎯 Cleanup Strategy

### Phase 1: Fix Stats External References ✓
```sql
-- Backfill external refs from linked tables
UPDATE player_game_stats pgs
SET 
  external_game_id = se.external_game_id,
  external_player_id = p.external_id
FROM sports_events se, players p
WHERE pgs.sports_event_id = se.id 
  AND pgs.player_id = p.id
  AND (pgs.external_game_id IS NULL OR pgs.external_player_id IS NULL);
```

### Phase 2: Update Game Data from API
- Fetch all 2025 season games from BallDontLie API
- Update existing games with:
  - Correct dates (September 2025+)
  - Proper status ("Final", "Scheduled", etc.)
  - Season type (regular/postseason)
  - Scores and quarter breakdowns
- Add any missing games

### Phase 3: Filter Active Players
**Criteria for Active Status:**
1. Has stats in 2024 or 2025 season
2. OR on current team roster (from API)
3. OR acquired in last 2 years

**Implementation:**
```sql
-- Mark players as inactive if they have no recent stats
UPDATE players
SET active = false
WHERE active = true
AND id NOT IN (
  SELECT DISTINCT player_id 
  FROM player_game_stats 
  WHERE game_date >= '2024-01-01'
);
```

### Phase 4: Fresh 2025 Season Data Sync
1. Sync 2025 season games (weeks 1-18 + playoffs)
2. Sync 2024 season stats (for historical performance)
3. Sync current active roster from API
4. Sync recent game stats

### Phase 5: Data Verification
- Verify all stats have proper external refs
- Confirm active player count (~1,500-2,000)
- Verify all games have correct dates and status
- Check for orphaned records

## 📊 Expected Results After Cleanup

| Metric | Before | After | Status |
|--------|--------|-------|--------|
| Active Players | 10,949 | ~1,700 | ❌→✅ |
| Teams | 32 | 32 | ✅ |
| Games (2025) | 0 | ~280 | ❌→✅ |
| Stats w/ External Refs | 500 | 14,191 | ❌→✅ |
| Game Status Accuracy | 0% | 100% | ❌→✅ |
| Season Type Populated | 0% | 100% | ❌→✅ |

## 🚀 Implementation Order

1. ✅ Fix stats external references (quick SQL update)
2. ✅ Sync 2025 season games from API
3. ✅ Mark inactive players based on recent activity
4. ✅ Sync 2024 season stats for player history
5. ✅ Verify and create comprehensive report

## 🔧 API Endpoints to Use

- `mcp_balldontlie-api_nfl_get_teams` - Verify team data
- `mcp_balldontlie-api_nfl_get_games` - Sync 2025 season schedule
- `mcp_balldontlie-api_nfl_get_active_players` - Current roster data
- `mcp_balldontlie-api_nfl_get_stats` - Sync game stats
- `mcp_balldontlie-api_nfl_get_season_stats` - Player season aggregates

## ⚠️ Important Notes

1. **Backup First**: Always backup before bulk updates
2. **External Refs**: Critical for future syncs - must be accurate
3. **Active Status**: Conservative approach - better to have extra than miss players
4. **Game Status**: Must match API exactly for accurate fantasy scoring
5. **Foreign Keys**: All relationships must remain intact

## 📝 Next Steps

Run cleanup scripts in this order:
1. `fix-stats-external-refs.sql`
2. `sync-2025-games.ts`
3. `filter-active-players.sql`
4. `sync-historical-stats.ts`
5. `verify-data-integrity.ts`

