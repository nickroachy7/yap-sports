'use client';

import { useState, useEffect } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabaseClient';

interface Team {
  id: string;
  external_id: string;
  name: string;
  abbreviation: string;
  city: string;
  conference: string;
  division: string;
  full_name?: string;
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export default function TeamsAdminPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [syncStats, setSyncStats] = useState<any>(null);

  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  async function loadTeams() {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .order('conference', { ascending: true })
        .order('division', { ascending: true })
        .order('name', { ascending: true });

      if (error) {
        console.error('Error loading teams:', error);
        setMessage(`Error loading teams: ${error.message}`);
      } else {
        setTeams(data || []);
      }
    } catch (err: any) {
      console.error('Unexpected error loading teams:', err);
      setMessage(`Unexpected error: ${err.message}`);
    }
  }

  async function syncTeams() {
    setLoading(true);
    setMessage(null);
    setSyncStats(null);

    try {
      const res = await fetch('/api/admin/sync/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      const data = await res.json();
      
      if (!res.ok) {
        setMessage(`❌ Team sync failed: ${data.error || 'Unknown error'}`);
      } else {
        setMessage(`✅ NFL Teams Synced Successfully! Processed ${data.processed} teams.`);
        setSyncStats(data);
        // Reload teams to show updated data
        await loadTeams();
      }
    } catch (err: any) {
      setMessage(`Network error: ${err.message}`);
    }

    setLoading(false);
  }

  const groupedTeams = teams.reduce((acc, team) => {
    const conference = team.conference || 'Unknown';
    if (!acc[conference]) {
      acc[conference] = {};
    }
    
    const division = team.division || 'Unknown';
    if (!acc[conference][division]) {
      acc[conference][division] = [];
    }
    
    acc[conference][division].push(team);
    return acc;
  }, {} as Record<string, Record<string, Team[]>>);

  return (
    <main className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">NFL Teams Management</h1>
        <button
          onClick={syncTeams}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium"
        >
          {loading ? 'Syncing...' : 'Sync NFL Teams'}
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

      {syncStats && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold mb-2">Sync Statistics</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium">Total Teams:</span> {syncStats.total_teams}
            </div>
            <div>
              <span className="font-medium">Processed:</span> {syncStats.processed}
            </div>
            <div>
              <span className="font-medium">Errors:</span> {syncStats.errors?.length || 0}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <div className="text-lg font-semibold text-gray-700">
          Total Teams: {teams.length}
        </div>

        {Object.entries(groupedTeams).map(([conference, divisions]) => (
          <div key={conference} className="border border-gray-200 rounded-lg p-4">
            <h2 className="text-xl font-bold mb-4 text-center">{conference}</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(divisions).map(([division, divisionTeams]) => (
                <div key={division} className="border border-gray-100 rounded p-3">
                  <h3 className="font-semibold text-center mb-3 text-sm text-gray-600">
                    {division}
                  </h3>
                  
                  <div className="space-y-2">
                    {divisionTeams.map((team) => (
                      <div 
                        key={team.id} 
                        className="p-2 bg-gray-50 rounded border text-sm"
                        style={team.primary_color ? { 
                          borderLeftColor: team.primary_color,
                          borderLeftWidth: '4px'
                        } : {}}
                      >
                        <div className="font-medium">{team.abbreviation}</div>
                        <div className="text-xs text-gray-600">{team.city}</div>
                        <div className="text-xs text-gray-500">
                          ID: {team.external_id}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {teams.length === 0 && !loading && (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No teams found in database.</p>
          <p className="text-sm text-gray-400">Click &quot;Sync NFL Teams&quot; to import data from Ball Don&apos;t Lie API.</p>
        </div>
      )}
    </main>
  );
}
