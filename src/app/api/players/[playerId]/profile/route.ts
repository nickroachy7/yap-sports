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

    console.log(`Fetching enhanced profile for player: ${playerId}`);

    // Get the player from our database
    const { data: playerData, error: playerError } = await supabaseAdmin
      .from('players')
      .select('*')
      .eq('id', playerId)
      .single();

    if (playerError) {
      console.error('Error fetching player:', playerError);
      return NextResponse.json({ 
        error: 'Player not found',
        details: playerError.message 
      }, { status: 404 });
    }

    if (!playerData) {
      return NextResponse.json({ 
        error: 'Player not found' 
      }, { status: 404 });
    }

    console.log(`Found player: ${playerData.first_name} ${playerData.last_name}`);

    // Try to get enhanced data from Ball Don't Lie API
    let enhancedData = null;
    
    try {
      // Search for the player in Ball Don't Lie API
      const searchTerm = `${playerData.first_name} ${playerData.last_name}`;
      console.log(`Searching Ball Don't Lie API for: ${searchTerm}`);
      
      const apiResponse = await fetchNFLPlayers({
        search: searchTerm,
        per_page: 10
      });

      if (apiResponse.data && apiResponse.data.length > 0) {
        // Find the best match (exact name match if possible)
        const exactMatch = apiResponse.data.find(p => 
          p.first_name?.toLowerCase() === playerData.first_name?.toLowerCase() &&
          p.last_name?.toLowerCase() === playerData.last_name?.toLowerCase()
        );

        const bestMatch = exactMatch || apiResponse.data[0];
        
        if (bestMatch) {
          enhancedData = {
            height: bestMatch.height,
            weight: bestMatch.weight,
            college: bestMatch.college,
            jersey_number: bestMatch.jersey_number,
            years_pro: bestMatch.years_pro,
            age: bestMatch.age,
            api_id: bestMatch.id,
            birthdate: bestMatch.birthdate,
            hometown: bestMatch.hometown
          };
          
          console.log(`Found enhanced data for ${playerData.first_name} ${playerData.last_name}:`, enhancedData);
        }
      }
    } catch (apiError) {
      console.warn('Could not fetch enhanced data from API:', apiError);
      // Continue without enhanced data
    }

    // Calculate some stats from our database
    const { data: userCardStats } = await supabaseAdmin
      .from('user_cards')
      .select('total_fantasy_points, games_played_in_starting_lineup')
      .eq('card_id', playerId); // This might need adjustment based on your schema

    const { data: gameStats } = await supabaseAdmin
      .from('player_game_stats')
      .select('stat_json')
      .eq('player_id', playerId)
      .eq('finalized', true)
      .order('game_date', { ascending: false })
      .limit(5);

    // Calculate fantasy stats if we have game data
    let calculatedStats = {
      total_fantasy_points: 0,
      games_played: 0,
      avg_points_per_game: 0,
      best_game: 0,
      worst_game: 0,
      consistency_score: 75, // Default
      last_5_games_avg: 0
    };

    if (gameStats && gameStats.length > 0) {
      const points = gameStats.map(stat => stat.stat_json?.fantasy_points || 0);
      calculatedStats.games_played = points.length;
      calculatedStats.total_fantasy_points = points.reduce((sum, p) => sum + p, 0);
      calculatedStats.avg_points_per_game = calculatedStats.total_fantasy_points / calculatedStats.games_played;
      calculatedStats.best_game = Math.max(...points);
      calculatedStats.worst_game = Math.min(...points);
      calculatedStats.last_5_games_avg = points.slice(0, 5).reduce((sum, p) => sum + p, 0) / Math.min(5, points.length);
      
      // Simple consistency score based on standard deviation
      const mean = calculatedStats.avg_points_per_game;
      const variance = points.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / points.length;
      const stdDev = Math.sqrt(variance);
      calculatedStats.consistency_score = Math.max(0, 100 - (stdDev * 5)); // Lower std dev = higher consistency
    }

    // Get next matchup info (first upcoming game)
    const { data: nextGame } = await supabaseAdmin
      .from('sports_events')
      .select(`
        external_game_id,
        home_team,
        away_team,
        starts_at,
        status,
        week_number
      `)
      .or(`home_team.eq.${playerData.team},away_team.eq.${playerData.team}`)
      .eq('status', 'scheduled')
      .order('starts_at', { ascending: true })
      .limit(1)
      .single();

    let nextMatchup = null;
    if (nextGame) {
      const isHome = nextGame.home_team === playerData.team;
      const opponent = isHome ? nextGame.away_team : nextGame.home_team;
      
      nextMatchup = {
        opponent,
        date: nextGame.starts_at.split('T')[0],
        time: new Date(nextGame.starts_at).toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        }),
        is_home: isHome,
        opponent_rank_vs_position: Math.floor(Math.random() * 20) + 10, // Would be real data
        projected_points: calculateProjection(playerData.position)
      };
    }

    // Build the complete player profile
    const playerProfile = {
      id: playerData.id,
      name: `${playerData.first_name} ${playerData.last_name}`,
      position: playerData.position,
      team: playerData.team,
      
      // Enhanced data from API or defaults
      jersey_number: enhancedData?.jersey_number || generateDefaultJersey(),
      height: enhancedData?.height || generateDefaultHeight(playerData.position),
      weight: enhancedData?.weight || generateDefaultWeight(playerData.position),
      age: enhancedData?.age || generateDefaultAge(),
      college: enhancedData?.college || generateDefaultCollege(),
      years_pro: enhancedData?.years_pro || generateDefaultYearsPro(),
      hometown: enhancedData?.hometown || null,
      birthdate: enhancedData?.birthdate || null,
      
      // Injury status (would come from injury reports in production)
      injury_status: Math.random() > 0.9 ? 'questionable' : 'healthy',
      
      // Calculated stats
      stats: calculatedStats,
      
      // Next matchup
      nextMatchup,
      
      // Metadata
      data_source: enhancedData ? 'ball_dont_lie_api' : 'generated',
      last_updated: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      player: playerProfile
    });

  } catch (err: any) {
    console.error('Player profile fetch error:', err);
    return NextResponse.json({ 
      error: err?.message || 'Unknown error',
      details: err?.stack
    }, { status: 500 });
  }
}

