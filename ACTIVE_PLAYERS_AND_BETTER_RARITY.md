# Active Players Only & Improved Rarity Distribution

## Overview
Enhanced all pack opening systems to **only grant cards for active NFL players** and **improved rarity distribution** for better balance of good/bad cards.

## Changes Made

### 1. ✅ Active Players Filter - Pack Opening Route
**File:** `src/app/api/packs/open/route.ts`

**Before:**
```typescript
// ❌ Could return retired players
const { data: cards } = await supabaseAdmin
  .from('cards')
  .select('id, players!inner(position)')
  .eq('rarity', rarity)
  .in('players.position', PLAYABLE_POSITIONS)
  .limit(50);
```

**After:**
```typescript
// ✅ Only active players
const { data: cards } = await supabaseAdmin
  .from('cards')
  .select('id, players!inner(position, active)')
  .eq('rarity', rarity)
  .eq('players.active', true)  // 🔥 Active players only!
  .in('players.position', PLAYABLE_POSITIONS)
  .limit(50);
```

---

### 2. ✅ Active Players Filter - Team Pack Opening
**File:** `src/app/api/teams/open-pack/route.ts`

**Before:**
```typescript
// ❌ No active filter, no position filter
const { data: cards, error } = await supabaseAdmin
  .from('cards')
  .select('id, base_sell_value, base_contracts')
  .eq('rarity', rarity);
```

**After:**
```typescript
// ✅ Active players + playable positions only
const PLAYABLE_POSITIONS = ['Quarterback', 'Running Back', 'Wide Receiver', 'Tight End'];

const { data: cards, error } = await supabaseAdmin
  .from('cards')
  .select('id, base_sell_value, base_contracts, players!inner(position, active)')
  .eq('rarity', rarity)
  .eq('players.active', true)  // 🔥 Active players only!
  .in('players.position', PLAYABLE_POSITIONS);  // 🔥 Playable positions only!
```

---

### 3. ✅ Active Players Filter - Dev Grant Cards
**File:** `src/app/api/dev/grant-cards/route.ts`

**Before:**
```typescript
// ❌ Could grant retired players
const { data: cards, error: cardsError } = await supabaseAdmin
  .from('cards')
  .select(`
    id, rarity, base_contracts, base_sell_value,
    players!inner (position, first_name, last_name, team)
  `)
  .in('players.position', PLAYABLE_POSITIONS)
  .limit(50);
```

**After:**
```typescript
// ✅ Only active players
const { data: cards, error: cardsError } = await supabaseAdmin
  .from('cards')
  .select(`
    id, rarity, base_contracts, base_sell_value,
    players!inner (position, first_name, last_name, team, active)
  `)
  .eq('players.active', true)  // 🔥 Active players only!
  .in('players.position', PLAYABLE_POSITIONS)
  .limit(50);
```

---

### 4. ✅ Improved Rarity Distribution
**File:** `src/app/api/teams/purchase-pack/route.ts`

**Before:**
```typescript
// ⚠️ Too many commons (50%), not enough excitement
const RARITY_WEIGHTS = {
  common: 50,      // 50% - Too many!
  uncommon: 30,    // 30%
  rare: 14,        // 14%
  epic: 5,         // 5%
  legendary: 1     // 1%
};
```

**After:**
```typescript
// ✅ Better balance for more exciting packs
const RARITY_WEIGHTS = {
  common: 45,      // 45% - Reduced by 5%
  uncommon: 30,    // 30% - Same
  rare: 17,        // 17% - Increased by 3% ⬆️
  epic: 6,         // 6% - Increased by 1% ⬆️
  legendary: 2     // 2% - DOUBLED! ⬆️⬆️
};
```

**Impact per 100 packs (500 cards):**
| Rarity | Before | After | Change |
|--------|--------|-------|--------|
| Common | 250 | 225 | -25 cards |
| Uncommon | 150 | 150 | No change |
| Rare | 70 | 85 | **+15 cards** ✨ |
| Epic | 25 | 30 | **+5 cards** ✨ |
| Legendary | 5 | 10 | **+5 cards (DOUBLED!)** ✨✨ |

---

## What This Fixes

### ❌ Problems Before
1. **Retired players in packs** - Users could get cards for players no longer in the NFL
2. **Non-playable positions** - Could get cards for positions not used in the game (in some routes)
3. **Too many common cards** - 50% commons made packs feel boring
4. **Legendary cards too rare** - Only 1% chance felt impossible to get

### ✅ Solutions Now
1. **Active players only** - All pack routes filter by `players.active = true`
2. **Playable positions only** - QB, RB, WR, TE only (no K, DEF, OL, etc.)
3. **Better rarity mix** - Reduced commons by 5%, increased rares/epics/legendaries
4. **Legendary cards 2x more common** - 2% instead of 1% (still rare but achievable!)

---

## Expected Pack Quality

### Old System (Per 5-Card Pack)
- ~2.5 Commons
- ~1.5 Uncommons
- ~0.7 Rare
- ~0.25 Epic
- ~0.05 Legendary (1 in 20 packs!)

### New System (Per 5-Card Pack)
- ~2.25 Commons (-0.25)
- ~1.5 Uncommons (same)
- ~0.85 Rare (+0.15) ✨
- ~0.30 Epic (+0.05) ✨
- ~0.10 Legendary (+0.05) ✨ **1 in 10 packs instead of 1 in 20!**

---

## Files Modified

