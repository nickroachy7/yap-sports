import { NextRequest, NextResponse } from 'next/server';
import { fetchNFLPlayers } from '@/lib/nflProvider';

export async function POST(req: NextRequest) {
  try {
    console.log('Testing Ball Don\'t Lie API player data...');

    const body = await req.json().catch(() => ({}));
    const { 
      search_term = 'Patrick Mahomes',
      max_players = 5
    } = body;

    console.log(`Searching for: ${search_term}`);

    // Test what data Ball Don't Lie API provides for players
    const playersResponse = await fetchNFLPlayers({
      search: search_term,
      per_page: max_players
    });

    console.log(`API returned ${playersResponse.data?.length || 0} players`);

    const results = {
      success: true,
      search_term,
      api_response: {
        total_found: playersResponse.data?.length || 0,
        meta: playersResponse.meta,
        sample_players: playersResponse.data?.map(player => ({
          id: player.id,
          first_name: player.first_name,
          last_name: player.last_name,
          position: player.position,
          team: player.team?.abbreviation,
          // Check what additional data is available
          height: player.height,
          weight: player.weight,
          college: player.college,
          years_pro: player.years_pro,
          jersey_number: player.jersey_number,
          age: player.age,
          raw_data: player // Include full object to see what's available
        })) || []
      }
    };

    return NextResponse.json(results);

  } catch (err: any) {
    console.error('Player data test error:', err);
    return NextResponse.json({ 
      success: false,
      error: err?.message || 'Unknown error',
      details: err?.stack
    }, { status: 500 });
  }
}
