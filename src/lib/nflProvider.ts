import { BalldontlieAPI } from '@balldontlie/sdk';
import { getCachedData, setCachedData, generateCacheKey } from './cache';

// Lazy initialization to avoid throwing errors during module import
let nflProvider: BalldontlieAPI | null = null;

function getNFLClient(): BalldontlieAPI {
  if (!nflProvider) {
    const BALLDONTLIE_API_KEY = process.env.BALLDONTLIE_API_KEY;
    
    if (!BALLDONTLIE_API_KEY) {
      throw new Error('BALLDONTLIE_API_KEY is not set in environment variables');
    }

    try {
      nflProvider = new BalldontlieAPI({
        apiKey: BALLDONTLIE_API_KEY,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to initialize NFL client: ${errorMessage}`);
    }
  }
  
  return nflProvider;
}

// Helper functions for common operations
export async function fetchNFLPlayers(params?: { 
  cursor?: string;
  per_page?: number;
  search?: string;
}) {
  try {
    // Check cache first (only for non-paginated requests)
    if (!params?.cursor) {
      const cacheKey = generateCacheKey('nfl_players', params || {});
      const cached = getCachedData(cacheKey);
      if (cached) {
        console.log('Using cached NFL players data');
        return cached;
      }
    }

    const client = getNFLClient();
    const result = await client.nfl.getPlayers(params);
    
    // Cache non-paginated requests for 10 minutes
    if (!params?.cursor && result.data) {
      const cacheKey = generateCacheKey('nfl_players', params || {});
      setCachedData(cacheKey, result, 600); // 10 minutes
    }
    
    return result;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to fetch NFL players: ${errorMessage}`);
  }
}

export async function fetchNFLTeams() {
  try {
    // Check cache first - teams don't change often
    const cacheKey = 'nfl_teams';
    const cached = getCachedData(cacheKey);
    if (cached) {
      console.log('Using cached NFL teams data');
      return cached;
    }

    const client = getNFLClient();
    const result = await client.nfl.getTeams();
    
    // Cache teams for 24 hours (they rarely change)
    if (result.data) {
      setCachedData(cacheKey, result, 24 * 3600); // 24 hours
    }
    
    return result;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to fetch NFL teams: ${errorMessage}`);
  }
}

export async function fetchNFLGames(params?: {
  dates?: string[];
  seasons?: number[];
  team_ids?: number[];
  per_page?: number;
  cursor?: string;
}) {
  try {
    const client = getNFLClient();
    const result = await client.nfl.getGames(params);
    return result;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to fetch NFL games: ${errorMessage}`);
  }
}

export async function fetchPlayerStats(params: {
  dates?: string[];
  seasons?: number[];
  player_ids?: number[];
  per_page?: number;
  cursor?: string;
}) {
  try {
    const client = getNFLClient();
    const result = await client.nfl.getStats(params);
    return result;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to fetch player stats: ${errorMessage}`);
  }
}


