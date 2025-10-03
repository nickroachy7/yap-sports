import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * EMERGENCY: Restore all players to active status
 * Use this if the inactive marking script went wrong
 */
export async function POST(req: NextRequest) {
  try {
    console.log('🚨 EMERGENCY: Restoring all players to active status...');
    
    const PLAYABLE_POSITIONS = ['Quarterback', 'Running Back', 'Wide Receiver', 'Tight End'];
    
    // Get count before
    const { count: inactiveBefore } = await supabaseAdmin
      .from('players')
      .select('*', { count: 'exact', head: true })
      .eq('active', false);
    
    // Mark ALL players in playable positions as active
    const { error: updateError, count: updated } = await supabaseAdmin
      .from('players')
      .update({ active: true })
      .in('position', PLAYABLE_POSITIONS)
      .eq('active', false)
      .select('*', { count: 'exact', head: true });
    
    if (updateError) {
      console.error('Error restoring players:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
    
    // Get counts after
    const { count: totalActive } = await supabaseAdmin
      .from('players')
      .select('*', { count: 'exact', head: true })
      .eq('active', true);
    
    const { count: totalInactive } = await supabaseAdmin
      .from('players')
      .select('*', { count: 'exact', head: true })
      .eq('active', false);
    
    const { count: playableActive } = await supabaseAdmin
      .from('players')
      .select('*', { count: 'exact', head: true })
      .eq('active', true)
      .in('position', PLAYABLE_POSITIONS);
    
    console.log(`✅ Restored ${updated} players to active status!`);
    
    return NextResponse.json({
      success: true,
      message: `Restored ${updated} players in playable positions to active status`,
      before: {
        inactive: inactiveBefore
      },
      after: {
        totalActive,
        totalInactive,
        playableActive
      },
      restored: updated
    });
    
  } catch (err: any) {
    console.error('Restore players error:', err);
    return NextResponse.json({ 
      error: 'Failed to restore players', 
      details: err.message 
    }, { status: 500 });
  }
}

