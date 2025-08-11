'use client';

import { useState, useEffect } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabaseClient';

interface Player {
  id: string;
  external_id: string;
  first_name: string;
  last_name: string;
  position: string;
  team: string;
  team_id?: string;
  active: boolean;
  teams?: {
    id: string;
    name: string;
    abbreviation: string;
    city: string;
    conference: string;
    division: string;
  };
}

export default function PlayersAdminPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [syncStats, setSyncStats] = useState<any>(null);
  const [positionFilter, setPositionFilter] = useState<string>('');
  const [teamFilter, setTeamFilter] = useState<string>('');

  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    loadPlayers();
  }, [positionFilter, teamFilter, loadPlayers]);

  async function loadPlayers() {
    try {
      let query = supabase
        .from('players')
        .select(`
          *,
          teams (
            id,
            name,
            abbreviation,
            city,
            conference,
            division
          )
        `)
        .eq('active', true)
        .order('last_name', { ascending: true })
        .limit(500); // Limit for performance

      if (positionFilter) {
        query = query.eq('position', positionFilter);
      }

      if (teamFilter) {
        query = query.eq('team', teamFilter);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error loading players:', error);
        setMessage(`Error loading players: ${error.message}`);
      } else {
        setPlayers(data || []);
      }
    } catch (err: any) {
      console.error('Unexpected error loading players:', err);
      setMessage(`Unexpected error: ${err.message}`);
    }
  }

  async function syncPlayers(testMode = true) {
    setLoading(true);
    setMessage(null);
    setSyncStats(null);

    try {
      const res = await fetch('/api/admin/sync/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          test_mode: testMode,
          per_page: testMode ? 50 : 100,
          max_players: testMode ? 200 : 2000
        })
      });

      const data = await res.json();
      
      if (!res.ok) {
        setMessage(`❌ Player sync failed: ${data.error || 'Unknown error'}`);
      } else {
        setMessage(`✅ NFL Players Synced Successfully! Processed ${data.stats.processed} players (${data.stats.team_mapped} mapped to teams).`);
        setSyncStats(data.stats);
        // Reload players to show updated data
        await loadPlayers();
      }
    } catch (err: any) {
      setMessage(`Network error: ${err.message}`);
    }

    setLoading(false);
  }

  // Get unique positions and teams for filters
  const positions = [...new Set(players.map(p => p.position))].sort();
  const teams = [...new Set(players.map(p => p.team).filter(Boolean))].sort();

  const groupedPlayers = players.reduce((acc, player) => {
    const pos = player.position || 'Unknown';
    if (!acc[pos]) acc[pos] = [];
    acc[pos].push(player);
    return acc;
  }, {} as Record<string, Player[]>);

  return (
    <main className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">NFL Players Management</h1>
        <div className="flex space-x-3">
          <button
            onClick={() => syncPlayers(true)}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium"
          >
            {loading ? 'Syncing...' : 'Test Sync (200 players)'}
          </button>
          <button
            onClick={() => syncPlayers(false)}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium"
          >
            {loading ? 'Syncing...' : 'Full Sync (2000+ players)'}
          </button>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${
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
              <span className="font-medium">Total Fetched:</span> {syncStats.total_fetched}
            </div>
            <div>
              <span className="font-medium">Processed:</span> {syncStats.processed}
            </div>
            <div>
              <span className="font-medium">Team Mapped:</span> {syncStats.team_mapped}
            </div>
            <div>
              <span className="font-medium">Errors:</span> {syncStats.errors}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex space-x-4 items-center">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
          <select
            value={positionFilter}
            onChange={(e) => setPositionFilter(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2"
          >
            <option value="">All Positions</option>
            {positions.map(pos => (
              <option key={pos} value={pos}>{pos}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Team</label>
          <select
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2"
          >
            <option value="">All Teams</option>
            {teams.map(team => (
              <option key={team} value={team}>{team}</option>
            ))}
          </select>
        </div>

        <div className="pt-6">
          <button
            onClick={() => {
              setPositionFilter('');
              setTeamFilter('');
            }}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            Clear Filters
          </button>
        </div>
      </div>

      <div className="text-lg font-semibold text-gray-700">
        Total Players: {players.length}
      </div>

      {/* Players by Position */}
      <div className="space-y-6">
        {Object.entries(groupedPlayers).map(([position, positionPlayers]) => (
          <div key={position} className="border border-gray-200 rounded-lg p-4">
            <h2 className="text-xl font-bold mb-4">{position} ({positionPlayers.length})</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {positionPlayers.slice(0, 20).map((player) => (
                <div 
                  key={player.id} 
                  className="p-3 bg-gray-50 rounded border text-sm"
                >
                  <div className="font-medium">
                    {player.first_name} {player.last_name}
                  </div>
                  <div className="text-xs text-gray-600">
                    {player.teams ? (
                      <span className="text-blue-600">
                        {player.teams.city} {player.teams.name} ({player.teams.abbreviation})
                      </span>
                    ) : player.team ? (
                      <span className="text-orange-600">{player.team} (not mapped)</span>
                    ) : (
                      <span className="text-gray-400">Free Agent</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    ID: {player.external_id}
                  </div>
                </div>
              ))}
              {positionPlayers.length > 20 && (
                <div className="p-3 bg-gray-100 rounded border text-sm text-center text-gray-500">
                  +{positionPlayers.length - 20} more players...
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {players.length === 0 && !loading && (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No players found in database.</p>
          <p className="text-sm text-gray-400">Click &quot;Test Sync&quot; to import players from Ball Don&apos;t Lie API.</p>
        </div>
      )}
    </main>
  );
}
