import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const LineupSlotSchema = z.object({
  slot: z.enum(['QB', 'RB', 'RB1', 'RB2', 'WR', 'WR1', 'WR2', 'TE', 'FLEX', 'BENCH']),
  user_card_id: z.string().uuid().optional(),
  applied_token_id: z.string().uuid().optional(),
});

const BodySchema = z.object({
  weekId: z.string().uuid(),
  teamId: z.string().uuid(),
  slots: z.array(LineupSlotSchema),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const { weekId, teamId, slots } = BodySchema.parse(json);

    // Authenticate user
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');

    const { data: { user }, error: getUserError } = await supabaseAdmin.auth.getUser(token);
    if (getUserError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = user.id;

    // Check if week is still open for submissions
    const { data: week, error: weekError } = await supabaseAdmin
      .from('weeks')
      .select('id, week_number, lock_at, status')
      .eq('id', weekId)
      .maybeSingle();

    if (weekError || !week) {
      return NextResponse.json({ error: 'Week not found' }, { status: 400 });
    }

    // Check if submissions are locked
    const lockTime = new Date(week.lock_at);
    const now = new Date();
    if (now >= lockTime) {
      return NextResponse.json({ 
        error: `Lineup submissions are locked. Lock time was ${lockTime.toLocaleString()}` 
      }, { status: 400 });
    }

    // Verify team belongs to user
    const { data: team, error: teamError } = await supabaseAdmin
      .from('user_teams')
      .select('id, user_id')
      .eq('id', teamId)
      .eq('user_id', userId)
      .maybeSingle();

    if (teamError || !team) {
      return NextResponse.json({ error: 'Team not found or does not belong to user' }, { status: 403 });
    }

    // Create or update lineup manually since RPC doesn't accept team_id
    let lineupId: string;
    
    // Check if lineup already exists for this team and week
    const { data: existingLineup, error: findLineupError } = await supabaseAdmin
      .from('lineups')
      .select('id')
      .eq('team_id', teamId)
      .eq('week_id', weekId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existingLineup) {
      // Update existing lineup
      lineupId = existingLineup.id;
    } else {
      // Create new lineup
      const { data: newLineup, error: createLineupError } = await supabaseAdmin
        .from('lineups')
        .insert({
          user_id: userId,
          team_id: teamId,
          week_id: weekId,
          status: 'draft',
          total_points: 0
        })
        .select('id')
        .single();

      if (createLineupError || !newLineup) {
        console.error('Failed to create lineup:', createLineupError);
        return NextResponse.json({ error: 'Failed to create lineup' }, { status: 500 });
      }
      
      lineupId = newLineup.id;
    }

    // Delete existing lineup slots
    await supabaseAdmin
      .from('lineup_slots')
      .delete()
      .eq('lineup_id', lineupId);

    // Map specific slots to database enum values
    const mapSlotToEnum = (slot: string): string => {
      const mapping: Record<string, string> = {
        'QB': 'QB',
        'RB1': 'RB',
        'RB2': 'RB',
        'WR1': 'WR',
        'WR2': 'WR',
        'TE': 'TE',
        'FLEX': 'FLEX',
        'BENCH': 'BENCH'
      };
      return mapping[slot] || slot;
    };

    // Insert new lineup slots
    const slotsToInsert = slots
      .filter(slot => slot.user_card_id) // Only insert slots with cards
      .map(slot => ({
        lineup_id: lineupId,
        slot: mapSlotToEnum(slot.slot), // Map to database enum
        user_card_id: slot.user_card_id,
        applied_token_id: slot.applied_token_id || null
      }));

    if (slotsToInsert.length > 0) {
      const { error: insertSlotsError } = await supabaseAdmin
        .from('lineup_slots')
        .insert(slotsToInsert);

      if (insertSlotsError) {
        console.error('Failed to insert lineup slots:', insertSlotsError);
        return NextResponse.json({ error: 'Failed to save lineup slots' }, { status: 500 });
      }
    }

    console.log('Lineup saved successfully:', lineupId, `(${slotsToInsert.length} slots)`);
    
    return NextResponse.json({ 
      ok: true, 
      lineup_id: lineupId,
      message: `Lineup saved for Week ${week.week_number}!`,
      validation: {
        valid: true,
        filled_slots: slotsToInsert.length,
        total_slots: slots.length
      }
    });

  } catch (err: unknown) {
    console.error('Lineup submission error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
