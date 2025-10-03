# 🏈 Live Game Testing & Stats Accuracy Plan

## Critical Date: Tomorrow (Testing Day)
**Created**: October 2, 2025  
**Purpose**: Ensure accurate real-time stats during live NFL games

---

## Current System Overview

### 📊 Data Flow

```
BallDontLie API
     ↓
Sync Endpoints (/api/admin/sync/*)
     ↓
Supabase Database (sports_events, player_game_stats)
     ↓
Display Endpoints (/api/players/[id]/quick-data)
     ↓
UI Components (PlayerModal, GameLog)
     ↓
SessionStorage Cache (5 min TTL)
```

### 🔄 Auto Sync System

**Cron Job**: `/api/cron/sync-gameday`
- **Trigger**: Vercel Cron (scheduled)
- **Runs On**: Sunday, Monday, Thursday only
- **Actions**:
  1. Syncs live player stats for today
  2. Updates game statuses (scheduled → live → final)
- **Frequency**: Configured in `vercel.json`

### 📦 Data Storage

**Game Status Tracking** (`sports_events` table):
- `scheduled` - Game hasn't started
- `live` or `in_progress` - Game is ongoing
- `final` - Game completed
- `postponed` - Game postponed/cancelled

**Player Stats** (`player_game_stats` table):
- `stat_json` - All player stats
- `fantasy_points` - Calculated fantasy points
- `finalized` - Boolean (false during live games)
- `game_date` - Date of game

---

## ⚠️ Potential Issues for Live Games

### 1. **Cache Staleness**
**Problem**: Player data cached for 5 minutes
- Cache key: `player_modal_v5_{playerId}`
- Cache key: `player_detail_v5_{playerId}`
- **Impact**: Live stats won't update for 5 minutes

**Solution**:
- Reduce cache TTL during live games (1 minute)
- Add cache invalidation on data refresh
- Show "as of" timestamp to users

### 2. **Game Status Detection**
**Problem**: Game status relies on both:
1. `sports_events.status` from database
2. Date comparison fallback

**Risk**: If sync fails, status may be incorrect

**Solution**:
- Verify sync is working before games start
- Manual refresh capability
- Status indicators in UI

### 3. **Finalized Flag**
**Problem**: Stats marked `finalized: false` during live games
- May affect queries that filter by finalized=true

**Solution**:
- Current implementation doesn't filter by finalized
- Show "LIVE" badge for non-finalized stats

### 4. **Fantasy Points Calculation**
**Problem**: Two calculation paths:
1. Stored in `stat_json.fantasy_points`
2. Calculated on-the-fly if missing

**Risk**: Inconsistent values if formula differs

**Solution**:
- Always calculate during sync (already implemented)
- Use calculated value as fallback

---

## 🧪 Pre-Game Testing Checklist

### Friday/Saturday Prep

#### 1. Verify API Access
```bash
# Test BallDontLie API connectivity
curl -X GET "https://api.balldontlie.io/v1/nfl/teams" \
  -H "Authorization: YOUR_API_KEY"
```

#### 2. Sync Tomorrow's Games
```bash
curl -X POST http://localhost:3000/api/admin/sync/games \
  -H "Content-Type: application/json" \
  -d '{
    "dates": ["2025-10-03"],
    "per_page": 25,
    "test_mode": true
  }'
```

#### 3. Verify Week Configuration
- Check `/src/app/admin/season/page.tsx` or database
- Ensure current week is set correctly
- Verify week dates encompass tomorrow's games

#### 4. Test Manual Sync
```bash
# Test stats sync (should return empty for future date)
curl -X POST http://localhost:3000/api/admin/sync/stats \
  -H "Content-Type": application/json" \
  -d '{
    "dates": ["2025-10-03"],
    "per_page": 100,
    "max_stats": 500,
    "test_mode": true
  }'
```

---

## 🎮 Live Game Day Protocol

### Pre-Game (2 hours before kickoff)

1. **Verify Game Schedule**
   - Check `/src/app/admin/games/page.tsx`
   - Confirm all games show "scheduled" status
   - Note game times and teams

2. **Clear All Caches**
   ```bash
   # Clear sessionStorage via browser console
   sessionStorage.clear()
   
   # Or manually delete cache keys
   Object.keys(sessionStorage).forEach(key => {
     if (key.startsWith('player_modal_v5_') || key.startsWith('player_detail_v5_')) {
       sessionStorage.removeItem(key);
     }
   });
   ```

3. **Pre-load Test Players**
   - Select 5-10 players from today's games
   - Note their player IDs
   - Open player modals to verify current stats

### During Games

