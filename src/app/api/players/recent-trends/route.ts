import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * GET /api/players/recent-trends?season=2025
 * 
 * Calculates trending data for all players by comparing recent games vs season average
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const season = parseInt(searchParams.get('season') || '2025')
    
    // Get all players with their game stats
    const { data: players, error: playersError } = await supabaseAdmin
      .from('players')
      .select('id, first_name, last_name, position')
      .eq('active', true)
    
    if (playersError) throw playersError
    
    // Get all game stats for the season by joining with sports_events
    const { data: allStats, error: statsError} = await supabaseAdmin
      .from('player_game_stats')
      .select(`
        player_id,
        stat_json,
        game_date,
        sports_event:sports_events!inner (
          starts_at
        )
      `)
      .gte('sports_event.starts_at', `${season}-08-01`)
      .lte('sports_event.starts_at', `${season + 1}-02-28`)
      .order('game_date', { ascending: false })
    
    if (statsError) throw statsError
    
    // Calculate trends for each player
    const trendsMap = new Map()
    
    for (const player of players) {
      const playerStats = allStats.filter(s => s.player_id === player.id && s.stat_json)
      
      // Calculate fantasy points for each game
      const gamesWithPoints = playerStats.map(stat => ({
        date: stat.game_date,
        points: calculateFantasyPoints(stat.stat_json, player.position)
      })).filter(g => g.points > 0) // Only games where they played
      
      if (gamesWithPoints.length < 3) {
        // Need at least 3 games
        trendsMap.set(player.id, {
          direction: 'stable',
          strength: 0,
          gamesPlayed: gamesWithPoints.length
        })
        continue
      }
      
      // Calculate season average
      const seasonAvg = gamesWithPoints.reduce((sum, g) => sum + g.points, 0) / gamesWithPoints.length
      
      // Calculate last 3 games average (most recent games are first due to ORDER BY DESC)
      const last3Games = gamesWithPoints.slice(0, 3)
      const last3Avg = last3Games.reduce((sum, g) => sum + g.points, 0) / 3
      
      // Calculate trend
      const diff = last3Avg - seasonAvg
      const diffPct = seasonAvg > 0 ? Math.round((diff / seasonAvg) * 100) : 0
      
      // Determine direction with lower threshold for more variety
      let direction: 'up' | 'down' | 'stable' = 'stable'
      if (diffPct >= 5) {
        direction = 'up'
      } else if (diffPct <= -5) {
        direction = 'down'
      } else {
        direction = 'stable'
      }
      
      trendsMap.set(player.id, {
        direction,
        strength: diffPct,
        seasonAvg: Math.round(seasonAvg * 10) / 10,
        last3Avg: Math.round(last3Avg * 10) / 10,
        gamesPlayed: gamesWithPoints.length
      })
    }
    
    return NextResponse.json({
      success: true,
      season,
      trends: Object.fromEntries(trendsMap)
    })
    
  } catch (error: any) {
    console.error('Error calculating trends:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to calculate trends' },
      { status: 500 }
    )
  }
}

// Calculate fantasy points from stat_json
function calculateFantasyPoints(stats: any, position: string): number {
  let points = 0;
  
  // Passing stats
  const passingYards = stats.passing_yards || 0;
  const passingTDs = stats.passing_touchdowns || 0;
  const interceptions = stats.passing_interceptions || 0;
  
  // Rushing stats
  const rushingYards = stats.rushing_yards || 0;
  const rushingTDs = stats.rushing_touchdowns || 0;
  
  // Receiving stats
  const receivingYards = stats.receiving_yards || 0;
  const receivingTDs = stats.receiving_touchdowns || 0;
  const receptions = stats.receptions || 0;
  
  // Fumbles
  const fumblesLost = stats.fumbles_lost || 0;
  
  // Standard scoring
  points += passingYards * 0.04; // 1 point per 25 yards
  points += passingTDs * 4;
  points -= interceptions * 2;
  
  points += rushingYards * 0.1; // 1 point per 10 yards
  points += rushingTDs * 6;
  
  points += receivingYards * 0.1; // 1 point per 10 yards
  points += receivingTDs * 6;
  points += receptions * 0.5; // 0.5 PPR
  
  points -= fumblesLost * 2;
  
  return Math.max(0, points);
}

