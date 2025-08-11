'use client';

import { useState, useEffect, useCallback } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabaseClient';

interface DashboardStats {
  teams: number;
  players: number;
  games: number;
  weeks: number;
  users: number;
  lineups: number;
  stats: number;
  current_week?: {
    week_number: number;
    status: string;
    start_at: string;
    lock_at: string;
  };
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const supabase = createSupabaseBrowserClient();

  const loadDashboardStats = useCallback(async () => {
    try {
      // Fetch all stats in parallel
      const [
        teamsResult,
        playersResult,
        gamesResult,
        weeksResult,
        usersResult,
        lineupsResult,
        statsResult,
        currentWeekResult
      ] = await Promise.all([
        supabase.from('teams').select('id', { count: 'exact', head: true }),
        supabase.from('players').select('id', { count: 'exact', head: true }),
        supabase.from('sports_events').select('id', { count: 'exact', head: true }),
        supabase.from('weeks').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('user_id', { count: 'exact', head: true }),
        supabase.from('lineups').select('id', { count: 'exact', head: true }),
        supabase.from('player_game_stats').select('id', { count: 'exact', head: true }),
        supabase.from('weeks').select('*').in('status', ['active', 'upcoming']).order('week_number').limit(1).single()
      ]);

      const dashboardStats: DashboardStats = {
        teams: teamsResult.count || 0,
        players: playersResult.count || 0,
        games: gamesResult.count || 0,
        weeks: weeksResult.count || 0,
        users: usersResult.count || 0,
        lineups: lineupsResult.count || 0,
        stats: statsResult.count || 0,
        current_week: currentWeekResult.data ? {
          week_number: currentWeekResult.data.week_number,
          status: currentWeekResult.data.status,
          start_at: currentWeekResult.data.start_at,
          lock_at: currentWeekResult.data.lock_at
        } : undefined
      };

      setStats(dashboardStats);
    } catch (err: unknown) {
      console.error('Error loading dashboard stats:', err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      setMessage(`Error loading dashboard: ${message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardStats();
  }, [loadDashboardStats]);

  const runFullSync = useCallback(async () => {
    setLoading(true);
    setMessage('Running complete NFL data sync...');

    try {
      // Run sync operations in sequence
      console.log('Starting full sync sequence...');

      // 1. Sync teams
      const teamsRes = await fetch('/api/admin/sync/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      
      if (!teamsRes.ok) {
        throw new Error('Teams sync failed');
      }

      // 2. Sync players (test mode)
      const playersRes = await fetch('/api/admin/sync/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test_mode: true })
      });
      
      if (!playersRes.ok) {
        throw new Error('Players sync failed');
      }

      // 3. Setup season
      const seasonRes = await fetch('/api/admin/sync/season', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      
      if (!seasonRes.ok) {
        throw new Error('Season setup failed');
      }

      // 4. Sync games (test mode)
      const gamesRes = await fetch('/api/admin/sync/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test_mode: true })
      });
      
      if (!gamesRes.ok) {
        throw new Error('Games sync failed');
      }

      setMessage('✅ Full sync completed successfully! All NFL data is up to date.');
      
      // Reload dashboard stats
      await loadDashboardStats();

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setMessage(`❌ Full sync failed: ${message}`);
    } finally {
      setLoading(false);
    }
  }, [loadDashboardStats]);

  function formatDate(dateStr?: string) {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  function getSystemHealth(): { status: string; color: string; issues: string[] } {
    if (!stats) return { status: 'Loading...', color: 'text-gray-500', issues: [] };

    const issues = [];
    
    if (stats.teams === 0) issues.push('No NFL teams synced');
    if (stats.players === 0) issues.push('No NFL players synced');
    if (stats.games === 0) issues.push('No NFL games synced');
    if (stats.weeks === 0) issues.push('No season weeks setup');
    if (!stats.current_week) issues.push('No current week found');

    if (issues.length === 0) {
      return { status: 'Healthy', color: 'text-green-600', issues: [] };
    } else if (issues.length <= 2) {
      return { status: 'Warning', color: 'text-yellow-600', issues };
    } else {
      return { status: 'Critical', color: 'text-red-600', issues };
    }
  }

  const health = getSystemHealth();

  if (loading && !stats) {
    return (
      <main className="p-6">
        <div className="text-center py-12">
          <div className="text-lg">Loading dashboard...</div>
        </div>
      </main>
    );
  }

  return (
    <main className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">YAP Sports Admin Dashboard</h1>
        <button
          onClick={runFullSync}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium"
        >
          {loading ? 'Syncing...' : 'Full Sync'}
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${
          message.includes('❌') ? 'bg-red-50 text-red-700 border border-red-200' : 
          'bg-green-50 text-green-700 border border-green-200'
        }`}>
          {message}
        </div>
      )}

      {/* System Health */}
      <div className="border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">System Health</h2>
        <div className="flex items-center space-x-3 mb-4">
          <div className={`text-lg font-semibold ${health.color}`}>
            {health.status}
          </div>
          <div className="text-sm text-gray-600">
            Last updated: {formatDate(new Date().toISOString())}
          </div>
        </div>

        {health.issues.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
            <div className="font-medium text-yellow-800 mb-2">Issues:</div>
            <ul className="text-sm text-yellow-700 space-y-1">
              {health.issues.map((issue, index) => (
                <li key={index}>• {issue}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Current Week */}
      {stats?.current_week && (
        <div className="border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Current Week</h2>
          <div className="bg-blue-50 rounded p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-lg font-semibold">Week {stats.current_week.week_number}</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                stats.current_week.status === 'active' ? 'text-green-700 bg-green-100' :
                stats.current_week.status === 'upcoming' ? 'text-blue-700 bg-blue-100' :
                'text-gray-700 bg-gray-100'
              }`}>
                {stats.current_week.status.toUpperCase()}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Starts:</span> {formatDate(stats.current_week.start_at)}
              </div>
              <div>
                <span className="font-medium">Locks:</span> {formatDate(stats.current_week.lock_at)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Data Overview */}
      <div className="border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">Data Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{stats?.teams || 0}</div>
            <div className="text-sm text-gray-600">NFL Teams</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">{stats?.players || 0}</div>
            <div className="text-sm text-gray-600">NFL Players</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">{stats?.games || 0}</div>
            <div className="text-sm text-gray-600">NFL Games</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600">{stats?.weeks || 0}</div>
            <div className="text-sm text-gray-600">Season Weeks</div>
          </div>
        </div>
      </div>

      {/* User Activity */}
      <div className="border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">User Activity</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-indigo-600">{stats?.users || 0}</div>
            <div className="text-sm text-gray-600">Registered Users</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-red-600">{stats?.lineups || 0}</div>
            <div className="text-sm text-gray-600">Total Lineups</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-yellow-600">{stats?.stats || 0}</div>
            <div className="text-sm text-gray-600">Player Stats</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <a 
            href="/admin/teams" 
            className="p-4 border rounded-lg hover:bg-gray-50 text-center"
          >
            <div className="font-medium">Manage Teams</div>
            <div className="text-sm text-gray-600">View & sync NFL teams</div>
          </a>
          <a 
            href="/admin/players" 
            className="p-4 border rounded-lg hover:bg-gray-50 text-center"
          >
            <div className="font-medium">Manage Players</div>
            <div className="text-sm text-gray-600">View & sync NFL players</div>
          </a>
          <a 
            href="/admin/season" 
            className="p-4 border rounded-lg hover:bg-gray-50 text-center"
          >
            <div className="font-medium">Manage Season</div>
            <div className="text-sm text-gray-600">Setup weeks & schedule</div>
          </a>
          <a 
            href="/admin/games" 
            className="p-4 border rounded-lg hover:bg-gray-50 text-center"
          >
            <div className="font-medium">Manage Games</div>
            <div className="text-sm text-gray-600">View & sync NFL games</div>
          </a>
        </div>
      </div>
    </main>
  );
}
