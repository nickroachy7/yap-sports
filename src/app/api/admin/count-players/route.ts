import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(req: NextRequest) {
  try {
    // Count total players
    const { count: total, error: totalError } = await supabaseAdmin
      .from('players')
      .select('*', { count: 'exact', head: true });

    // Count players with external_id
    const { count: withExternalId, error: externalError } = await supabaseAdmin
      .from('players')
      .select('*', { count: 'exact', head: true })
      .not('external_id', 'is', null);

    // Count players without external_id
    const { count: withoutExternalId, error: nullError } = await supabaseAdmin
      .from('players')
      .select('*', { count: 'exact', head: true })
      .is('external_id', null);

    // Get sample of players with external_id
    const { data: sampleWith } = await supabaseAdmin
      .from('players')
      .select('id, first_name, last_name, external_id, team')
      .not('external_id', 'is', null)
      .limit(5);

    // Get sample of players without external_id
    const { data: sampleWithout } = await supabaseAdmin
      .from('players')
      .select('id, first_name, last_name, external_id, team')
      .is('external_id', null)
      .limit(5);

    return NextResponse.json({
      success: true,
      counts: {
        total: total || 0,
        with_external_id: withExternalId || 0,
        without_external_id: withoutExternalId || 0,
        percentage_with_id: total ? Math.round(((withExternalId || 0) / total) * 100) : 0
      },
      samples: {
        with_external_id: sampleWith,
        without_external_id: sampleWithout
      }
    });

  } catch (err: any) {
    return NextResponse.json({
      error: err.message
    }, { status: 500 });
  }
}
