import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const BodySchema = z.object({ packId: z.string().uuid(), idempotencyKey: z.string().min(10) });

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const { packId, idempotencyKey } = BodySchema.parse(json);

    const authHeader = req.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const token = authHeader.replace('Bearer ', '');

    // Get user
    const { data: { user }, error: getUserError } = await supabaseAdmin.auth.getUser(token);
    if (getUserError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = user.id;

    // Idempotency check: create a unique transaction per idempotency key
    const { data: existingTxn, error: existingErr } = await supabaseAdmin
      .from('transactions')
      .select('id')
      .eq('user_id', userId)
      .eq('type', 'purchase-pack')
      .contains('meta_json', { idempotencyKey })
      .maybeSingle();
    if (existingErr) throw existingErr;
    if (existingTxn) return NextResponse.json({ ok: true, transactionId: existingTxn.id });

    // Fetch pack and price
    const { data: pack, error: packErr } = await supabaseAdmin
      .from('packs')
      .select('id, price_coins, enabled')
      .eq('id', packId)
      .maybeSingle();
    if (packErr || !pack || !pack.enabled) {
      return NextResponse.json({ error: 'Invalid pack' }, { status: 400 });
    }

    // Get profile balance
    const { data: profile, error: profErr } = await supabaseAdmin
      .from('profiles')
      .select('coins')
      .eq('user_id', userId)
      .maybeSingle();
    if (profErr || !profile) return NextResponse.json({ error: 'Profile not found' }, { status: 400 });
    if (Number(profile.coins) < Number(pack.price_coins)) return NextResponse.json({ error: 'Insufficient funds' }, { status: 400 });

    // Atomic: decrement coins, insert user_pack, insert transaction
    const { data, error } = await supabaseAdmin.rpc('purchase_pack_txn', {
      p_user_id: userId,
      p_pack_id: packId,
      p_price: pack.price_coins,
      p_idempotency_key: idempotencyKey,
    });
    if (error) throw error;

    return NextResponse.json({ ok: true, userPackId: data?.user_pack_id, transactionId: data?.transaction_id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}


