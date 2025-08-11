import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const token = authHeader.replace('Bearer ', '');

    const { data: { user }, error: getUserError } = await supabaseAdmin.auth.getUser(token);
    if (getUserError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Get a user card to test evolution
    const { data: userCards, error: cardsError } = await supabaseAdmin
      .from('user_cards')
      .select('id, current_rarity, total_fantasy_points')
      .eq('user_id', user.id)
      .eq('status', 'owned')
      .limit(1);

    if (cardsError || !userCards || userCards.length === 0) {
      return NextResponse.json({ 
        error: 'No cards found to test evolution. Purchase and open some packs first.' 
      }, { status: 400 });
    }

    const testCard = userCards[0];

    // Simulate adding fantasy points to trigger evolution
    const pointsToAdd = 25; // Good game performance

    const { data: evolutionResult, error: evolutionError } = await supabaseAdmin.rpc('evolve_user_card', {
      p_user_card_id: testCard.id,
      p_fantasy_points: pointsToAdd
    });

    if (evolutionError) {
      return NextResponse.json({ 
        error: 'Evolution failed', 
        details: evolutionError.message 
      }, { status: 500 });
    }

    // Get updated card info
    const { data: updatedCardInfo, error: cardInfoError } = await supabaseAdmin.rpc('get_user_card_with_evolution', {
      p_user_card_id: testCard.id
    });

    return NextResponse.json({
      success: true,
      message: `Added ${pointsToAdd} fantasy points to card`,
      evolution: evolutionResult,
      cardInfo: updatedCardInfo,
      testNotes: [
        'All cards start as Common (100 coins, 6 contracts)',
        'Evolution thresholds: 40pts→Rare, 100pts→Epic, 200pts→Legendary',
        'Cards evolve based on fantasy points scored in starting lineups',
        'Each evolution increases sell value and contracts'
      ]
    });

  } catch (err: any) {
    console.error('Evolution test error:', err);
    return NextResponse.json({ 
      error: 'Test failed', 
      details: err.message 
    }, { status: 500 });
  }
}