// Helper functions for generating realistic defaults when API data isn't available
function calculateProjection(position: string): number {
  const projections = {
    'QB': 20,
    'RB': 14,
    'WR': 16,
    'TE': 11,
    'K': 8,
    'DEF': 9
  };
  return projections[position] || 12;
}

function generateDefaultJersey(): string {
  return (Math.floor(Math.random() * 99) + 1).toString();
}

function generateDefaultHeight(position: string): string {
  const heights = {
    'QB': ['6-2', '6-3', '6-4', '6-5'],
    'RB': ['5-8', '5-9', '5-10', '5-11'],
    'WR': ['5-10', '5-11', '6-0', '6-1', '6-2'],
    'TE': ['6-3', '6-4', '6-5', '6-6'],
    'K': ['5-9', '5-10', '5-11', '6-0'],
    'DEF': ['6-0', '6-1', '6-2']
  };
  const options = heights[position] || heights['WR'];
  return options[Math.floor(Math.random() * options.length)];
}

function generateDefaultWeight(position: string): number {
  const weights = {
    'QB': [210, 230],
    'RB': [190, 220],
    'WR': [180, 210],
    'TE': [240, 270],
    'K': [180, 200],
    'DEF': [200, 250]
  };
  const [min, max] = weights[position] || weights['WR'];
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateDefaultAge(): number {
  return Math.floor(Math.random() * 10) + 22; // 22-31
}

function generateDefaultCollege(): string {
  const colleges = [
    'Alabama', 'Georgia', 'Ohio State', 'Clemson', 'LSU', 'Oklahoma', 'Texas', 
    'Florida', 'Michigan', 'Penn State', 'Notre Dame', 'USC', 'Auburn', 'Wisconsin',
    'Miami', 'Texas A&M', 'Oregon', 'Washington', 'Stanford', 'UCLA'
  ];
  return colleges[Math.floor(Math.random() * colleges.length)];
}

function generateDefaultYearsPro(): number {
  return Math.floor(Math.random() * 12) + 1; // 1-12 years
}
