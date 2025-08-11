import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: NextRequest) {
  try {
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

    // Get some random cards from each position to create a balanced roster
    const { data: cards, error: cardsError } = await supabaseAdmin
      .from('cards')
      .select(`
        id, rarity, base_contracts, base_sell_value,
        players (position, first_name, last_name, team)
      `)
      .limit(50);

    if (cardsError || !cards) {
      return NextResponse.json({ error: 'Failed to fetch cards' }, { status: 400 });
    }

    // Group cards by position
    const cardsByPosition = cards.reduce((acc: any, card: any) => {
      const pos = card.players.position;
      if (!acc[pos]) acc[pos] = [];
      acc[pos].push(card);
      return acc;
    }, {});

    // Grant cards for a complete roster
    const cardsToGrant = [
      ...(cardsByPosition['QB']?.slice(0, 2) || []),  // 2 QBs
      ...(cardsByPosition['RB']?.slice(0, 4) || []),  // 4 RBs  
      ...(cardsByPosition['WR']?.slice(0, 4) || []),  // 4 WRs
      ...(cardsByPosition['TE']?.slice(0, 2) || []),  // 2 TEs
    ];

    const grantedCards = [];

    for (const card of cardsToGrant) {
      // Calculate initial sell value
      const sellValue = Math.round(card.base_sell_value * (
        card.rarity === 'epic' ? 2 : 
        card.rarity === 'rare' ? 1.5 : 1
      ));

      const { data: userCard, error: insertError } = await supabaseAdmin
        .from('user_cards')
        .insert({
          user_id: userId,
          card_id: card.id,
          remaining_contracts: card.base_contracts,
          current_sell_value: sellValue,
          status: 'owned'
        })
        .select('id')
        .single();

      if (!insertError && userCard) {
        grantedCards.push({
          user_card_id: userCard.id,
          player_name: `${card.players.first_name} ${card.players.last_name}`,
          position: card.players.position,
          team: card.players.team,
          rarity: card.rarity,
          contracts: card.base_contracts
        });
      }
    }

    return NextResponse.json({
      ok: true,
      message: `Granted ${grantedCards.length} cards for a complete roster!`,
      cards: grantedCards
    });

  } catch (err: any) {
    console.error('Grant cards error:', err);
    const message = err?.message || 'Unknown error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