#### Every 15 Minutes: Manual Sync

```bash
# 1. Sync game statuses (updates live → final)
curl -X POST http://localhost:3000/api/admin/sync/games \
  -H "Content-Type: application/json" \
  -d '{
    "dates": ["2025-10-03"],
    "per_page": 20
  }'

# 2. Sync player stats (updates fantasy points)
curl -X POST http://localhost:3000/api/admin/sync/stats \
  -H "Content-Type: application/json" \
  -d '{
    "dates": ["2025-10-03"],
    "per_page": 100,
    "max_stats": 2000
  }'
```

#### Monitor Sync Results

Check sync response:
```json
{
  "success": true,
  "stats": {
    "processed": 150,
    "inserted": 100,
    "player_mapped": 150,
    "errors": 0
  }
}
```

**Red flags**:
- `errors > 0` - Check error messages
- `player_mapped < processed` - Player ID mapping issues
- `processed: 0` - No data from API

#### Verify Live Data

1. **Check Game Status**
   ```bash
   # Query database directly
   curl http://localhost:3000/api/admin/games?status=live
   ```

2. **Check Player Stats**
   ```bash
   # Get player data
   curl http://localhost:3000/api/players/PLAYER_ID/quick-data
   ```

3. **UI Verification**
   - Open player modal
   - Check "Last Updated" timestamp
   - Verify stats match expectations
   - Look for "LIVE" indicators

### Post-Game (After final whistle)

1. **Final Sync**
   ```bash
   # Wait 10 minutes after game ends, then sync
   curl -X POST http://localhost:3000/api/admin/sync/stats \
     -H "Content-Type: application/json" \
     -d '{
       "dates": ["2025-10-03"],
       "per_page": 100,
       "max_stats": 5000
     }'
   ```

2. **Verify Finalized Stats**
   - Check `finalized: true` in database
   - Verify fantasy points match actual performance
   - Compare with official NFL stats

3. **Document Issues**
   - Note any discrepancies
   - Record API response times
   - Document sync failures

---

## 🚨 Emergency Procedures

### If Sync Fails

**Symptoms**:
- Stats not updating
- Game status stuck on "scheduled"
- Error responses from sync endpoints

**Troubleshooting Steps**:

1. **Check API Key**
   ```bash
   # Verify environment variable
   echo $BALLDONTLIE_API_KEY
   ```

2. **Test API Directly**
   ```bash
   curl -X GET "https://api.balldontlie.io/v1/nfl/stats?seasons[]=2025&dates[]=2025-10-03" \
     -H "Authorization: YOUR_API_KEY"
   ```

3. **Check Rate Limits**
   - BallDontLie API rate limits may apply
   - Wait and retry if rate limited

4. **Manual Database Update** (Last Resort)
   ```sql
   -- Update game status manually
   UPDATE sports_events
   SET status = 'live'
   WHERE starts_at::date = '2025-10-03'
   AND status = 'scheduled';
   ```

### If Cache Won't Clear

```javascript
// Run in browser console
// Force clear all player caches
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  if (key && (key.includes('player_modal') || key.includes('player_detail'))) {
    localStorage.removeItem(key);
  }
}

// Hard refresh
location.reload(true);
```

### If Fantasy Points Are Wrong

**Check Calculation Formula**:
- Passing: 0.04 pts/yd, 4 pts/TD, -2 pts/INT
- Rushing: 0.1 pts/yd, 6 pts/TD
- Receiving: 0.1 pts/yd, 6 pts/TD, 1 pt/reception
- Fumbles Lost: -2 pts

**Verify in Code**: `/src/app/api/admin/sync/stats/route.ts` lines 162-172

---

## 📱 Testing Checklist

### Before First Kickoff
- [ ] All games show "scheduled" status
- [ ] Game times are correct
- [ ] Player modals load without errors
- [ ] Cache is clear
- [ ] Manual sync endpoints work

### During First Quarter
- [ ] Game status changes to "live"
- [ ] Player stats start appearing
- [ ] Fantasy points calculate correctly
- [ ] UI shows "LIVE" indicators
- [ ] Stats update within 5 minutes

### Halftime
- [ ] Stats reflect first half performance
- [ ] No stuck/stale data
- [ ] Game status still "live"
- [ ] Cache refreshing properly

### Post-Game
- [ ] Game status changes to "final"
- [ ] Final stats match official NFL stats
- [ ] `finalized: true` in database
- [ ] DNP players marked correctly
- [ ] No lingering "live" statuses

---

## 🔧 Useful Endpoints for Testing

