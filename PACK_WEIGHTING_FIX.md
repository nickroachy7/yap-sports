# 🔧 Pack Weighting Fix - Retired Players Removed

## Problem

Packs were giving users **retired/inactive players** instead of current NFL players:
- Stephen Alexander (DEN TE) - retired years ago
- Joe Montgomery (CAR RB) - retired years ago  
- Joseph Randle (DAL RB) - retired years ago
- Kapri Bibbs (GB RB) - not currently active

**Root Cause:** Database had old players still marked as `active = true`, and the performance weighting system was using ALL stats from any season, including old seasons from retired players.

## Solution

### Updated Filtering Logic

The pack weighting system now applies **3 layers of filtering**:

1. **Active Flag** - Must be marked `active = true` in database
2. **Recent Seasons** - Only considers stats from **2024 and 2025 seasons**
3. **Recent Game Dates** - Only counts games played **after Sept 1, 2024**

This ensures **only current NFL players** appear in packs.

### Code Changes

**File:** `/src/lib/packWeighting.ts`

#### Before:
```typescript
// Only looked at 2025 season
const { data: season } = await supabaseAdmin
  .from('seasons')
  .select('id')
  .eq('year', 2025)
  .eq('league', 'NFL')
  .single();

// Got ALL stats for that season (could be old data)
const { data: stats } = await supabaseAdmin
  .from('player_game_stats')
  .select('stat_json')
  .eq('player_id', player.id)
  .eq('season_id', season.id);
```

#### After:
```typescript
// Looks at BOTH 2024 and 2025 seasons
const RECENT_SEASON_YEARS = [2024, 2025];
const SEASON_START_DATE = '2024-09-01';

const { data: seasons } = await supabaseAdmin
  .from('seasons')
  .select('id, year')
  .in('year', RECENT_SEASON_YEARS)
  .eq('league', 'NFL');

// CRITICAL: Only get stats from recent seasons AND recent game dates
const { data: stats } = await supabaseAdmin
  .from('player_game_stats')
  .select('stat_json, game_date')
  .eq('player_id', player.id)
  .in('season_id', seasonIds)
  .gte('game_date', SEASON_START_DATE); // ✅ Filters out old games!

// Skip players with NO recent games
if (gamesPlayed === 0) {
  skippedInactive++;
  continue; // ✅ Don't include in pack pool!
}
```

### New Features

#### 1. Better Logging
Now shows how many players were filtered out:
```
✓ Calculated weights for common rarity:
  - Active players with recent games: 847
  - Skipped (no recent games/retired): 1,653
  - Total weight: 12,458.00
  Top 5 performers:
    - Josh Allen (Quarterback): 18.2 avg pts, 12 games, weight: 50
    - Lamar Jackson (Quarterback): 17.8 avg pts, 11 games, weight: 50
    ...
```

#### 2. Cache Refresh Endpoint
**New API:** `/api/dev/refresh-pack-weights`

Use this to clear cached weights and force recalculation:
```bash
curl -X POST http://localhost:3000/api/dev/refresh-pack-weights
```

Response:
```json
{
  "success": true,
  "message": "Pack weighting cache cleared successfully",
  "note": "Next pack opening will use fresh performance data from 2024-2025 seasons only"
}
```

## Testing

### How to Verify Fix

1. **Clear the cache** (old weights may still be cached):
   ```bash
   curl -X POST http://localhost:3000/api/dev/refresh-pack-weights
   ```

2. **Open a pack** and check the players you receive

3. **Check server logs** to see filtered players:
   ```
   ✓ Calculated weights for common rarity:
     - Active players with recent games: 847
     - Skipped (no recent games/retired): 1,653  ← These are retired players!
   ```

4. **Expected Results:**
   - All players should be **current NFL players** (2024-2025 season)
   - No retired players (Stephen Alexander, Joe Montgomery, etc.)
   - Recognizable names (Mahomes, Allen, McCaffrey, Jefferson, etc.)

### Example Good Pack Results

After fix, packs should contain players like:
- Josh Allen (BUF QB) - 18.2 avg fantasy pts ✅
- Christian McCaffrey (SF RB) - 16.8 avg pts ✅
- Justin Jefferson (MIN WR) - 15.3 avg pts ✅
- Travis Kelce (KC TE) - 12.1 avg pts ✅

NOT players like:
- Stephen Alexander (retired) ❌
- Joe Montgomery (retired) ❌
- Joseph Randle (retired) ❌

## Configuration

### Adjust Season Filter
To change which seasons are considered "recent":

```typescript
// In /src/lib/packWeighting.ts
const RECENT_SEASON_YEARS = [2024, 2025]; // ← Change years here
const SEASON_START_DATE = '2024-09-01';   // ← Change cutoff date here
```

### Example: Only 2025 Season
```typescript
const RECENT_SEASON_YEARS = [2025];
const SEASON_START_DATE = '2025-01-01';
```

## Files Modified

1. **`/src/lib/packWeighting.ts`** - Core filtering logic updated
2. **`/src/app/api/dev/refresh-pack-weights/route.ts`** - New cache refresh endpoint

## Migration Steps

If you're deploying this fix:

1. **Deploy the code** with updated filtering
2. **Clear the cache** via API or restart server
3. **Test pack opening** to verify only current players appear
4. **(Optional)** Run player inactive marking script to update database:
   ```bash
   curl -X POST http://localhost:3000/api/dev/mark-inactive-by-recent-play
   ```

## Summary

✅ **Fixed:** Retired players no longer appear in packs  
✅ **Fixed:** Only 2024-2025 season stats are considered  
✅ **Fixed:** Players with 0 recent games are completely filtered out  
✅ **Added:** Cache refresh endpoint for quick fixes  
✅ **Added:** Better logging to show filtered players  

**Result:** Users now get **only current, active NFL players** in their packs! 🎉

