# 🏈 Quick Reference - Live Game Testing

## 🚀 Quick Start (Copy & Paste Commands)

### Check System Status
```bash
# Test if sync is working
curl http://localhost:3000/api/dev/test-live-sync?date=2025-10-03
```

### Manual Sync (Every 15 min during games)
```bash
# Run auto-sync script
./scripts/sync-live-games.sh 2025-10-03

# OR manually:
# 1. Sync games
curl -X POST http://localhost:3000/api/admin/sync/games \
  -H "Content-Type: application/json" \
  -d '{"dates": ["2025-10-03"], "per_page": 25}'

# 2. Sync stats
curl -X POST http://localhost:3000/api/admin/sync/stats \
  -H "Content-Type: application/json" \
  -d '{"dates": ["2025-10-03"], "per_page": 100, "max_stats": 2000}'
```

### Clear Cache (If data seems stale)
```javascript
// Run in browser console
sessionStorage.clear()
location.reload()
```

---

## 📋 Testing Checklist

### Before Games Start
- [ ] Run `test-live-sync` endpoint
- [ ] Verify games show "scheduled" status
- [ ] Clear browser cache
- [ ] Test one player modal

### During Live Games
- [ ] Check game status changes to "live"
- [ ] Verify stats updating
- [ ] Monitor fantasy points calculation
- [ ] Test every 15 minutes

### After Games
- [ ] Final sync
- [ ] Verify "final" status
- [ ] Check finalized flag
- [ ] Validate fantasy points

---

## 🚨 Troubleshooting

### Stats Not Updating?
```bash
# 1. Check if API is responding
curl http://localhost:3000/api/dev/test-live-sync

# 2. Manual sync
./scripts/sync-live-games.sh $(date +%Y-%m-%d)

# 3. Clear cache
sessionStorage.clear()
```

### Game Status Wrong?
```bash
# Force game sync
curl -X POST http://localhost:3000/api/admin/sync/games \
  -H "Content-Type: application/json" \
  -d '{"dates": ["'$(date +%Y-%m-%d)'"]}'
```

### Fantasy Points Incorrect?
```
Check calculation:
- Passing: 0.04 pts/yd, 4 pts/TD, -2 pts/INT
- Rushing: 0.1 pts/yd, 6 pts/TD
- Receiving: 0.1 pts/yd, 6 pts/TD, 1 pt/rec
- Fumbles Lost: -2 pts
```

---

## 📊 Key Metrics to Watch

| Metric | Target | Red Flag |
|--------|--------|----------|
| Sync Time | < 30 sec | > 60 sec |
| Cache Age | < 1 min (live) | > 5 min |
| Stats Accuracy | 100% match | Any mismatch |
| Game Status | Updates in 2 min | Stuck status |

---

## 🔗 Important URLs

| Purpose | URL |
|---------|-----|
| Test Sync Status | `http://localhost:3000/api/dev/test-live-sync` |
| Admin Games View | `http://localhost:3000/admin/games` |
| Admin Players View | `http://localhost:3000/admin/players` |
| Manual Game Sync | `POST /api/admin/sync/games` |
| Manual Stats Sync | `POST /api/admin/sync/stats` |

---

## ⏰ Timeline for Tomorrow

**T-30 min**: Clear cache, verify system  
**Kickoff**: Manual sync immediately  
**Every 15 min**: Run sync script  
**Halftime**: Verify all stats  
**Final Whistle**: Final sync, check finalized flag  
**T+15 min**: Validate all data

---

## 📞 Emergency Commands

```bash
# Everything is broken - nuclear option
./scripts/sync-live-games.sh $(date +%Y-%m-%d)
sessionStorage.clear()
location.reload()

# Check what's in database
curl http://localhost:3000/api/dev/test-live-sync?date=$(date +%Y-%m-%d) | jq
```

---

## ✅ Success Indicators

- ✅ Game status: scheduled → live → final
- ✅ Stats appear within 5 minutes
- ✅ Fantasy points accurate (±0.1)
- ✅ "LIVE" indicators showing
- ✅ DNP marked for inactive players
- ✅ Cache refreshing properly

---

## ❌ Failure Indicators

- ❌ Game stuck on "scheduled"
- ❌ No stats after 10 minutes
- ❌ Fantasy points way off
- ❌ Sync errors in logs
- ❌ Cache never refreshes
- ❌ API timeouts

---

## 🎯 Critical Files

| File | Purpose |
|------|---------|
| `/src/app/api/admin/sync/stats/route.ts` | Stats sync |
| `/src/app/api/admin/sync/games/route.ts` | Game status sync |
| `/src/app/api/players/[id]/quick-data/route.ts` | Player data display |
| `/src/lib/liveGameCache.ts` | Cache management |
| `/scripts/sync-live-games.sh` | Auto-sync script |

---

## 📝 Notes Space

**Test Players** (Write down 5 players to monitor):
1. ___________________________
2. ___________________________
3. ___________________________
4. ___________________________
5. ___________________________

**Issues Found**:
- _________________________________
- _________________________________
- _________________________________

**Performance**:
- Average sync time: _____ seconds
- Cache hit rate: _____ %
- Data accuracy: _____ %

---

**Good luck! 🏈🎉**

For detailed information, see: `LIVE_GAME_TESTING_PLAN.md`

