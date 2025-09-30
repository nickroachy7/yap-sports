import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
  try {
    const { data: player, error } = await supabaseAdmin
      .from('players')
      .select('id, first_name, last_name, position, team, external_id')
      .eq('external_id', '277867')
      .maybeSingle();

    let statsCount = 0;
    if (player) {
      const { count } = await supabaseAdmin
        .from('player_game_stats')
        .select('id', { count: 'exact', head: true })
        .eq('player_id', player.id);
      statsCount = count || 0;
    }

    return NextResponse.json({
      player: player || 'Not found',
      stats_count: statsCount,
      error: error?.message
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
