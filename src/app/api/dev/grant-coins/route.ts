import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const BodySchema = z.object({ amount: z.number().int().positive().max(1_000_000) });

export async function POST(req: NextRequest) {
  const devMode = process.env.NODE_ENV !== 'production';
  if (!devMode) return NextResponse.json({ error: 'Disabled' }, { status: 403 });
  try {
    const json = await req.json();
    const { amount } = BodySchema.parse(json);
    const authHeader = req.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = user.id;

    const { error } = await supabaseAdmin.rpc('grant_coins_txn', { p_user_id: userId, p_amount: amount });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 400 });
  }
}


