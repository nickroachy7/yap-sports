import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * Comprehensive Data Verification
 * 
 * Checks all critical data quality metrics:
 * - Stats external references
 * - Active player counts
 * - Game data quality
 * - Foreign key integrity
 */
export async function GET(req: NextRequest) {
  try {
    console.log('🔍 Starting Data Verification...\n');
    
    const report = {
      timestamp: new Date().toISOString(),
      overall_status: 'healthy' as 'healthy' | 'warning' | 'critical',
      checks: [] as any[],
      summary: {
        passed: 0,
        warnings: 0,
        failed: 0
      }
    };

    // Check 1: Stats External References
    const { count: totalStats } = await supabaseAdmin
      .from('player_game_stats')
      .select('*', { count: 'exact', head: true });

    const { count: withGameRef } = await supabaseAdmin
      .from('player_game_stats')
      .select('*', { count: 'exact', head: true })
      .not('external_game_id', 'is', null);

    const { count: withPlayerRef } = await supabaseAdmin
      .from('player_game_stats')
      .select('*', { count: 'exact', head: true })
      .not('external_player_id', 'is', null);

    const statsResult = {
      total_stats: totalStats || 0,
      with_game_ref: withGameRef || 0,
      with_player_ref: withPlayerRef || 0,
      missing_game_ref: (totalStats || 0) - (withGameRef || 0),
      missing_player_ref: (totalStats || 0) - (withPlayerRef || 0)
    };
    const statsCheckPassed = statsResult && 
      statsResult.missing_game_ref === 0 && 
      statsResult.missing_player_ref === 0;

    report.checks.push({
      name: 'Stats External References',
      status: statsCheckPassed ? 'pass' : 'fail',
      details: {
        total_stats: statsResult?.total_stats || 0,
        missing_game_refs: statsResult?.missing_game_ref || 0,
        missing_player_refs: statsResult?.missing_player_ref || 0
      },
      message: statsCheckPassed 
        ? `✅ All ${statsResult?.total_stats || 0} stats have proper external references`
        : `❌ ${statsResult?.missing_game_ref || 0} stats missing game refs, ${statsResult?.missing_player_ref || 0} missing player refs`
    });

    if (statsCheckPassed) report.summary.passed++;
    else report.summary.failed++;

    // Check 2: Active Player Count
    const { count: activePlayers } = await supabaseAdmin
      .from('players')
      .select('*', { count: 'exact', head: true })
      .eq('active', true);

    const expectedMin = 1500;
    const expectedMax = 2500;
    const playerCountHealthy = activePlayers && 
      activePlayers >= expectedMin && 
      activePlayers <= expectedMax;

    report.checks.push({
      name: 'Active Player Count',
      status: playerCountHealthy ? 'pass' : 'warning',
      details: {
        active_players: activePlayers || 0,
        expected_range: `${expectedMin}-${expectedMax}`
      },
      message: playerCountHealthy
        ? `✅ ${activePlayers} active players (within expected range)`
        : `⚠️ ${activePlayers} active players (expected ${expectedMin}-${expectedMax})`
    });

    if (playerCountHealthy) report.summary.passed++;
    else report.summary.warnings++;

    // Check 3: 2025 Season Games
    const { count: games2025 } = await supabaseAdmin
      .from('sports_events')
      .select('*', { count: 'exact', head: true })
      .gte('starts_at', '2025-01-01')
      .lt('starts_at', '2026-01-01');

    const expectedGames = 250; // Approximate for full season
    const gamesHealthy = games2025 && games2025 >= expectedGames;

    report.checks.push({
      name: '2025 Season Games',
      status: gamesHealthy ? 'pass' : 'warning',
      details: {
        games_count: games2025 || 0,
        expected_min: expectedGames
      },
      message: gamesHealthy
        ? `✅ ${games2025} games in 2025 season`
        : `⚠️ Only ${games2025} games found (expected ~${expectedGames}+)`
    });

    if (gamesHealthy) report.summary.passed++;
    else report.summary.warnings++;

    // Check 4: Game Status & Season Type
    const { data: gamesWithoutSeasonType } = await supabaseAdmin
      .from('sports_events')
      .select('id')
      .is('season_type', null)
      .limit(1);

    const seasonTypeHealthy = !gamesWithoutSeasonType || gamesWithoutSeasonType.length === 0;

    report.checks.push({
      name: 'Game Metadata Completeness',
      status: seasonTypeHealthy ? 'pass' : 'warning',
      details: {
        games_missing_season_type: gamesWithoutSeasonType?.length || 0
      },
      message: seasonTypeHealthy
        ? `✅ All games have proper season_type`
        : `⚠️ Some games missing season_type`
    });

    if (seasonTypeHealthy) report.summary.passed++;
    else report.summary.warnings++;

    // Check 5: Foreign Key Integrity
    const { data: orphanedStats } = await supabaseAdmin
      .from('player_game_stats')
      .select('id')
      .or('player_id.is.null,sports_event_id.is.null')
      .limit(1);

    const fkIntegrity = !orphanedStats || orphanedStats.length === 0;

    report.checks.push({
      name: 'Foreign Key Integrity',
      status: fkIntegrity ? 'pass' : 'fail',
      details: {
        orphaned_stats: orphanedStats?.length || 0
      },
      message: fkIntegrity
        ? `✅ All stats properly linked to players and games`
        : `❌ Found orphaned stats records`
    });

    if (fkIntegrity) report.summary.passed++;
    else report.summary.failed++;

    // Check 6: Team Count
    const { count: activeTeams } = await supabaseAdmin
      .from('teams')
      .select('*', { count: 'exact', head: true })
      .eq('active', true);

    const teamsHealthy = activeTeams === 32;

    report.checks.push({
      name: 'NFL Teams',
      status: teamsHealthy ? 'pass' : 'fail',
      details: {
        active_teams: activeTeams || 0,
        expected: 32
      },
      message: teamsHealthy
        ? `✅ All 32 NFL teams present`
        : `❌ Expected 32 teams, found ${activeTeams}`
    });

    if (teamsHealthy) report.summary.passed++;
    else report.summary.failed++;

    // Check 7: Players without Teams
    const { count: playersWithoutTeam } = await supabaseAdmin
      .from('players')
      .select('*', { count: 'exact', head: true })
      .eq('active', true)
      .is('team_id', null);

    const teamAssignmentHealthy = (playersWithoutTeam || 0) === 0;

    report.checks.push({
      name: 'Player Team Assignment',
      status: teamAssignmentHealthy ? 'pass' : 'warning',
      details: {
        players_without_team: playersWithoutTeam || 0
      },
      message: teamAssignmentHealthy
        ? `✅ All active players assigned to teams`
        : `⚠️ ${playersWithoutTeam} active players without team assignment`
    });

    if (teamAssignmentHealthy) report.summary.passed++;
    else report.summary.warnings++;

    // Check 8: Recent Stats Availability
    const { count: statsLast30Days } = await supabaseAdmin
      .from('player_game_stats')
      .select('*', { count: 'exact', head: true })
      .gte('game_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    report.checks.push({
      name: 'Recent Stats Data',
      status: 'info',
      details: {
        stats_last_30_days: statsLast30Days || 0
      },
      message: `📊 ${statsLast30Days} stat records from last 30 days`
    });

    // Determine overall status
    if (report.summary.failed > 0) {
      report.overall_status = 'critical';
    } else if (report.summary.warnings > 0) {
      report.overall_status = 'warning';
    }

    console.log('\n✅ Data Verification Complete!\n');
    console.log(`Overall Status: ${report.overall_status.toUpperCase()}`);
    console.log(`Passed: ${report.summary.passed}`);
    console.log(`Warnings: ${report.summary.warnings}`);
    console.log(`Failed: ${report.summary.failed}\n`);

    report.checks.forEach(check => {
      console.log(check.message);
    });

    return NextResponse.json(report);

  } catch (error) {
    console.error('❌ Fatal error during verification:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

