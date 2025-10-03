import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * Ultra-fast player data endpoint - NO external API calls, optimized queries
 * Returns: player profile, season stats, game log, next game
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ playerId: string }> }
) {
  try {
    const { playerId } = await params;
    
    if (!playerId) {
      return NextResponse.json({ 
        error: 'Player ID is required' 
      }, { status: 400 });
    }

    // Get current season year (2025 for now)
    const currentSeasonYear = 2025;
    const currentDate = new Date().toISOString();

    // Execute all queries in PARALLEL for maximum speed
    const [
      playerResult,
      statsResult,
      seasonResult,
      allGamesResult,
      trendingResult
    ] = await Promise.all([
      // 1. Get player profile
      supabaseAdmin
        .from('players')
        .select('id, first_name, last_name, position, team, team_id, jersey_number, height, weight, age, college, years_pro, external_id')
        .eq('id', playerId)
        .single(),

      // 2. Get all game stats for this player
      supabaseAdmin
        .from('player_game_stats')
        .select(`
          id,
          stat_json,
          finalized,
          sports_event_id,
          sports_event:sports_events (
            id,
            home_team,
            away_team,
            starts_at,
            status,
            week_number
          )
        `)
        .eq('player_id', playerId),

      // 3. Get current season info
      supabaseAdmin
        .from('seasons')
        .select('id, year')
        .eq('year', currentSeasonYear)
        .eq('league', 'NFL')
        .single(),

      // 4. Get ALL sports events for the 2025 season (we'll filter by team after)
      supabaseAdmin
        .from('sports_events')
        .select('id, home_team, away_team, home_team_id, away_team_id, starts_at, status, week_number, week_id')
        .gte('starts_at', `${currentSeasonYear}-08-01`)
        .lte('starts_at', `${currentSeasonYear + 1}-02-28`)
        .order('starts_at', { ascending: true }),

      // 5. Get trending data from cache
      supabaseAdmin
        .from('player_trending_cache')
        .select('trend_direction, trend_strength, season_avg, last_3_avg, games_played')
        .eq('player_id', playerId)
        .eq('season_year', currentSeasonYear)
        .single()
    ]);

    if (playerResult.error || !playerResult.data) {
      return NextResponse.json({ 
        error: 'Player not found',
        details: playerResult.error?.message 
      }, { status: 404 });
    }

    const player = playerResult.data;
    const allStatsRaw = statsResult.data || [];
    const allGames = allGamesResult.data || [];
    const trendingData = trendingResult.data || null;
    
    // Fetch position rank and projected points from season-stats API
    let position_rank = null;
    let projected_points = null;
    try {
      const seasonStatsResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/players/season-stats?season=${currentSeasonYear}`);
      if (seasonStatsResponse.ok) {
        const seasonStatsData = await seasonStatsResponse.json();
        const playerSeasonStats = seasonStatsData.stats?.find((s: any) => s.player_id === playerId);
        if (playerSeasonStats) {
          position_rank = playerSeasonStats.position_rank;
          projected_points = playerSeasonStats.avg_fantasy_points; // Use avg as projection
        }
      }
    } catch (err) {
      console.log('Could not fetch season stats:', err);
    }
    
    // Format trending data
    let trending = null;
    if (trendingData) {
      trending = {
        direction: trendingData.trend_direction,
        strength: trendingData.trend_strength,
        display: trendingData.trend_direction === 'up' 
          ? `📈 +${Math.abs(trendingData.trend_strength)}%`
          : trendingData.trend_direction === 'down'
          ? `📉 ${trendingData.trend_strength}%`
          : '—'
      };
    }

    // Filter games to ONLY those where this player's team is playing
    const teamGames = allGames.filter(game => {
      // Match by team abbreviation OR team_id
      const matchesHome = game.home_team === player.team || (player.team_id && game.home_team_id === player.team_id);
      const matchesAway = game.away_team === player.team || (player.team_id && game.away_team_id === player.team_id);
      return matchesHome || matchesAway;
    });

    console.log(`Found ${teamGames.length} team games for ${player.team} in ${currentSeasonYear} season`);

    // Create a map of player stats by game ID for quick lookup
    const statsByGameId = new Map();
    allStatsRaw.forEach(stat => {
      const gameId = stat.sports_event_id;
      if (gameId) {
        statsByGameId.set(gameId, stat);
      }
    });

    // Get stats only for games where player actually played (for season stats calculation)
    const gamesWithStats = allStatsRaw.filter(stat => {
      const game = Array.isArray(stat.sports_event) ? stat.sports_event[0] : stat.sports_event;
      return game && game.starts_at;
    });

    console.log(`Player has stats for ${gamesWithStats.length} games`);

    // Calculate season stats from games where player has stats
    const seasonStats = calculateSeasonStats(gamesWithStats, player.position);

    // Find next upcoming game for this player's team
    const now = new Date();
    const upcomingTeamGames = teamGames.filter(game => new Date(game.starts_at) > now);
    const nextGame = upcomingTeamGames.length > 0 ? upcomingTeamGames[0] : null;

    let nextMatchup = null;
    if (nextGame) {
      const isHome = nextGame.home_team === player.team || nextGame.home_team_id === player.team_id;
      const opponent = isHome ? nextGame.away_team : nextGame.home_team;
      const gameDate = new Date(nextGame.starts_at);
      
      nextMatchup = {
        opponent: opponent || 'TBD',
        date: gameDate.toISOString().split('T')[0],
        time: gameDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
        is_home: isHome,
        opponent_rank_vs_position: Math.floor(Math.random() * 20) + 10, // TODO: Calculate from defensive stats
        projected_points: projected_points || seasonStats.avg_points_per_game || 0
      };
    }

    // Build FULL game log - ALL team games, showing stats when available or DNP/Upcoming when not
    const gameLog = teamGames.map(game => {
      const isHome = game.home_team === player.team || game.home_team_id === player.team_id;
      const opponent = isHome ? game.away_team : game.home_team;
      const gameDate = new Date(game.starts_at);

      // Determine game status
      let gameStatus: 'upcoming' | 'live' | 'completed' = 'upcoming';
      if (game.status === 'final') {
        gameStatus = 'completed';
      } else if (game.status === 'live' || game.status === 'in_progress') {
        gameStatus = 'live';
      } else if (gameDate < now) {
        gameStatus = 'completed';
      }

      // Check if player has stats for this game
      const playerStat = statsByGameId.get(game.id);
      
      let actualPoints = undefined;
      let playerStats = null;
      let didNotPlay = false;

      if (playerStat && playerStat.stat_json) {
        // Player has stats for this game
        actualPoints = playerStat.stat_json.fantasy_points || calculateFantasyPoints(playerStat.stat_json);
        playerStats = extractPositionStats(playerStat.stat_json, player.position);
      } else if (gameStatus === 'completed') {
        // Game is completed but player has no stats = DNP (Did Not Play)
        didNotPlay = true;
        actualPoints = 0;
      }
      // else: upcoming game, no stats expected

      return {
        id: `${game.id}-${player.id}`,
        week: game.week_number || 0,
        opponent: opponent || 'TBD',
        date: game.starts_at.split('T')[0],
        time: gameDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
        projection: seasonStats.avg_points_per_game || 0,
        actualPoints,
        isHome,
        gameStatus,
        playerStats,
        didNotPlay // Flag to indicate DNP vs upcoming
      };
    }).sort((a, b) => a.week - b.week); // Sort by week ascending

    // Return everything in one response
    return NextResponse.json({
      success: true,
      season: currentSeasonYear,
      player: {
        id: player.id,
        name: `${player.first_name} ${player.last_name}`,
        position: player.position,
        team: player.team,
        jersey_number: player.jersey_number || null,
        height: player.height || null,
        weight: player.weight ? `${player.weight} lbs` : null,
        age: player.age || null,
        college: player.college || null,
        years_pro: player.years_pro || null,
        position_rank: position_rank,
        projected_points: projected_points,
        trending: trending,
        stats: seasonStats,
        nextMatchup
      },
      gameLog,
      summary: {
        total_games: gameLog.length,
        completed_games: gameLog.filter(g => g.gameStatus === 'completed').length,
        games_played: gameLog.filter(g => g.gameStatus === 'completed' && !g.didNotPlay).length,
        dnp_games: gameLog.filter(g => g.didNotPlay).length,
        upcoming_games: gameLog.filter(g => g.gameStatus === 'upcoming').length
      }
    });

  } catch (err: any) {
    console.error('Quick data fetch error:', err);
    return NextResponse.json({ 
      error: err?.message || 'Unknown error',
      details: err?.stack
    }, { status: 500 });
  }
}

// Helper to normalize position names (handles "Quarterback" or "QB")
function normalizePosition(position: string): string {
  const pos = position.toUpperCase();
  if (pos.includes('QUARTERBACK') || pos === 'QB') return 'QB';
  if (pos.includes('RUNNING') || pos === 'RB') return 'RB';
  if (pos.includes('WIDE') || pos.includes('RECEIVER') || pos === 'WR') return 'WR';
  if (pos.includes('TIGHT') || pos === 'TE') return 'TE';
  return position; // Return original if no match
}

function calculateSeasonStats(stats: any[], position: string) {
  if (!stats || stats.length === 0) {
    return {
      total_fantasy_points: 0,
      games_played: 0,
      avg_points_per_game: 0,
      best_game: 0,
      worst_game: 0,
      consistency_score: 0,
      last_5_games_avg: 0,
      // Position-specific stats
      position_stats: getEmptyPositionStats(position)
    };
  }

  // Calculate fantasy points (use stored value or calculate on-the-fly)
  const points = stats.map(stat => stat.stat_json?.fantasy_points || calculateFantasyPoints(stat.stat_json));
  const totalPoints = Math.round(points.reduce((sum, p) => sum + p, 0));
  const gamesPlayed = points.length;
  const avgPoints = totalPoints / gamesPlayed;

  const last5Points = points.slice(0, Math.min(5, points.length));
  const last5Avg = last5Points.reduce((sum, p) => sum + p, 0) / last5Points.length;

  // Calculate consistency (lower std dev = higher consistency)
  const variance = points.reduce((sum, p) => sum + Math.pow(p - avgPoints, 2), 0) / points.length;
  const stdDev = Math.sqrt(variance);
  const consistency = Math.max(0, Math.min(100, 100 - (stdDev * 5)));

  // Calculate position-specific stats
  const positionStats = calculatePositionStats(stats, position);

  return {
    total_fantasy_points: totalPoints,
    games_played: gamesPlayed,
    avg_points_per_game: Math.round(avgPoints * 10) / 10,
    best_game: Math.round(Math.max(...points)),
    worst_game: Math.round(Math.min(...points)),
    consistency_score: Math.round(consistency),
    last_5_games_avg: Math.round(last5Avg * 10) / 10,
    position_stats: positionStats
  };
}

function calculatePositionStats(stats: any[], position: string) {
  const allStats = stats.map(s => s.stat_json).filter(Boolean);
  
  // Normalize position to handle both "QB" and "Quarterback" formats
  const normalizedPosition = normalizePosition(position);
  
  switch (normalizedPosition) {
    case 'QB':
      const qbComp = sum(allStats, 'passing_completions');
      const qbAtt = sum(allStats, 'passing_attempts');
      const qbYds = sum(allStats, 'passing_yards');
      const qbTDs = sum(allStats, 'passing_touchdowns');
      const qbINTs = sum(allStats, 'passing_interceptions');
      const qbCompPct = qbAtt > 0 ? Math.round((qbComp / qbAtt) * 1000) / 10 : 0;
      const qbYPA = qbAtt > 0 ? Math.round((qbYds / qbAtt) * 10) / 10 : 0;
      
      return {
        passing_yards: qbYds,
        passing_tds: qbTDs,
        passing_ints: qbINTs,
        completions: qbComp,
        attempts: qbAtt,
        completion_pct: qbCompPct,
        yards_per_attempt: qbYPA,
        qb_rating: calculateAvg(allStats, 'qb_rating') || 
                   calculateQBRating(qbComp, qbAtt, qbYds, qbTDs, qbINTs)
      };
    
    case 'RB':
      const rbRushYards = sum(allStats, 'rushing_yards');
      const rbRushAttempts = sum(allStats, 'rushing_attempts');
      const rbYPC = rbRushAttempts > 0 ? Math.round((rbRushYards / rbRushAttempts) * 10) / 10 : 0;
      const rbReceptions = sum(allStats, 'receiving_receptions') || sum(allStats, 'receptions');
      const rbRecYards = sum(allStats, 'receiving_yards');
      const rbYPR = rbReceptions > 0 ? Math.round((rbRecYards / rbReceptions) * 10) / 10 : 0;
      
      return {
        rushing_yards: rbRushYards,
        rushing_tds: sum(allStats, 'rushing_touchdowns'),
        rushing_attempts: rbRushAttempts,
        yards_per_carry: rbYPC,
        receptions: rbReceptions,
        receiving_yards: rbRecYards,
        yards_per_reception: rbYPR,
        receiving_tds: sum(allStats, 'receiving_touchdowns'),
        targets: sum(allStats, 'receiving_targets')
      };
    
    case 'WR':
    case 'TE':
      const wrReceptions = sum(allStats, 'receiving_receptions') || sum(allStats, 'receptions');
      const wrRecYards = sum(allStats, 'receiving_yards');
      const wrYPR = wrReceptions > 0 ? Math.round((wrRecYards / wrReceptions) * 10) / 10 : 0;
      
      return {
        receptions: wrReceptions,
        receiving_yards: wrRecYards,
        receiving_tds: sum(allStats, 'receiving_touchdowns'),
        targets: sum(allStats, 'receiving_targets'),
        yards_per_reception: wrYPR,
        catch_pct: calculateCatchPercentage(allStats),
        longest_reception: max(allStats, 'longest_reception')
      };
    
    default:
      return {};
  }
}

function extractPositionStats(statJson: any, position: string) {
  if (!statJson) return null;

  // Normalize position to handle both "QB" and "Quarterback" formats
  const normalizedPosition = normalizePosition(position);

  switch (normalizedPosition) {
    case 'QB':
      // Calculate derived stats
      const comp = statJson.passing_completions || 0;
      const att = statJson.passing_attempts || 0;
      const yds = statJson.passing_yards || 0;
      const pct = att > 0 ? Math.round((comp / att) * 100) : 0;
      const ypa = att > 0 ? Math.round((yds / att) * 10) / 10 : 0;
      
      return {
        snp: statJson.snap_percentage || 0,
        cmp: comp,
        att: att,
        pct: pct,
        yds: yds,
        ypa: ypa,
        td: statJson.passing_touchdowns || 0,
        int: statJson.passing_interceptions || 0,
        rating: statJson.qb_rating || calculateQBRating(comp, att, yds, statJson.passing_touchdowns || 0, statJson.passing_interceptions || 0)
      };
    
    case 'RB':
      // Calculate derived stats for RB
      const rushAtt = statJson.rushing_attempts || 0;
      const rushYds = statJson.rushing_yards || 0;
      const ypc = rushAtt > 0 ? Math.round((rushYds / rushAtt) * 10) / 10 : 0;
      const recYds = statJson.receiving_yards || 0;
      const rec = statJson.receiving_receptions || statJson.receptions || 0;
      const recYpr = rec > 0 ? Math.round((recYds / rec) * 10) / 10 : 0;
      
      return {
        snp: statJson.snap_percentage || 0,
        car: rushAtt,
        yds: rushYds,
        ypc: ypc,
        td: statJson.rushing_touchdowns || 0,
        tar: statJson.receiving_targets || 0,
        rec: rec,
        rec_yds: recYds,
        rec_ypr: recYpr,
        rec_td: statJson.receiving_touchdowns || 0
      };
    
    case 'WR':
    case 'TE':
      // Calculate derived stats for WR/TE
      const recWR = statJson.receiving_receptions || statJson.receptions || 0;
      const recYdsWR = statJson.receiving_yards || 0;
      const ypr = recWR > 0 ? Math.round((recYdsWR / recWR) * 10) / 10 : 0;
      
      return {
        snp: statJson.snap_percentage || 0,
        tar: statJson.receiving_targets || 0,
        rec: recWR,
        yds: recYdsWR,
        ypr: ypr,
        td: statJson.receiving_touchdowns || 0,
        lng: statJson.longest_reception || 0,
        fum: statJson.fumbles || 0
      };
    
    default:
      return null;
  }
}

function getEmptyPositionStats(position: string) {
  const normalizedPosition = normalizePosition(position);
  
  switch (normalizedPosition) {
    case 'QB':
      return {
        passing_yards: 0,
        passing_tds: 0,
        passing_ints: 0,
        completions: 0,
        attempts: 0,
        completion_pct: 0,
        yards_per_attempt: 0,
        qb_rating: 0
      };
    case 'RB':
      return {
        rushing_yards: 0,
        rushing_tds: 0,
        rushing_attempts: 0,
        yards_per_carry: 0,
        receptions: 0,
        receiving_yards: 0,
        receiving_tds: 0,
        targets: 0
      };
    case 'WR':
    case 'TE':
      return {
        receptions: 0,
        receiving_yards: 0,
        receiving_tds: 0,
        targets: 0,
        yards_per_reception: 0,
        catch_pct: 0,
        longest_reception: 0
      };
    default:
      return {};
  }
}

function sum(stats: any[], field: string): number {
  // Special handling for receptions field (API uses "receptions", sync uses "receiving_receptions")
  if (field === 'receptions' || field === 'receiving_receptions') {
    return Math.round(stats.reduce((sum, stat) => 
      sum + (stat['receptions'] || stat['receiving_receptions'] || 0), 0));
  }
  return Math.round(stats.reduce((sum, stat) => sum + (stat[field] || 0), 0));
}

function max(stats: any[], field: string): number {
  return Math.max(...stats.map(s => s[field] || 0));
}

function calculateAvg(stats: any[], field: string): number {
  if (stats.length === 0) return 0;
  const total = stats.reduce((sum, stat) => sum + (stat[field] || 0), 0);
  return Math.round((total / stats.length) * 10) / 10;
}

function calculateCatchPercentage(stats: any[]): number {
  const totalTargets = sum(stats, 'receiving_targets');
  const totalReceptions = sum(stats, 'receiving_receptions') || sum(stats, 'receptions');
  if (totalTargets === 0) return 0;
  return Math.round((totalReceptions / totalTargets) * 100);
}

// Calculate fantasy points using standard scoring
function calculateFantasyPoints(statJson: any): number {
  if (!statJson) return 0;
  
  const passingYards = statJson.passing_yards || 0;
  const passingTDs = statJson.passing_touchdowns || 0;
  const passingInts = statJson.passing_interceptions || 0;
  const rushingYards = statJson.rushing_yards || 0;
  const rushingTDs = statJson.rushing_touchdowns || 0;
  const receivingYards = statJson.receiving_yards || 0;
  const receivingTDs = statJson.receiving_touchdowns || 0;
  const receptions = statJson.receiving_receptions || statJson.receptions || 0;
  const fumblesLost = statJson.fumbles_lost || 0;
  
  const points = (
    passingYards * 0.04 +
    passingTDs * 4 +
    passingInts * -2 +
    rushingYards * 0.1 +
    rushingTDs * 6 +
    receivingYards * 0.1 +
    receivingTDs * 6 +
    receptions * 1 +
    fumblesLost * -2
  );
  
  return Math.round(points * 10) / 10;
}

// Calculate QB Rating (simplified NFL passer rating)
function calculateQBRating(comp: number, att: number, yds: number, tds: number, ints: number): number {
  if (att === 0) return 0;
  
  // NFL passer rating formula (simplified)
  const a = Math.max(0, Math.min(2.375, ((comp / att) - 0.3) * 5));
  const b = Math.max(0, Math.min(2.375, ((yds / att) - 3) * 0.25));
  const c = Math.max(0, Math.min(2.375, (tds / att) * 20));
  const d = Math.max(0, Math.min(2.375, 2.375 - ((ints / att) * 25)));
  
  const rating = ((a + b + c + d) / 6) * 100;
  return Math.round(rating * 10) / 10;
}
