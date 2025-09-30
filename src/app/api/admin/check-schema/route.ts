import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * Check the players table to see what data is actually stored
 */
export async function GET(req: NextRequest) {
  try {
    // Get Patrick Mahomes directly from database
    const { data: mahomes, error } = await supabaseAdmin
      .from('players')
      .select('*')
      .eq('external_id', '34')
      .single();

    if (error) throw error;

    // Get a few random players
    const { data: randomPlayers } = await supabaseAdmin
      .from('players')
      .select('id, first_name, last_name, external_id, height, weight, age, years_pro, college')
      .eq('active', true)
      .limit(10);

    // Count players with age
    const { count: withAge } = await supabaseAdmin
      .from('players')
      .select('*', { count: 'exact', head: true })
      .not('age', 'is', null);

    // Count players with years_pro
    const { count: withYears } = await supabaseAdmin
      .from('players')
      .select('*', { count: 'exact', head: true })
      .not('years_pro', 'is', null);

    return NextResponse.json({
      success: true,
      patrick_mahomes: mahomes,
      random_players: randomPlayers,
      counts: {
        with_age: withAge,
        with_years_pro: withYears
      }
    });

  } catch (err: any) {
    return NextResponse.json({
      error: err.message
    }, { status: 500 });
  }
}
