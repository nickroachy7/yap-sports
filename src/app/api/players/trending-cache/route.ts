import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * GET /api/players/trending-cache?season=2025
 * 
 * Fast read-only endpoint to fetch pre-calculated trending data
 * from the player_trending_cache table.
 * 
 * This is MUCH faster than calculating trends on-demand.
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const season = parseInt(searchParams.get('season') || '2025')
    
    // Fetch all cache entries with pagination (bypass 1000 row limit)
    let allData: any[] = []
    let from = 0
    const batchSize = 1000
    let hasMore = true
    
    while (hasMore) {
      const { data: batch, error } = await supabaseAdmin
        .from('player_trending_cache')
        .select('*')
        .eq('season_year', season)
        .range(from, from + batchSize - 1)
      
      if (error) throw error
      
      if (batch && batch.length > 0) {
        allData = allData.concat(batch)
        from += batchSize
        hasMore = batch.length === batchSize
      } else {
        hasMore = false
      }
    }
    
    const data = allData
    
    // Convert array to map for easy lookup by player_id
    const trendingMap: Record<string, any> = {}
    
    ;(data || []).forEach(item => {
      trendingMap[item.player_id] = {
        direction: item.trend_direction,
        strength: item.trend_strength,
        seasonAvg: item.season_avg,
        last3Avg: item.last_3_avg,
        gamesPlayed: item.games_played,
        calculatedAt: item.calculated_at
      }
    })
    
    return NextResponse.json({
      success: true,
      season,
      trends: trendingMap,
      totalPlayers: data?.length || 0,
      cachedAt: data?.[0]?.calculated_at || null
    })
    
  } catch (error: any) {
    console.error('Error fetching trending cache:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch trending data' },
      { status: 500 }
    )
  }
}

