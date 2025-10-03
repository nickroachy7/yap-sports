import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * Test Live Sync Endpoint
 * 
 * Quickly verifies:
 * - Games exist for target date
 * - Game statuses are updating
 * - Player stats exist for games
 * - Fantasy points are calculated
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const targetDate = searchParams.get('date') || new Date().toISOString().split('T')[0];
    
    console.log(`🧪 Testing sync status for ${targetDate}`);

    // 1. Check games for target date
    const { data: games, error: gamesError } = await supabaseAdmin
      .from('sports_events')
      .select('id, external_game_id, home_team, away_team, starts_at, status, week_number')
      .gte('starts_at', `${targetDate}T00:00:00`)
      .lte('starts_at', `${targetDate}T23:59:59`)
      .order('starts_at', { ascending: true });

    if (gamesError) throw gamesError;

    // 2. Group games by status
    const gamesByStatus = (games || []).reduce((acc: any, game) => {
      acc[game.status] = (acc[game.status] || 0) + 1;
      return acc;
    }, {});

    // 3. Check player stats for these games
    const gameIds = (games || []).map(g => g.id);
    
    let statsCount = 0;
    let finalizedCount = 0;
    let avgFantasyPoints = 0;

    if (gameIds.length > 0) {
      const { data: stats, error: statsError } = await supabaseAdmin
        .from('player_game_stats')
        .select('id, finalized, stat_json')
        .in('sports_event_id', gameIds);

      if (!statsError && stats) {
        statsCount = stats.length;
        finalizedCount = stats.filter(s => s.finalized).length;
        
        const fantasyPoints = stats
          .map(s => s.stat_json?.fantasy_points || 0)
          .filter(fp => fp > 0);
        
        if (fantasyPoints.length > 0) {
          avgFantasyPoints = fantasyPoints.reduce((a, b) => a + b, 0) / fantasyPoints.length;
        }
      }
    }

    // 4. Check recent sync activity (last 24 hours)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: recentStats, error: recentError } = await supabaseAdmin
      .from('player_game_stats')
      .select('created_at, updated_at')
      .gte('updated_at', yesterday)
      .order('updated_at', { ascending: false })
      .limit(10);

    const lastSyncTime = recentStats && recentStats.length > 0 
      ? new Date(recentStats[0].updated_at) 
      : null;

    // 5. Calculate time since last sync
    const timeSinceLastSync = lastSyncTime 
      ? Math.round((Date.now() - lastSyncTime.getTime()) / 1000 / 60) // minutes
      : null;

    // 6. Determine health status
    const healthStatus = {
      overall: 'unknown' as 'healthy' | 'warning' | 'critical' | 'unknown',
      issues: [] as string[]
    };

    if (games && games.length === 0) {
      healthStatus.overall = 'warning';
      healthStatus.issues.push('No games found for target date');
    } else if (gamesByStatus['live'] > 0 || gamesByStatus['in_progress'] > 0) {
      // Live games exist
      if (statsCount === 0) {
        healthStatus.overall = 'critical';
        healthStatus.issues.push('Live games exist but no stats found');
      } else if (timeSinceLastSync && timeSinceLastSync > 15) {
        healthStatus.overall = 'warning';
        healthStatus.issues.push(`Last sync was ${timeSinceLastSync} minutes ago (>15 min)`);
      } else {
        healthStatus.overall = 'healthy';
      }
    } else if (gamesByStatus['final'] > 0) {
      // Final games exist
      if (finalizedCount === 0) {
        healthStatus.overall = 'warning';
        healthStatus.issues.push('Final games exist but no finalized stats');
      } else if (statsCount === 0) {
        healthStatus.overall = 'critical';
        healthStatus.issues.push('Final games exist but no stats found');
      } else {
        healthStatus.overall = 'healthy';
      }
    } else {
      // Scheduled games or no games
      healthStatus.overall = 'healthy';
    }

    // Return comprehensive status
    return NextResponse.json({
      success: true,
      date: targetDate,
      timestamp: new Date().toISOString(),
      games: {
        total: games?.length || 0,
        byStatus: gamesByStatus,
        details: games?.slice(0, 5).map(g => ({
          id: g.external_game_id,
          matchup: `${g.away_team} @ ${g.home_team}`,
          time: g.starts_at,
          status: g.status,
          week: g.week_number
        }))
      },
      stats: {
        total: statsCount,
        finalized: finalizedCount,
        avgFantasyPoints: Math.round(avgFantasyPoints * 10) / 10,
        lastSyncMinutesAgo: timeSinceLastSync
      },
      health: healthStatus,
      recommendations: generateRecommendations(healthStatus, gamesByStatus, statsCount, timeSinceLastSync)
    });

  } catch (err: any) {
    console.error('Test sync error:', err);
    return NextResponse.json({ 
      success: false,
      error: err.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

function generateRecommendations(
  health: any,
  gamesByStatus: any,
  statsCount: number,
  timeSinceLastSync: number | null
): string[] {
  const recommendations: string[] = [];

  if (health.overall === 'critical') {
    recommendations.push('🚨 URGENT: Run manual sync immediately');
    recommendations.push('   curl -X POST http://localhost:3000/api/admin/sync/stats -d \'{"dates":["' + new Date().toISOString().split('T')[0] + '"]}\' -H "Content-Type: application/json"');
  }

  if (health.overall === 'warning') {
    if (timeSinceLastSync && timeSinceLastSync > 15) {
      recommendations.push('⚠️  Stats are stale, consider refreshing');
      recommendations.push('   Run: ./scripts/sync-live-games.sh');
    }
  }

  if (gamesByStatus['live'] > 0 || gamesByStatus['in_progress'] > 0) {
    recommendations.push('⚡ Live games detected');
    recommendations.push('   Recommended: Sync every 5-10 minutes');
  }

  if (statsCount === 0 && (gamesByStatus['final'] > 0 || gamesByStatus['live'] > 0)) {
    recommendations.push('📊 Missing stats for completed/live games');
    recommendations.push('   Check API key and connectivity');
  }

  if (health.overall === 'healthy') {
    recommendations.push('✅ System is healthy');
    if (gamesByStatus['live'] > 0) {
      recommendations.push('   Continue monitoring during live games');
    }
  }

  return recommendations;
}

