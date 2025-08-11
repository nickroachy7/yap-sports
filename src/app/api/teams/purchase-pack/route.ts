import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const BodySchema = z.object({ 
  packId: z.string().uuid(),
  teamId: z.string().uuid(),
  idempotencyKey: z.string().min(10)
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const { packId, teamId, idempotencyKey } = BodySchema.parse(json);

    const authHeader = req.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const token = authHeader.replace('Bearer ', '');

    // Get user
    const { data: { user }, error: getUserError } = await supabaseAdmin.auth.getUser(token);
    if (getUserError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = user.id;

    // Verify team ownership
    const { data: team, error: teamError } = await supabaseAdmin
      .from('user_teams')
      .select('id, coins')
      .eq('id', teamId)
      .eq('user_id', userId)
      .eq('active', true)
      .single();

    if (teamError || !team) {
      return NextResponse.json({ error: 'Team not found or not owned by user' }, { status: 403 });
    }

    // Idempotency check: create a unique transaction per team and idempotency key
    const { data: existingTxn, error: existingErr } = await supabaseAdmin
      .from('transactions')
      .select('id')
      .eq('user_id', userId)
      .eq('type', 'purchase-pack')
      .contains('meta_json', { idempotencyKey, teamId })
      .maybeSingle();
    if (existingErr) throw existingErr;
    
    if (existingTxn) {
      return NextResponse.json({ 
        success: true, 
        message: 'Pack already purchased (idempotency)', 
        transactionId: existingTxn.id 
      });
    }

    // Get pack details
    const { data: pack, error: packError } = await supabaseAdmin
      .from('packs')
      .select('*')
      .eq('id', packId)
      .eq('enabled', true)
      .single();
    if (packError || !pack) {
      return NextResponse.json({ error: 'Pack not found' }, { status: 404 });
    }

    // Check if team has enough coins
    if (team.coins < pack.price_coins) {
      return NextResponse.json({ 
        error: 'Insufficient coins',
        required: pack.price_coins,
        available: team.coins
      }, { status: 400 });
    }

    // Call the database function to handle the transaction atomically
    const { data: result, error: purchaseError } = await supabaseAdmin.rpc('purchase_pack_for_team', {
      p_user_id: userId,
      p_team_id: teamId,
      p_pack_id: packId,
      p_price: pack.price_coins,
      p_idempotency_key: idempotencyKey
    });

    if (purchaseError) {
      console.error('Purchase error:', purchaseError);
      return NextResponse.json({ 
        error: 'Purchase failed', 
        details: purchaseError.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Purchased ${pack.name} for ${pack.price_coins} coins`,
      userPackId: result.user_pack_id,
      remainingCoins: result.remaining_coins,
      pack: {
        id: pack.id,
        name: pack.name,
        price: pack.price_coins
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
