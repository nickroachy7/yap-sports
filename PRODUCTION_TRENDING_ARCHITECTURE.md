# Production-Ready Trending System Architecture

## 🎯 Optimal Approach for Scale

### **Pre-Calculated + Cached Trending Data**

Instead of calculating trends on every page load, use a **background job** to pre-calculate and store trending data.

---

## 📐 Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Background Job (Runs Daily or After Each Game)         │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  1. Calculate trending for all players                   │
│  2. Store in database table: `player_trending_cache`     │
│  3. Update once per day (or after game completion)       │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│  Database: player_trending_cache Table                   │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  - player_id                                             │
│  - season_year                                           │
│  - trend_direction (up/down/stable)                      │
│  - trend_strength (percentage)                           │
│  - season_avg                                            │
│  - last_3_avg                                            │
│  - games_played                                          │
│  - calculated_at (timestamp)                             │
│  - INDEX on (player_id, season_year)                     │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│  API: Fast Read-Only Endpoint                            │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  GET /api/players/trending-cache?season=2025             │
│  → Simple SELECT from player_trending_cache              │
│  → Returns pre-calculated data instantly                 │
│  → No computation needed                                 │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│  Frontend: Players Page                                  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  → Fetches cached trending data (single query)          │
│  → Renders instantly (no calculation overhead)           │
│  → Scales to millions of users                           │
└─────────────────────────────────────────────────────────┘
```

---

## 💪 Why This is Best for Production

### ✅ Performance Benefits
1. **Fast Page Loads** - Simple SELECT query, no computation
2. **Low Database Load** - Single read vs thousands of calculations
3. **Predictable Performance** - Consistent response times
4. **Cacheable** - Can add Redis/CDN layer on top

### ✅ Scalability Benefits
1. **Handles High Traffic** - No CPU-intensive calculations on request
2. **Horizontal Scaling** - API servers can scale independently
3. **Database Efficiency** - One calculation job vs per-request computation
4. **Cost Effective** - Lower compute costs

### ✅ Data Freshness
1. **Configurable Updates** - Run job after each game day
2. **Good Enough Freshness** - Trends don't change minute-to-minute
3. **Background Processing** - Doesn't impact user experience

---

## 🔧 Implementation Plan

### Phase 1: Database Schema
```sql
-- Create trending cache table
CREATE TABLE player_trending_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  season_year INTEGER NOT NULL,
  trend_direction TEXT NOT NULL CHECK (trend_direction IN ('up', 'down', 'stable')),
  trend_strength INTEGER NOT NULL,
  season_avg DECIMAL(10,2),
  last_3_avg DECIMAL(10,2),
  games_played INTEGER NOT NULL,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Indexes for fast lookups
  UNIQUE(player_id, season_year)
);

CREATE INDEX idx_trending_cache_season ON player_trending_cache(season_year);
CREATE INDEX idx_trending_cache_direction ON player_trending_cache(trend_direction);
CREATE INDEX idx_trending_cache_strength ON player_trending_cache(trend_strength DESC);
```

### Phase 2: Background Calculation Job
```typescript
// /src/app/api/cron/calculate-trending/route.ts

export async function GET(req: NextRequest) {
  // Verify cron secret for security
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const season = 2025;
  
  // 1. Get all active players
  const { data: players } = await supabase
    .from('players')
    .select('id, position')
    .eq('active', true);

  // 2. Get all game stats for season
  const { data: stats } = await supabase
    .from('player_game_stats')
    .select('player_id, stat_json, game_date, sports_event:sports_events(starts_at)')
    .gte('sports_event.starts_at', `${season}-08-01`)
    .lte('sports_event.starts_at', `${season + 1}-02-28`);

  // 3. Calculate trending for each player
  const trendingData = players.map(player => {
    const playerStats = stats.filter(s => s.player_id === player.id);
    // ... calculate trending logic ...
    return {
      player_id: player.id,
      season_year: season,
      trend_direction: direction,
      trend_strength: strength,
      season_avg: seasonAvg,
      last_3_avg: last3Avg,
      games_played: gamesPlayed
    };
  });

  // 4. Upsert to cache table
  await supabase
    .from('player_trending_cache')
    .upsert(trendingData, { onConflict: 'player_id,season_year' });

  return NextResponse.json({ 
    success: true, 
    updated: trendingData.length,
    timestamp: new Date().toISOString()
  });
}
```

### Phase 3: Fast Read API
```typescript
// /src/app/api/players/trending-cache/route.ts