### Pack Opening Routes
- ✅ `src/app/api/packs/open/route.ts` - Added active filter
- ✅ `src/app/api/teams/open-pack/route.ts` - Added active + position filters
- ✅ `src/app/api/teams/purchase-pack/route.ts` - Improved rarity weights
- ✅ `src/app/api/dev/grant-cards/route.ts` - Added active filter

### Collection Display Routes
- ✅ `src/app/dashboard/[teamId]/page.tsx` - Added active filter to `loadTeamCards()`
- ✅ `src/app/api/dev/test-user-flow/route.ts` - Added active filter for consistency

### Cleanup Utilities
- ✅ `src/app/api/dev/cleanup-retired-cards/route.ts` - NEW! Removes retired player cards

### Database Queries
All queries now include:
```typescript
.eq('players.active', true)  // Only active players
.in('players.position', PLAYABLE_POSITIONS)  // Only playable positions
```

---

## Testing

### Test 1: Verify Active Players Only
1. Open 5 packs
2. Check each player card
3. Verify all players are currently in the NFL (active = true)
4. ✅ Should see no retired players

### Test 2: Verify Playable Positions Only
1. Open 5 packs
2. Check each player position
3. ✅ Should only see: QB, RB, WR, TE
4. ❌ Should NOT see: K, DEF, OL, DL, LB, CB, S, etc.

### Test 3: Better Rarity Distribution
1. Open 20 packs (100 cards total)
2. Count cards by rarity
3. Expected distribution:
   - ~45 Commons (45%)
   - ~30 Uncommons (30%)
   - ~17 Rares (17%)
   - ~6 Epics (6%)
   - ~2 Legendaries (2%)

### Test 4: Legendary Cards More Common
1. Open 10 packs (50 cards)
2. ✅ Should get ~1 legendary (2% chance)
3. Before: Would need 20 packs to expect 1 legendary

---

## Database Impact

### Player Distribution (as of sync)
- **Total active players:** 10,849
- **Playable positions:**
  - Quarterbacks: ~150
  - Running Backs: ~250
  - Wide Receivers: ~400
  - Tight Ends: ~150
- **Total eligible for packs:** ~950 players

All pack queries now filter from this pool of ~950 active, playable-position players only!

---

## 🧹 Cleanup Retired Player Cards

### Problem
If you already have cards for retired players (like Donovan McNabb) in your collection, they won't automatically disappear. The new filters only prevent **new** retired player cards from being granted.

### Solution: Cleanup Endpoint
Use the cleanup endpoint to automatically sell all cards for retired players:

```bash
# Using curl (replace with your auth token)
curl -X POST http://localhost:3000/api/dev/cleanup-retired-cards \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json"

# Clean up specific team only
curl -X POST http://localhost:3000/api/dev/cleanup-retired-cards \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"teamId": "YOUR_TEAM_ID"}'
```

### What It Does
1. ✅ Finds all cards for retired players (`active = false`)
2. ✅ Marks them as "sold" in the database
3. ✅ Refunds their sell value in coins to your team(s)
4. ✅ Creates transaction records for tracking
5. ✅ Returns list of removed cards

### Example Response
```json
{
  "success": true,
  "message": "Successfully removed 3 cards for retired players",
  "cardsRemoved": 3,
  "coinsRefunded": 200,
  "removedCards": [
    {
      "player_name": "Donovan McNabb",
      "position": "Quarterback",
      "team": "MIN",
      "sell_value": 50
    },
    {
      "player_name": "Calvin Johnson",
      "position": "Wide Receiver",
      "team": "DET",
      "sell_value": 100
    },
    {
      "player_name": "Ray Rice",
      "position": "Running Back",
      "team": "BAL",
      "sell_value": 50
    }
  ]
}
```

### After Running Cleanup
✅ **Collection is clean** - Only active NFL players remain  
✅ **Coins refunded** - You get coins back for the retired player cards  
✅ **No data loss** - Cards are marked as "sold" not deleted (transactions recorded)

---

## Next Steps (Optional)

### 🎯 Further Improvements
- [ ] Add player overall rating to weight card selection (better players = higher rarity bias)
- [ ] Implement "pity timer" for legendaries (guarantee after X packs)
- [ ] Add pack type variants (e.g., "Premium Pack" with better odds)
- [ ] Track and display pull rates to players
- [ ] Add duplicate protection for legendaries

### 📊 Analytics
- [ ] Track rarity distribution in production
- [ ] Monitor most/least pulled players
- [ ] Add "pack opening stats" to user profile

---

## Summary

### What Changed
✅ **Active players only in packs** - No more retired players in NEW packs  
✅ **Active players only in collection** - Retired players hidden from view  
✅ **Playable positions only** - QB, RB, WR, TE only (all routes)  
✅ **Better rarity distribution** - More rares/epics/legendaries  
✅ **Legendary cards 2x more common** - 2% instead of 1%  
✅ **Cleanup endpoint** - Remove existing retired player cards  

### User Impact
🎉 **More exciting packs** - Better mix of card qualities  
🎉 **Better player pool** - Only active NFL players  
🎉 **Achievable legendaries** - 1 in 10 packs instead of 1 in 20  
🎉 **Consistent experience** - All pack routes use same logic  
🎉 **Clean collection** - No more Donovan McNabb or other retired players  
🎉 **More relevant players** - Current NFL rosters only  

### Immediate Next Steps
1. **Refresh your dashboard** - Retired player cards will disappear from view
2. **Run cleanup endpoint** (optional) - Get coins back by selling retired cards
3. **Open new packs** - You'll only get active players now!

Users should now have a much better experience with active players only and more balanced rarity distribution! 🎊

