import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * Player Trending Analysis Endpoint
 * 
 * Calculates comprehensive trending metrics:
 * - Season performance
 * - Recent performance (last 3-5 games)
 * - Trend direction (up/down)
 * - Projected season finish
 * - Injury impact
 * - Position rank changes
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ playerId: string }> }
) {
  try {
    const { playerId } = await params;
    const searchParams = req.nextUrl.searchParams;
    const season = parseInt(searchParams.get('season') || '2025');
    
    if (!playerId) {
      return NextResponse.json({ 
        error: 'Player ID is required' 
      }, { status: 400 });
    }

    // Get player info
    const { data: player, error: playerError } = await supabaseAdmin
      .from('players')
      .select('id, first_name, last_name, position, team, external_id')
      .eq('id', playerId)
      .single();

    if (playerError || !player) {
      return NextResponse.json({ 
        error: 'Player not found' 
      }, { status: 404 });
    }

    // Get all stats for this season, ordered by date
    const { data: allStats, error: statsError } = await supabaseAdmin
      .from('player_game_stats')
      .select(`
        id,
        stat_json,
        game_date,
        finalized,
        sports_event:sports_events (
          starts_at,
          status,
          week_number
        )
      `)
      .eq('player_id', playerId)
      .gte('game_date', `${season}-01-01`)
      .lte('game_date', `${season}-12-31`)
      .order('game_date', { ascending: true });

    if (statsError) {
      console.error('Error fetching stats:', statsError);
      return NextResponse.json({ 
        error: 'Failed to fetch stats',
        details: statsError.message 
      }, { status: 500 });
    }

    const stats = allStats || [];
    
    // Calculate fantasy points for each game
    const gamePerformances = stats.map(stat => {
      const statJson = stat.stat_json || {};
      const fp = calculateFantasyPoints(statJson, player.position);
      return {
        date: stat.game_date,
        week: stat.sports_event?.week_number || 0,
        points: fp,
        stats: statJson
      };
    }).filter(g => g.points > 0); // Only games where they played

    // Get total games remaining in season (assuming 17 game season)
    const totalGamesInSeason = 17;
    const gamesPlayed = gamePerformances.length;
    const gamesRemaining = Math.max(0, totalGamesInSeason - gamesPlayed);

    // Season totals
    const seasonPoints = gamePerformances.reduce((sum, g) => sum + g.points, 0);
    const seasonAverage = gamesPlayed > 0 ? seasonPoints / gamesPlayed : 0;

    // Recent performance (last 5 games)
    const recentGames = gamePerformances.slice(-5);
    const recentPoints = recentGames.reduce((sum, g) => sum + g.points, 0);
    const recentAverage = recentGames.length > 0 ? recentPoints / recentGames.length : 0;

    // Very recent (last 3 games for short-term trend)
    const lastThreeGames = gamePerformances.slice(-3);
    const lastThreeAverage = lastThreeGames.length > 0
      ? lastThreeGames.reduce((sum, g) => sum + g.points, 0) / lastThreeGames.length
      : 0;

    // Calculate trend direction
    let trendDirection: 'up' | 'down' | 'stable' = 'stable';
    let trendStrength = 0; // -100 to +100
    
    if (recentGames.length >= 3 && gamesPlayed >= 5) {
      const improvement = recentAverage - seasonAverage;
      const percentChange = (improvement / seasonAverage) * 100;
      
      if (percentChange > 15) {
        trendDirection = 'up';
        trendStrength = Math.min(100, percentChange);
      } else if (percentChange < -15) {
        trendDirection = 'down';
        trendStrength = Math.max(-100, percentChange);
      } else {
        trendDirection = 'stable';
        trendStrength = percentChange;
      }
    }

    // Projected season finish
    const projectedTotalPoints = seasonPoints + (recentAverage * gamesRemaining);
    const projectedSeasonAverage = projectedTotalPoints / totalGamesInSeason;

    // Consistency score (lower standard deviation = more consistent)
    let consistencyScore = 75; // Default
    if (gamePerformances.length >= 3) {
      const mean = seasonAverage;
      const variance = gamePerformances.reduce((sum, g) => 
        sum + Math.pow(g.points - mean, 2), 0
      ) / gamePerformances.length;
      const stdDev = Math.sqrt(variance);
      const coefficientOfVariation = (stdDev / mean) * 100;
      
      // Convert to 0-100 scale (lower CV = higher score)
      consistencyScore = Math.max(0, Math.min(100, 100 - coefficientOfVariation));
    }

    // Get injury status (placeholder - would integrate with injury API)
    const injuryStatus = await getInjuryStatus(player.external_id);

    // Calculate position rank (compare to other players at same position)
    const positionRank = await calculatePositionRank(
      playerId, 
      player.position, 
      seasonAverage, 
      season
    );

    // Best and worst games
    const bestGame = Math.max(...gamePerformances.map(g => g.points), 0);
    const worstGame = gamePerformances.length > 0 
      ? Math.min(...gamePerformances.map(g => g.points))
      : 0;

    // Boom/Bust rate (games above 1.5x average vs below 0.5x average)
    const boomGames = gamePerformances.filter(g => g.points > seasonAverage * 1.5).length;
    const bustGames = gamePerformances.filter(g => g.points < seasonAverage * 0.5).length;
    const boomRate = gamesPlayed > 0 ? (boomGames / gamesPlayed) * 100 : 0;
    const bustRate = gamesPlayed > 0 ? (bustGames / gamesPlayed) * 100 : 0;

    // Trending summary text
    let trendingSummary = '';
    if (trendDirection === 'up') {
      trendingSummary = `📈 Trending UP - Averaging ${recentAverage.toFixed(1)} pts over last ${recentGames.length} games (up from ${seasonAverage.toFixed(1)} season avg)`;
    } else if (trendDirection === 'down') {
      trendingSummary = `📉 Trending DOWN - Averaging ${recentAverage.toFixed(1)} pts over last ${recentGames.length} games (down from ${seasonAverage.toFixed(1)} season avg)`;
    } else {
      trendingSummary = `➡️ Stable - Consistent at ${seasonAverage.toFixed(1)} pts per game`;
    }

    return NextResponse.json({
      success: true,
      playerId,
      playerName: `${player.first_name} ${player.last_name}`,
      position: player.position,
      season,
      trending: {
        direction: trendDirection,
        strength: Math.round(trendStrength),
        summary: trendingSummary,
        indicator: trendDirection === 'up' ? '🔥' : trendDirection === 'down' ? '❄️' : '⚡'
      },
      seasonStats: {
        gamesPlayed,
        gamesRemaining,
        totalPoints: Math.round(seasonPoints * 10) / 10,
        averagePoints: Math.round(seasonAverage * 10) / 10,
        bestGame: Math.round(bestGame * 10) / 10,
        worstGame: Math.round(worstGame * 10) / 10,
        consistencyScore: Math.round(consistencyScore)
      },
      recentPerformance: {
        lastThreeAverage: Math.round(lastThreeAverage * 10) / 10,
        lastFiveAverage: Math.round(recentAverage * 10) / 10,
        recentGames: recentGames.length,
        improvementVsSeasonAvg: Math.round((recentAverage - seasonAverage) * 10) / 10
      },
      projections: {
        projectedTotalPoints: Math.round(projectedTotalPoints * 10) / 10,
        projectedSeasonAverage: Math.round(projectedSeasonAverage * 10) / 10,
        gamesRemaining
      },
      analytics: {
        boomGames,
        bustGames,
        boomRate: Math.round(boomRate),
        bustRate: Math.round(bustRate),
        consistencyScore: Math.round(consistencyScore)
      },
      injuryStatus,
      positionRank
    });

  } catch (error) {
    console.error('Error calculating trending:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
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

// Get injury status (would integrate with real API)
async function getInjuryStatus(externalId: string): Promise<{
  status: 'healthy' | 'questionable' | 'doubtful' | 'out' | 'ir';
  injury?: string;
  returnDate?: string;
}> {
  // TODO: Integrate with BallDontLie injury API
  // For now, return healthy
  return {
    status: 'healthy'
  };
}

// Calculate position rank
async function calculatePositionRank(
  playerId: string,
  position: string,
  avgPoints: number,
  season: number
): Promise<{
  rank: number;
  total: number;
  percentile: number;
}> {
  try {
    // Get all players at this position with their averages
    const { data: positionStats } = await supabaseAdmin
      .from('player_game_stats')
      .select(`
        player_id,
        stat_json
      `)
      .gte('game_date', `${season}-01-01`)
      .lte('game_date', `${season}-12-31`);

    if (!positionStats) {
      return { rank: 0, total: 0, percentile: 0 };
    }

    // Group by player and calculate averages
    const playerAverages = new Map<string, number[]>();
    
    positionStats.forEach(stat => {
      const fp = calculateFantasyPoints(stat.stat_json, position);
      if (fp > 0) {
        if (!playerAverages.has(stat.player_id)) {
          playerAverages.set(stat.player_id, []);
        }
        playerAverages.get(stat.player_id)!.push(fp);
      }
    });

    // Calculate averages and sort
    const averages = Array.from(playerAverages.entries())
      .map(([pid, points]) => ({
        playerId: pid,
        avg: points.reduce((sum, p) => sum + p, 0) / points.length,
        games: points.length
      }))
      .filter(p => p.games >= 3) // At least 3 games played
      .sort((a, b) => b.avg - a.avg);

    const rank = averages.findIndex(p => p.playerId === playerId) + 1;
    const total = averages.length;
    const percentile = total > 0 ? ((total - rank + 1) / total) * 100 : 0;

    return {
      rank: rank || 0,
      total,
      percentile: Math.round(percentile)
    };
  } catch (error) {
    console.error('Error calculating position rank:', error);
    return { rank: 0, total: 0, percentile: 0 };
  }
}

