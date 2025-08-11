import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(_req: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = headers().get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔧 Starting weekly maintenance job...');
    const startTime = Date.now();
    
    const results: any = {
      timestamp: new Date().toISOString(),
      jobs: [],
      total_duration: 0,
      success: true,
      errors: []
    };

    // 1. Database Maintenance
    try {
      console.log('🗄️ Running database maintenance...');
      
      // Analyze tables for performance
      await supabaseAdmin.rpc('maintenance_analyze_tables');
      
      // Clean up old sessions and temporary data
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30); // 30 days ago
      
      const { data: cleanupResult, error: cleanupError } = await supabaseAdmin
        .from('token_evaluations')
        .delete()
        .lt('evaluated_at', cutoffDate.toISOString());

      if (cleanupError) {
        throw new Error(`Database cleanup failed: ${cleanupError.message}`);
      }

      results.jobs.push({
        name: 'database_maintenance',
        status: 'success',
        duration: Date.now() - startTime,
        data: { 
          message: 'Database maintenance completed',
          cleanup_result: cleanupResult
        }
      });

      console.log('✅ Database maintenance completed');
    } catch (err: any) {
      console.error('❌ Database maintenance failed:', err);
      results.errors.push(`Database maintenance: ${err.message}`);
      results.success = false;
    }

    // 2. Performance Monitoring
    try {
      console.log('📊 Collecting performance metrics...');
      
      // Get key metrics
      const [
        { count: totalUsers },
        { count: totalLineups },
        { count: totalCards },
        { count: totalStats }
      ] = await Promise.all([
        supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }),
        supabaseAdmin.from('lineups').select('*', { count: 'exact', head: true }),
        supabaseAdmin.from('user_cards').select('*', { count: 'exact', head: true }),
        supabaseAdmin.from('player_game_stats').select('*', { count: 'exact', head: true })
      ]);

      const metrics = {
        total_users: totalUsers || 0,
        total_lineups: totalLineups || 0,
        total_cards: totalCards || 0,
        total_stats: totalStats || 0,
        timestamp: new Date().toISOString()
      };

      results.jobs.push({
        name: 'performance_monitoring',
        status: 'success',
        duration: Date.now() - startTime,
        data: metrics
      });

      console.log('✅ Performance metrics collected:', metrics);
    } catch (err: any) {
      console.error('❌ Performance monitoring failed:', err);
      results.errors.push(`Performance monitoring: ${err.message}`);
      results.success = false;
    }

    // 3. Health Checks
    try {
      console.log('🏥 Running system health checks...');
      
      const healthChecks = {
        database_connection: false,
        nfl_api_connection: false,
        essential_tables: false
      };

      // Test database connection
      try {
        const { data } = await supabaseAdmin.from('players').select('id').limit(1);
        healthChecks.database_connection = true;
      } catch (err) {
        console.error('Database health check failed:', err);
      }

      // Test NFL API connection
      try {
        const nflTestResponse = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/dev/test-api`, {
          method: 'POST'
        });
        const nflData = await nflTestResponse.json();
        healthChecks.nfl_api_connection = nflTestResponse.ok && nflData.success;
      } catch (err) {
        console.error('NFL API health check failed:', err);
      }

      // Check essential tables exist and have data
      try {
        const [teams, players, weeks] = await Promise.all([
          supabaseAdmin.from('teams').select('id').limit(1),
          supabaseAdmin.from('players').select('id').limit(1),
          supabaseAdmin.from('weeks').select('id').limit(1)
        ]);
        
        healthChecks.essential_tables = 
          teams.data && teams.data.length > 0 &&
          players.data && players.data.length > 0 &&
          weeks.data && weeks.data.length > 0;
      } catch (err) {
        console.error('Essential tables health check failed:', err);
      }

      const overallHealth = Object.values(healthChecks).every(check => check);

      results.jobs.push({
        name: 'health_checks',
        status: overallHealth ? 'success' : 'warning',
        duration: Date.now() - startTime,
        data: {
          overall_health: overallHealth,
          checks: healthChecks
        }
      });

      console.log('✅ Health checks completed:', healthChecks);
    } catch (err: any) {
      console.error('❌ Health checks failed:', err);
      results.errors.push(`Health checks: ${err.message}`);
      results.success = false;
    }

    // 4. Data Integrity Checks
    try {
      console.log('🔍 Running data integrity checks...');
      
      // Check for orphaned records, data consistency, etc.
      const { data: orphanedCards, error: orphanError } = await supabaseAdmin
        .from('user_cards')
        .select('id')
        .is('cards.id', null);

      if (orphanError) {
        throw new Error(`Data integrity check failed: ${orphanError.message}`);
      }

      const integrityResults = {
        orphaned_cards: orphanedCards?.length || 0,
        // Add more integrity checks as needed
      };

      results.jobs.push({
        name: 'data_integrity',
        status: 'success',
        duration: Date.now() - startTime,
        data: integrityResults
      });

      console.log('✅ Data integrity checks completed');
    } catch (err: any) {
      console.error('❌ Data integrity checks failed:', err);
      results.errors.push(`Data integrity: ${err.message}`);
      results.success = false;
    }

    results.total_duration = Date.now() - startTime;

    console.log(`🎯 Weekly maintenance completed in ${results.total_duration}ms`);
    console.log(`📊 Jobs: ${results.jobs.length}, Errors: ${results.errors.length}`);

    // Return comprehensive results
    return NextResponse.json({
      message: results.success ? 'Weekly maintenance completed successfully' : 'Weekly maintenance completed with errors',
      success: results.success,
      duration_ms: results.total_duration,
      jobs_completed: results.jobs.length,
      error_count: results.errors.length,
      results: results
    });

  } catch (err: any) {
    console.error('💥 Weekly maintenance job failed:', err);
    
    return NextResponse.json({
      error: 'Weekly maintenance job failed',
      message: err.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
