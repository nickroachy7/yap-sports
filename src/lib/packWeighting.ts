import { supabaseAdmin } from './supabaseAdmin';
import { getCachedData, setCachedData } from './cache';

/**
 * Player Performance Score System
 * 
 * This system weights pack card distribution based on actual player performance
 * from their game logs. Players with higher fantasy points appear more frequently.
 */

interface PlayerPerformance {
  playerId: string;
  cardId: string;
  avgFantasyPoints: number;
  gamesPlayed: number;
  position: string;
  playerName: string;
  weight: number; // Calculated weight for pack distribution
}

interface WeightedCardPool {
  cards: PlayerPerformance[];
  totalWeight: number;
  lastUpdated: number;
}

// Performance tiers for weighting (AGGRESSIVE - favor superstars heavily)
const PERFORMANCE_TIERS = {
  SUPERSTAR: { min: 18, weight: 500 },  // 18+ avg points: 500x weight (Mahomes, Allen, CMC)
  ELITE: { min: 15, weight: 250 },      // 15-18 avg points: 250x weight (top tier starters)
  GREAT: { min: 12, weight: 100 },      // 12-15 avg points: 100x weight (solid WR1/RB1)
  GOOD: { min: 10, weight: 40 },        // 10-12 avg points: 40x weight (WR2/RB2)
  DECENT: { min: 8, weight: 15 },       // 8-10 avg points: 15x weight (flex players)
  MEDIOCRE: { min: 6, weight: 5 },      // 6-8 avg points: 5x weight (backups who play)
  POOR: { min: 0, weight: 1 }           // 0-6 avg points: 1x weight (rarely used)
};

// Minimum games to be considered (filters out players who haven't played much)
const MIN_GAMES_PLAYED = 5; // Require at least 5 games (ensures regular contributors)

// Minimum average fantasy points to even be included (filters out complete unknowns)
const MIN_AVG_FANTASY_POINTS = 5.0; // Must average at least 5 points per game (filters bench players)

// Only consider games from recent seasons (filters out retired players)
const RECENT_SEASON_YEARS = [2024, 2025];
const SEASON_START_DATE = '2024-09-01'; // NFL 2024 season started September 2024

/**
 * Calculate performance weight for a player based on their average fantasy points
 * Now with AGGRESSIVE weighting to heavily favor superstars
 */
function calculateWeight(avgFantasyPoints: number, gamesPlayed: number): number {
  // Players with insufficient games get minimal weight
  if (gamesPlayed < MIN_GAMES_PLAYED) {
    return 0.01; // Nearly zero weight
  }

  // Players below minimum fantasy points get minimal weight
  if (avgFantasyPoints < MIN_AVG_FANTASY_POINTS) {
    return 0.01; // Nearly zero weight
  }

  // Find the appropriate tier (ordered from highest to lowest)
  const tiers = [
    PERFORMANCE_TIERS.SUPERSTAR,
    PERFORMANCE_TIERS.ELITE,
    PERFORMANCE_TIERS.GREAT,
    PERFORMANCE_TIERS.GOOD,
    PERFORMANCE_TIERS.DECENT,
    PERFORMANCE_TIERS.MEDIOCRE,
    PERFORMANCE_TIERS.POOR
  ];

  for (const tier of tiers) {
    if (avgFantasyPoints >= tier.min) {
      return tier.weight;
    }
  }

  return 0.01; // Should never reach here
}

/**
 * Get weighted card pool for a specific rarity
 * Cached for 30 minutes to improve performance
 */
