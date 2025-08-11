import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: NextRequest) {
  try {
    console.log('Testing complete user flow...');

    const body = await req.json().catch(() => ({}));
    const { 
      test_user_id = null,
      create_test_data = false 
    } = body;

    const results: any = {
      success: true,
      message: 'User flow test completed',
      timestamp: new Date().toISOString(),
      flow_steps: {}
    };

    // Step 1: Check database setup
    console.log('Step 1: Checking database setup...');
    try {
      // Check teams
      const { data: teams, error: teamsError } = await supabaseAdmin
        .from('teams')
        .select('id, name, abbreviation')
        .limit(5);
      
      if (teamsError) throw teamsError;
      
      results.flow_steps.database_teams = {
        status: 'success',
        count: teams?.length || 0,
        sample: teams?.slice(0, 3) || []
      };

      // Check players  
      const { data: players, error: playersError } = await supabaseAdmin
        .from('players')
        .select('id, first_name, last_name, position, team, external_id')
        .eq('active', true)
        .limit(5);
      
      if (playersError) throw playersError;
      
      results.flow_steps.database_players = {
        status: 'success',
        count: players?.length || 0,
        sample: players?.slice(0, 3) || []
      };

      // Check packs
      const { data: packs, error: packsError } = await supabaseAdmin
        .from('packs')
        .select('id, name, price_coins, enabled')
        .eq('enabled', true);
      
      if (packsError) throw packsError;
      
      results.flow_steps.available_packs = {
        status: 'success',
        count: packs?.length || 0,
        packs: packs || []
      };

      // Check cards exist
      const { data: cards, error: cardsError } = await supabaseAdmin
        .from('cards')
        .select('id, rarity, base_sell_value')
        .limit(5);
      
      if (cardsError) throw cardsError;
      
      results.flow_steps.available_cards = {
        status: 'success',
        count: cards?.length || 0,
        sample: cards?.slice(0, 3) || []
      };

    } catch (error) {
      results.flow_steps.database_setup = {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown database error'
      };
    }

    // Step 2: Check user team setup (if test user provided)
    if (test_user_id) {
      console.log('Step 2: Checking user team setup...');
      try {
        const { data: userTeams, error: userTeamsError } = await supabaseAdmin
          .from('user_teams')
          .select('id, name, coins, active')
          .eq('user_id', test_user_id)
          .eq('active', true);
        
        if (userTeamsError) throw userTeamsError;
        
        results.flow_steps.user_teams = {
          status: 'success',
          count: userTeams?.length || 0,
          teams: userTeams || []
        };

        if (userTeams && userTeams.length > 0) {
          const teamId = userTeams[0].id;
          
          // Check user cards
          const { data: userCards, error: userCardsError } = await supabaseAdmin
            .from('user_cards')
            .select(`
              id, 
              remaining_contracts, 
              current_sell_value,
              status,
              cards!inner (
                id,
                rarity,
                players!inner (
                  id,
                  first_name,
                  last_name,
                  position,
                  team
                )
              )
            `)
            .eq('team_id', teamId)
            .eq('status', 'owned')
            .limit(5);
          
          if (userCardsError) throw userCardsError;
          
          results.flow_steps.user_cards = {
            status: 'success',
            count: userCards?.length || 0,
            sample: userCards?.slice(0, 3) || []
          };

          // Check user packs
          const { data: userPacks, error: userPacksError } = await supabaseAdmin
            .from('user_packs')
            .select(`
              id,
              status,
              packs (
                id,
                name,
                price_coins
              )
            `)
            .eq('team_id', teamId)
            .limit(5);
          
          if (userPacksError) throw userPacksError;
          
          results.flow_steps.user_packs = {
            status: 'success',
            count: userPacks?.length || 0,
            unopened: userPacks?.filter(p => p.status === 'unopened').length || 0,
            sample: userPacks?.slice(0, 3) || []
          };

          // Check user tokens
          const { data: userTokens, error: userTokensError } = await supabaseAdmin
            .from('user_tokens')
            .select(`
              id,
              uses_remaining,
              status,
              token_types (
                id,
                name,
                description,
                rarity
              )
            `)
            .eq('team_id', teamId)
            .limit(5);
          
          if (userTokensError) throw userTokensError;
          
          results.flow_steps.user_tokens = {
            status: 'success',
            count: userTokens?.length || 0,
            sample: userTokens?.slice(0, 3) || []
          };
        }
      } catch (error) {
        results.flow_steps.user_data = {
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown user data error'
        };
      }
    }

    // Step 3: Check database functions exist
    console.log('Step 3: Checking database functions...');
    try {
      // Check if functions exist in pg_proc system catalog
      const { data: functions, error: functionsError } = await supabaseAdmin
        .from('pg_proc')
        .select('proname')
        .eq('proname', 'purchase_pack_for_team')
        .limit(1);
      
      results.flow_steps.database_functions = {
        status: 'success',
        purchase_pack_for_team: functions && functions.length > 0 ? 'exists' : 'not_found'
      };
    } catch (error) {
      // Check if functions exist using a different method
      try {
        const { data: functionsList, error: listError } = await supabaseAdmin
          .from('pg_proc')
          .select('proname')
          .like('proname', '%pack%')
          .limit(10);
        
        results.flow_steps.database_functions = {
          status: 'partial',
          found_functions: functionsList?.map(f => f.proname) || [],
          note: 'Could not verify all functions directly'
        };
      } catch (listError) {
        results.flow_steps.database_functions = {
          status: 'unknown',
          error: 'Could not check database functions',
          note: 'Functions may exist but cannot be verified'
        };
      }
    }

    // Step 4: Current season and week setup
    console.log('Step 4: Checking season and week setup...');
    try {
      const { data: seasons, error: seasonsError } = await supabaseAdmin
        .from('seasons')
        .select('id, year, league, start_date, end_date')
        .eq('league', 'NFL')
        .order('year', { ascending: false })
        .limit(3);
      
      if (seasonsError) throw seasonsError;
      
      results.flow_steps.seasons = {
        status: 'success',
        count: seasons?.length || 0,
        seasons: seasons || []
      };

      if (seasons && seasons.length > 0) {
        const currentSeason = seasons[0];
        
        const { data: weeks, error: weeksError } = await supabaseAdmin
          .from('weeks')
          .select('id, week_number, start_at, lock_at, end_at, status')
          .eq('season_id', currentSeason.id)
          .order('week_number', { ascending: true })
          .limit(5);
        
        if (weeksError) throw weeksError;
        
        results.flow_steps.weeks = {
          status: 'success',
          season_year: currentSeason.year,
          count: weeks?.length || 0,
          sample: weeks?.slice(0, 3) || []
        };
      }
    } catch (error) {
      results.flow_steps.season_setup = {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown season error'
      };
    }

    // Provide summary and recommendations
    results.summary = {
      database_ready: Boolean(
        results.flow_steps.database_teams?.status === 'success' &&
        results.flow_steps.database_players?.status === 'success' &&
        results.flow_steps.available_packs?.status === 'success'
      ),
      user_flow_ready: Boolean(
        test_user_id && 
        results.flow_steps.user_teams?.status === 'success' &&
        results.flow_steps.user_teams?.count > 0
      ),
      season_ready: Boolean(
        results.flow_steps.seasons?.status === 'success' &&
        results.flow_steps.seasons?.count > 0
      )
    };

    results.recommendations = [];
    
    if (!results.summary.database_ready) {
      results.recommendations.push('❌ Database setup incomplete - need to sync teams and players');
    } else {
      results.recommendations.push('✅ Database has teams, players, and packs ready');
    }

    if (!results.summary.season_ready) {
      results.recommendations.push('❌ Season setup incomplete - need to create seasons and weeks');
    } else {
      results.recommendations.push('✅ Season and week structure exists');
    }

    if (test_user_id && !results.summary.user_flow_ready) {
      results.recommendations.push('❌ Test user needs a team to test user flow');
    } else if (test_user_id) {
      results.recommendations.push('✅ Test user has team setup ready');
    }

    return NextResponse.json(results);

  } catch (err: any) {
    console.error('User flow test error:', err);
    return NextResponse.json({ 
      success: false,
      error: err?.message || 'Unknown error',
      details: err?.stack
    }, { status: 500 });
  }
}
