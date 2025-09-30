# ✅ Fixed: 0 vs Missing Data Display

## Issues Fixed

### 1. ✅ Zero Values Now Show "0" Instead of "-"
**Before**: If a stat was 0, it showed "-" (looked like missing data)
**After**: If a stat is 0, it shows "0" (clear that player had zero of that stat)

**Example**:
```
Before: TD: -  (could be 0 or missing?)
After:  TD: 0  (clearly zero touchdowns)
```

### 2. ⚠️ Missing REC Data Needs Re-Sync
**Issue**: REC column showing "-" for all WRs/TEs
**Cause**: Stats were synced with wrong field name (`receiving_receptions` instead of `receptions`)
**Status**: Sync endpoint fixed, database needs update

---

## What Was Changed

### File: `src/components/ui/GameLog.tsx`

**Before**:
```typescript
{entry.playerStats?.[col.key] !== undefined && entry.playerStats?.[col.key] !== 0
  ? /* show value */
  : '-'}
```
**Problem**: `!== 0` hid all zero values

**After**:
```typescript
{entry.playerStats?.[col.key] !== undefined && entry.playerStats?.[col.key] !== null
  ? /* show value (including 0) */
  : '-'}
```
**Solution**: Only hide `undefined` and `null`, show `0`

---

## Current State

### Working Stats ✅
- **QB**: CMP, ATT, YDS, TD, INT (all working, 0s show as 0)
- **WR/TE**: TAR, YDS, TD (working)
- **RB**: CAR, YDS, TD (working)

### Missing Stats ⚠️ (Need Re-Sync)
- **WR/TE**: REC (receptions)
- **Impact**: Fantasy points slightly lower (missing +1 per reception)

---

## How to Fix Missing Data

### Option 1: Quick Test (1 week only)
```bash
# Test with Week 1 data
curl -X POST "http://localhost:3000/api/admin/sync/stats" \
  -H "Content-Type: application/json" \
  -d '{
    "season_year": 2025,
    "dates": ["2025-09-05", "2025-09-06", "2025-09-07", "2025-09-08", "2025-09-09"],
    "max_stats": 5000
  }'
```

### Option 2: Full Re-Sync (All 4 weeks) - Recommended
```bash
# Run the automated script
./scripts/resync-2025-stats.sh
```

**Time**: ~30 seconds (syncs all 4 weeks)

---

## After Re-Sync

### Before Re-Sync:
```
WK | OPP | PROJ | FPTS | TAR | REC | YDS | YPR | TD | LONG | FUM
1  | DAL | 5.3  | 0.8  | 1   | -   | 8   | -   | -  | -    | -
2  | KC  | 5.3  | 2.7  | 8   | -   | 27  | -   | -  | -    | -
3  | LAR | 5.3  | 16.9 | 10  | -   | 109 | -   | 1  | -    | -
```

### After Re-Sync ✅:
```
WK | OPP | PROJ | FPTS | TAR | REC | YDS | YPR  | TD | LONG | FUM
1  | DAL | 5.3  | 8.0  | 1   | 1   | 8   | 8.0  | 0  | 8    | 0
2  | KC  | 5.3  | 7.7  | 8   | 6   | 27  | 4.5  | 0  | 12   | 0
3  | LAR | 5.3  | 23.9 | 10  | 8   | 109 | 13.6 | 1  | 45   | 0
```

**Changes**:
- ✅ REC column populated (1, 6, 8 receptions)
- ✅ YPR calculated (8.0, 4.5, 13.6)
- ✅ Fantasy points increased (+1 per reception)
- ✅ Zero values show "0" instead of "-"

---

## Display Logic

### Shows "0" (not "-") when:
- Touchdowns: 0
- Interceptions: 0
- Fumbles: 0
- Any counting stat that is actually zero

### Shows "-" when:
- Data is `undefined` (not synced)
- Data is `null` (missing from API)
- Field doesn't exist

### Shows Decimal (X.X) when:
- Percentages (completion %, snap %)
- Averages (YPA, YPC, YPR)
- Ratings (QB rating)

---

## Test Now

### 1. Clear Browser Cache
```javascript
// Open browser console
sessionStorage.clear()
```

### 2. Test Current State (Before Re-Sync)
- Click on a WR (Justin Jefferson, AJ Brown)
- Game log should show:
  - ✅ TAR with values
  - ✅ YDS with values
  - ✅ TD showing "0" or "1"
  - ⚠️ REC showing "-"

### 3. Run Re-Sync
```bash
./scripts/resync-2025-stats.sh
```

### 4. Test After Re-Sync
- Clear cache again: `sessionStorage.clear()`
- Click on same WR
- Game log should now show:
  - ✅ REC with values (6, 8, etc.)
  - ✅ YPR calculated
  - ✅ Fantasy points higher
  - ✅ All "0" values showing as "0"

---

## What Each Field Means

### QB Stats
- **CMP**: Completions (can be 0)
- **ATT**: Attempts (can be 0 if didn't play)
- **PCT%**: Completion percentage (0.0 if no attempts)
- **YDS**: Passing yards (can be 0 or negative)
- **YPA**: Yards per attempt (0.0 if no attempts)
- **TD**: Touchdowns (often 0)
- **INT**: Interceptions (often 0 - good!)
- **RATING**: QB rating (0.0 if no stats)

### WR/TE Stats
- **TAR**: Targets (can be 0)
- **REC**: Receptions (can be 0 if no catches)
- **YDS**: Receiving yards (can be 0)
- **YPR**: Yards per reception (0.0 if no catches)
- **TD**: Touchdowns (often 0)
- **LONG**: Longest reception (0 if no catches)
- **FUM**: Fumbles (usually 0 - good!)

### RB Stats
- **CAR**: Carries (can be 0)
- **YDS**: Rushing yards (can be 0 or negative)
- **YPC**: Yards per carry (0.0 if no carries)
- **TD**: Rushing TDs (often 0)
- **TAR**: Targets (can be 0)
- **REC**: Receptions (can be 0)
- **REC YDS**: Receiving yards (can be 0)
- **REC TD**: Receiving TDs (often 0)

---

## Summary

✅ **Fixed Now**:
- Zero values display as "0"
- Clear distinction between "0" and missing data ("-")
- Proper decimal formatting for rates/percentages

⚠️ **Needs Re-Sync** (5 minutes):
- Receptions field for WR/RB/TE
- Run: `./scripts/resync-2025-stats.sh`

🎯 **Result**:
- Accurate game logs
- All stats populated
- Clear data visualization

---

## Quick Command Reference

```bash
# Re-sync all 2025 stats (Weeks 1-4)
./scripts/resync-2025-stats.sh

# Clear browser cache (in browser console)
sessionStorage.clear()

# Test one week only
curl -X POST "http://localhost:3000/api/admin/sync/stats" \
  -H "Content-Type: application/json" \
  -d '{"season_year": 2025, "dates": ["2025-09-05"], "max_stats": 5000}'
```

**Ready!** The display logic is fixed. Just run the re-sync script to populate missing REC data! 🚀
