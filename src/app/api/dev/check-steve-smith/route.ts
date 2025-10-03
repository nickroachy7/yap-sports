import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * Quick check to see Steve Smith Sr.'s status in the database
 */
export async function GET(req: NextRequest) {
  try {
    // Search for Steve Smith
    const { data: players, error } = await supabaseAdmin
      .from('players')
      .select('id, first_name, last_name, active, team, position, external_id')
      .ilike('last_name', '%Smith%')
      .ilike('first_name', '%Steve%');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      found: players?.length || 0,
      players: players || []
    });

  } catch (err: any) {
    console.error('Check error:', err);
    return NextResponse.json({ 
      error: 'Failed to check player', 
      details: err.message 
    }, { status: 500 });
  }
}

/**
 * POST endpoint to force update Steve Smith Sr. to inactive
 */
export async function POST(req: NextRequest) {
  try {
    // Search for Steve Smith Sr.
    const { data: players, error: searchError } = await supabaseAdmin
      .from('players')
      .select('id, first_name, last_name, active, team, position')
      .ilike('last_name', '%Smith%')
      .ilike('first_name', '%Steve%');

    if (searchError) {
      return NextResponse.json({ error: searchError.message }, { status: 500 });
    }

    if (!players || players.length === 0) {
      return NextResponse.json({ error: 'Steve Smith not found' }, { status: 404 });
    }

    // Update all Steve Smith entries to inactive
    const results = [];
    for (const player of players) {
      const { data: updated, error: updateError } = await supabaseAdmin
        .from('players')
        .update({ active: false })
        .eq('id', player.id)
        .select();

      if (updateError) {
        console.error(`Failed to update ${player.first_name} ${player.last_name}:`, updateError);
        results.push({
          player: `${player.first_name} ${player.last_name}`,
          success: false,
          error: updateError.message
        });
      } else {
        console.log(`Successfully updated ${player.first_name} ${player.last_name} to inactive`);
        results.push({
          player: `${player.first_name} ${player.last_name}`,
          success: true,
          before: player.active,
          after: updated?.[0]?.active
        });
      }
    }

    // Verify the update
    const { data: verifyPlayers } = await supabaseAdmin
      .from('players')
      .select('id, first_name, last_name, active, team, position')
      .ilike('last_name', '%Smith%')
      .ilike('first_name', '%Steve%');

    return NextResponse.json({
      success: true,
      playersFound: players.length,
      updateResults: results,
      verification: verifyPlayers
    });

  } catch (err: any) {
    console.error('Update error:', err);
    return NextResponse.json({ 
      error: 'Failed to update player', 
      details: err.message,
      stack: err.stack
    }, { status: 500 });
  }
}

