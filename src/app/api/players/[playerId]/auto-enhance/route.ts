import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { fetchNFLPlayers } from '@/lib/nflProvider';

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

    // Get the player from database
    const { data: playerData, error: playerError } = await supabaseAdmin
      .from('players')
      .select('*')
      .eq('id', playerId)
      .single();

    if (playerError || !playerData) {
      return NextResponse.json({ 
        error: 'Player not found' 
      }, { status: 404 });
    }

    // Get player stats from database
    const { data: gameStats } = await supabaseAdmin
      .from('player_game_stats')
      .select('stat_json, finalized')
      .eq('player_id', playerId)
      .eq('finalized', true)
      .order('game_date', { ascending: false });

    // Calculate real stats from game data
    let calculatedStats = {
      total_fantasy_points: 0,
      games_played: 0,
      avg_points_per_game: 0,
      best_game: 0,
      worst_game: 0,
      consistency_score: 75,
      last_5_games_avg: 0
    };

    if (gameStats && gameStats.length > 0) {
      const points = gameStats.map(stat => stat.stat_json?.fantasy_points || 0);
      calculatedStats.games_played = points.length;
      calculatedStats.total_fantasy_points = Math.round(points.reduce((sum, p) => sum + p, 0));
      calculatedStats.avg_points_per_game = calculatedStats.total_fantasy_points / calculatedStats.games_played;
      calculatedStats.best_game = Math.round(Math.max(...points));
      calculatedStats.worst_game = Math.round(Math.min(...points));
      
      const last5Points = points.slice(0, Math.min(5, points.length));
      calculatedStats.last_5_games_avg = last5Points.reduce((sum, p) => sum + p, 0) / last5Points.length;
      
      // Calculate consistency score (lower standard deviation = higher consistency)
      const mean = calculatedStats.avg_points_per_game;
      const variance = points.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / points.length;
      const stdDev = Math.sqrt(variance);
      calculatedStats.consistency_score = Math.max(0, Math.min(100, 100 - (stdDev * 5)));
    }

    // Get next matchup info (first upcoming game)
    const { data: nextGame } = await supabaseAdmin
      .from('sports_events')
      .select('external_game_id, home_team, away_team, starts_at, status, week_number')
      .or(`home_team.eq.${playerData.team},away_team.eq.${playerData.team}`)
      .eq('status', 'scheduled')
      .order('starts_at', { ascending: true })
      .limit(1)
      .single();

    let nextMatchup = null;
    if (nextGame) {
      const isHome = nextGame.home_team === playerData.team;
      const opponent = isHome ? nextGame.away_team : nextGame.home_team;
      const gameDate = new Date(nextGame.starts_at);
      
      nextMatchup = {
        opponent: opponent || 'TBD',
        date: gameDate.toISOString().split('T')[0],
        time: gameDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
        is_home: isHome,
        opponent_rank_vs_position: Math.floor(Math.random() * 20) + 10, // TODO: Calculate from actual defensive rankings
        projected_points: calculatedStats.avg_points_per_game || 0
      };
    }

    // Check if player already has enhanced data
    const hasEnhancedData = playerData.height && playerData.weight && playerData.college;
    
    if (hasEnhancedData) {
      // Return existing data immediately with real stats
      return NextResponse.json({
        success: true,
        player: {
          id: playerData.id,
          name: `${playerData.first_name} ${playerData.last_name}`,
          position: playerData.position,
          team: playerData.team,
          jersey_number: playerData.jersey_number || 'N/A',
          height: playerData.height || 'N/A',
          weight: playerData.weight || 'N/A',
          age: playerData.age || undefined,
          college: playerData.college || 'N/A',
          years_pro: playerData.years_pro || undefined,
          data_source: 'database',
          enhanced: true,
          stats: calculatedStats,
          nextMatchup: nextMatchup
        }
      });
    }

    // If no enhanced data, try to fetch and update in background
    console.log(`Auto-enhancing player data for: ${playerData.first_name} ${playerData.last_name}`);
    
    try {
      // Search Ball Don't Lie API
      const searchTerm = `${playerData.first_name} ${playerData.last_name}`;
      const apiResponse = await fetchNFLPlayers({
        search: searchTerm,
        per_page: 5
      });

      let enhancedData = null;
      if (apiResponse.data && apiResponse.data.length > 0) {
        // Find the best match
        const exactMatch = apiResponse.data.find(p => 
          p.first_name?.toLowerCase().trim() === playerData.first_name?.toLowerCase().trim() &&
          p.last_name?.toLowerCase().trim() === playerData.last_name?.toLowerCase().trim()
        );

        const bestMatch = exactMatch || apiResponse.data[0];
        
        if (bestMatch) {
          enhancedData = {
            height: bestMatch.height || null,
            weight: bestMatch.weight || null,
            college: bestMatch.college || null,
            jersey_number: bestMatch.jersey_number || null,
            years_pro: bestMatch.years_pro || null,
            age: bestMatch.age || null,
            external_id: bestMatch.id ? bestMatch.id.toString() : playerData.external_id
          };

          // Update database in background (don't wait for it)
          supabaseAdmin
            .from('players')
            .update(enhancedData)
            .eq('id', playerId)
            .then(({ error }) => {
              if (error) {
                console.error(`Background update failed for ${searchTerm}:`, error);
              } else {
                console.log(`✓ Auto-enhanced ${searchTerm} in background`);
              }
            });
        }
      }

      // Return immediately with best available data and real stats
      return NextResponse.json({
        success: true,
        player: {
          id: playerData.id,
          name: `${playerData.first_name} ${playerData.last_name}`,
          position: playerData.position,
          team: playerData.team,
          jersey_number: enhancedData?.jersey_number || 'N/A',
          height: enhancedData?.height || 'N/A',
          weight: enhancedData?.weight || 'N/A',
          age: enhancedData?.age || undefined,
          college: enhancedData?.college || 'N/A',
          years_pro: enhancedData?.years_pro || undefined,
          data_source: enhancedData ? 'api_fresh' : 'basic',
          enhanced: !!enhancedData,
          stats: calculatedStats,
          nextMatchup: nextMatchup
        }
      });

    } catch (apiError) {
      console.warn(`API fetch failed for ${playerData.first_name} ${playerData.last_name}:`, apiError);
      
      // Return basic data if API fails, but still include real stats
      return NextResponse.json({
        success: true,
        player: {
          id: playerData.id,
          name: `${playerData.first_name} ${playerData.last_name}`,
          position: playerData.position,
          team: playerData.team,
          jersey_number: 'N/A',
          height: 'N/A',
          weight: 'N/A',
          age: undefined,
          college: 'N/A',
          years_pro: undefined,
          data_source: 'basic',
          enhanced: false,
          stats: calculatedStats,
          nextMatchup: nextMatchup
        }
      });
    }

  } catch (err: any) {
    console.error('Auto-enhance error:', err);
    return NextResponse.json({ 
      error: err?.message || 'Unknown error'
    }, { status: 500 });
  }
}
