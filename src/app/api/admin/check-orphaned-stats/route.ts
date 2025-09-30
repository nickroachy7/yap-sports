import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
  try {
    // Check for stats with NULL player_id
    const { count: nullPlayerCount } = await supabaseAdmin
      .from('player_game_stats')
      .select('id', { count: 'exact', head: true })
      .is('player_id', null);

    // Check for stats with NULL sports_event_id
    const { count: nullEventCount } = await supabaseAdmin
      .from('player_game_stats')
      .select('id', { count: 'exact', head: true })
      .is('sports_event_id', null);

    // Check total stats
    const { count: totalCount } = await supabaseAdmin
      .from('player_game_stats')
      .select('id', { count: 'exact', head: true });

    // Check if there are any stats for Brock Bowers' external_id in stat_json
    const { data: bowerStats } = await supabaseAdmin
      .from('player_game_stats')
      .select('id, player_id, sports_event_id, stat_json')
      .or('player_id.is.null')
      .limit(10);

    const bowerStatsInJson = bowerStats?.filter(s => 
      s.stat_json?.player_name?.includes('Bowers')
    ) || [];

    return NextResponse.json({
      total_stats: totalCount || 0,
      null_player_id: nullPlayerCount || 0,
      null_event_id: nullEventCount || 0,
      sample_bowers_stats: bowerStatsInJson.slice(0, 3)
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
