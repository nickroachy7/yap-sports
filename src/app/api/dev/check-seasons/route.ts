import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * Check what seasons exist in the database
 */
export async function GET(req: NextRequest) {
  try {
    // Get all seasons
    const { data: seasons, error: seasonsError } = await supabaseAdmin
      .from('seasons')
      .select('*')
      .eq('league', 'NFL')
      .order('year', { ascending: false });
    
    if (seasonsError) {
      return NextResponse.json({ error: seasonsError.message }, { status: 500 });
    }
    
    // For each season, count stats
    const seasonStats = await Promise.all(
      (seasons || []).map(async (season) => {
        const { count: statsCount } = await supabaseAdmin
          .from('player_game_stats')
          .select('*', { count: 'exact', head: true })
          .eq('season_id', season.id);
        
        // Get a sample stat
        const { data: sampleStats } = await supabaseAdmin
          .from('player_game_stats')
          .select('game_date, stat_json, player_id')
          .eq('season_id', season.id)
          .limit(3);
        
        return {
          ...season,
          stats_count: statsCount || 0,
          sample_stats: sampleStats?.map(s => ({
            game_date: s.game_date,
            fantasy_points: s.stat_json?.fantasy_points
          }))
        };
      })
    );
    
    return NextResponse.json({
      success: true,
      seasons: seasonStats
    });
    
  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json({ 
      error: 'Failed to check seasons', 
      details: error.message 
    }, { status: 500 });
  }
}

