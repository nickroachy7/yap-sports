import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const LineupSlotSchema = z.object({
  slot: z.enum(['QB', 'RB', 'WR', 'TE', 'FLEX', 'BENCH']),
  user_card_id: z.string().uuid().optional(),
  applied_token_id: z.string().uuid().optional(),
});

const BodySchema = z.object({
  weekId: z.string().uuid(),
  slots: z.array(LineupSlotSchema),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const { weekId, slots } = BodySchema.parse(json);

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

    // Call database function for atomic submission
    const { data, error } = await supabaseAdmin.rpc('submit_lineup_txn', {
      p_user_id: userId,
      p_week_id: weekId,
      p_lineup_slots: slots,
    });

    if (error) {
      console.error('Submit lineup RPC error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!data.success) {
      return NextResponse.json({ 
        error: data.error || 'Lineup submission failed',
        validation: data.validation 
      }, { status: 400 });
    }

    console.log('Lineup submitted successfully:', data);
    return NextResponse.json({ 
      ok: true, 
      lineup_id: data.lineup_id,
      message: `Lineup submitted for Week ${week.week_number}!`,
      validation: data.validation
    });

  } catch (err: unknown) {
    console.error('Lineup submission error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
