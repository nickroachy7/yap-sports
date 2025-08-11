import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const BodySchema = z.object({ 
  teamId: z.string().uuid()
});

export async function DELETE(req: NextRequest) {
  try {
    const json = await req.json();
    const { teamId } = BodySchema.parse(json);

    const authHeader = req.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const token = authHeader.replace('Bearer ', '');

    const { data: { user }, error: getUserError } = await supabaseAdmin.auth.getUser(token);
    if (getUserError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = user.id;

    // Verify team ownership first
    const { data: team, error: teamError } = await supabaseAdmin
      .from('user_teams')
      .select('id, name, coins')
      .eq('id', teamId)
      .eq('user_id', userId)
      .single();

    if (teamError || !team) {
      return NextResponse.json({ error: 'Team not found or not owned by user' }, { status: 403 });
    }

    // Check if user has other teams (prevent deleting last team)
    const { data: otherTeams, error: otherTeamsError } = await supabaseAdmin
      .from('user_teams')
      .select('id')
      .eq('user_id', userId)
      .eq('active', true)
      .neq('id', teamId);

    if (otherTeamsError) {
      return NextResponse.json({ error: 'Failed to check other teams' }, { status: 500 });
    }

    if (!otherTeams || otherTeams.length === 0) {
      return NextResponse.json({ 
        error: 'Cannot delete your last team. You must have at least one active team.' 
      }, { status: 400 });
    }

    // Use the database function to completely delete the team and all associated data
    const { data: result, error: deleteError } = await supabaseAdmin.rpc('delete_team_completely', {
      p_team_id: teamId,
      p_user_id: userId
    });

    if (deleteError) {
      console.error('Team deletion error:', deleteError);
      return NextResponse.json({ 
        error: 'Failed to delete team', 
        details: deleteError.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Team "${result.team_name}" has been completely deleted`,
      deletionSummary: {
        teamName: result.team_name,
        coinsLost: result.coins_lost,
        cardsDeleted: result.cards_deleted,
        tokensDeleted: result.tokens_deleted,
        packsDeleted: result.packs_deleted,
        lineupsDeleted: result.lineups_deleted
      }
    });

  } catch (err: any) {
    console.error('API Error:', err);
    return NextResponse.json({ 
      error: 'Invalid request', 
      details: err.message 
    }, { status: 400 });
  }
}
