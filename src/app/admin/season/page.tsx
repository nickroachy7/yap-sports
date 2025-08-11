'use client';

import { useState, useEffect } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabaseClient';

interface Season {
  id: string;
  year: number;
  league: string;
  start_date: string;
  end_date: string;
}

interface Week {
  id: string;
  season_id: string;
  week_number: number;
  start_at: string;
  lock_at: string;
  end_at: string;
  status: string;
}

export default function SeasonAdminPage() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<Season | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [setupStats, setSetupStats] = useState<any>(null);

  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    loadSeasons();
  }, []);

  useEffect(() => {
    if (selectedSeason) {
      loadWeeks(selectedSeason.id);
    }
  }, [selectedSeason]);

  async function loadSeasons() {
    try {
      const { data, error } = await supabase
        .from('seasons')
        .select('*')
        .order('year', { ascending: false });

      if (error) {
        console.error('Error loading seasons:', error);
        setMessage(`Error loading seasons: ${error.message}`);
      } else {
        setSeasons(data || []);
        // Auto-select most recent season
        if (data && data.length > 0 && !selectedSeason) {
          setSelectedSeason(data[0]);
        }
      }
    } catch (err: any) {
      console.error('Unexpected error loading seasons:', err);
      setMessage(`Unexpected error: ${err.message}`);
    }
  }

  async function loadWeeks(seasonId: string) {
    try {
      const { data, error } = await supabase
        .from('weeks')
        .select('*')
        .eq('season_id', seasonId)
        .order('week_number', { ascending: true });

      if (error) {
        console.error('Error loading weeks:', error);
        setMessage(`Error loading weeks: ${error.message}`);
      } else {
        setWeeks(data || []);
      }
    } catch (err: any) {
      console.error('Unexpected error loading weeks:', err);
      setMessage(`Unexpected error: ${err.message}`);
    }
  }

  async function setupSeason(forceRecreate = false) {
    setLoading(true);
    setMessage(null);
    setSetupStats(null);

    try {
      const res = await fetch('/api/admin/sync/season', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          force_recreate: forceRecreate 
        })
      });

      const data = await res.json();
      
      if (!res.ok) {
        setMessage(`❌ Season setup failed: ${data.error || 'Unknown error'}`);
      } else {
        setMessage(`✅ NFL ${data.season.year} season setup complete! Created ${data.weeks.total} weeks.`);
        setSetupStats(data.stats);
        // Reload data
        await loadSeasons();
      }
    } catch (err: any) {
      setMessage(`Network error: ${err.message}`);
    }

    setLoading(false);
  }

  function formatDate(dateStr: string) {
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
      case 'upcoming': return 'text-blue-600 bg-blue-50';
      case 'active': return 'text-green-600 bg-green-50';
      case 'locked': return 'text-orange-600 bg-orange-50';
      case 'completed': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  }

  const currentWeek = weeks.find(w => w.status === 'active') || 
                     weeks.find(w => w.status === 'upcoming');

  return (
    <main className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">NFL Season Management</h1>
        <div className="flex space-x-3">
          <button
            onClick={() => setupSeason(false)}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium"
          >
            {loading ? 'Setting up...' : 'Setup Current Season'}
          </button>
          <button
            onClick={() => setupSeason(true)}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium"
          >
            {loading ? 'Recreating...' : 'Force Recreate'}
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

      {setupStats && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold mb-2">Setup Statistics</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium">Season Created:</span> {setupStats.season_created ? 'Yes' : 'No'}
            </div>
            <div>
              <span className="font-medium">Weeks Created:</span> {setupStats.weeks_created}
            </div>
            <div>
              <span className="font-medium">Current Week:</span> {setupStats.current_week_number || 'N/A'}
            </div>
          </div>
        </div>
      )}

      {/* Season Selection */}
      <div className="border border-gray-200 rounded-lg p-4">
        <h2 className="text-xl font-bold mb-4">NFL Seasons</h2>
        
        {seasons.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {seasons.map((season) => (
              <div 
                key={season.id}
                onClick={() => setSelectedSeason(season)}
                className={`p-4 border rounded-lg cursor-pointer ${
                  selectedSeason?.id === season.id 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-semibold text-lg">{season.league} {season.year}</div>
                <div className="text-sm text-gray-600">
                  {formatDate(season.start_date)} - {formatDate(season.end_date)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">No seasons found.</p>
            <p className="text-sm text-gray-400">Click &quot;Setup Current Season&quot; to create the current NFL season.</p>
          </div>
        )}
      </div>

      {/* Current Week Info */}
      {selectedSeason && currentWeek && (
        <div className="border border-gray-200 rounded-lg p-4">
          <h2 className="text-xl font-bold mb-4">Current Week</h2>
          <div className="bg-gray-50 p-4 rounded">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-lg">Week {currentWeek.week_number}</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(currentWeek.status)}`}>
                {currentWeek.status.toUpperCase()}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium">Starts:</span> {formatDate(currentWeek.start_at)}
              </div>
              <div>
                <span className="font-medium">Locks:</span> {formatDate(currentWeek.lock_at)}
              </div>
              <div>
                <span className="font-medium">Ends:</span> {formatDate(currentWeek.end_at)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Weeks Grid */}
      {selectedSeason && weeks.length > 0 && (
        <div className="border border-gray-200 rounded-lg p-4">
          <h2 className="text-xl font-bold mb-4">Season Weeks ({weeks.length})</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {weeks.map((week) => (
              <div 
                key={week.id}
                className="p-3 border rounded-lg bg-white"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">Week {week.week_number}</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(week.status)}`}>
                    {week.status}
                  </span>
                </div>
                <div className="text-xs text-gray-600 space-y-1">
                  <div>Starts: {formatDate(week.start_at)}</div>
                  <div>Locks: {formatDate(week.lock_at)}</div>
                  <div>Ends: {formatDate(week.end_at)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
