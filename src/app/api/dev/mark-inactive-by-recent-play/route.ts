import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * Mark players as inactive if they haven't played since a certain date
 * Uses ACTUAL game dates, not created_at timestamps
 */
export async function POST(req: NextRequest) {
  try {
    const { cutoffDate } = await req.json().catch(() => ({}));
    
    // Default: Mark players inactive if they haven't played since Sept 1, 2024
    // (2024 NFL season started in early September)
    const CUTOFF_DATE = cutoffDate || '2024-09-01';
    const PLAYABLE_POSITIONS = ['Quarterback', 'Running Back', 'Wide Receiver', 'Tight End'];
    
    console.log(`🔍 Finding players who haven't played since ${CUTOFF_DATE}...`);
    
    // Get all currently active players in playable positions
    const { data: activePlayers, error: playersError } = await supabaseAdmin
      .from('players')
      .select('id, first_name, last_name, position, team, external_id')
      .eq('active', true)
      .in('position', PLAYABLE_POSITIONS);
    
    if (playersError) {
      return NextResponse.json({ error: playersError.message }, { status: 500 });
    }
    
    console.log(`📊 Checking ${activePlayers?.length || 0} active players...`);
    
    if (!activePlayers || activePlayers.length === 0) {
      return NextResponse.json({ 
        success: true,
        message: 'No active players found' 
      });
    }
    
    const playersToMarkInactive = [];
    const playersWithRecentGames = [];
    let checkedCount = 0;
    
    // Process in smaller batches to avoid URI length limits
    const BATCH_SIZE = 25; // Reduced from 100 to avoid 414 errors
    
    for (let i = 0; i < activePlayers.length; i += BATCH_SIZE) {
      const batch = activePlayers.slice(i, i + BATCH_SIZE);
      
      // Check each player individually to avoid large queries
      for (const player of batch) {
        checkedCount++;
        
        // Get most recent game for this player
        const { data: stats, error: statsError } = await supabaseAdmin
          .from('player_game_stats')
          .select('game_date')
          .eq('player_id', player.id)
          .eq('finalized', true)
          .order('game_date', { ascending: false })
          .limit(1);
        
        if (statsError) {
          console.warn(`Error fetching stats for ${player.first_name} ${player.last_name}:`, statsError);
          continue;
        }
        
        if (!stats || stats.length === 0) {
          // No stats at all = inactive
          playersToMarkInactive.push({
            ...player,
            reason: 'no-stats',
            lastGame: null
          });
          continue;
        }
        
        const lastGameDate = stats[0].game_date;
        
        if (!lastGameDate || lastGameDate < CUTOFF_DATE) {
          // No recent games = inactive
          playersToMarkInactive.push({
            ...player,
            reason: 'no-recent-games',
            lastGame: lastGameDate || 'unknown'
          });
        } else {
          playersWithRecentGames.push(player);
        }
      }
      
      // Progress update every 100 players
      if (checkedCount % 100 === 0) {
        console.log(`Progress: ${checkedCount}/${activePlayers.length} players checked...`);
      }
    }
    
    console.log(`✅ Players WITH recent games: ${playersWithRecentGames.length}`);
    console.log(`❌ Players WITHOUT recent games: ${playersToMarkInactive.length}`);
    
    if (playersToMarkInactive.length === 0) {
      return NextResponse.json({
        success: true,
        message: `All active players have played since ${CUTOFF_DATE}!`,
        summary: {
          totalChecked: checkedCount,
          withRecentGames: playersWithRecentGames.length,
          withoutRecentGames: 0,
          markedInactive: 0
        }
      });
    }
    
    // Mark players as inactive in batches to avoid URI limits
    const playerIdsToMarkInactive = playersToMarkInactive.map(p => p.id);
    const UPDATE_BATCH_SIZE = 500; // Update 500 at a time
    let updateCount = 0;
    
    for (let i = 0; i < playerIdsToMarkInactive.length; i += UPDATE_BATCH_SIZE) {
      const batchIds = playerIdsToMarkInactive.slice(i, i + UPDATE_BATCH_SIZE);
      
      const { error: updateError } = await supabaseAdmin
        .from('players')
        .update({ active: false })
        .in('id', batchIds);
      
      if (updateError) {
        console.error(`Error marking batch ${i}-${i + batchIds.length} as inactive:`, updateError);
        continue; // Continue with other batches
      }
      
      updateCount += batchIds.length;
      console.log(`Updated ${updateCount}/${playerIdsToMarkInactive.length} players...`);
    }
    
    console.log(`✅ Successfully marked ${updateCount} players as inactive!`);
    
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
      message: `Marked ${playersToMarkInactive.length} players as inactive (no games since ${CUTOFF_DATE})`,
      summary: {
        totalChecked: checkedCount,
        cutoffDate: CUTOFF_DATE,
        withRecentGames: playersWithRecentGames.length,
        withoutRecentGames: playersToMarkInactive.length,
        markedInactive: playersToMarkInactive.length
      },
      playerCounts: {
        totalActive,
        totalInactive
      },
      inactivatedPlayers: playersToMarkInactive.map(p => ({
        name: `${p.first_name} ${p.last_name}`,
        position: p.position,
        team: p.team,
        lastGame: p.lastGame,
        reason: p.reason
      })).slice(0, 200) // Show first 200
    });
    
  } catch (err: any) {
    console.error('Mark inactive by recent play error:', err);
    return NextResponse.json({ 
      error: 'Failed to mark inactive players', 
      details: err.message 
    }, { status: 500 });
  }
}

