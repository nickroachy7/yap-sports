import { NextRequest, NextResponse } from 'next/server';

/**
 * Master Data Cleanup & Sync Orchestrator
 * 
 * Runs all cleanup tasks in the correct order:
 * 1. ✅ Stats External Refs (already fixed via SQL)
 * 2. Sync 2025 Season Games
 * 3. Filter Active Players
 * 4. Verify Data Integrity
 */
export async function POST(req: NextRequest) {
  try {
    console.log('🚀 Starting Master Data Cleanup & Sync...\n');
    
    const body = await req.json().catch(() => ({}));
    const { dry_run = false, skip_games = false, skip_players = false } = body;

    const results = {
      success: true,
      dry_run,
      timestamp: new Date().toISOString(),
      steps: [] as any[]
    };

    const baseUrl = req.nextUrl.origin;

    // Step 1: Stats External Refs (already done via SQL)
    console.log('✅ Step 1/4: Stats External Refs - Already Complete\n');
    results.steps.push({
      step: 1,
      name: 'Fix Stats External References',
      status: 'skipped',
      message: 'Already completed via SQL update'
    });

    // Step 2: Sync 2025 Season Games
    if (!skip_games) {
      console.log('📅 Step 2/4: Syncing 2025 Season Games...\n');
      try {
        const gamesResponse = await fetch(`${baseUrl}/api/admin/cleanup/sync-2025-data`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dry_run })
        });

        const gamesResult = await gamesResponse.json();
        
        results.steps.push({
          step: 2,
          name: 'Sync 2025 Season Games',
          status: gamesResult.success ? 'success' : 'failed',
          details: gamesResult
        });

        if (!gamesResult.success) {
          console.error('❌ Game sync failed:', gamesResult.error);
        } else {
          console.log(`✅ Games: ${gamesResult.games_created} created, ${gamesResult.games_updated} updated\n`);
        }
      } catch (error) {
        console.error('❌ Error syncing games:', error);
        results.steps.push({
          step: 2,
          name: 'Sync 2025 Season Games',
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    } else {
      results.steps.push({
        step: 2,
        name: 'Sync 2025 Season Games',
        status: 'skipped',
        message: 'Skipped per request'
      });
    }

    // Step 3: Filter Active Players
    if (!skip_players) {
      console.log('👥 Step 3/4: Filtering Active Players...\n');
      try {
        const playersResponse = await fetch(`${baseUrl}/api/admin/cleanup/filter-active-players`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dry_run, cutoff_date: '2024-01-01' })
        });

        const playersResult = await playersResponse.json();
        
        results.steps.push({
          step: 3,
          name: 'Filter Active Players',
          status: playersResult.success ? 'success' : 'failed',
          details: playersResult
        });

        if (!playersResult.success) {
          console.error('❌ Player filtering failed:', playersResult.error);
        } else {
          console.log(`✅ Players: ${playersResult.before.active_players} → ${playersResult.after.active_players} active\n`);
        }
      } catch (error) {
        console.error('❌ Error filtering players:', error);
        results.steps.push({
          step: 3,
          name: 'Filter Active Players',
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    } else {
      results.steps.push({
        step: 3,
        name: 'Filter Active Players',
        status: 'skipped',
        message: 'Skipped per request'
      });
    }

    // Step 4: Verify Data Integrity
    console.log('🔍 Step 4/4: Verifying Data Integrity...\n');
    try {
      const verifyResponse = await fetch(`${baseUrl}/api/admin/cleanup/verify-data`, {
        method: 'GET'
      });

      const verifyResult = await verifyResponse.json();
      
      results.steps.push({
        step: 4,
        name: 'Verify Data Integrity',
        status: verifyResult.overall_status === 'healthy' ? 'success' : 'warning',
        details: verifyResult
      });

      console.log(`\n📊 Verification Status: ${verifyResult.overall_status.toUpperCase()}`);
      console.log(`   Passed: ${verifyResult.summary.passed}`);
      console.log(`   Warnings: ${verifyResult.summary.warnings}`);
      console.log(`   Failed: ${verifyResult.summary.failed}\n`);

    } catch (error) {
      console.error('❌ Error during verification:', error);
      results.steps.push({
        step: 4,
        name: 'Verify Data Integrity',
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Summary
    const allSuccess = results.steps.every(s => 
      s.status === 'success' || s.status === 'skipped'
    );

    results.success = allSuccess;

    console.log('\n' + '='.repeat(60));
    console.log('🎉 Master Data Cleanup & Sync Complete!\n');
    console.log(`Status: ${results.success ? '✅ SUCCESS' : '⚠️ PARTIAL'}`);
    console.log(`Dry Run: ${dry_run ? 'YES' : 'NO'}`);
    console.log('='.repeat(60) + '\n');

    return NextResponse.json(results);

  } catch (error) {
    console.error('❌ Fatal error during master sync:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

