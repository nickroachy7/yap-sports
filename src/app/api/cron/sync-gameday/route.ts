import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

export async function GET(_req: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = headers().get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🏈 Starting gameday sync job...');
    const startTime = Date.now();
    
    const results: any = {
      timestamp: new Date().toISOString(),
      jobs: [],
      total_duration: 0,
      success: true,
      errors: []
    };

    // Check if it's actually gameday (Sunday or Monday/Thursday for primetime)
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const isGameDay = dayOfWeek === 0 || dayOfWeek === 1 || dayOfWeek === 4; // Sunday, Monday, Thursday

    if (!isGameDay) {
      console.log('📅 Not a game day, skipping gameday sync');
      return NextResponse.json({
        message: 'Not a game day, sync skipped',
        success: true,
        day_of_week: dayOfWeek,
        is_game_day: false
      });
    }

    // 1. Sync Live Player Stats
    try {
      console.log('📊 Syncing live player stats...');
      const statsResponse = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/admin/sync/stats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          cron_job: true,
          dates: [now.toISOString().split('T')[0]], // Today's date
          per_page: 100,
          max_stats: 2000
        })
      });

      const statsData = await statsResponse.json();
      
      if (!statsResponse.ok) {
        throw new Error(`Stats sync failed: ${statsData.error}`);
      }

      results.jobs.push({
        name: 'live_stats_sync',
        status: 'success',
        duration: Date.now() - startTime,
        data: statsData
      });

      console.log('✅ Live stats sync completed');
    } catch (err: any) {
      console.error('❌ Stats sync failed:', err);
      results.errors.push(`Stats sync: ${err.message}`);
      results.success = false;
    }

    // 2. Update Game Statuses
    try {
      console.log('🎮 Updating game statuses...');
      const gamesResponse = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/admin/sync/games`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          cron_job: true,
          dates: [now.toISOString().split('T')[0]], // Today's games only
          per_page: 20
        })
      });

      const gamesData = await gamesResponse.json();
      
      if (!gamesResponse.ok) {
        throw new Error(`Games update failed: ${gamesData.error}`);
      }

      results.jobs.push({
        name: 'games_status_update',
        status: 'success',
        duration: Date.now() - startTime,
        data: gamesData
      });

      console.log('✅ Game statuses updated');
    } catch (err: any) {
      console.error('❌ Game status update failed:', err);
      results.errors.push(`Games update: ${err.message}`);
      results.success = false;
    }

    results.total_duration = Date.now() - startTime;

    console.log(`🎯 Gameday sync completed in ${results.total_duration}ms`);
    console.log(`📊 Jobs: ${results.jobs.length}, Errors: ${results.errors.length}`);

    // Return comprehensive results
    return NextResponse.json({
      message: results.success ? 'Gameday sync completed successfully' : 'Gameday sync completed with errors',
      success: results.success,
      duration_ms: results.total_duration,
      jobs_completed: results.jobs.length,
      error_count: results.errors.length,
      is_game_day: isGameDay,
      day_of_week: dayOfWeek,
      results: results
    });

  } catch (err: any) {
    console.error('💥 Gameday sync job failed:', err);
    
    return NextResponse.json({
      error: 'Gameday sync job failed',
      message: err.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
