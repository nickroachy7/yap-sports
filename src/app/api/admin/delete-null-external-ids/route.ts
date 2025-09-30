import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * Delete players with null external_id (duplicates from manual creation)
 */
export async function POST(req: NextRequest) {
  try {
    console.log('🗑️  Deleting players with null external_id...');

    // Get players with null external_id
    const { data: playersToDelete, error: selectError } = await supabaseAdmin
      .from('players')
      .select('id, first_name, last_name, team')
      .is('external_id', null);

    if (selectError) {
      throw selectError;
    }

    console.log(`Found ${playersToDelete?.length || 0} players to delete:`);
    playersToDelete?.forEach(p => {
      console.log(`  - ${p.first_name} ${p.last_name} (${p.team})`);
    });

    // Delete them
    const { error: deleteError } = await supabaseAdmin
      .from('players')
      .delete()
      .is('external_id', null);

    if (deleteError) {
      throw deleteError;
    }

    console.log(`✅ Deleted ${playersToDelete?.length || 0} duplicate players`);

    return NextResponse.json({
      success: true,
      message: `Deleted ${playersToDelete?.length || 0} players with null external_id`,
      deleted_players: playersToDelete
    });

  } catch (err: any) {
    console.error('Delete error:', err);
    return NextResponse.json({
      success: false,
      error: err?.message || 'Unknown error'
    }, { status: 500 });
  }
}
