import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const BodySchema = z.object({ 
  userCardId: z.string().uuid(),
  teamId: z.string().uuid()
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const { userCardId, teamId } = BodySchema.parse(json);

    const authHeader = req.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const token = authHeader.replace('Bearer ', '');

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

    // Get card details for response
    const { data: cardDetails, error: cardErr } = await supabaseAdmin
      .from('user_cards')
      .select(`
        id,
        current_sell_value,
        remaining_contracts,
        status,
        team_id,
        cards (
          id,
          players (first_name, last_name)
        )
      `)
      .eq('id', userCardId)
      .eq('user_id', userId)
      .eq('team_id', teamId)
      .eq('status', 'owned')
      .single();

    if (cardErr || !cardDetails) {
      return NextResponse.json({ error: 'Card not found or not owned by this team' }, { status: 400 });
    }

    if (cardDetails.remaining_contracts <= 0) {
      return NextResponse.json({ error: 'Cannot sell card with no remaining contracts' }, { status: 400 });
    }

    // Sell the card using team-specific function
    const { data: result, error: sellErr } = await supabaseAdmin.rpc('sell_card_for_team', {
      p_user_card_id: userCardId,
      p_user_id: userId,
      p_team_id: teamId
    });

    if (sellErr) {
      console.error('Card selling error:', sellErr);
      return NextResponse.json({ 
        error: 'Failed to sell card', 
        details: sellErr.message 
      }, { status: 500 });
    }

    const playerName = cardDetails.cards?.players ? 
      `${cardDetails.cards.players.first_name} ${cardDetails.cards.players.last_name}` : 
      'Unknown Player';

    return NextResponse.json({
      success: true,
      message: `Sold ${playerName} for ${result.coins_received} coins`,
      coinsReceived: result.coins_received,
      newBalance: team.coins + result.coins_received,
      cardSold: {
        id: cardDetails.id,
        playerName: playerName,
        sellValue: result.coins_received
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
