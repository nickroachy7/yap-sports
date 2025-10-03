# 📈 Trending & Multi-Season Game Log - Quick Start Guide

## ✨ What You Got

### 1. **Trending System** 🔥
Players now show if they're HOT (📈 trending up), COLD (📉 trending down), or STABLE (⚡).

### 2. **Multi-Season Toggle** 📅
View player game logs from 2024, 2025, or any season with data.

### 3. **Smart Analytics** 🎯
- Boom/Bust rates
- Consistency scores
- Position rankings
- Season projections

---

## 🚀 How to Use

### View Player Trending

1. **Open any player** from the Players page
2. Click the **"📈 Trending"** tab
3. See:
   - Trending direction (Up/Down/Stable)
   - Last 5 games average
   - Projected season finish
   - Boom/Bust rates
   - Position rank

### Compare Seasons

1. Open a player
2. Click the **"🗓️ Game Log"** tab
3. Click **2024** or **2025** button
4. Game log updates instantly
5. Toggle back and forth to compare

### Quick Trending Indicator

Look for the trending indicator in player stats:
- 🔥 **HOT** - Averaging higher than season average
- ❄️ **COLD** - Averaging lower than season average
- ⚡ **STABLE** - Consistent with season average

---

## 📊 Understanding the Metrics

### Trending Strength
- **+25%** or more = 🔥🔥🔥 Very Hot
- **+15% to +24%** = 🔥 Hot
- **-15% to +15%** = ⚡ Stable
- **-15% to -24%** = ❄️ Cold
- **-25%** or more = ❄️❄️❄️ Very Cold

### Consistency Score
- **80-100** = Very reliable, predictable
- **60-79** = Fairly consistent
- **40-59** = Somewhat volatile
- **0-39** = Boom or bust player

### Boom/Bust
- **Boom** = Game with 1.5x+ average points (e.g., 30+ if avg is 20)
- **Bust** = Game with 0.5x- average points (e.g., <10 if avg is 20)

---

## 🎯 Making Better Decisions

### Start a Trending Up Player
If a player shows:
- 📈 Trending UP
- Last 5 avg > Season avg
- High consistency score
- Low bust rate

**→ Great start candidate!**

### Bench a Trending Down Player
If a player shows:
- 📉 Trending DOWN
- Last 5 avg < Season avg
- High bust rate
- Recent injury (when integrated)

**→ Consider benching**

### Compare Historical Performance
Use season toggle to see:
- How did they perform in 2024?
- Are they improving or declining year-over-year?
- What was their best/worst season?

---

## 🔥 Pro Tips

1. **Check Trending Before Lineup Decisions**
   - A "cold" superstar might be worse than a "hot" mid-tier player

2. **Use Multi-Season for Trades**
   - Compare 2024 vs 2025 to see if player is improving
   - Sell high on trending-up players
   - Buy low on temporarily cold players

3. **Watch Boom/Bust Rates**
   - High boom rate = High ceiling
   - High bust rate = High risk
   - Low both = Safe, consistent floor

4. **Position Rank Matters**
   - Top 20% at position = Elite tier
   - Top 40% at position = Starter tier
   - Below 60% at position = Bench/trade

5. **Projected Finish**
   - Shows where player is headed
   - Based on recent form + games remaining
   - Updates each week

---

## 🛠️ Technical Details

### API Endpoints

**Trending Data:**
```
GET /api/players/{playerId}/trending?season=2025
```

**Game Log (Any Season):**
```
GET /api/players/{playerId}/game-log?season=2024
```

### Components

```tsx
import { TrendingIndicator } from '@/components/ui'

<TrendingIndicator 
  trending={data.trending} 
  stats={data.stats}
/>
```

---

## 🎨 Visual Guide

### Trending Tab Shows:
```
┌─────────────────────────────────────┐
│ 🔥 TRENDING UP      [+23%]         │
│ Averaging 18.5 pts over last 5...  │
└─────────────────────────────────────┘

Season Avg    Last 5    Proj. Finish   Rank
   16.5        18.5        291.0        #12

Consistency   Boom Rate   Bust Rate   Best/Worst
    72%         25%         17%       28.3/8.2
```

### Game Log Tab Shows:
```
┌─────────────────────────────────────┐
│ Game Log              [2025] [2024] │ ← Season Toggle
├─────────────────────────────────────┤
│ WK  OPP    PROJ  FPTS  TAR REC ...  │
│ 1   @DAL   14.2  18.5   8   6  ...  │
│ 2   vs NYG 15.1  21.3  10   8  ...  │
│ 3   @PHI   13.8   9.2   5   3  ...  │
└─────────────────────────────────────┘
```

---

## ✅ Quick Test

1. Start dev server: `npm run dev`
2. Go to Players page
3. Click on a player like Jaylen Waddle or Cooper Kupp
4. You should see **3 tabs**: Overview, Trending, Game Log
5. Click each tab to explore
6. In Game Log, toggle between 2025/2024

---

## 🎉 That's It!

You now have professional-grade player analysis tools built right into your fantasy app!

**Questions?** Check `TRENDING_SYSTEM_IMPLEMENTED.md` for full technical details.

---

**Made with ❤️ for better fantasy decisions** 🏈📊

