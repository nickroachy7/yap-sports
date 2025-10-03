import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ playerId: string }> }
) {
  try {
    const { playerId } = await params;
    const searchParams = req.nextUrl.searchParams;
    const requestedSeason = searchParams.get('season') ? parseInt(searchParams.get('season')!) : 2025;
    
    if (!playerId) {
      return NextResponse.json({ 
        error: 'Player ID is required' 
      }, { status: 400 });
    }

    console.log(`Fetching game log for player: ${playerId}, season: ${requestedSeason}`);

    // Get the requested season
    const { data: currentSeason, error: seasonError } = await supabaseAdmin
      .from('seasons')
      .select('id, year')
      .eq('year', requestedSeason)
      .eq('league', 'NFL')
      .single();

    if (seasonError) {
      console.error('Error fetching season:', seasonError);
      return NextResponse.json({ 
        error: 'Failed to fetch current season',
        details: seasonError.message 
      }, { status: 500 });
    }

    // Get all weeks for the current season
    const { data: weeks, error: weeksError } = await supabaseAdmin
      .from('weeks')
      .select('id, week_number, start_at, lock_at, end_at, status')
      .eq('season_id', currentSeason.id)
      .order('week_number', { ascending: true });

    if (weeksError) {
      console.error('Error fetching weeks:', weeksError);
      return NextResponse.json({ 
        error: 'Failed to fetch weeks',
        details: weeksError.message 
      }, { status: 500 });
    }

    console.log(`Found ${weeks.length} weeks for season ${currentSeason.year}`);

    // For each week, get the player's game data
    const gameLogEntries = [];

    for (const week of weeks) {
      // Get sports_events for this week that involve teams
      const { data: games, error: gamesError } = await supabaseAdmin
        .from('sports_events')
        .select(`
          id,
          external_game_id,
          home_team,
          away_team,
          starts_at,
          status,
          week_number,
          home_team_id,
          away_team_id
        `)
        .eq('week_id', week.id);

      if (gamesError) {
        console.error(`Error fetching games for week ${week.week_number}:`, gamesError);
        continue;
      }

      // Get player info to determine their team
      const { data: player, error: playerError } = await supabaseAdmin
        .from('players')
        .select('team, team_id, first_name, last_name')
        .eq('id', playerId)
        .single();

      if (playerError) {
        console.error('Error fetching player:', playerError);
        continue;
      }

      // Find games where this player's team is playing
      const playerGames = games.filter(game => 
        game.home_team === player.team || 
        game.away_team === player.team ||
        (player.team_id && (game.home_team_id === player.team_id || game.away_team_id === player.team_id))
      );

      for (const game of playerGames) {
        // Determine opponent and home/away status
        const isHome = game.home_team === player.team || game.home_team_id === player.team_id;
        const opponent = isHome ? game.away_team : game.home_team;

        // Get player stats for this game if they exist
        const { data: stats, error: statsError } = await supabaseAdmin
          .from('player_game_stats')
          .select('stat_json, finalized')
          .eq('player_id', playerId)
          .eq('sports_event_id', game.id)
          .single();

        // Calculate game status
        const gameDate = new Date(game.starts_at);
        const now = new Date();
        let gameStatus: 'upcoming' | 'live' | 'completed' = 'upcoming';
        
        if (game.status === 'final') {
          gameStatus = 'completed';
        } else if (game.status === 'live' || game.status === 'in_progress') {
          gameStatus = 'live';
        } else if (gameDate < now) {
          gameStatus = 'completed';
        }

        // Extract stats if available
        let playerStats = undefined;
        let actualPoints = undefined;

        if (stats && stats.stat_json) {
          const statJson = stats.stat_json;
          playerStats = {
            snp: statJson.snap_percentage || 0,
            tar: statJson.receiving_targets || 0, // Fixed: was 'targets', now 'receiving_targets'
            rec: statJson.receptions || 0, // Fixed: API uses 'receptions', not 'receiving_receptions'
            yd: statJson.receiving_yards || statJson.rushing_yards || statJson.passing_yards || 0,
            ypt: statJson.yards_per_reception || 0, // Fixed: was 'yards_per_target'
            ypc: statJson.yards_per_reception || 0, // Fixed: was 'yards_per_catch'
            td: statJson.receiving_touchdowns || statJson.rushing_touchdowns || statJson.passing_touchdowns || 0,
            fum: statJson.fumbles || 0,
            lost: statJson.fumbles_lost || 0
          };
          
          actualPoints = statJson.fantasy_points || 0;
        }

        gameLogEntries.push({
          id: `${game.id}-${playerId}`,
          week: week.week_number,
          opponent: opponent || 'TBD',
          date: game.starts_at.split('T')[0], // YYYY-MM-DD format
          time: new Date(game.starts_at).toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
          }),
          projection: generateProjection(player, opponent), // Generate based on matchup
          actualPoints,
          isHome,
          gameStatus,
          playerStats
        });
      }
    }

    // Sort by week number
    gameLogEntries.sort((a, b) => a.week - b.week);

    console.log(`Generated ${gameLogEntries.length} game log entries for player ${playerId}`);

    // Get player info for the response
    const { data: playerInfo, error: playerInfoError } = await supabaseAdmin
      .from('players')
      .select('first_name, last_name')
      .eq('id', playerId)
      .single();

    // Get available seasons for this player
    const { data: availableSeasons } = await supabaseAdmin
      .from('player_game_stats')
      .select('game_date')
      .eq('player_id', playerId)
      .order('game_date', { ascending: false });

    const seasonsWithData = new Set<number>();
    availableSeasons?.forEach(stat => {
      if (stat.game_date) {
        const year = new Date(stat.game_date).getFullYear();
        seasonsWithData.add(year);
      }
    });

    return NextResponse.json({
      success: true,
      playerId,
      playerName: playerInfo ? `${playerInfo.first_name} ${playerInfo.last_name}` : 'Unknown Player',
      season: currentSeason.year,
      gameLogEntries,
      availableSeasons: Array.from(seasonsWithData).sort((a, b) => b - a)
    });

  } catch (err: any) {
    console.error('Game log fetch error:', err);
    return NextResponse.json({ 
      error: err?.message || 'Unknown error',
      details: err?.stack
    }, { status: 500 });
  }
}

// Helper function to generate projections based on player position and opponent
function generateProjection(player: any, opponent: string): number {
  let baseProjection = 10;
  
  // Base projection by position
  switch (player.team) {
    case 'QB':
      baseProjection = 18;
      break;
    case 'RB':
      baseProjection = 12;
      break;
    case 'WR':
      baseProjection = 14;
      break;
    case 'TE':
      baseProjection = 9;
      break;
    default:
      baseProjection = 10;
  }
  
  // Add some variance based on opponent (in reality, this would be more sophisticated)
  const variance = Math.random() * 4 - 2; // +/- 2 points
  return Math.max(0, baseProjection + variance);
}
