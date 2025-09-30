import { NextRequest, NextResponse } from 'next/server';

/**
 * Weekly 2025 Season Stats Sync
 * 
 * Call this endpoint weekly during the 2025 NFL season to update current stats.
 * This should be run after each week's games are completed (Monday/Tuesday).
 */
export async function POST(req: NextRequest) {
  try {
    console.log('🏈 Starting weekly 2025 season stats sync...');

    const body = await req.json().catch(() => ({}));
    const {
      week_dates = null, // Optional: specific dates for this week
      auto_detect_week = true // Automatically detect which week to sync
    } = body;

    const baseUrl = req.nextUrl.origin;
    const now = new Date();
    const season_year = 2025;

    // Auto-detect which week to sync based on current date
    let datesToSync: string[] = [];
    
    if (auto_detect_week && !week_dates) {
      // 2025 NFL Season week schedule
      const week1Start = new Date('2025-09-04'); // Thursday Sept 4, 2025
      const daysSinceWeek1 = Math.floor((now.getTime() - week1Start.getTime()) / (1000 * 60 * 60 * 24));
      const currentWeek = Math.min(Math.floor(daysSinceWeek1 / 7) + 1, 18);

      if (currentWeek > 0 && currentWeek <= 18) {
        // Calculate the Sunday of the current week
        const weekStartDate = new Date(week1Start);
        weekStartDate.setDate(week1Start.getDate() + (currentWeek - 1) * 7 + 3); // +3 to get to Sunday
        
        const dateStr = weekStartDate.toISOString().split('T')[0];
        datesToSync = [dateStr];
        
        console.log(`Auto-detected Week ${currentWeek} (${dateStr})`);
      } else {
        console.log('Season not yet started or completed');
        return NextResponse.json({
          success: true,
          message: 'No current week to sync (season not started or completed)',
          week: currentWeek > 18 ? 'completed' : 'not started'
        });
      }
    } else {
      datesToSync = week_dates || [];
    }

    if (datesToSync.length === 0) {
      return NextResponse.json({
        error: 'No dates specified and auto-detection failed',
        details: 'Please provide week_dates or enable auto_detect_week'
      }, { status: 400 });
    }

    console.log(`Syncing stats for dates: ${datesToSync.join(', ')}`);

    // Sync stats for the specified dates
    const statsResponse = await fetch(`${baseUrl}/api/admin/sync/stats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        season_year: season_year,
        dates: datesToSync,
        per_page: 100,
        max_stats: 5000
      })
    });

    const statsData = await statsResponse.json();

    if (!statsResponse.ok) {
      console.error('Stats sync failed:', statsData.error);
      return NextResponse.json({
        success: false,
        error: 'Stats sync failed',
        details: statsData.error,
        dates_attempted: datesToSync
      }, { status: 500 });
    }

    console.log(`✅ Successfully synced ${statsData.stats?.processed || 0} stat records`);

    return NextResponse.json({
      success: true,
      message: `2025 Week stats synced successfully`,
      dates_synced: datesToSync,
      stats: statsData.stats,
      timestamp: new Date().toISOString()
    });

  } catch (err: any) {
    console.error('Weekly sync error:', err);
    return NextResponse.json({
      success: false,
      error: err?.message || 'Unknown error',
      details: err?.stack
    }, { status: 500 });
  }
}

