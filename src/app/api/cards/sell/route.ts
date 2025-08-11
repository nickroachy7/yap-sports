import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const BodySchema = z.object({
  userCardId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const { userCardId } = BodySchema.parse(json);

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

    // Call database function for atomic card sale
    const { data, error } = await supabaseAdmin.rpc('sell_card_txn', {
      p_user_id: userId,
      p_user_card_id: userCardId,
    });

    if (error) {
      console.error('Sell card RPC error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!data.success) {
      return NextResponse.json({ 
        error: data.error || 'Card sale failed'
      }, { status: 400 });
    }

    console.log('Card sold successfully:', data);
    return NextResponse.json({ 
      ok: true,
      sell_price: data.sell_price,
      new_balance: data.new_balance,
      card_rarity: data.card_rarity,
      message: `Card sold for ${data.sell_price} coins!`
    });

  } catch (err: unknown) {
    console.error('Card sale error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
