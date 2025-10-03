# NFL Data Cleanup - Implementation Instructions

## 🎯 Quick Start

### Option 1: Run Everything (Recommended)

Run the master orchestrator to execute all cleanup steps:

```bash
# DRY RUN (see what would change)
curl -X POST http://localhost:3000/api/admin/cleanup/master-sync \
  -H "Content-Type: application/json" \
  -d '{"dry_run": true}'

# ACTUAL RUN (make changes)
curl -X POST http://localhost:3000/api/admin/cleanup/master-sync \
  -H "Content-Type: application/json" \
  -d '{"dry_run": false}'
```

### Option 2: Run Individual Steps

#### Step 1: Fix Stats External References ✅ COMPLETE
This was already fixed via SQL:
```sql
UPDATE player_game_stats pgs
SET 
  external_game_id = se.external_game_id,
  external_player_id = p.external_id
FROM sports_events se, players p
WHERE pgs.sports_event_id = se.id 
  AND pgs.player_id = p.id;
```
Result: ✅ All 14,191 stats now have proper external references

#### Step 2: Sync 2025 Season Games

```bash
# DRY RUN
curl -X POST http://localhost:3000/api/admin/cleanup/sync-2025-data \
  -H "Content-Type: application/json" \
  -d '{"dry_run": true}'

# ACTUAL RUN
curl -X POST http://localhost:3000/api/admin/cleanup/sync-2025-data \
  -H "Content-Type: application/json" \
  -d '{"dry_run": false, "max_games": 500}'
```

This will:
- Fetch all 2025 games from BallDontLie API
- Update existing games with correct dates, status, season_type
- Create missing games
- Expected: ~280 games for 2025 season

#### Step 3: Filter Active Players

```bash
# DRY RUN
curl -X POST http://localhost:3000/api/admin/cleanup/filter-active-players \
  -H "Content-Type: application/json" \
  -d '{"dry_run": true}'

# ACTUAL RUN
curl -X POST http://localhost:3000/api/admin/cleanup/filter-active-players \
  -H "Content-Type: application/json" \
  -d '{"dry_run": false, "cutoff_date": "2024-01-01"}'
```

This will:
- Mark players inactive if they have no stats since 2024
- Reduce active count from ~11,000 to ~1,700
- Keep only players with recent game activity

#### Step 4: Verify Data Integrity

```bash
curl http://localhost:3000/api/admin/cleanup/verify-data
```

This will check:
- ✅ Stats have external references
- ✅ Active player count in healthy range (1,500-2,500)
- ✅ 2025 games present and properly formatted
- ✅ Foreign key integrity
- ✅ All 32 teams active
- ✅ Players assigned to teams

## 📊 Expected Results

### Before Cleanup
```
Active Players: 10,949
2025 Games: 0-556 (with incorrect dates)
Stats with External Refs: 500/14,191
Game Status: "scheduled" (incorrect)
Season Type: NULL (missing)
```

### After Cleanup
```
Active Players: ~1,700
2025 Games: ~280 (correct dates Sept 2025+)
Stats with External Refs: 14,191/14,191 ✅
Game Status: "final", "scheduled" (correct)
Season Type: "regular", "postseason" ✅
```

## 🔍 Monitoring Progress

### Check Current State
```bash
# Quick stats check
curl http://localhost:3000/api/admin/cleanup/verify-data | jq '.summary'

# Detailed report
curl http://localhost:3000/api/admin/cleanup/verify-data | jq '.'
```

### Check Logs
The dev server will output detailed logs for each step:
- 📥 Fetching data from API
- 🔄 Processing records
- ✅ Success counts
- ❌ Error details

## ⚠️ Important Notes

### Dry Run First!
Always run with `dry_run: true` first to see what would change:
```json
{
  "dry_run": true,
  "max_games": 500,
  "cutoff_date": "2024-01-01"
}
```

### Safety Features
- All operations log changes before applying
- Foreign key constraints prevent orphaned records
- Rollback possible if needed (have database backup)
- Dry run mode shows exactly what would change

### Error Handling
- Batch operations continue even if individual records fail
- Errors are collected and reported at the end
- Can re-run safely (idempotent operations)

## 🚨 Troubleshooting

### Issue: API Rate Limiting
If you hit API rate limits:
```json
{
  "max_games": 100,  // Reduce batch size
  "per_page": 25     // Smaller pages
}
```

### Issue: Too Many Players Still Active
Adjust the cutoff date:
```json
{
  "cutoff_date": "2024-06-01"  // More recent = fewer active
}
```

### Issue: Games Not Syncing
Check that:
1. Season 2025 exists in database
2. All 32 teams have correct external_id
3. API key is valid (`BALLDONTLIE_API_KEY`)

## 📈 Next Steps After Cleanup

1. **Verify everything looks good:**
   ```bash
   curl http://localhost:3000/api/admin/cleanup/verify-data
   ```

2. **Test the app:**
   - Check player pages load correctly
   - Verify stats display accurately
   - Confirm games show proper dates/status

3. **Sync fresh 2025 data:**
   ```bash
   # Sync latest games and stats
   curl -X POST http://localhost:3000/api/admin/sync/games
   curl -X POST http://localhost:3000/api/admin/sync/stats
   ```

4. **Set up recurring syncs:**
   - Daily game updates
   - Real-time stats during games
   - Weekly player roster updates

## 🎉 Success Criteria

You'll know the cleanup worked when:
- ✅ Verification shows "healthy" status
- ✅ Active players: 1,500-2,500
- ✅ 2025 games: 250-300 with correct dates
- ✅ All stats have external references
- ✅ No orphaned records
- ✅ Player pages load with accurate stats
- ✅ Games show realistic dates (Sept 2025+)

