import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * CRON JOB: Calculate Trending Data for All Players
 * 
 * This endpoint should be called by a cron job (e.g., Vercel Cron)
 * to pre-calculate trending data for all active players.
 * 
 * Security: Requires CRON_SECRET environment variable
 * Schedule: Run daily at 3 AM or after each game day
 */
export async function GET(req: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = req.headers.get('authorization')
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`
    
    if (!process.env.CRON_SECRET || authHeader !== expectedAuth) {
      console.error('Unauthorized trending calculation attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const season = 2025
    console.log(`🔄 Starting trending calculation for ${season} season...`)
    
    // 1. Get all active players (with pagination to bypass 1000 row limit)
    let allPlayers: any[] = []
    let playerFrom = 0
    const playerBatchSize = 1000
    let hasMorePlayers = true
    
    while (hasMorePlayers) {
      const { data: batch, error: playersError } = await supabaseAdmin
        .from('players')
        .select('id, position')
        .eq('active', true)
        .range(playerFrom, playerFrom + playerBatchSize - 1)
      
      if (playersError) throw playersError
      
      if (batch && batch.length > 0) {
        allPlayers = allPlayers.concat(batch)
        playerFrom += playerBatchSize
        hasMorePlayers = batch.length === playerBatchSize
      } else {
        hasMorePlayers = false
      }
    }
    
    const players = allPlayers
    console.log(`📊 Processing ${players.length} active players...`)
    
    // 2. Get all game stats for the season using date range
    // Fetch in batches to bypass 1000 row limit
    let allStats: any[] = []
    let from = 0
    const batchSize = 1000
    let hasMore = true
    
    while (hasMore) {
      const { data: batch, error: statsError } = await supabaseAdmin
        .from('player_game_stats')
        .select('player_id, stat_json, game_date, sports_event_id')
        .gte('game_date', `${season}-08-01`)
        .lte('game_date', `${season + 1}-02-28`)
        .not('stat_json', 'is', null)
        .order('game_date', { ascending: false })
        .range(from, from + batchSize - 1)
      
      if (statsError) throw statsError
      
      if (batch && batch.length > 0) {
        allStats = allStats.concat(batch)
        from += batchSize
        hasMore = batch.length === batchSize
      } else {
        hasMore = false
      }
    }
    
    console.log(`📈 Found ${allStats.length} stat records (fetched in ${Math.ceil(allStats.length / batchSize)} batches)`)
    
    // 4. Calculate trending for each player
    const trendingData: any[] = []
    let playersProcessed = 0
    let playersWithTrends = 0
    
    for (const player of players) {
      const playerStats = (allStats || []).filter(s => s.player_id === player.id && s.stat_json)
      
      // Calculate fantasy points for each game
      const gamesWithPoints = playerStats.map(stat => {
        const points = calculateFantasyPoints(stat.stat_json, player.position)
        // Debug first few calculations
        if (playersProcessed < 5 && playerStats.length > 0) {
          console.log(`  Player ${playersProcessed}: ${player.position}, ${playerStats.length} games, ${points} pts`)
          if (points > 0 || playerStats.length >= 3) {
            console.log(`    Sample stat:`, JSON.stringify(stat.stat_json).substring(0, 200))
          }
        }
        return {
          date: stat.game_date,
          points
        }
      }).filter(g => g.points > 0)
      
      // Skip only if NO games at all
      if (gamesWithPoints.length === 0) {
        trendingData.push({
          player_id: player.id,
          season_year: season,
          trend_direction: 'stable',
          trend_strength: 0,
          season_avg: 0,
          last_3_avg: 0,
          games_played: 0
        })
        playersProcessed++
        continue
      }
      
      // Calculate season average
      const seasonAvg = gamesWithPoints.reduce((sum, g) => sum + g.points, 0) / gamesWithPoints.length
      
      // Position-aware baseline for context (typical weekly fantasy points)
      const positionBaseline: Record<string, number> = {
        'Quarterback': 18,
        'Running Back': 12,
        'Wide Receiver': 12,
        'Tight End': 10,
        'Kicker': 8,
        'Defense': 8
      }
      const baseline = positionBaseline[player.position] || 5
      
      // Calculate trend - ROBUST version
      let diff = 0
      let diffPct = 0
      let recentAvg = seasonAvg
      
      if (gamesWithPoints.length === 1) {
        // Single game: compare to position baseline
        recentAvg = gamesWithPoints[0].points
        diff = recentAvg - baseline
        // Use baseline as denominator to avoid huge percentages
        diffPct = Math.round((diff / baseline) * 100)
        
      } else if (gamesWithPoints.length === 2) {
        // Two games: compare most recent to previous, but use minimum threshold
        const mostRecent = gamesWithPoints[0].points
        const previous = gamesWithPoints[1].points
        recentAvg = mostRecent
        diff = mostRecent - previous
        
        // Use the larger of: previous game or position baseline
        // This prevents 0.5 -> 2.0 from showing as +300%
        const denominator = Math.max(previous, baseline * 0.5)
        diffPct = Math.round((diff / denominator) * 100)
        
      } else {
        // Three+ games: compare recent 3 to season average
        const last3Games = gamesWithPoints.slice(0, 3)
        recentAvg = last3Games.reduce((sum, g) => sum + g.points, 0) / 3
        diff = recentAvg - seasonAvg
        
        // Use the larger of: season avg or position baseline
        const denominator = Math.max(seasonAvg, baseline * 0.5)
        diffPct = Math.round((diff / denominator) * 100)
      }
      
      // Cap extreme percentages at ±200% for sanity
      diffPct = Math.max(-200, Math.min(200, diffPct))
      
      // Determine direction - use raw diff to catch even tiny movements
      // For players with 1-2 games, this compares their most recent games to their season avg
      let direction: 'up' | 'down' | 'stable' = 'stable'
      if (diff > 0.01) { // Any positive trend, even tiny
        direction = 'up'
        playersWithTrends++
      } else if (diff < -0.01) { // Any negative trend, even tiny
        direction = 'down'
        playersWithTrends++
      }
      // Only shows stable "-" if within ±0.01 points (virtually no change)
      
      trendingData.push({
        player_id: player.id,
        season_year: season,
        trend_direction: direction,
        trend_strength: diffPct,
        season_avg: Math.round(seasonAvg * 10) / 10,
        last_3_avg: Math.round(recentAvg * 10) / 10,
        games_played: gamesWithPoints.length
      })
      
      playersProcessed++
      
      // Log progress every 100 players
      if (playersProcessed % 100 === 0) {
        console.log(`  Processed ${playersProcessed}/${players.length} players...`)
      }
    }
    
    console.log(`✅ Calculated trends for ${playersProcessed} players (${playersWithTrends} with up/down trends)`)
    
    // 5. Upsert to cache table (batch insert)
    const { error: upsertError } = await supabaseAdmin
      .from('player_trending_cache')
      .upsert(trendingData, { 
        onConflict: 'player_id,season_year',
        ignoreDuplicates: false 
      })
    
    if (upsertError) throw upsertError
    
    console.log(`💾 Cache updated successfully`)
    
    return NextResponse.json({
      success: true,
      season,
      playersProcessed,
      playersWithTrends,
      totalCached: trendingData.length,
      timestamp: new Date().toISOString()
    })
    
  } catch (error: any) {
    console.error('❌ Error calculating trending:', error)
    return NextResponse.json(
      { 
        error: error.message || 'Failed to calculate trending',
        details: error.stack
      },
      { status: 500 }
    )
  }
}

// Calculate fantasy points from stat_json (same logic as trending endpoint)
function calculateFantasyPoints(stats: any, position: string): number {
  let points = 0
  
  // Convert all stats to numbers (they come as strings from DB)
  const passingYards = parseFloat(stats.passing_yards) || 0
  const passingTDs = parseFloat(stats.passing_touchdowns) || 0
  const interceptions = parseFloat(stats.passing_interceptions) || 0
  
  const rushingYards = parseFloat(stats.rushing_yards) || 0
  const rushingTDs = parseFloat(stats.rushing_touchdowns) || 0
  
  const receivingYards = parseFloat(stats.receiving_yards) || 0
  const receivingTDs = parseFloat(stats.receiving_touchdowns) || 0
  const receptions = parseFloat(stats.receptions) || 0
  
  const fumblesLost = parseFloat(stats.fumbles_lost) || 0
  
  // Standard scoring
  points += passingYards * 0.04 // 1 point per 25 yards
  points += passingTDs * 4
  points -= interceptions * 2
  
  points += rushingYards * 0.1 // 1 point per 10 yards
  points += rushingTDs * 6
  
  points += receivingYards * 0.1 // 1 point per 10 yards
  points += receivingTDs * 6
  points += receptions * 0.5 // 0.5 PPR
  
  points -= fumblesLost * 2
  
  return Math.max(0, points)
}

