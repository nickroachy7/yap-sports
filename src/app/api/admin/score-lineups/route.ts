import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const BodySchema = z.object({
  weekId: z.string().uuid().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json().catch(() => ({}));
    const { weekId } = BodySchema.parse(json);

    // For development, we'll allow anyone to trigger scoring
    // In production, this should be restricted to admin users or cron jobs

    let targetWeekId = weekId;

    // If no week specified, use the current/latest week
    if (!targetWeekId) {
      const { data: week } = await supabaseAdmin
        .from('weeks')
        .select('id')
        .order('week_number', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (!week) {
        return NextResponse.json({ error: 'No weeks found' }, { status: 400 });
      }
      targetWeekId = week.id;
    }

    // Get all submitted lineups for this week
    const { data: lineups, error: lineupsError } = await supabaseAdmin
      .from('lineups')
      .select('id, user_id')
      .eq('week_id', targetWeekId)
      .eq('status', 'submitted');

    if (lineupsError) {
      console.error('Error fetching lineups:', lineupsError);
      return NextResponse.json({ error: 'Failed to fetch lineups' }, { status: 400 });
    }

    if (!lineups || lineups.length === 0) {
      return NextResponse.json({ 
        message: 'No submitted lineups found for this week',
        week_id: targetWeekId,
        scored_count: 0
      });
    }

    const scoringResults = [];
    let successCount = 0;
    let errorCount = 0;

    // Score each lineup
    for (const lineup of lineups) {
      try {
        console.log(`Scoring lineup ${lineup.id} for user ${lineup.user_id}`);
        
        const { data: result, error: scoringError } = await supabaseAdmin.rpc('score_lineup_for_week', {
          p_lineup_id: lineup.id,
          p_week_id: targetWeekId,
        });

        if (scoringError) {
          console.error(`Error scoring lineup ${lineup.id}:`, scoringError);
          errorCount++;
          scoringResults.push({
            lineup_id: lineup.id,
            user_id: lineup.user_id,
            success: false,
            error: scoringError.message
          });
        } else {
          console.log(`Successfully scored lineup ${lineup.id}:`, result);
          successCount++;
          scoringResults.push({
            lineup_id: lineup.id,
            user_id: lineup.user_id,
            success: true,
            total_points: result.total_points,
            team_result: result.team_result
          });

          // Consume token uses for tokens that were applied
          const tokenIds = result.slot_results
            ?.flatMap((slot: any) => 
              slot.token_evaluations?.map((evaluation: any) => evaluation.user_token_id) || []
            )
            ?.filter((id: any) => id) || [];
          
          if (tokenIds.length > 0) {
            // Use RPC to decrement uses_remaining atomically
            await supabaseAdmin.rpc('decrement_token_uses', { token_ids: tokenIds });
          }
        }
      } catch (err: any) {
        console.error(`Unexpected error scoring lineup ${lineup.id}:`, err);
        errorCount++;
        scoringResults.push({
          lineup_id: lineup.id,
          user_id: lineup.user_id,
          success: false,
          error: err.message || 'Unknown error'
        });
      }
    }

    console.log(`Scoring complete: ${successCount} successful, ${errorCount} failed`);

    return NextResponse.json({
      message: `Scoring complete for week ${targetWeekId}`,
      week_id: targetWeekId,
      total_lineups: lineups.length,
      successful: successCount,
      failed: errorCount,
      results: scoringResults
    });

  } catch (err: any) {
    console.error('Scoring process error:', err);
    const message = err?.message || 'Unknown error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
