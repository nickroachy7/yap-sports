import { NextRequest, NextResponse } from 'next/server';

/**
 * Master setup endpoint that orchestrates initial data sync from BallDontLie API
 * 
 * This endpoint runs all necessary syncs in the correct order:
 * 0. Season Setup (creates 2025 season and weeks)
 * 1. Teams (32 NFL teams)
 * 2. Players (basic player data)
 * 2.5. Player Profiles (height, weight, college, jersey, age, hometown, etc.)
 * 3. Games (2025 season schedule)
 * 4. Stats (2024 season stats for historical data)
 */
export async function POST(req: NextRequest) {
  try {
    console.log('🚀 Starting initial BallDontLie API sync...');
    
    const body = await req.json().catch(() => ({}));
    const {
      season_year = 2025, // Current season structure
      sync_teams = true,
      sync_players = true,
      sync_player_profiles = true, // Enhanced player data (height, weight, college, etc.)
      sync_games = true,
      sync_stats = true,
      test_mode = false,
      stats_dates = null, // Optional: specific dates for stats sync
      stats_season_year = 2024 // Get stats from 2024 (2025 season just started)
    } = body;

    const results: any = {
      success: true,
      timestamp: new Date().toISOString(),
      season_year,
      test_mode,
      steps: []
    };

    const baseUrl = req.nextUrl.origin;

    // Step 0: Setup Season (Required before games)
    console.log('\n📅 Step 0/5: Setting up NFL Season and Weeks...');
    try {
      const seasonResponse = await fetch(`${baseUrl}/api/admin/sync/season`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          season_year,
          force_recreate: false
        })
      });
      const seasonData = await seasonResponse.json();
      
      results.steps.push({
        step: 0,
        name: 'Season Setup',
        status: seasonResponse.ok ? 'success' : 'failed',
        data: seasonData
      });
      
      if (seasonResponse.ok) {
        console.log(`✅ Season setup: ${seasonData.season?.year} with ${seasonData.weeks?.total || 0} weeks`);
      } else {
        console.error('❌ Season setup failed:', seasonData.error);
        throw new Error(`Season setup failed: ${seasonData.error}`);
      }
    } catch (error: any) {
      console.error('❌ Season setup error:', error.message);
      results.steps.push({
        step: 0,
        name: 'Season Setup',
        status: 'error',
        error: error.message
      });
      throw error; // Season is critical, stop if it fails
    }

    // Step 1: Sync Teams
    if (sync_teams) {
      console.log('\n📋 Step 1/5: Syncing NFL Teams...');
      try {
        const teamsResponse = await fetch(`${baseUrl}/api/admin/sync/teams`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        const teamsData = await teamsResponse.json();
        
        results.steps.push({
          step: 1,
          name: 'Teams Sync',
          status: teamsResponse.ok ? 'success' : 'failed',
          data: teamsData
        });
        
        if (teamsResponse.ok) {
          console.log(`✅ Teams synced: ${teamsData.stats?.inserted || 0} teams`);
        } else {
          console.error('❌ Teams sync failed:', teamsData.error);
          if (!test_mode) {
            throw new Error(`Teams sync failed: ${teamsData.error}`);
          }
        }
      } catch (error: any) {
        console.error('❌ Teams sync error:', error.message);
        results.steps.push({
          step: 1,
          name: 'Teams Sync',
          status: 'error',
          error: error.message
        });
        if (!test_mode) throw error;
      }
    }

    // Step 2: Sync Players
    if (sync_players) {
      console.log('\n👥 Step 2/6: Syncing NFL Players (Basic Data)...');
      try {
        const playersResponse = await fetch(`${baseUrl}/api/admin/sync/players`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            per_page: 100,
            max_players: test_mode ? 200 : 2000,
            test_mode
          })
        });
        const playersData = await playersResponse.json();
        
        results.steps.push({
          step: 2,
          name: 'Players Sync',
          status: playersResponse.ok ? 'success' : 'failed',
          data: playersData
        });
        
        if (playersResponse.ok) {
          console.log(`✅ Players synced: ${playersData.stats?.processed || 0} players`);
        } else {
          console.error('❌ Players sync failed:', playersData.error);
          if (!test_mode) {
            throw new Error(`Players sync failed: ${playersData.error}`);
          }
        }
      } catch (error: any) {
        console.error('❌ Players sync error:', error.message);
        results.steps.push({
          step: 2,
          name: 'Players Sync',
          status: 'error',
          error: error.message
        });
        if (!test_mode) throw error;
      }
    }

    // Step 2.5: Enhance Player Profiles (height, weight, college, jersey, age, hometown)
    if (sync_player_profiles) {
      console.log('\n📝 Step 2.5/6: Enhancing Player Profiles (Physical Stats & Background)...');
      try {
        const profilesResponse = await fetch(`${baseUrl}/api/admin/sync/player-profiles`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            batch_size: 50,
            max_players: test_mode ? 100 : 1000 // Enhance up to 1000 players
          })
        });
        const profilesData = await profilesResponse.json();
        
        results.steps.push({
          step: 2.5,
          name: 'Player Profiles Enhancement',
          status: profilesResponse.ok ? 'success' : 'failed',
          data: profilesData
        });
        
        if (profilesResponse.ok) {
          console.log(`✅ Player profiles enhanced: ${profilesData.stats?.enhanced || 0} players updated with height, weight, college, etc.`);
        } else {
          console.error('❌ Player profiles enhancement failed:', profilesData.error);
          console.warn('⚠️  Continuing without full profile data (players will have basic info only)');
        }
      } catch (error: any) {
        console.error('❌ Player profiles error:', error.message);
        results.steps.push({
          step: 2.5,
          name: 'Player Profiles Enhancement',
          status: 'error',
          error: error.message
        });
        // Don't throw - profile enhancement is helpful but not critical
      }
    }

    // Step 3: Sync Games
    if (sync_games) {
      console.log('\n🏈 Step 3/6: Syncing NFL Games (2025 Schedule)...');
      try {
        const gamesResponse = await fetch(`${baseUrl}/api/admin/sync/games`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            season_year,
            per_page: 100,
            max_games: test_mode ? 50 : 500,
            test_mode
          })
        });
        const gamesData = await gamesResponse.json();
        
        results.steps.push({
          step: 3,
          name: 'Games Sync',
          status: gamesResponse.ok ? 'success' : 'failed',
          data: gamesData
        });
        
        if (gamesResponse.ok) {
          console.log(`✅ Games synced: ${gamesData.stats?.processed || 0} games`);
        } else {
          console.error('❌ Games sync failed:', gamesData.error);
          if (!test_mode) {
            throw new Error(`Games sync failed: ${gamesData.error}`);
          }
        }
      } catch (error: any) {
        console.error('❌ Games sync error:', error.message);
        results.steps.push({
          step: 3,
          name: 'Games Sync',
          status: 'error',
          error: error.message
        });
        if (!test_mode) throw error;
      }
    }

    // Step 4: Sync Stats (Both 2024 Historical + 2025 Current Season)
    if (sync_stats) {
      console.log('\n📊 Step 4/6: Syncing Player Stats (2024 Historical + 2025 Current)...');
      
      // Step 4a: Sync 2024 Historical Data (for player baselines)
      try {
        console.log('  → Syncing 2024 season stats (historical data)...');
        const historical2024Dates = [
          `${stats_season_year}-09-08`, // Week 1
          `${stats_season_year}-09-15`, // Week 2
          `${stats_season_year}-09-22`, // Week 3
          `${stats_season_year}-09-29`, // Week 4
          `${stats_season_year}-10-06`, // Week 5
          `${stats_season_year}-10-13`, // Week 6
          `${stats_season_year}-10-20`, // Week 7
          `${stats_season_year}-10-27`  // Week 8
        ];

        const stats2024Response = await fetch(`${baseUrl}/api/admin/sync/stats`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            season_year: stats_season_year, // 2024
            dates: historical2024Dates,
            per_page: 100,
            max_stats: test_mode ? 50 : 10000,
            test_mode
          })
        });
        const stats2024Data = await stats2024Response.json();
        
        results.steps.push({
          step: 4.1,
          name: '2024 Stats Sync (Historical)',
          status: stats2024Response.ok ? 'success' : 'failed',
          data: stats2024Data
        });
        
        if (stats2024Response.ok) {
          console.log(`  ✅ 2024 stats synced: ${stats2024Data.stats?.processed || 0} stat records`);
        } else {
          console.warn(`  ⚠️  2024 stats sync failed: ${stats2024Data.error}`);
        }
      } catch (error: any) {
        console.error('  ❌ 2024 stats error:', error.message);
        results.steps.push({
          step: 4.1,
          name: '2024 Stats Sync',
          status: 'error',
          error: error.message
        });
      }

      // Step 4b: Sync 2025 Current Season Data
      try {
        console.log('  → Syncing 2025 season stats (current season)...');
        
        // Get dates from Sept 2025 onwards (current season)
        const current2025Dates = [
          `${season_year}-09-05`, // Week 1 2025
          `${season_year}-09-12`, // Week 2 2025
          `${season_year}-09-19`, // Week 3 2025
          `${season_year}-09-26`  // Week 4 2025
        ];

        const stats2025Response = await fetch(`${baseUrl}/api/admin/sync/stats`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            season_year: season_year, // 2025
            dates: stats_dates || current2025Dates,
            per_page: 100,
            max_stats: test_mode ? 50 : 5000,
            test_mode
          })
        });
        const stats2025Data = await stats2025Response.json();
        
        results.steps.push({
          step: 4.2,
          name: '2025 Stats Sync (Current Season)',
          status: stats2025Response.ok ? 'success' : 'failed',
          data: stats2025Data
        });
        
        if (stats2025Response.ok) {
          console.log(`  ✅ 2025 stats synced: ${stats2025Data.stats?.processed || 0} stat records`);
        } else {
          console.warn(`  ⚠️  2025 stats may not be available yet (season just started)`);
          console.warn(`  → This is normal if games haven't been played yet`);
        }
      } catch (error: any) {
        console.warn('  ⚠️  2025 stats not yet available:', error.message);
        results.steps.push({
          step: 4.2,
          name: '2025 Stats Sync',
          status: 'warning',
          error: error.message
        });
        // Don't fail the whole setup if 2025 stats aren't available yet
      }
    }

    // Summary
    const successCount = results.steps.filter((s: any) => s.status === 'success').length;
    const totalSteps = results.steps.length;
    
    console.log(`\n✨ Initial sync complete: ${successCount}/${totalSteps} steps successful`);
    
    results.summary = {
      total_steps: totalSteps,
      successful: successCount,
      failed: totalSteps - successCount,
      completion_rate: `${Math.round((successCount / totalSteps) * 100)}%`
    };

    return NextResponse.json(results);

  } catch (err: any) {
    console.error('💥 Initial sync error:', err);
    return NextResponse.json({
      success: false,
      error: err?.message || 'Unknown error',
      details: err?.stack
    }, { status: 500 });
  }
}
