'use client';

import { useState, useEffect } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabaseClient';

interface CronJobResult {
  name: string;
  last_run: string;
  status: 'success' | 'error' | 'running' | 'pending';
  duration_ms?: number;
  error_message?: string;
  next_run?: string;
}

interface SystemMetrics {
  users: number;
  active_players: number;
  total_cards: number;
  active_lineups: number;
  completed_games: number;
  total_stats: number;
  current_week?: {
    week_number: number;
    status: string;
    lock_at: string;
  };
  timestamp: string;
}

export default function MonitoringPage() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [cronJobs, setCronJobs] = useState<CronJobResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    loadMonitoringData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadMonitoringData, 30000);
    return () => clearInterval(interval);
  }, [loadMonitoringData]);

  async function loadMonitoringData() {
    try {
      // Get system metrics
      const { data: metricsData, error: metricsError } = await supabase
        .rpc('get_system_metrics');

      if (metricsError) {
        console.error('Error loading metrics:', metricsError);
      } else {
        setMetrics(metricsData);
      }

      // Mock cron job status (in production, this would come from a monitoring system)
      const mockCronJobs: CronJobResult[] = [
        {
          name: 'Daily Sync',
          last_run: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
          status: 'success',
          duration_ms: 45000,
          next_run: new Date(Date.now() + 21 * 3600000).toISOString() // 21 hours from now
        },
        {
          name: 'Gameday Sync',
          last_run: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
          status: 'success',
          duration_ms: 12000,
          next_run: new Date(Date.now() + 1800000).toISOString() // 30 minutes from now
        },
        {
          name: 'Scoring Process',
          last_run: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
          status: 'success',
          duration_ms: 8500,
          next_run: new Date(Date.now() + 3600000).toISOString() // 1 hour from now
        },
        {
          name: 'Weekly Maintenance',
          last_run: new Date(Date.now() - 24 * 3600000).toISOString(), // 24 hours ago
          status: 'success',
          duration_ms: 125000,
          next_run: new Date(Date.now() + 6 * 24 * 3600000).toISOString() // 6 days from now
        }
      ];

      setCronJobs(mockCronJobs);

    } catch (err) {
      console.error('Error loading monitoring data:', err);
      setMessage('Error loading monitoring data');
    } finally {
      setLoading(false);
    }
  }

  async function triggerManualSync(syncType: string) {
    setLoading(true);
    setMessage(null);

    try {
      let endpoint = '';
      switch (syncType) {
        case 'daily':
          endpoint = '/api/cron/sync-daily';
          break;
        case 'gameday':
          endpoint = '/api/cron/sync-gameday';
          break;
        case 'scoring':
          endpoint = '/api/cron/process-scoring';
          break;
        case 'maintenance':
          endpoint = '/api/cron/maintenance';
          break;
        default:
          throw new Error('Invalid sync type');
      }

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || 'dev-secret'}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Sync failed');
      }

      setMessage(`✅ ${syncType} sync completed successfully`);
      loadMonitoringData(); // Refresh data

    } catch (err: any) {
      setMessage(`❌ ${syncType} sync failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-100';
      case 'error': return 'text-red-600 bg-red-100';
      case 'running': return 'text-blue-600 bg-blue-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  }

  function formatDuration(ms?: number): string {
    if (!ms) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  }

  function formatDateTime(dateStr: string): string {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  if (loading && !metrics) {
    return (
      <main className="p-6">
        <div className="text-center py-12">
          <div className="text-lg">Loading monitoring data...</div>
        </div>
      </main>
    );
  }

  return (
    <main className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">System Monitoring</h1>
        <div className="text-sm text-gray-600">
          Last updated: {formatDateTime(new Date().toISOString())}
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

      {/* System Health Overview */}
      <div className="border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">System Health</h2>
        
        {metrics ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{metrics.users}</div>
              <div className="text-sm text-gray-600">Total Users</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{metrics.active_players}</div>
              <div className="text-sm text-gray-600">Active Players</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">{metrics.total_cards}</div>
              <div className="text-sm text-gray-600">Player Cards</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600">{metrics.total_stats}</div>
              <div className="text-sm text-gray-600">Game Stats</div>
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-600">No metrics available</div>
        )}

        {metrics?.current_week && (
          <div className="mt-6 bg-blue-50 rounded p-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">Current Week: {metrics.current_week.week_number}</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                metrics.current_week.status === 'active' ? 'text-green-700 bg-green-100' :
                'text-blue-700 bg-blue-100'
              }`}>
                {metrics.current_week.status.toUpperCase()}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Cron Jobs Status */}
      <div className="border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">Automated Jobs</h2>
        
        <div className="space-y-4">
          {cronJobs.map((job, index) => (
            <div key={index} className="border border-gray-100 rounded p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-lg">{job.name}</div>
                  <div className="text-sm text-gray-600">
                    Last run: {formatDateTime(job.last_run)} • Duration: {formatDuration(job.duration_ms)}
                  </div>
                  {job.next_run && (
                    <div className="text-sm text-gray-500">
                      Next run: {formatDateTime(job.next_run)}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center space-x-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(job.status)}`}>
                    {job.status.toUpperCase()}
                  </span>
                  
                  <button
                    onClick={() => triggerManualSync(job.name.toLowerCase().split(' ')[0])}
                    disabled={loading}
                    className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white px-3 py-1 rounded text-sm"
                  >
                    Run Now
                  </button>
                </div>
              </div>
              
              {job.error_message && (
                <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                  {job.error_message}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Manual Operations */}
      <div className="border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">Manual Operations</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => triggerManualSync('daily')}
            disabled={loading}
            className="p-4 border rounded-lg hover:bg-gray-50 text-center disabled:opacity-50"
          >
            <div className="font-medium">Daily Sync</div>
            <div className="text-sm text-gray-600">Teams, players, games</div>
          </button>
          
          <button
            onClick={() => triggerManualSync('gameday')}
            disabled={loading}
            className="p-4 border rounded-lg hover:bg-gray-50 text-center disabled:opacity-50"
          >
            <div className="font-medium">Gameday Sync</div>
            <div className="text-sm text-gray-600">Live stats, game status</div>
          </button>
          
          <button
            onClick={() => triggerManualSync('scoring')}
            disabled={loading}
            className="p-4 border rounded-lg hover:bg-gray-50 text-center disabled:opacity-50"
          >
            <div className="font-medium">Process Scoring</div>
            <div className="text-sm text-gray-600">Calculate points, rewards</div>
          </button>
          
          <button
            onClick={() => triggerManualSync('maintenance')}
            disabled={loading}
            className="p-4 border rounded-lg hover:bg-gray-50 text-center disabled:opacity-50"
          >
            <div className="font-medium">Maintenance</div>
            <div className="text-sm text-gray-600">DB cleanup, health checks</div>
          </button>
        </div>
      </div>
    </main>
  );
}