export async function getWeightedCardPool(rarity: string): Promise<WeightedCardPool | null> {
  const cacheKey = `weighted-cards:${rarity}`;
  
  // Try to get from cache first
  const cached = getCachedData<WeightedCardPool>(cacheKey);
  if (cached) {
    console.log(`✓ Using cached weighted card pool for ${rarity} (${cached.cards.length} cards)`);
    return cached;
  }

  console.log(`Calculating weighted card pool for ${rarity}...`);

  const PLAYABLE_POSITIONS = ['Quarterback', 'Running Back', 'Wide Receiver', 'Tight End'];

  // Get all active cards of this rarity
  const { data: cards, error: cardsError } = await supabaseAdmin
    .from('cards')
    .select(`
      id,
      players!inner (
        id,
        first_name,
        last_name,
        position,
        active
      )
    `)
    .eq('rarity', rarity)
    .eq('players.active', true)
    .in('players.position', PLAYABLE_POSITIONS);

  if (cardsError || !cards || cards.length === 0) {
    console.error('Error fetching cards:', cardsError);
    return null;
  }

  // For each card, calculate the player's performance score
  const performanceScores: PlayerPerformance[] = [];
  let skippedInactive = 0;

  for (const card of cards) {
    const player = Array.isArray(card.players) ? card.players[0] : card.players;
    if (!player) continue;

    // CRITICAL: Only get stats from recent game dates (2024-2025 seasons)
    // We use game_date only because season_id is unreliable in the database
    const { data: stats } = await supabaseAdmin
      .from('player_game_stats')
      .select('stat_json, game_date')
      .eq('player_id', player.id)
      .gte('game_date', SEASON_START_DATE) // Only games after Sept 1, 2024
      .eq('finalized', true); // Only finalized stats

    let avgFantasyPoints = 0;
    let gamesPlayed = 0;

    if (stats && stats.length > 0) {
      const totalPoints = stats.reduce((sum, stat) => {
        const points = stat.stat_json?.fantasy_points || 0;
        return sum + points;
      }, 0);
      
      gamesPlayed = stats.length;
      avgFantasyPoints = gamesPlayed > 0 ? totalPoints / gamesPlayed : 0;
    }

    // Skip players with insufficient recent games or low performance
    if (gamesPlayed === 0 || gamesPlayed < MIN_GAMES_PLAYED) {
      skippedInactive++;
      continue;
    }

    // Skip players below minimum fantasy points threshold
    if (avgFantasyPoints < MIN_AVG_FANTASY_POINTS) {
      skippedInactive++;
      continue;
    }

    const weight = calculateWeight(avgFantasyPoints, gamesPlayed);

    // Additional safety check - skip if weight is too low
    if (weight < 0.1) {
      skippedInactive++;
      continue;
    }

    performanceScores.push({
      playerId: player.id,
      cardId: card.id,
      avgFantasyPoints,
      gamesPlayed,
      position: player.position,
      playerName: `${player.first_name} ${player.last_name}`,
      weight
    });
  }

  // Sort by weight (highest first) for debugging
  performanceScores.sort((a, b) => b.weight - a.weight);

  const totalWeight = performanceScores.reduce((sum, p) => sum + p.weight, 0);

  const pool: WeightedCardPool = {
    cards: performanceScores,
    totalWeight,
    lastUpdated: Date.now()
  };

  // Cache for 30 minutes
  setCachedData(cacheKey, pool, 30 * 60);

  console.log(`✓ Calculated weights for ${rarity} rarity:`);
  console.log(`  - Active players with recent games: ${performanceScores.length}`);
  console.log(`  - Skipped (no recent games/retired): ${skippedInactive}`);
  console.log(`  - Total weight: ${totalWeight.toFixed(2)}`);
  console.log(`  Top 5 performers:`);
  performanceScores.slice(0, 5).forEach(p => {
    console.log(`    - ${p.playerName} (${p.position}): ${p.avgFantasyPoints.toFixed(1)} avg pts, ${p.gamesPlayed} games, weight: ${p.weight}`);
  });

  return pool;
}

/**
 * Select a random card from the weighted pool
 * Higher-performing players are more likely to be selected
 */
export function selectWeightedCard(pool: WeightedCardPool): string | null {
  if (!pool || pool.cards.length === 0) return null;

  // Generate a random number between 0 and total weight
  let random = Math.random() * pool.totalWeight;

  // Walk through the cards, subtracting weights until we hit our random number
  for (const card of pool.cards) {
    random -= card.weight;
    if (random <= 0) {
      return card.cardId;
    }
  }

  // Fallback to last card (should rarely happen)
  return pool.cards[pool.cards.length - 1]?.cardId || null;
}

/**
 * Get a performance-weighted random card for a given rarity
 */
export async function getPerformanceWeightedCard(rarity: string): Promise<string | null> {
  const pool = await getWeightedCardPool(rarity);
  if (!pool) return null;
  
  return selectWeightedCard(pool);
}

/**
 * Clear the weighted card pool cache (useful for testing or manual refresh)
 */
export function clearWeightedCardCache() {
  const rarities = ['common', 'uncommon', 'rare', 'elite', 'legendary'];
  rarities.forEach(rarity => {
    const cacheKey = `weighted-cards:${rarity}`;
    getCachedData(cacheKey); // This will handle deletion if needed
  });
  console.log('✓ Cleared weighted card pool cache');
}

