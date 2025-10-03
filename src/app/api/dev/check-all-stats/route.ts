import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(req: NextRequest) {
  try {
    // Count ALL stats
    const { count: totalStats } = await supabaseAdmin
      .from('player_game_stats')
      .select('*', { count: 'exact', head: true });
    
    // Get sample of stats
    const { data: sampleStats } = await supabaseAdmin
      .from('player_game_stats')
      .select('season_id, game_date, stat_json, players(first_name, last_name)')
      .limit(10);
    
    // Get all seasons
    const { data: allSeasons } = await supabaseAdmin
      .from('seasons')
      .select('*')
      .eq('league', 'NFL');
    
    return NextResponse.json({
      total_stats: totalStats,
      sample: sampleStats,
      all_seasons: allSeasons
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

