import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
  try {
    // Check if Brock Bowers' Week 1 game exists (external_game_id: 423950)
    const bowerWeek1GameId = '423950';
    
    const { data: game, error } = await supabaseAdmin
      .from('sports_events')
      .select('id, external_game_id, home_team, away_team, starts_at, week_number')
      .eq('external_game_id', bowerWeek1GameId)
      .maybeSingle();

    // Check total 2025 games
    const { count } = await supabaseAdmin
      .from('sports_events')
      .select('id', { count: 'exact', head: true })
      .gte('starts_at', '2025-08-01')
      .lte('starts_at', '2026-02-28');

    return NextResponse.json({
      bowers_week1_game: game || 'NOT FOUND',
      total_2025_games: count || 0,
      error: error?.message
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
