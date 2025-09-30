import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * Debug endpoint to check why a player has no stats
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const playerName = searchParams.get('name') || 'AJ Dillon';

    console.log(`Checking stats for: ${playerName}`);

    // 1. Find the player in database
    const { data: players, error: playerError } = await supabaseAdmin
      .from('players')
      .select('*')
      .or(`first_name.ilike.%${playerName.split(' ')[0]}%,last_name.ilike.%${playerName.split(' ').pop()}%`)
      .limit(5);

    if (playerError) {
      return NextResponse.json({ error: 'Player search failed', details: playerError });
    }

    if (!players || players.length === 0) {
      return NextResponse.json({ 
        error: 'Player not found',
        searched_name: playerName,
        suggestion: 'Check spelling or try just last name'
      });
    }

    const player = players[0];
    console.log(`Found player:`, player);

    // 2. Check for stats using player_id
    const { data: statsByPlayerId, error: statsError1 } = await supabaseAdmin
      .from('player_game_stats')
      .select('*')
      .eq('player_id', player.id)
      .limit(10);

    console.log(`Stats by player_id (${player.id}):`, statsByPlayerId?.length || 0);

    // 3. Check for stats using external_id
    const { data: statsByExternalId, error: statsError2 } = await supabaseAdmin
      .from('player_game_stats')
      .select('*')
      .eq('external_player_id', player.external_id)
      .limit(10);

    console.log(`Stats by external_id (${player.external_id}):`, statsByExternalId?.length || 0);

    // 4. Check if this player has ANY stats in the API
    const { data: allStatsForPlayer } = await supabaseAdmin
      .from('player_game_stats')
      .select('stat_json')
      .or(`player_id.eq.${player.id},external_player_id.eq.${player.external_id}`)
      .limit(5);

    // 5. Get sample of what stats exist in database
    const { data: sampleStats } = await supabaseAdmin
      .from('player_game_stats')
      .select('player_id, external_player_id, stat_json')
      .limit(5);

    return NextResponse.json({
      success: true,
      player: {
        id: player.id,
        name: `${player.first_name} ${player.last_name}`,
        external_id: player.external_id,
        position: player.position,
        team: player.team,
        height: player.height,
        weight: player.weight,
        college: player.college,
        age: player.age,
        years_pro: player.years_pro,
        jersey_number: player.jersey_number
      },
      stats_check: {
        by_player_id: {
          count: statsByPlayerId?.length || 0,
          sample: statsByPlayerId?.slice(0, 2) || []
        },
        by_external_id: {
          count: statsByExternalId?.length || 0,
          sample: statsByExternalId?.slice(0, 2) || []
        },
        any_stats: allStatsForPlayer?.length || 0
      },
      database_sample: {
        total_stats_in_db: sampleStats?.length || 0,
        sample_records: sampleStats
      },
      diagnosis: statsByPlayerId?.length === 0 && statsByExternalId?.length === 0
        ? '❌ NO STATS FOUND - Player has no game stats in database'
        : '✅ Stats exist for this player'
    });

  } catch (err: any) {
    console.error('Debug error:', err);
    return NextResponse.json({ 
      error: err?.message || 'Unknown error',
      stack: err?.stack
    }, { status: 500 });
  }
}

