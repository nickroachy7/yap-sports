// API Response Types for YAP Sports
// Centralized TypeScript interfaces for all API endpoints

// ==================== COMMON TYPES ====================

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
  success?: boolean;
}

export interface DatabaseError {
  message: string;
  code?: string;
  hint?: string;
  details?: string;
}

export interface SupabaseResponse<T> {
  data: T[] | T | null;
  error: DatabaseError | null;
  count?: number | null;
}

// ==================== USER & TEAM TYPES ====================

export interface UserProfile {
  id: string;
  username: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface UserTeam {
  id: string;
  user_id: string;
  name: string;
  coins: number;
  created_at: string;
  updated_at: string;
}

// ==================== PLAYER & CARD TYPES ====================

export interface Player {
  id: string;
  external_id: number;
  first_name: string;
  last_name: string;
  position: string;
  team: string;
  height?: string;
  weight?: string;
  country?: string;
  college?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Card {
  id: string;
  player_id: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  base_sell_value: number;
  base_contracts: number;
  mint_batch_id?: string;
  created_at: string;
  updated_at: string;
}

export interface UserCard {
  id: string;
  user_team_id: string;
  card_id: string;
  remaining_contracts: number;
  current_sell_value: number;
  locked_until_week_id?: string;
  status: 'owned' | 'listed' | 'burned';
  acquired_at: string;
  card?: Card;
  player?: Player;
}

// ==================== PACK TYPES ====================

export interface Pack {
  id: string;
  name: string;
  price_coins: number;
  contents_schema: {
    guaranteed_cards: number;
    rarity_weights: Record<string, number>;
  };
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserPack {
  id: string;
  user_team_id: string;
  pack_id: string;
  status: 'unopened' | 'opened';
  pre_roll_seed?: string;
  opened_at?: string;
  pack?: Pack;
}

export interface PackOpenResult {
  cards: UserCard[];
  totalValue: number;
}

// ==================== LINEUP TYPES ====================

export interface Week {
  id: string;
  season_id: string;
  week_number: number;
  start_at: string;
  lock_at: string;
  end_at: string;
  status: 'upcoming' | 'active' | 'locked' | 'completed';
}

export interface Lineup {
  id: string;
  user_team_id: string;
  week_id: string;
  submitted_at?: string;
  total_points?: number;
  status: 'draft' | 'submitted' | 'locked' | 'scored';
  created_at: string;
  updated_at: string;
}

export interface LineupSlot {
  id: string;
  lineup_id: string;
  slot: 'QB' | 'RB' | 'WR' | 'TE' | 'FLEX' | 'BENCH';
  user_card_id?: string;
  applied_token_id?: string;
  points_scored?: number;
}

// ==================== GAME & STATS TYPES ====================

export interface SportsEvent {
  id: string;
  week_id: string;
  external_game_id: number;
  home_team_id: string;
  away_team_id: string;
  starts_at: string;
  status: 'scheduled' | 'live' | 'final';
  created_at: string;
  updated_at: string;
}

export interface PlayerGameStats {
  id: string;
  sports_event_id: string;
  player_id: string;
  stat_data: Record<string, number>;
  finalized: boolean;
  created_at: string;
  updated_at: string;
}

// ==================== TOKEN TYPES ====================

export interface TokenType {
  id: string;
  name: string;
  description: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  rule_json: {
    condition: string;
    points_awarded: number;
    applies_to?: string[];
  };
  max_uses: number;
  stackable: boolean;
  scope: 'game' | 'week';
  enabled: boolean;
}

export interface UserToken {
  id: string;
  user_team_id: string;
  token_type_id: string;
  uses_remaining: number;
  status: 'available' | 'applied' | 'consumed';
  token_type?: TokenType;
}

// ==================== ADMIN TYPES ====================

export interface SyncStats {
  players_synced: number;
  teams_synced: number;
  games_synced: number;
  stats_synced: number;
  last_sync: string;
  errors: string[];
}

export interface DashboardStats {
  total_users: number;
  total_teams: number;
  total_cards: number;
  total_packs_opened: number;
  active_lineups: number;
  current_week?: Week;
  recent_activity: Array<{
    type: string;
    description: string;
    timestamp: string;
  }>;
}

export interface SystemMetrics {
  database: {
    connections: number;
    queries_per_second: number;
    avg_response_time: number;
  };
  api: {
    requests_per_minute: number;
    error_rate: number;
    avg_response_time: number;
  };
  cache: {
    hit_rate: number;
    memory_usage: number;
  };
  last_updated: string;
}

// ==================== EXTERNAL API TYPES ====================

export interface NFLApiResponse<T> {
  data: T[];
  meta?: {
    total_pages?: number;
    current_page?: number;
    next_cursor?: string;
    per_page?: number;
  };
}

export interface NFLPlayer {
  id: number;
  first_name: string;
  last_name: string;
  position: string;
  height?: string;
  weight?: number;
  college?: string;
  country?: string;
  team?: {
    id: number;
    name: string;
    abbreviation: string;
    city: string;
    conference: string;
    division: string;
  };
}

export interface NFLTeam {
  id: number;
  name: string;
  abbreviation: string;
  city: string;
  conference: string;
  division: string;
}

export interface NFLGame {
  id: number;
  date: string;
  season: number;
  week: number;
  home_team: NFLTeam;
  away_team: NFLTeam;
  status: string;
  home_team_score?: number;
  away_team_score?: number;
}

export interface NFLStats {
  id: number;
  player_id: number;
  game_id: number;
  season: number;
  week: number;
  stats: Record<string, number>;
}

// ==================== ADMIN DASHBOARD TYPES ====================

export interface DashboardStats {
  total_users: number;
  total_teams: number;
  total_lineups: number;
  active_week: string;
  recent_signups: number;
}

export interface MonitoringData {
  database_health: 'healthy' | 'warning' | 'error';
  api_response_time: number;
  active_connections: number;
  recent_errors: number;
  cache_hit_rate: number;
}
