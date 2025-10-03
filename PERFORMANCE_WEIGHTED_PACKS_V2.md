# 🎯 Performance-Weighted Pack System V2

## Overview

The Performance-Weighted Pack System ensures that users receive **relevant, active players** who are actually playing and performing well in the NFL. This system **drastically increases** the probability of getting good players while filtering out retired, injured, or inactive players.

## How It Works

### 1. **Player Performance Scoring**

Every active player is assigned a **performance weight** based on their average fantasy points from actual game logs:

```
Performance Tiers (AGGRESSIVE):
┌─────────────┬──────────────────┬────────────┬─────────────────────┐
│ Tier        │ Avg Fantasy Pts  │ Weight     │ Examples            │
├─────────────┼──────────────────┼────────────┼─────────────────────┤
│ SUPERSTAR   │ 18+ points       │ 500x       │ Mahomes, Allen, CMC │
│ ELITE       │ 15-18 points     │ 250x       │ Top tier starters   │
│ GREAT       │ 12-15 points     │ 100x       │ WR1/RB1 caliber     │
│ GOOD        │ 10-12 points     │ 40x        │ WR2/RB2 level       │
│ DECENT      │ 8-10 points      │ 15x        │ Flex players        │
│ MEDIOCRE    │ 6-8 points       │ 5x         │ Backups who play    │
│ POOR        │ 0-6 points       │ 1x         │ Rarely used         │
└─────────────┴──────────────────┴────────────┴─────────────────────┘

Minimum Requirements:
- At least 3 games played in 2024-2025 seasons
- At least 2.0 avg fantasy points per game
- Games must be after Sept 1, 2024
```

### 2. **Weighted Random Selection**

When a pack is opened:
1. System determines rarity (common, rare, elite, etc.) based on pack schema
2. Fetches all eligible cards of that rarity
3. Calculates each player's performance weight
4. Uses **weighted random selection** - better players are 50x more likely than backups!

### 3. **Smart Filtering**

Only includes players who:
- ✅ Are marked as `active` in the database
- ✅ Play a **playable position** (QB, RB, WR, TE)
- ✅ Have game log data (filters out retired/inactive players)

## Key Features

### 🎲 **Weighted Probability**

A player with 15+ avg fantasy points (ELITE tier) is **50x more likely** to appear in packs than a backup with 0-3 points.

**Example:**
- Patrick Mahomes (18 avg pts): **50x weight**
- Average backup QB (2 avg pts): **1x weight**
- Result: Mahomes is **50 times** more likely to be pulled!

### ⚡ **Performance Caching**

- Calculations are **cached for 30 minutes** to prevent database overload
- First pack opening per rarity calculates weights
- Subsequent openings use cached data (super fast!)
- Cache automatically refreshes every 30 minutes

### 📊 **Real Stats, Real Players**

Uses **actual fantasy points** from player game logs:
- Passing: 0.04 pts/yd, 4 pts/TD, -2 pts/INT
- Rushing: 0.1 pts/yd, 6 pts/TD
- Receiving: 0.1 pts/yd, 6 pts/TD, 1 pt/reception (PPR)
- Fumbles: -2 pts/fumble lost

## Implementation Details

### Files Modified

#### 1. **New File: `/src/lib/packWeighting.ts`**
Core performance weighting logic:
- `getWeightedCardPool(rarity)` - Gets all cards with performance weights
- `selectWeightedCard(pool)` - Selects a card using weighted random
- `getPerformanceWeightedCard(rarity)` - Combined function for easy use
- `clearWeightedCardCache()` - Manual cache refresh

#### 2. **Updated: `/src/app/api/packs/open/route.ts`**
Main pack opening route now uses performance weighting:
```typescript
async function rollCard(rarityWeights: Record<string, number>) {
  const rarity = weightedRandom(rarityWeights);
  
  // Use performance-weighted card selection
  const cardId = await getPerformanceWeightedCard(rarity);
  
  if (cardId) {
    console.log(`✓ Selected performance-weighted card (${rarity}): ${cardId}`);
    return cardId;
  }
  
  // Fallback to old system if weighting fails
  // ...
}
```

#### 3. **Updated: `/src/app/api/teams/open-pack/route.ts`**
Team-specific pack opening also uses performance weighting:
```typescript
async function getRandomCard(rarity: string) {
  // Use performance-weighted card selection
  const cardId = await getPerformanceWeightedCard(rarity);
  
  if (cardId) {
    // Get card details and return
    // ...
  }
  
  // Fallback to old system if needed
  // ...
}
```

## Example Scenarios

### Scenario 1: Opening a Standard Pack

**Pack Schema:**
- 5 Common cards
- 2 Rare cards
- 1 Elite card

**What Happens:**

