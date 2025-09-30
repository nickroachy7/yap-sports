import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const BodySchema = z.object({ 
  packId: z.string().uuid(),
  teamId: z.string().uuid(),
  idempotencyKey: z.string().min(10)
});

// Rarity weights for card distribution
const RARITY_WEIGHTS = {
  common: 60,
  uncommon: 25,
  rare: 10,
  epic: 4,
  legendary: 1
};

// Default cards per pack
const CARDS_PER_PACK = 5;

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
      .select('id, meta_json')
      .eq('user_id', userId)
      .eq('type', 'purchase-pack')
      .contains('meta_json', { idempotencyKey, teamId })
      .maybeSingle();
    if (existingErr) throw existingErr;
    
    if (existingTxn) {
      // Return the previously granted cards from meta_json
      const grantedCards = existingTxn.meta_json?.grantedCards || [];
      return NextResponse.json({ 
        success: true, 
        message: 'Pack already purchased (idempotency)', 
        transactionId: existingTxn.id,
        cards: grantedCards
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

    // Generate random cards from active players
    console.log('Generating random cards...');
    const grantedCards = await generateRandomCards(CARDS_PER_PACK);
    console.log('Generated cards:', grantedCards.length);
    
    if (!grantedCards || grantedCards.length === 0) {
      console.error('No cards generated!');
      return NextResponse.json({ 
        error: 'Failed to generate cards', 
        details: 'No active players available' 
      }, { status: 500 });
    }

    // Deduct coins from team
    console.log('Deducting coins from team...');
    const { error: updateCoinsError } = await supabaseAdmin
      .from('user_teams')
      .update({ coins: team.coins - pack.price_coins })
      .eq('id', teamId);

    if (updateCoinsError) {
      console.error('Failed to update coins:', updateCoinsError);
      throw updateCoinsError;
    }
    console.log('Coins updated successfully');

    // Add cards to user's inventory
    console.log('Preparing to insert user cards...');
    const userCards = grantedCards.map(card => ({
      team_id: teamId,
      card_id: card.id,
      remaining_contracts: card.base_contracts || 3,
      current_sell_value: card.base_sell_value || 100,
      status: 'owned' as const,
      acquired_at: new Date().toISOString()
    }));
    console.log('User cards to insert:', userCards);

    const { error: insertCardsError } = await supabaseAdmin
      .from('user_cards')
      .insert(userCards);

    if (insertCardsError) {
      console.error('Failed to insert cards:', insertCardsError);
      console.error('Insert error details:', JSON.stringify(insertCardsError, null, 2));
      // Rollback coins
      await supabaseAdmin
        .from('user_teams')
        .update({ coins: team.coins })
        .eq('id', teamId);
      throw insertCardsError;
    }
    console.log('Cards inserted successfully');

    // Create transaction record
    const { data: transaction, error: txnError } = await supabaseAdmin
      .from('transactions')
      .insert({
        user_id: userId,
        type: 'purchase-pack',
        amount: -pack.price_coins,
        meta_json: { 
          idempotencyKey, 
          teamId, 
          packId,
          grantedCards: grantedCards.map(c => ({
            id: c.id,
            player_name: c.player_name,
            rarity: c.rarity,
            position: c.position,
            team: c.team
          }))
        }
      })
      .select()
      .single();

    if (txnError) {
      console.error('Failed to create transaction:', txnError);
    }

    // Get detailed card information for response
    const detailedCards = await Promise.all(
      grantedCards.map(async (card) => {
        const { data: playerData } = await supabaseAdmin
          .from('players')
          .select('id, first_name, last_name, position, team, jersey_number')
          .eq('id', card.player_id)
          .single();

        return {
          id: card.id,
          rarity: card.rarity,
          base_sell_value: card.base_sell_value,
          base_contracts: card.base_contracts,
          player: playerData || {
            id: card.player_id,
            first_name: 'Unknown',
            last_name: 'Player',
            position: card.position,
            team: card.team,
            jersey_number: null
          }
        };
      })
    );

    return NextResponse.json({
      success: true,
      message: `Purchased ${pack.name} and received ${grantedCards.length} cards!`,
      transactionId: transaction?.id,
      remainingCoins: team.coins - pack.price_coins,
      pack: {
        id: pack.id,
        name: pack.name,
        price: pack.price_coins
      },
      cards: detailedCards
    });

  } catch (err: any) {
    console.error('Pack purchase API Error:', err);
    console.error('Error stack:', err.stack);
    return NextResponse.json({ 
      error: 'Invalid request', 
      details: err.message || String(err),
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    }, { status: 400 });
  }
}

/**
 * Generate random cards from active players
 * Optimized to fetch all players once and create cards in batch
 */
async function generateRandomCards(count: number) {
  // Get a pool of random active players (fetch more than needed to ensure variety)
  const { data: players, error: playersError } = await supabaseAdmin
    .from('players')
    .select('id, first_name, last_name, position, team')
    .eq('active', true)
    .limit(500); // Get a good pool of players

  if (playersError || !players || players.length === 0) {
    console.error('Failed to fetch active players:', playersError);
    return [];
  }

  // Shuffle players to ensure randomness
  const shuffledPlayers = players.sort(() => Math.random() - 0.5);
  
  // Select random players for cards
  const selectedPlayers = shuffledPlayers.slice(0, count);
  
  // Get player IDs to check for existing cards
  const playerIds = selectedPlayers.map(p => p.id);
  
  // Fetch all existing cards for these players at once
  const { data: existingCards } = await supabaseAdmin
    .from('cards')
    .select('id, player_id, rarity, base_sell_value, base_contracts')
    .in('player_id', playerIds);
  
  // Create a map of existing cards by player_id
  const cardMap = new Map(existingCards?.map(c => [c.player_id, c]) || []);
  
  const cards = [];
  const cardsToCreate = [];

  // Process each selected player
  for (const player of selectedPlayers) {
    const existingCard = cardMap.get(player.id);
    const rarity = rollRarity(RARITY_WEIGHTS);

    if (existingCard) {
      // Use existing card
      cards.push({
        ...existingCard,
        player_name: `${player.first_name} ${player.last_name}`,
        position: player.position,
        team: player.team
      });
    } else {
      // Queue card creation
      const sellValue = getRarityValue(rarity, 'sell');
      const contracts = getRarityValue(rarity, 'contracts');
      
      cardsToCreate.push({
        player_id: player.id,
        rarity: rarity,
        base_sell_value: sellValue,
        base_contracts: contracts,
        player_info: player // Store for later reference
      });
    }
  }

  // Create all new cards in batch if any
  if (cardsToCreate.length > 0) {
    const { data: newCards, error: createError } = await supabaseAdmin
      .from('cards')
      .insert(cardsToCreate.map(c => ({
        player_id: c.player_id,
        rarity: c.rarity,
        base_sell_value: c.base_sell_value,
        base_contracts: c.base_contracts
      })))
      .select();

    if (createError) {
      console.error('Failed to create cards in batch:', createError);
    } else if (newCards) {
      // Add newly created cards to the result
      newCards.forEach((card, index) => {
        const playerInfo = cardsToCreate[index].player_info;
        cards.push({
          ...card,
          player_name: `${playerInfo.first_name} ${playerInfo.last_name}`,
          position: playerInfo.position,
          team: playerInfo.team
        });
      });
    }
  }

  return cards;
}

/**
 * Roll a random rarity based on weights
 */
function rollRarity(weights: Record<string, number>): string {
  const total = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
  let random = Math.random() * total;

  for (const [rarity, weight] of Object.entries(weights)) {
    random -= weight;
    if (random <= 0) return rarity;
  }

  return 'common'; // fallback
}

/**
 * Get base values for card based on rarity
 */
function getRarityValue(rarity: string, type: 'sell' | 'contracts'): number {
  const values = {
    common: { sell: 50, contracts: 3 },
    uncommon: { sell: 100, contracts: 4 },
    rare: { sell: 250, contracts: 5 },
    epic: { sell: 500, contracts: 6 },
    legendary: { sell: 1000, contracts: 8 }
  };

  return values[rarity as keyof typeof values]?.[type] || values.common[type];
}
