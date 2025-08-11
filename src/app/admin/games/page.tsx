'use client';

import { useState, useEffect, useCallback } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabaseClient';
// Removed unused Game import

interface LocalGame {
  id: string;
  external_game_id: string;
  week_id?: string;
  home_team: string;
  away_team: string;
  home_team_id?: string;
  away_team_id?: string;
  starts_at?: string;
  status: string;
  season_type?: string;
  week_number?: number;
  weeks?: {
    week_number: number;
    status: string;
  };
  home_teams?: {
    id: string;
    name: string;
    abbreviation: string;
    city: string;
  };
  away_teams?: {
    id: string;
    name: string;
    abbreviation: string;
    city: string;
  };
}

export default function GamesAdminPage() {
  const [games, setGames] = useState<LocalGame[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [syncStats, setSyncStats] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [weekFilter, setWeekFilter] = useState<string>('');

  const supabase = createSupabaseBrowserClient();

  const loadGames = useCallback(async () => {
    try {
      let query = supabase
        .from('sports_events')
        .select(`
          *,
          weeks (
            week_number,
            status
          ),
          home_teams:teams!home_team_id (
            id,
            name,
            abbreviation,
            city
          ),
          away_teams:teams!away_team_id (
            id,
            name,
            abbreviation,
            city
          )
        `)
        .order('starts_at', { ascending: true })
        .limit(200); // Limit for performance

      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      if (weekFilter) {
        query = query.eq('week_number', parseInt(weekFilter));
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error loading games:', error);
        setMessage(`Error loading games: ${error.message}`);
      } else {
        setGames(data || []);
      }
    } catch (err: unknown) {
      console.error('Unexpected error loading games:', err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      setMessage(`Unexpected error: ${message}`);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, weekFilter]);

  useEffect(() => {
    loadGames();
  }, [statusFilter, weekFilter, loadGames]);

  const syncGames = useCallback(async (testMode = true) => {
    setLoading(true);
    setMessage(null);
    setSyncStats(null);

    try {
      const res = await fetch('/api/admin/sync/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          test_mode: testMode,
          per_page: testMode ? 25 : 100,
          max_games: testMode ? 50 : 500
        })
      });

      const data = await res.json();
      
      if (!res.ok) {
        setMessage(`❌ Games sync failed: ${data.error || 'Unknown error'}`);
        if (data.details) {
          setMessage(prev => `${prev}\n${data.details}`);
        }
      } else {
        setMessage(`✅ NFL Games Synced Successfully! Processed ${data.stats.processed} games (${data.stats.week_mapped} mapped to weeks).`);
        setSyncStats(data.stats);
        // Reload games to show updated data
        await loadGames();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setMessage(`Network error: ${message}`);
    }

    setLoading(false);
  }, [loadGames]);

  function formatDateTime(dateStr?: string) {
    if (!dateStr) return 'TBD';
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'scheduled': return 'text-blue-600 bg-blue-50';
      case 'live': return 'text-green-600 bg-green-50';
      case 'final': return 'text-gray-600 bg-gray-50';
      case 'postponed': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  }

  // Get unique statuses and weeks for filters
  const statuses = [...new Set(games.map(g => g.status))].sort();
  const weekNumbers = [...new Set(games.map(g => g.week_number).filter(Boolean))].sort((a, b) => a! - b!);

  const groupedGames = games.reduce((acc, game) => {
    const week = game.weeks?.week_number || game.week_number || 0;
    const weekKey = `Week ${week}`;
    if (!acc[weekKey]) acc[weekKey] = [];
    acc[weekKey].push(game);
    return acc;
  }, {} as Record<string, LocalGame[]>);

  return (
    <main className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">NFL Games Management</h1>
        <div className="flex space-x-3">
          <button
            onClick={() => syncGames(true)}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium"
          >
            {loading ? 'Syncing...' : 'Test Sync (50 games)'}
          </button>
          <button
            onClick={() => syncGames(false)}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium"
          >
            {loading ? 'Syncing...' : 'Full Sync (500+ games)'}
          </button>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-lg whitespace-pre-line ${
          message.includes('❌') ? 'bg-red-50 text-red-700 border border-red-200' : 
          'bg-green-50 text-green-700 border border-green-200'
        }`}>
          {message}
        </div>
      )}

      {syncStats && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold mb-2">Sync Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium">Season:</span> {syncStats.season_year}
            </div>
            <div>
              <span className="font-medium">Fetched:</span> {syncStats.total_fetched}
            </div>
            <div>
              <span className="font-medium">Processed:</span> {syncStats.processed}
            </div>
            <div>
              <span className="font-medium">Week Mapped:</span> {syncStats.week_mapped}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex space-x-4 items-center">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2"
          >
            <option value="">All Statuses</option>
            {statuses.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Week</label>
          <select
            value={weekFilter}
            onChange={(e) => setWeekFilter(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2"
          >
            <option value="">All Weeks</option>
            {weekNumbers.map(week => (
              <option key={week} value={week?.toString()}>Week {week}</option>
            ))}
          </select>
        </div>

        <div className="pt-6">
          <button
            onClick={() => {
              setStatusFilter('');
              setWeekFilter('');
            }}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            Clear Filters
          </button>
        </div>
      </div>

      <div className="text-lg font-semibold text-gray-700">
        Total Games: {games.length}
      </div>

      {/* Games by Week */}
      <div className="space-y-6">
        {Object.entries(groupedGames).map(([week, weekGames]) => (
          <div key={week} className="border border-gray-200 rounded-lg p-4">
            <h2 className="text-xl font-bold mb-4">{week} ({weekGames.length} games)</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {weekGames.map((game) => (
                <div 
                  key={game.id} 
                  className="p-4 bg-gray-50 rounded border"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(game.status)}`}>
                      {game.status.toUpperCase()}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatDateTime(game.starts_at)}
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-sm">
                        <span className="font-medium">{game.away_team}</span>
                        {game.away_teams && (
                          <div className="text-xs text-gray-600">
                            {game.away_teams.city} {game.away_teams.name}
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-gray-400">@</div>
                      <div className="text-sm text-right">
                        <span className="font-medium">{game.home_team}</span>
                        {game.home_teams && (
                          <div className="text-xs text-gray-600">
                            {game.home_teams.city} {game.home_teams.name}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-500 space-y-1">
                      <div>Game ID: {game.external_game_id}</div>
                      {game.week_id ? (
                        <div className="text-green-600">✓ Mapped to week</div>
                      ) : (
                        <div className="text-orange-600">⚠ Not mapped to week</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {games.length === 0 && !loading && (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No games found in database.</p>
          <p className="text-sm text-gray-400">Click &quot;Test Sync&quot; to import games from Ball Don&apos;t Lie API.</p>
        </div>
      )}
    </main>
  );
}
