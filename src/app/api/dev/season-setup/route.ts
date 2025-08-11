import { NextRequest, NextResponse } from 'next/server';
import { fetchNFLGames, fetchPlayerStats, fetchNFLTeams, fetchNFLPlayers } from '@/lib/nflProvider';

export async function POST(req: NextRequest) {
  try {
    console.log('Testing 2025 NFL Season Data Setup...');

    const body = await req.json().catch(() => ({}));
    const { 
      test_games = true, 
      test_stats = true, 
      current_year = 2024,
      upcoming_year = 2025 
    } = body;

    const results: any = {
      success: true,
      message: 'Season data exploration completed',
      current_season: current_year,
      upcoming_season: upcoming_year,
      timestamp: new Date().toISOString()
    };

    // Test games data for current and upcoming seasons
    if (test_games) {
      console.log('Testing games data...');
      
      // Try to get current season games
      try {
        const currentSeasonGames = await fetchNFLGames({
          seasons: [current_year],
          per_page: 10
        });
        
        results.current_season_games = {
          available: true,
          count: currentSeasonGames.data?.length || 0,
          sample: currentSeasonGames.data?.slice(0, 3) || [],
          meta: currentSeasonGames.meta
        };
      } catch (error) {
        results.current_season_games = {
          available: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }

      // Try to get upcoming season games  
      try {
        const upcomingSeasonGames = await fetchNFLGames({
          seasons: [upcoming_year],
          per_page: 10
        });
        
        results.upcoming_season_games = {
          available: true,
          count: upcomingSeasonGames.data?.length || 0,
          sample: upcomingSeasonGames.data?.slice(0, 3) || [],
          meta: upcomingSeasonGames.meta
        };
      } catch (error) {
        results.upcoming_season_games = {
          available: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }

      // Try recent games (last 7 days)
      try {
        const recentDate = new Date();
        recentDate.setDate(recentDate.getDate() - 7);
        const dateStr = recentDate.toISOString().split('T')[0];
        
        const recentGames = await fetchNFLGames({
          dates: [dateStr],
          per_page: 5
        });
        
        results.recent_games = {
          available: true,
          count: recentGames.data?.length || 0,
          sample: recentGames.data?.slice(0, 2) || [],
          search_date: dateStr
        };
      } catch (error) {
        results.recent_games = {
          available: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }

    // Test current stats data
    if (test_stats) {
      console.log('Testing player stats data...');
      
      try {
        const currentStats = await fetchPlayerStats({
          seasons: [current_year],
          per_page: 5
        });
        
        results.current_season_stats = {
          available: true,
          count: currentStats.data?.length || 0,
          sample: currentStats.data?.slice(0, 2) || [],
          meta: currentStats.meta
        };
      } catch (error) {
        results.current_season_stats = {
          available: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }

      // Try upcoming season stats
      try {
        const upcomingStats = await fetchPlayerStats({
          seasons: [upcoming_year],
          per_page: 5
        });
        
        results.upcoming_season_stats = {
          available: true,
          count: upcomingStats.data?.length || 0,
          sample: upcomingStats.data?.slice(0, 2) || [],
          meta: upcomingStats.meta
        };
      } catch (error) {
        results.upcoming_season_stats = {
          available: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }

    // Get team and player counts for reference
    try {
      const teams = await fetchNFLTeams();
      results.teams_available = {
        count: teams.data?.length || 0,
        sample: teams.data?.slice(0, 3).map(t => ({ id: t.id, name: t.full_name, abbreviation: t.abbreviation })) || []
      };
    } catch (error) {
      results.teams_available = {
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    try {
      const players = await fetchNFLPlayers({ per_page: 10 });
      results.players_available = {
        count: players.data?.length || 0,
        total_estimated: players.meta?.total_count || 'unknown',
        sample: players.data?.slice(0, 3).map(p => ({ 
          id: p.id, 
          name: `${p.first_name} ${p.last_name}`, 
          position: p.position,
          team: p.team?.abbreviation 
        })) || []
      };
    } catch (error) {
      results.players_available = {
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Summary and recommendations
    results.recommendations = {
      can_setup_2025_season: Boolean(results.upcoming_season_games?.available || results.teams_available?.count > 0),
      has_current_data: Boolean(results.current_season_games?.available && results.current_season_stats?.available),
      next_steps: []
    };

    if (results.upcoming_season_games?.available) {
      results.recommendations.next_steps.push('✅ Can sync 2025 season schedule');
    } else {
      results.recommendations.next_steps.push('⏳ 2025 season schedule not yet available - use current season for testing');
    }

    if (results.current_season_stats?.available) {
      results.recommendations.next_steps.push('✅ Can use current season stats for player projections');
    }

    if (results.teams_available?.count > 0) {
      results.recommendations.next_steps.push('✅ Team data is available for roster setup');
    }

    return NextResponse.json(results);

  } catch (err: any) {
    console.error('Season setup test error:', err);
    return NextResponse.json({ 
      success: false,
      error: err?.message || 'Unknown error',
      details: err?.stack
    }, { status: 500 });
  }
}
