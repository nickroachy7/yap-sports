import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

export async function GET(_req: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = headers().get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🕒 Starting daily sync job...');
    const startTime = Date.now();
    
    const results: any = {
      timestamp: new Date().toISOString(),
      jobs: [],
      total_duration: 0,
      success: true,
      errors: []
    };

    // 1. Sync NFL Teams
    try {
      console.log('📋 Syncing NFL teams...');
      const teamsResponse = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/admin/sync/teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cron_job: true })
      });

      const teamsData = await teamsResponse.json();
      
      if (!teamsResponse.ok) {
        throw new Error(`Teams sync failed: ${teamsData.error}`);
      }

      results.jobs.push({
        name: 'teams_sync',
        status: 'success',
        duration: Date.now() - startTime,
        data: teamsData
      });

      console.log('✅ Teams sync completed');
    } catch (err: any) {
      console.error('❌ Teams sync failed:', err);
      results.errors.push(`Teams sync: ${err.message}`);
      results.success = false;
    }

    // 2. Sync NFL Players
    try {
      console.log('👥 Syncing NFL players...');
      const playersResponse = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/admin/sync/players`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          cron_job: true,
          per_page: 100,
          max_players: 3000 // Full sync
        })
      });

      const playersData = await playersResponse.json();
      
      if (!playersResponse.ok) {
        throw new Error(`Players sync failed: ${playersData.error}`);
      }

      results.jobs.push({
        name: 'players_sync',
        status: 'success',
        duration: Date.now() - startTime,
        data: playersData
      });

      console.log('✅ Players sync completed');
    } catch (err: any) {
      console.error('❌ Players sync failed:', err);
      results.errors.push(`Players sync: ${err.message}`);
      results.success = false;
    }

    // 3. Sync Season/Weeks Management
    try {
      console.log('📅 Updating season management...');
      const seasonResponse = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/admin/sync/season`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cron_job: true })
      });

      const seasonData = await seasonResponse.json();
      
      if (!seasonResponse.ok) {
        throw new Error(`Season sync failed: ${seasonData.error}`);
      }

      results.jobs.push({
        name: 'season_sync',
        status: 'success',
        duration: Date.now() - startTime,
        data: seasonData
      });

      console.log('✅ Season management updated');
    } catch (err: any) {
      console.error('❌ Season sync failed:', err);
      results.errors.push(`Season sync: ${err.message}`);
      results.success = false;
    }

    // 4. Sync NFL Games/Schedule
    try {
      console.log('🏈 Syncing NFL games...');
      const gamesResponse = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/admin/sync/games`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          cron_job: true,
          per_page: 50,
          max_games: 1000 // Full season
        })
      });

      const gamesData = await gamesResponse.json();
      
      if (!gamesResponse.ok) {
        throw new Error(`Games sync failed: ${gamesData.error}`);
      }

      results.jobs.push({
        name: 'games_sync',
        status: 'success',
        duration: Date.now() - startTime,
        data: gamesData
      });

      console.log('✅ Games sync completed');
    } catch (err: any) {
      console.error('❌ Games sync failed:', err);
      results.errors.push(`Games sync: ${err.message}`);
      results.success = false;
    }

    results.total_duration = Date.now() - startTime;

    console.log(`🎯 Daily sync completed in ${results.total_duration}ms`);
    console.log(`📊 Jobs: ${results.jobs.length}, Errors: ${results.errors.length}`);

    // Return comprehensive results
    return NextResponse.json({
      message: results.success ? 'Daily sync completed successfully' : 'Daily sync completed with errors',
      success: results.success,
      duration_ms: results.total_duration,
      jobs_completed: results.jobs.length,
      error_count: results.errors.length,
      results: results
    });

  } catch (err: any) {
    console.error('💥 Daily sync job failed:', err);
    
    return NextResponse.json({
      error: 'Daily sync job failed',
      message: err.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
