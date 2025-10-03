import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * Cleanup endpoint to handle cards for retired players
 * This will sell cards for retired players and return coins to the user
 */
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

    // Get optional team ID from body (if not provided, clean up all teams)
    const body = await req.json().catch(() => ({}));
    const teamId = body.teamId;

    // Find all user cards for retired players
    let query = supabaseAdmin
      .from('user_cards')
      .select(`
        id,
        current_sell_value,
        team_id,
        cards!inner (
          id,
          players!inner (
            id,
            first_name,
            last_name,
            position,
            team,
            active
          )
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'owned')
      .eq('cards.players.active', false); // Only retired players

    if (teamId) {
      query = query.eq('team_id', teamId);
    }

    const { data: retiredCards, error: retiredCardsError } = await query;

    if (retiredCardsError) {
      console.error('Error finding retired cards:', retiredCardsError);
      return NextResponse.json({ error: 'Failed to find retired cards' }, { status: 500 });
    }

    if (!retiredCards || retiredCards.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No retired player cards found',
        cardsRemoved: 0,
        coinsRefunded: 0
      });
    }

    // Group cards by team to update coins
    const cardsByTeam = retiredCards.reduce((acc, card) => {
      if (!acc[card.team_id]) {
        acc[card.team_id] = [];
      }
      acc[card.team_id].push(card);
      return acc;
    }, {} as Record<string, typeof retiredCards>);

    const removedCards: any[] = [];
    let totalCoinsRefunded = 0;

    // Process each team
    for (const [teamId, cards] of Object.entries(cardsByTeam)) {
      const totalValue = cards.reduce((sum, card) => sum + (card.current_sell_value || 0), 0);

      // Mark cards as sold
      const cardIds = cards.map(c => c.id);
      const { error: updateError } = await supabaseAdmin
        .from('user_cards')
        .update({ status: 'sold' })
        .in('id', cardIds);

      if (updateError) {
        console.error(`Error selling cards for team ${teamId}:`, updateError);
        continue;
      }

      // Add coins to team (fetch current coins first)
      const { data: teamData, error: teamError } = await supabaseAdmin
        .from('user_teams')
        .select('coins')
        .eq('id', teamId)
        .single();

      if (teamError) {
        console.error(`Error fetching team ${teamId}:`, teamError);
        // Continue anyway - cards are already marked as sold
      } else {
        // Update team coins
        const newCoins = (teamData.coins || 0) + totalValue;
        const { error: updateError } = await supabaseAdmin
          .from('user_teams')
          .update({ coins: newCoins })
          .eq('id', teamId);

        if (updateError) {
          console.error(`Error updating coins for team ${teamId}:`, updateError);
        }
      }

      // Record transaction
      await supabaseAdmin
        .from('transactions')
        .insert({
          user_id: userId,
          type: 'sell-card',
          amount: totalValue,
          meta_json: {
            source: 'retired-player-cleanup',
            team_id: teamId,
            card_count: cards.length,
            cards: cards.map(c => ({
              id: c.id,
              player_name: `${c.cards.players.first_name} ${c.cards.players.last_name}`,
              sell_value: c.current_sell_value
            }))
          }
        });

      removedCards.push(...cards.map(c => ({
        player_name: `${c.cards.players.first_name} ${c.cards.players.last_name}`,
        position: c.cards.players.position,
        team: c.cards.players.team,
        sell_value: c.current_sell_value
      })));

      totalCoinsRefunded += totalValue;
    }

    return NextResponse.json({
      success: true,
      message: `Successfully removed ${removedCards.length} cards for retired players`,
      cardsRemoved: removedCards.length,
      coinsRefunded: totalCoinsRefunded,
      removedCards: removedCards
    });

  } catch (err: any) {
    console.error('Cleanup retired cards error:', err);
    return NextResponse.json({ 
      error: 'Failed to cleanup retired cards', 
      details: err.message 
    }, { status: 500 });
  }
}

