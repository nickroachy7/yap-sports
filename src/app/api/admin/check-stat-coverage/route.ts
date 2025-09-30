import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
  try {
    // Get sample of players WITH stats
    const { data: playersWithStats } = await supabaseAdmin
      .from('player_game_stats')
      .select('player_id, stat_json')
      .not('player_id', 'is', null)
      .limit(5);

    // Check what weeks we have stats for
    const { data: weekStats } = await supabaseAdmin
      .from('player_game_stats')
      .select(`
        id,
        sports_event:sports_events(week_number, starts_at)
      `)
      .limit(200);

    const weeks = weekStats
      ?.map(s => (s as any).sports_event)
      .filter(e => e)
      .map((e: any) => e.week_number)
      .filter(w => w) || [];

    const uniqueWeeks = [...new Set(weeks)].sort();

    // Get date range of stats
    const { data: dateRange } = await supabaseAdmin
      .from('player_game_stats')
      .select(`
        sports_event:sports_events(starts_at)
      `)
      .order('sports_event(starts_at)', { ascending: true })
      .limit(1);

    const { data: latestStat } = await supabaseAdmin
      .from('player_game_stats')
      .select(`
        sports_event:sports_events(starts_at)
      `)
      .order('sports_event(starts_at)', { ascending: false })
      .limit(1);

    return NextResponse.json({
      total_stat_records: 6792,
      weeks_covered: uniqueWeeks,
      sample_players_with_stats: playersWithStats?.slice(0, 3).map(s => s.stat_json?.player_name),
      earliest_stat: (dateRange?.[0] as any)?.sports_event?.starts_at,
      latest_stat: (latestStat?.[0] as any)?.sports_event?.starts_at,
      note: 'If only certain dates are covered, Bowers stats might be outside that range'
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
