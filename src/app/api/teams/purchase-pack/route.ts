import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const BodySchema = z.object({ 
  packId: z.string().uuid(),
  teamId: z.string().uuid(),
  idempotencyKey: z.string().min(10)
});

// Rarity weights for card distribution
// Balanced for exciting packs with better mix of good/bad cards
const RARITY_WEIGHTS = {
  common: 45,      // 45% - Common but not overwhelming
  uncommon: 30,    // 30% - Solid middle tier
  rare: 17,        // 17% - Good pull frequency
  epic: 6,         // 6% - Exciting finds
  legendary: 2     // 2% - Rare but achievable!
};

// Default cards per pack
const CARDS_PER_PACK = 5;

export async function POST(req: NextRequest) {
  try {
    console.log('=== PACK PURCHASE REQUEST STARTED ===');
    const json = await req.json();
    console.log('Request body:', json);
    
    let packId, teamId, idempotencyKey;
    try {
      const parsed = BodySchema.parse(json);
      packId = parsed.packId;
      teamId = parsed.teamId;
      idempotencyKey = parsed.idempotencyKey;
      console.log('Validated params:', { packId, teamId, idempotencyKey });
    } catch (validationError: any) {
      console.error('Validation error:', validationError);
      return NextResponse.json({ 
        error: 'Invalid request parameters', 
        details: validationError.message,
        required: 'packId (uuid), teamId (uuid), idempotencyKey (string min 10 chars)'
      }, { status: 400 });
    }

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
    let grantedCards;
    try {
      grantedCards = await generateRandomCards(CARDS_PER_PACK);
      console.log('Generated cards:', grantedCards.length);
    } catch (cardGenError: any) {
      console.error('Card generation error:', cardGenError);
      return NextResponse.json({ 
        error: 'Failed to generate cards', 
        details: cardGenError.message,
        hint: 'Check if cards and players tables exist'
      }, { status: 500 });
    }
    
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
      user_id: userId,
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
 * Performance-weighted: Better players appear more often!
 * Only includes playable positions: QB, RB, WR, TE
 */
async function generateRandomCards(count: number) {
  // Only allow playable positions for the fantasy game
  // Note: Database stores full position names, not abbreviations
  const PLAYABLE_POSITIONS = ['Quarterback', 'Running Back', 'Wide Receiver', 'Tight End'];
  
  console.log('Fetching active players with positions:', PLAYABLE_POSITIONS);
  
  // First, get total count of eligible players
  const { count: totalPlayers } = await supabaseAdmin
    .from('players')
    .select('*', { count: 'exact', head: true })
    .eq('active', true)
    .in('position', PLAYABLE_POSITIONS);
  
  console.log('Total eligible players:', totalPlayers);
  
  // Use a random offset to get different players each time
  const randomOffset = Math.floor(Math.random() * Math.max(0, (totalPlayers || 1000) - 500));
  
  // Get a pool of random active players (fetch more than needed to ensure variety)
  const { data: players, error: playersError } = await supabaseAdmin
    .from('players')
    .select('id, first_name, last_name, position, team')
    .eq('active', true)
    .in('position', PLAYABLE_POSITIONS)
    .range(randomOffset, randomOffset + 499); // Random window of 500 players

  console.log('Query result - Players:', players?.length || 0, 'Offset:', randomOffset, 'Error:', playersError);

  if (playersError) {
    console.error('Database error fetching players:', playersError);
    throw new Error(`Database error: ${playersError.message}`);
  }

  if (!players || players.length === 0) {
    console.error('No active players found with positions:', PLAYABLE_POSITIONS);
    
    // Try without position filter to see if there are ANY active players
    const { data: anyPlayers, error: anyError } = await supabaseAdmin
      .from('players')
      .select('id, position')
      .eq('active', true)
      .limit(10);
    
    console.log('Sample of active players in DB:', anyPlayers);
    
    throw new Error('No active players available with playable positions');
  }
  
  console.log('Successfully fetched', players.length, 'active players');

  // Fetch recent performance data for all players to weight selection
  const playersWithPerformance = await calculatePlayerPerformanceWeights(players);
  
  // Group players by position for balanced selection
  const playersByPosition = playersWithPerformance.reduce((acc, player) => {
    if (!acc[player.position]) acc[player.position] = [];
    acc[player.position].push(player);
    return acc;
  }, {} as Record<string, typeof playersWithPerformance>);
  
  console.log('Players by position:', Object.keys(playersByPosition).map(pos => 
    `${pos}: ${playersByPosition[pos].length}`
  ).join(', '));

  // Select players with WEIGHTED probability based on performance
  const selectedPlayers = [];
  const positions = Object.keys(playersByPosition);
  
  for (let i = 0; i < count; i++) {
    // Randomly select a position (equal odds for each)
    const randomPosition = positions[Math.floor(Math.random() * positions.length)];
    const positionPlayers = playersByPosition[randomPosition];
    
    // Use weighted random selection - better players more likely!
    const randomPlayer = weightedRandomPlayer(positionPlayers);
    selectedPlayers.push(randomPlayer);
    
    const perfTier = randomPlayer.performanceTier || 'unknown';
    const avgPoints = randomPlayer.avgFantasyPoints?.toFixed(1) || '?';
    console.log(`Card ${i + 1}: Selected ${randomPlayer.first_name} ${randomPlayer.last_name} (${randomPosition}) - ${perfTier} tier (${avgPoints} FP/game)`);
  }
  
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

/**
 * Calculate performance weights for players based on recent game stats
 * Better performing players get higher weights = more likely to appear in packs
 * Players with NO stats for the season have very low weight (0.1x)
 */
async function calculatePlayerPerformanceWeights(players: any[]) {
  const GAMES_TO_ANALYZE = 5; // Look at last 5 games
  const CURRENT_SEASON_YEAR = 2025; // Current season
  
  const playersWithWeights = await Promise.all(
    players.map(async (player) => {
      try {
        // First, check if player has ANY stats for current season
        const { data: seasonStats, error: seasonError } = await supabaseAdmin
          .from('player_game_stats')
          .select('stat_json, created_at')
          .eq('player_id', player.id)
          .eq('finalized', true)
          .gte('created_at', `${CURRENT_SEASON_YEAR}-01-01`)
          .order('created_at', { ascending: false })
          .limit(GAMES_TO_ANALYZE);

        // If player has NO stats at all for the season, they're likely injured/benched/practice squad
        if (!seasonStats || seasonStats.length === 0) {
          return {
            ...player,
            avgFantasyPoints: 0,
            gamesAnalyzed: 0,
            performanceTier: 'no-stats',
            selectionWeight: 0.001, // VIRTUALLY IMPOSSIBLE (1000x less likely than average!)
            hasSeasonStats: false
          };
        }

        // Calculate average fantasy points from recent games
        let avgFantasyPoints = 0;
        let gamesPlayed = 0;
        let totalPoints = 0;

        for (const stat of seasonStats) {
          const fp = stat.stat_json?.fantasy_points || 0;
          totalPoints += fp;
          if (fp > 0) gamesPlayed++;
        }

        avgFantasyPoints = gamesPlayed > 0 ? totalPoints / gamesPlayed : 0;

        // Determine performance tier and weight based on actual performance
        // EXTREME weighting: Only top performers appear regularly!
        let performanceTier: string;
        let selectionWeight: number;

        if (avgFantasyPoints >= 15) {
          performanceTier = 'elite';
          selectionWeight = 50.0; // 50x more likely than average! 🔥🔥🔥
        } else if (avgFantasyPoints >= 12) {
          performanceTier = 'star';
          selectionWeight = 25.0; // 25x more likely! 🔥🔥
        } else if (avgFantasyPoints >= 10) {
          performanceTier = 'above-average';
          selectionWeight = 10.0; // 10x more likely! 🔥
        } else if (avgFantasyPoints >= 8) {
          performanceTier = 'good';
          selectionWeight = 4.0; // 4x more likely
        } else if (avgFantasyPoints >= 6) {
          performanceTier = 'average';
          selectionWeight = 1.0; // Baseline
        } else if (avgFantasyPoints >= 4) {
          performanceTier = 'below-average';
          selectionWeight = 0.2; // Very rare
        } else if (avgFantasyPoints >= 2) {
          performanceTier = 'bench-warmer';
          selectionWeight = 0.05; // Extremely rare
        } else if (avgFantasyPoints > 0) {
          performanceTier = 'minimal-impact';
          selectionWeight = 0.01; // Almost never
        } else {
          // Has stats but 0 FP (edge case - maybe on special teams only)
          performanceTier = 'zero-impact';
          selectionWeight = 0.001; // Virtually impossible
        }

        return {
          ...player,
          avgFantasyPoints,
          gamesAnalyzed: seasonStats.length,
          performanceTier,
          selectionWeight,
          hasSeasonStats: true
        };
      } catch (error) {
        console.warn(`Error fetching stats for ${player.first_name} ${player.last_name}:`, error);
        // On error, treat as no stats - virtually impossible to select
        return {
          ...player,
          avgFantasyPoints: 0,
          gamesAnalyzed: 0,
          performanceTier: 'error',
          selectionWeight: 0.001,
          hasSeasonStats: false
        };
      }
    })
  );

  return playersWithWeights;
}

/**
 * Weighted random selection - better players more likely to be selected
 */
function weightedRandomPlayer(players: any[]) {
  // Calculate total weight
  const totalWeight = players.reduce((sum, player) => sum + (player.selectionWeight || 1.0), 0);
  
  // Pick a random value between 0 and total weight
  let random = Math.random() * totalWeight;
  
  // Find the player that corresponds to this random value
  for (const player of players) {
    random -= player.selectionWeight || 1.0;
    if (random <= 0) {
      return player;
    }
  }
  
  // Fallback to last player (should never reach here)
  return players[players.length - 1];
}

/**
 * Fisher-Yates shuffle algorithm for true random shuffling
 * More random than Array.sort(() => Math.random() - 0.5)
 */
function fisherYatesShuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