export async function GET(req: NextRequest) {
  const season = parseInt(req.nextUrl.searchParams.get('season') || '2025');
  
  // Simple read from cache
  const { data, error } = await supabase
    .from('player_trending_cache')
    .select('*')
    .eq('season_year', season);

  if (error) throw error;

  return NextResponse.json({
    success: true,
    season,
    trending: data
  });
}
```

### Phase 4: Vercel Cron Job
```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/calculate-trending",
      "schedule": "0 3 * * *"
    }
  ]
}
```

---

## 🔄 Alternative: Hybrid Approach

For even better UX, combine both approaches:

```typescript
// On page load
1. Fetch cached trending data (instant)
2. Display immediately
3. Background: Check if cache is stale
4. If stale (>24hrs), show "refreshing" indicator
5. Optionally trigger recalculation
```

---

## 📊 Performance Comparison

| Approach | Page Load Time | DB Load | Scalability | Freshness |
|----------|---------------|---------|-------------|-----------|
| **Calculate on Request** | 2-5s | HIGH | ⚠️ Poor | Real-time |
| **Per-Player On-Demand** | 1-3s | MEDIUM | ⚠️ Medium | Real-time |
| **Pre-Calculated Cache** ✅ | <100ms | LOW | ✅ Excellent | ~24hrs |
| **Hybrid (Cache + Fallback)** | <100ms | LOW | ✅ Excellent | Smart |

---

## 🎯 Recommendation

### For Production: **Pre-Calculated Cache**

**Why:**
1. ✅ Handles 100,000+ concurrent users
2. ✅ Sub-100ms response times
3. ✅ Low infrastructure costs
4. ✅ Simple to maintain
5. ✅ Trending data doesn't need real-time updates

**Implementation Timeline:**
- **Week 1**: Create schema + cron job
- **Week 2**: Update frontend to use cached data
- **Week 3**: Add monitoring + alerting
- **Week 4**: Optimize cache refresh strategy

---

## 🚀 Migration Path

### Phase 1 (Current)
- Keep individual player trending (modal/profile)
- Remove bulk trending from players list

### Phase 2 (Production Prep)
- Create `player_trending_cache` table
- Build calculation cron job
- Test with current data

### Phase 3 (Production)
- Deploy cron job (runs nightly)
- Update players page to use cache
- Monitor performance

### Phase 4 (Optimization)
- Add Redis cache layer
- Implement real-time updates for live games
- Add trending history tracking

---

## 💡 Additional Production Features

Once cache is in place, you can easily add:

1. **Trending History**
   - Track how trends change over time
   - Show "was trending up, now trending down"

2. **Trending Alerts**
   - Notify users when their players change trend direction
   - Email: "Your player is now trending up!"

3. **Trending Analytics**
   - Most volatile players
   - Consistency scores over time
   - Breakout player detection

4. **Social Features**
   - "Trending in your league"
   - "Most added/dropped trending players"

---

## ✅ Next Steps

1. **Create the database schema** (10 minutes)
2. **Build the cron calculation job** (1-2 hours)
3. **Create the cache read API** (30 minutes)
4. **Update frontend to use cache** (1 hour)
5. **Deploy and test** (30 minutes)

**Total Implementation**: ~4-5 hours for production-ready trending system

This approach will scale from 10 users to 10 million users with minimal infrastructure changes.

