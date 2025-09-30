import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const BodySchema = z.object({ 
  teamName: z.string().min(3).max(50)
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const { teamName } = BodySchema.parse(json);

    const authHeader = req.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const token = authHeader.replace('Bearer ', '');

    // Get user
    const { data: { user }, error: getUserError } = await supabaseAdmin.auth.getUser(token);
    if (getUserError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = user.id;

    // Check if team name is already taken by this user
    const { data: existingTeam, error: existingTeamError } = await supabaseAdmin
      .from('user_teams')
      .select('id')
      .eq('user_id', userId)
      .eq('name', teamName)
      .eq('active', true)
      .maybeSingle();

    if (existingTeamError) {
      console.error('Error checking existing team:', existingTeamError);
      return NextResponse.json({ error: 'Failed to check existing teams' }, { status: 500 });
    }

    if (existingTeam) {
      return NextResponse.json({ error: 'You already have a team with this name' }, { status: 400 });
    }

    // Create new team with starter coins
    console.log('Creating team for user:', userId, 'with name:', teamName);
    const { data: newTeam, error: createError } = await supabaseAdmin
      .from('user_teams')
      .insert({
        user_id: userId,
        name: teamName,
        coins: 5000, // Starter coins
        active: true
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating team:', createError);
      return NextResponse.json({ error: 'Failed to create team' }, { status: 500 });
    }

    console.log('Team created successfully:', newTeam.id, newTeam.name);

    // Create welcome transaction
    await supabaseAdmin
      .from('transactions')
      .insert({
        user_id: userId,
        type: 'grant-coins',
        amount: 5000,
        meta_json: {
          reason: 'Welcome bonus for new team',
          team_id: newTeam.id,
          team_name: teamName
        }
      });

    return NextResponse.json({
      success: true,
      team: newTeam,
      message: `Team "${teamName}" created successfully!`
    });

  } catch (err: any) {
    console.error('Team creation error:', err);
    
    if (err instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid team name. Must be between 3-50 characters.' 
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      error: err?.message || 'Failed to create team' 
    }, { status: 500 });
  }
}
