import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * Automatically mark players as inactive if they have NO stats for the 2025 season
 * This catches ALL retired/injured/inactive players at once
 */
export async function POST(req: NextRequest) {
  try {
    const CURRENT_SEASON_YEAR = 2025;
    const PLAYABLE_POSITIONS = ['Quarterback', 'Running Back', 'Wide Receiver', 'Tight End'];
    
    console.log('🔍 Finding players with no 2025 stats...');
    
    // Get all currently active players in playable positions
    const { data: activePlayers, error: playersError } = await supabaseAdmin
      .from('players')
      .select('id, first_name, last_name, position, team')
      .eq('active', true)
      .in('position', PLAYABLE_POSITIONS);
    
    if (playersError) {
      return NextResponse.json({ error: playersError.message }, { status: 500 });
    }
    
    console.log(`📊 Found ${activePlayers?.length || 0} active players in playable positions`);
    
    if (!activePlayers || activePlayers.length === 0) {
      return NextResponse.json({ 
        success: true,
        message: 'No active players found' 
      });
    }
    
    // Check each player for 2025 stats
    const playersToMarkInactive = [];
    const playersWithStats = [];
    
    for (const player of activePlayers) {
      // Check if player has ANY stats for 2025 season
      const { data: stats, error: statsError } = await supabaseAdmin
        .from('player_game_stats')
        .select('id')
        .eq('player_id', player.id)
        .eq('finalized', true)
        .gte('created_at', `${CURRENT_SEASON_YEAR}-01-01`)
        .limit(1);
      
      if (statsError) {
        console.warn(`Error checking stats for ${player.first_name} ${player.last_name}:`, statsError);
        continue;
      }
      
      if (!stats || stats.length === 0) {
        // No 2025 stats = mark as inactive
        playersToMarkInactive.push(player);
      } else {
        playersWithStats.push(player);
      }
    }
    
    console.log(`✅ Players WITH 2025 stats: ${playersWithStats.length}`);
    console.log(`❌ Players WITHOUT 2025 stats: ${playersToMarkInactive.length}`);
    
    if (playersToMarkInactive.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All active players have 2025 stats!',
        summary: {
          totalChecked: activePlayers.length,
          withStats: playersWithStats.length,
          withoutStats: 0,
          markedInactive: 0
        }
      });
    }
    
    // Mark players without stats as inactive
    const playerIdsToMarkInactive = playersToMarkInactive.map(p => p.id);
    
    const { error: updateError } = await supabaseAdmin
      .from('players')
      .update({ active: false })
      .in('id', playerIdsToMarkInactive);
    
    if (updateError) {
      console.error('Error marking players as inactive:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
    
    console.log(`✅ Successfully marked ${playersToMarkInactive.length} players as inactive!`);
    
    // Get updated counts
    const { count: totalActive } = await supabaseAdmin
      .from('players')
      .select('*', { count: 'exact', head: true })
      .eq('active', true);
    
    const { count: totalInactive } = await supabaseAdmin
      .from('players')
      .select('*', { count: 'exact', head: true })
      .eq('active', false);
    
    return NextResponse.json({
      success: true,
      message: `Marked ${playersToMarkInactive.length} players as inactive (no 2025 stats)`,
      summary: {
        totalChecked: activePlayers.length,
        withStats: playersWithStats.length,
        withoutStats: playersToMarkInactive.length,
        markedInactive: playersToMarkInactive.length
      },
      playerCounts: {
        totalActive,
        totalInactive
      },
      inactivatedPlayers: playersToMarkInactive.map(p => ({
        name: `${p.first_name} ${p.last_name}`,
        position: p.position,
        team: p.team
      })).slice(0, 100) // Show first 100
    });
    
  } catch (err: any) {
    console.error('Auto-mark inactive error:', err);
    return NextResponse.json({ 
      error: 'Failed to auto-mark inactive players', 
      details: err.message 
    }, { status: 500 });
  }
}