### Admin Sync Endpoints
```bash
# Sync games
POST /api/admin/sync/games
Body: { "dates": ["2025-10-03"], "per_page": 20 }

# Sync stats
POST /api/admin/sync/stats
Body: { "dates": ["2025-10-03"], "per_page": 100, "max_stats": 2000 }
```

### Player Data Endpoints
```bash
# Get player with stats
GET /api/players/{playerId}/quick-data

# Get full game log
GET /api/players/{playerId}/game-log
```

### Admin View Endpoints
```bash
# View all games
GET /src/app/admin/games/page.tsx

# View player stats
GET /src/app/admin/players/page.tsx
```

---

## 📊 Monitoring Metrics

### Key Metrics to Track

1. **Sync Latency**
   - Time from game event to stat update
   - Target: < 5 minutes

2. **Data Accuracy**
   - Fantasy points vs. expected
   - Target: 100% match

3. **API Reliability**
   - Success rate of sync operations
   - Target: > 95%

4. **Cache Hit Rate**
   - Percentage of cached vs. fresh requests
   - Target: 60-80% (balance freshness)

### Log What to Monitor

```javascript
console.log('[LiveGame] Sync Started:', new Date().toISOString());
console.log('[LiveGame] Stats Fetched:', statsCount);
console.log('[LiveGame] Sync Completed:', duration + 'ms');
console.log('[LiveGame] Errors:', errorCount);
```

---

## 🎯 Success Criteria

### Must Have (Critical)
✅ Game status updates within 2 minutes of game start/end
✅ Player stats appear within 5 minutes of play
✅ Fantasy points calculate correctly (±0.1 pts)
✅ No stuck "scheduled" games after kickoff
✅ No stuck "live" games after final whistle

### Nice to Have (Enhanced)
⭐ Stats update every 1-2 minutes
⭐ Real-time score updates
⭐ Live play-by-play updates
⭐ Player availability alerts (injuries)

---

## 📝 Post-Testing Report Template

### Game Day Results - [Date]

**Games Tested**: [X games]
**Players Monitored**: [Y players]
**Sync Operations**: [Z syncs]

#### Successes ✅
- [What worked well]
- [Accurate data points]
- [Fast updates]

#### Issues ❌
- [What failed]
- [Slow updates]
- [Inaccurate data]

#### Performance Metrics
- Average sync time: [X seconds]
- Cache hit rate: [Y%]
- Data accuracy: [Z%]

#### Recommendations
- [Changes needed]
- [Optimizations]
- [New features]

---

## 🔄 Automated Improvements (Future)

### Short Term
1. Add "Last Updated" timestamp to UI
2. Add "Refresh" button to manually sync
3. Show "LIVE" badge for in-progress games
4. Reduce cache TTL during game days (1 min)

### Medium Term
1. WebSocket connection for real-time updates
2. Auto-refresh every 2 minutes during live games
3. Push notifications for key player updates
4. Background sync service

### Long Term
1. Real-time scoring system
2. Live play-by-play feed
3. Automated lineup optimization
4. Injury status integration

---

## 📞 Support Contacts

**BallDontLie API**:
- Documentation: https://docs.balldontlie.io
- Support: support@balldontlie.io
- Status Page: status.balldontlie.io

**Supabase**:
- Dashboard: app.supabase.com
- Status: status.supabase.com

---

## 🚀 Quick Start for Tomorrow

### 30 Minutes Before Games

```bash
# 1. Clear cache
sessionStorage.clear()

# 2. Sync upcoming games
curl -X POST http://localhost:3000/api/admin/sync/games \
  -H "Content-Type: application/json" \
  -d '{"dates": ["2025-10-03"], "per_page": 25}'

# 3. Open admin dashboard
open http://localhost:3000/admin/games

# 4. Set timer for first sync (at kickoff)
```

### At Kickoff

```bash
# Run both syncs immediately
./sync-live-games.sh 2025-10-03
```

### Every 15 Minutes

```bash
# Repeat sync commands
./sync-live-games.sh 2025-10-03
```

### After Games

```bash
# Final sync + verify
./sync-live-games.sh 2025-10-03
# Check finalized status in database
```

---

## 📋 Summary

**Key Points**:
1. ✅ System is ready for live game testing
2. ⚠️ Manual syncs required every 15 minutes
3. 🔄 Cache refresh needed during games
4. 📊 Monitor sync results closely
5. 🚨 Have emergency procedures ready

**Next Steps**:
1. Test sync endpoints tonight
2. Clear caches tomorrow morning
3. Monitor first game closely
4. Document any issues
5. Adjust strategy as needed

Good luck with testing! 🏈🎉

