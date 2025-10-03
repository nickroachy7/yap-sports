import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(req: NextRequest) {
  try {
    // Get sample of stats with game dates
    const { data: allStats } = await supabaseAdmin
      .from('player_game_stats')
      .select('game_date, stat_json, players(first_name, last_name)')
      .order('game_date', { ascending: false })
      .limit(20);
    
    // Count stats by date range
    const { count: recentStats } = await supabaseAdmin
      .from('player_game_stats')
      .select('*', { count: 'exact', head: true })
      .gte('game_date', '2024-09-01');
    
    const { count: allStatsCount } = await supabaseAdmin
      .from('player_game_stats')
      .select('*', { count: 'exact', head: true });
    
    return NextResponse.json({
      total_stats: allStatsCount,
      stats_since_sept_2024: recentStats,
      sample_stats: allStats?.map(s => ({
        game_date: s.game_date,
        player: s.players ? `${s.players.first_name} ${s.players.last_name}` : 'Unknown',
        fantasy_points: s.stat_json?.fantasy_points || 0
      }))
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

