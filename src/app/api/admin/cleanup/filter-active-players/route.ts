import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * Filter Active Players
 * 
 * Marks players as inactive if they:
 * - Have no stats from 2024 or 2025
 * - Have not been updated recently
 * 
 * This reduces the active player count from ~11,000 to ~1,700 active roster players
 */
export async function POST(req: NextRequest) {
  try {
    console.log('🔍 Starting Active Player Filter...');
    
    const body = await req.json().catch(() => ({}));
    const { dry_run = false, cutoff_date = '2024-01-01' } = body;

    const results = {
      success: true,
      dry_run,
      timestamp: new Date().toISOString(),
      before: {
        active_players: 0,
        inactive_players: 0
      },
      after: {
        active_players: 0,
        inactive_players: 0
      },
      players_deactivated: 0
    };

    // Get current stats
    const { count: beforeActive } = await supabaseAdmin
      .from('players')
      .select('*', { count: 'exact', head: true })
      .eq('active', true);

    const { count: beforeInactive } = await supabaseAdmin
      .from('players')
      .select('*', { count: 'exact', head: true })
      .eq('active', false);

    results.before.active_players = beforeActive || 0;
    results.before.inactive_players = beforeInactive || 0;

    console.log(`📊 Current State:`);
    console.log(`   Active Players: ${results.before.active_players}`);
    console.log(`   Inactive Players: ${results.before.inactive_players}`);

    if (dry_run) {
      // Just count how many would be affected
      const { count: wouldDeactivate } = await supabaseAdmin
        .from('players')
        .select('*', { count: 'exact', head: true })
        .eq('active', true)
        .not('id', 'in', 
          supabaseAdmin
            .from('player_game_stats')
            .select('player_id')
            .gte('game_date', cutoff_date)
        );

      results.players_deactivated = wouldDeactivate || 0;
      results.after.active_players = results.before.active_players - results.players_deactivated;
      results.after.inactive_players = results.before.inactive_players + results.players_deactivated;

      console.log(`\n🔬 DRY RUN - Would deactivate ${results.players_deactivated} players`);
      console.log(`   New Active Count: ${results.after.active_players}`);

      return NextResponse.json(results);
    }

    // Get players with recent stats (2024 or 2025)
    console.log('\n📥 Finding players with recent activity...');
    const { data: activePlayerIds } = await supabaseAdmin
      .from('player_game_stats')
      .select('player_id')
      .gte('game_date', cutoff_date);

    const activeIds = new Set(
      (activePlayerIds || []).map((row: any) => row.player_id)
    );

    console.log(`✅ Found ${activeIds.size} players with stats since ${cutoff_date}`);

    // Mark players without recent stats as inactive
    console.log('\n🔄 Deactivating players without recent activity...');
    
    const { data: playersToDeactivate } = await supabaseAdmin
      .from('players')
      .select('id, first_name, last_name, position, team')
      .eq('active', true)
      .not('id', 'in', `(${Array.from(activeIds).join(',')})`);

    if (playersToDeactivate && playersToDeactivate.length > 0) {
      const idsToDeactivate = playersToDeactivate.map((p: any) => p.id);

      // Deactivate in batches of 1000
      const batchSize = 1000;
      for (let i = 0; i < idsToDeactivate.length; i += batchSize) {
        const batch = idsToDeactivate.slice(i, i + batchSize);
        
        const { error: updateError } = await supabaseAdmin
          .from('players')
          .update({ active: false })
          .in('id', batch);

        if (updateError) {
          console.error(`❌ Error deactivating batch ${i / batchSize + 1}:`, updateError);
        } else {
          console.log(`   Batch ${i / batchSize + 1}: Deactivated ${batch.length} players`);
        }
      }

      results.players_deactivated = idsToDeactivate.length;
    }

    // Get final stats
    const { count: afterActive } = await supabaseAdmin
      .from('players')
      .select('*', { count: 'exact', head: true })
      .eq('active', true);

    const { count: afterInactive } = await supabaseAdmin
      .from('players')
      .select('*', { count: 'exact', head: true })
      .eq('active', false);

    results.after.active_players = afterActive || 0;
    results.after.inactive_players = afterInactive || 0;

    console.log(`\n✅ Active Player Filter Complete!`);
    console.log(`   Active Players: ${results.before.active_players} → ${results.after.active_players}`);
    console.log(`   Inactive Players: ${results.before.inactive_players} → ${results.after.inactive_players}`);
    console.log(`   Deactivated: ${results.players_deactivated}`);

    return NextResponse.json(results);

  } catch (error) {
    console.error('❌ Fatal error during player filtering:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