1. **Common Card #1** (random weight)
   - Eligible pool: All common cards of active players
   - Patrick Mahomes (Common): 18 avg pts → **50x weight**
   - Backup QB: 1.2 avg pts → **1x weight**
   - Result: Mahomes is **50x more likely** to appear

2. **Rare Card #1** (better weights)
   - Same weighting system, but from rare cards only
   - Top performers still heavily favored

3. **Elite Card** (guaranteed high performer)
   - Elite rarity already filters to top players
   - Performance weighting ensures the BEST of the elite appear more often

### Scenario 2: Filtering Out Bad Players

**Before Performance Weighting:**
```
Pack contains:
- 3 active star players
- 2 retired players (shouldn't be there!)
- 5 backup players who never play

Result: 50% chance of getting a useless card ❌
```

**After Performance Weighting:**
```
Pack contains:
- 3 active star players (50x weight each) = 150 total weight
- 5 backup players (1x weight each) = 5 total weight

Total weight: 155
Chance of getting a star: 150/155 = 96.7% ✅
Chance of getting a backup: 5/155 = 3.2%
```

## Benefits

### For Users 🎮
- **Better pack value** - Most cards are relevant, playable players
- **No more retired players** - Only active NFL players appear
- **Higher engagement** - Opening packs feels rewarding, not disappointing
- **Fair distribution** - Still possible to get backups, but much less likely

### For The Game 📈
- **Player retention** - Users happier with pack contents
- **Realistic gameplay** - Team composition reflects actual NFL performance
- **Automatic updates** - System adapts as players get injured or perform poorly
- **No manual curation** - Performance data updates automatically from game logs

## Testing & Verification

### How to Test

1. **Open a few packs** and check the players you receive
2. **Check server logs** for weight calculations:
   ```
   ✓ Calculated weights for 2,247 cards (total weight: 45,234.00)
     Top performers:
       - Patrick Mahomes (Quarterback): 18.4 avg pts, weight: 50
       - Josh Allen (Quarterback): 17.2 avg pts, weight: 50
       - Christian McCaffrey (Running Back): 16.8 avg pts, weight: 50
   ```

3. **Verify player quality** - Most cards should be recognizable NFL starters

### Expected Results

- **~70-80%** of cards should be solid starters (9+ avg fantasy pts)
- **~15-20%** of cards should be average/role players (3-9 avg fantasy pts)
- **~5%** of cards might be backups or injured players (0-3 avg fantasy pts)
- **0%** retired or completely inactive players (filtered out)

## Configuration

### Adjust Performance Tiers

To change the weighting, edit `/src/lib/packWeighting.ts`:

```typescript
const PERFORMANCE_TIERS = {
  ELITE: { min: 15, weight: 50 },      // ← Increase weight to make elite MORE common
  GREAT: { min: 12, weight: 30 },      // ← Adjust thresholds to change tier boundaries
  GOOD: { min: 9, weight: 15 },
  DECENT: { min: 6, weight: 8 },
  MEDIOCRE: { min: 3, weight: 3 },
  POOR: { min: 0, weight: 1 }
};
```

### Cache Duration

Change cache TTL (time to live):

```typescript
// In getWeightedCardPool()
setCachedData(cacheKey, pool, 30 * 60); // ← Change 30 to desired minutes
```

### Minimum Games Filter

Players must have played at least 1 game. To adjust:

```typescript
const MIN_GAMES_PLAYED = 1; // ← Increase to require more games
```

## Future Enhancements

### Potential Improvements
- **Position-specific weighting** - Weight QBs differently than WRs
- **Recent performance bias** - Weight last 3 games more heavily than full season
- **Injury status integration** - Reduce weight for injured players
- **Matchup-based weighting** - Increase weight for players with good upcoming matchups
- **User feedback loop** - Track which players users keep vs. sell, adjust weights accordingly

## Troubleshooting

### Issue: All cards are superstars
**Solution:** Reduce the weight multipliers in `PERFORMANCE_TIERS`

### Issue: Still getting retired players
**Solution:** Verify `players.active` field is set correctly in database

### Issue: Pack opening is slow
**Solution:** Cache is working correctly - first opening calculates weights (slow), subsequent openings use cache (fast)

### Issue: Getting error "Performance weighting failed"
**Solution:** Check that player game stats exist for the current season (2025)

## Summary

The Performance-Weighted Pack System transforms pack opening from a lottery of random players into a **curated experience** where users consistently receive **relevant, active, and high-performing players**. 

By leveraging real fantasy point data, the system automatically:
- ✅ Filters out inactive/retired players
- ✅ Heavily favors NFL starters and stars
- ✅ Provides better pack value and user satisfaction
- ✅ Requires no manual curation or updates

**Result:** Users open packs and get players they've actually heard of! 🎉

