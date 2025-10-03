import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * Check what data we have in the database
 */
export async function GET(req: NextRequest) {
  try {
    // Count total players
    const { count: totalPlayers } = await supabaseAdmin
      .from('players')
      .select('*', { count: 'exact', head: true });
    
    // Count active players
    const { count: activePlayers } = await supabaseAdmin
      .from('players')
      .select('*', { count: 'exact', head: true })
      .eq('active', true);
    
    // Count inactive players
    const { count: inactivePlayers } = await supabaseAdmin
      .from('players')
      .select('*', { count: 'exact', head: true })
      .eq('active', false);
    
    // Count playable position players
    const PLAYABLE_POSITIONS = ['Quarterback', 'Running Back', 'Wide Receiver', 'Tight End'];
    const { count: playablePositionPlayers } = await supabaseAdmin
      .from('players')
      .select('*', { count: 'exact', head: true })
      .eq('active', true)
      .in('position', PLAYABLE_POSITIONS);
    
    // Check for any stats
    const { count: totalStats } = await supabaseAdmin
      .from('player_game_stats')
      .select('*', { count: 'exact', head: true });
    
    // Check for 2025 stats
    const { count: stats2025 } = await supabaseAdmin
      .from('player_game_stats')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', '2025-01-01');
    
    // Check for 2024 stats
    const { count: stats2024 } = await supabaseAdmin
      .from('player_game_stats')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', '2024-01-01')
      .lt('created_at', '2025-01-01');
    
    // Get sample of most recent stats
    const { data: recentStats } = await supabaseAdmin
      .from('player_game_stats')
      .select('created_at, finalized')
      .order('created_at', { ascending: false })
      .limit(10);
    
    // Sample some active players
    const { data: samplePlayers } = await supabaseAdmin
      .from('players')
      .select('id, first_name, last_name, position, team, active')
      .eq('active', true)
      .in('position', PLAYABLE_POSITIONS)
      .limit(20);
    
    return NextResponse.json({
      players: {
        total: totalPlayers,
        active: activePlayers,
        inactive: inactivePlayers,
        playablePositions: playablePositionPlayers
      },
      stats: {
        total: totalStats,
        year2025: stats2025,
        year2024: stats2024,
        recentSample: recentStats
      },
      samplePlayers: samplePlayers
    });
    
  } catch (err: any) {
    console.error('Check data status error:', err);
    return NextResponse.json({ 
      error: 'Failed to check data status', 
      details: err.message 
    }, { status: 500 });
  }
}

