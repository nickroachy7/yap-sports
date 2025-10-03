import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * Get Season Stats for All Active Players
 * 
 * Aggregates stats from player_game_stats for the 2025 season
 * Returns summary stats for each player (total yards, TDs, fantasy points, etc.)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const season = parseInt(searchParams.get('season') || '2025');
    
    console.log(`📊 Aggregating season stats for ${season}...`);

    // Fetch players first
    const playersResult = await supabaseAdmin
      .from('players')
      .select('id, position')
      .eq('active', true);
    
    if (playersResult.error) throw playersResult.error;
    const allPlayers = playersResult.data || [];
    
    // Fetch stats with pagination to bypass 1000-row limit
    let allStats: any[] = []
    let from = 0
    const batchSize = 1000
    let hasMore = true
    
    while (hasMore) {
      const statsResult = await supabaseAdmin
        .from('player_game_stats')
        .select(`
          player_id,
          stat_json,
          finalized,
          sports_event_id,
          sports_event:sports_events!inner (
            id,
            starts_at,
            status
          )
        `)
        .gte('sports_event.starts_at', `${season}-08-01`)
        .lte('sports_event.starts_at', `${season + 1}-02-28`)
        .range(from, from + batchSize - 1);
      
      if (statsResult.error) throw statsResult.error;
      
      if (statsResult.data && statsResult.data.length > 0) {
        allStats = allStats.concat(statsResult.data)
        from += batchSize
        hasMore = statsResult.data.length === batchSize
      } else {
        hasMore = false
      }
    }
    
    // Create position lookup map
    const playerPositionMap = new Map<string, string>();
    allPlayers.forEach(p => {
      playerPositionMap.set(p.id, p.position);
    });

    console.log(`Found ${allStats?.length || 0} stat records for ${season} season`);

    // Group stats by player (using same approach as quick-data endpoint)
    const playerStatsMap = new Map<string, any[]>();

    (allStats || []).forEach(stat => {
      const playerId = stat.player_id;
      if (!playerId || !stat.stat_json) return;

      if (!playerStatsMap.has(playerId)) {
        playerStatsMap.set(playerId, []);
      }
      playerStatsMap.get(playerId).push(stat);
    });

    // Calculate season stats using SAME logic as quick-data endpoint
    const aggregatedStats = Array.from(playerStatsMap.entries()).map(([playerId, playerStats]) => {
      // Extract stat_json from each game
      const statJsons = playerStats.map(s => s.stat_json).filter(Boolean);
      
      // Calculate fantasy points (same as quick-data)
      const points = statJsons.map(s => s.fantasy_points || calculateFantasyPoints(s));
      const totalPoints = Math.round(points.reduce((sum, p) => sum + p, 0) * 10) / 10;
      const gamesPlayed = points.length;
      const avgPoints = gamesPlayed > 0 ? Math.round((totalPoints / gamesPlayed) * 10) / 10 : 0;
      
      // Sum up stats using same helper function as quick-data
      const sum = (field: string) => Math.round(statJsons.reduce((sum, s) => sum + (s[field] || 0), 0));
      
      // Calculate passing stats
      const passingYards = sum('passing_yards');
      const passingTDs = sum('passing_touchdowns');
      const passingInts = sum('passing_interceptions');
      
      // Calculate rushing stats
      const rushingYards = sum('rushing_yards');
      const rushingTDs = sum('rushing_touchdowns');
      const rushingAttempts = sum('rushing_attempts');
      const yardsPerCarry = rushingAttempts > 0 
        ? Math.round((rushingYards / rushingAttempts) * 10) / 10 
        : 0;
      
      // Calculate receiving stats (handle both field names like quick-data)
      const receptions = sum('receptions') + sum('receiving_receptions');
      const receivingYards = sum('receiving_yards');
      const receivingTDs = sum('receiving_touchdowns');
      const targets = sum('receiving_targets');
      const catchPct = targets > 0 ? Math.round((receptions / targets) * 100) : 0;
      const yardsPerReception = receptions > 0 
        ? Math.round((receivingYards / receptions) * 10) / 10 
        : 0;
      
      return {
        player_id: playerId,
        position: playerPositionMap.get(playerId) || 'Unknown',
        games_played: gamesPlayed,
        total_fantasy_points: totalPoints,
        avg_fantasy_points: avgPoints,
        
        // Passing stats
        passing_yards: passingYards,
        passing_tds: passingTDs,
        passing_ints: passingInts,
        
        // Rushing stats
        rushing_yards: rushingYards,
        rushing_tds: rushingTDs,
        rushing_attempts: rushingAttempts,
        yards_per_carry: yardsPerCarry,
        
        // Receiving stats
        receiving_yards: receivingYards,
        receiving_tds: receivingTDs,
        receptions: receptions,
        targets: targets,
        catch_pct: catchPct,
        yards_per_reception: yardsPerReception,
        
        // Other
        fumbles_lost: sum('fumbles_lost')
      };
    });

    console.log(`✅ Aggregated stats for ${aggregatedStats.length} players`);

    // Calculate position ranks based on total fantasy points
    const statsWithRanks = calculatePositionRanks(aggregatedStats);

    return NextResponse.json({
      success: true,
      season,
      player_count: statsWithRanks.length,
      stats: statsWithRanks,
      cached_at: new Date().toISOString()
    });

  } catch (err: any) {
    console.error('Season stats aggregation error:', err);
    return NextResponse.json({ 
      success: false,
      error: err.message,
      details: err.stack
    }, { status: 500 });
  }
}

// Calculate position ranks based on total fantasy points
function calculatePositionRanks(stats: any[]): any[] {
  // Normalize position names
  const normalizePosition = (pos: string): string => {
    const p = pos.toUpperCase().trim();
    if (p.includes('QUARTERBACK') || p === 'QB') return 'QB';
    if (p.includes('RUNNING') || p === 'RB') return 'RB';
    if (p.includes('WIDE') || p.includes('RECEIVER') || p === 'WR') return 'WR';
    if (p.includes('TIGHT') || p === 'TE') return 'TE';
    if (p.includes('KICKER') || p === 'K') return 'K';
    if (p.includes('DEFENSE') || p.includes('DEF')) return 'DEF';
    return p;
  };

  // Group players by normalized position
  const playersByPosition = new Map<string, any[]>();
  
  stats.forEach(player => {
    const normalizedPos = normalizePosition(player.position);
    if (!playersByPosition.has(normalizedPos)) {
      playersByPosition.set(normalizedPos, []);
    }
    playersByPosition.get(normalizedPos)!.push(player);
  });

  // Sort each position group by fantasy points (descending) and assign ranks
  const rankedStats: any[] = [];
  
  playersByPosition.forEach((players, position) => {
    // Sort by total fantasy points (highest first)
    const sorted = players.sort((a, b) => b.total_fantasy_points - a.total_fantasy_points);
    
    // Assign ranks
    sorted.forEach((player, index) => {
      rankedStats.push({
        ...player,
        position_rank: index + 1,
        total_in_position: sorted.length
      });
    });
  });

  return rankedStats;
}

// Calculate fantasy points using SAME scoring as quick-data endpoint
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

