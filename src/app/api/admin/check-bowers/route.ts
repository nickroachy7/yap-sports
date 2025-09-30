import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
  try {
    // Check by external_id
    const { data: byExternalId, error: err1 } = await supabaseAdmin
      .from('players')
      .select('id, first_name, last_name, position, team, external_id')
      .eq('external_id', '277679')
      .maybeSingle();

    // Check by name
    const { data: byName, error: err2 } = await supabaseAdmin
      .from('players')
      .select('id, first_name, last_name, position, team, external_id')
      .eq('first_name', 'Brock')
      .eq('last_name', 'Bowers');

    // Check stats for this player if found
    let statsCount = 0;
    if (byExternalId) {
      const { count } = await supabaseAdmin
        .from('player_game_stats')
        .select('id', { count: 'exact', head: true })
        .eq('player_id', byExternalId.id);
      statsCount = count || 0;
    }

    return NextResponse.json({
      by_external_id: byExternalId || 'Not found',
      by_name: byName || [],
      stats_count: statsCount,
      errors: {
        external_id_error: err1?.message,
        name_error: err2?.message
      }
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
