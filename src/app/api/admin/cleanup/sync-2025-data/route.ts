import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * Comprehensive 2025 NFL Season Data Sync
 * 
 * This endpoint:
 * 1. Syncs all 2025 season games with correct dates, status, and season_type
 * 2. Updates existing game records with accurate data
 * 3. Adds missing games from the API
 */
export async function POST(req: NextRequest) {
  try {
    console.log('🚀 Starting 2025 NFL Season Data Sync...');
    
    const body = await req.json().catch(() => ({}));
    const { dry_run = false, max_games = 500 } = body;

    const results = {
      success: true,
      dry_run,
      timestamp: new Date().toISOString(),
      games_processed: 0,
      games_updated: 0,
      games_created: 0,
      errors: [] as any[]
    };

    // Get 2025 season from database
    const { data: season, error: seasonError } = await supabaseAdmin
      .from('seasons')
      .select('id, year')
      .eq('year', 2025)
      .eq('league', 'NFL')
      .single();

    if (seasonError || !season) {
      console.error('2025 season not found:', seasonError);
      return NextResponse.json({
        success: false,
        error: '2025 NFL season not found in database',
        details: seasonError
      }, { status: 404 });
    }

    console.log(`📅 Found 2025 season: ${season.id}`);

    // Get team mapping (external_id -> internal id)
    const { data: teams, error: teamsError } = await supabaseAdmin
      .from('teams')
      .select('id, external_id, abbreviation');

    if (teamsError || !teams) {
      return NextResponse.json({
        success: false,
        error: 'Failed to load teams',
        details: teamsError
      }, { status: 500 });
    }

    const teamMap = new Map(teams.map(t => [t.external_id, t.id]));
    console.log(`📊 Loaded ${teams.length} teams`);

    // Fetch all 2025 games from BallDontLie API using the nflProvider
    // We'll make multiple paginated requests
    const baseUrl = req.nextUrl.origin;
    let allGamesFromAPI: any[] = [];
    let cursor: number | undefined = undefined;
    let hasMore = true;
    let page = 0;

    console.log('📥 Fetching 2025 games from BallDontLie API...');

    while (hasMore && allGamesFromAPI.length < max_games) {
      page++;
      console.log(`  Page ${page}, cursor: ${cursor || 'start'}`);

      // Build the API call URL
      const params = new URLSearchParams({
        seasons: '2025',
        per_page: '100',
        ...(cursor && { cursor: cursor.toString() })
      });

      // Call our internal sync endpoint to fetch games
      const response = await fetch(`${baseUrl}/api/admin/sync/games?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch games from API: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      if (data.games && data.games.length > 0) {
        allGamesFromAPI.push(...data.games);
        console.log(`    Got ${data.games.length} games, total: ${allGamesFromAPI.length}`);
        
        // Check for next page
        if (data.meta && data.meta.next_cursor) {
          cursor = data.meta.next_cursor;
        } else {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }

      // Safety break
      if (page > 20) {
        console.log('⚠️ Stopping at page 20 to prevent infinite loop');
        break;
      }
    }

    console.log(`✅ Fetched ${allGamesFromAPI.length} games from API`);

    // Get existing games from database
    const { data: existingGames } = await supabaseAdmin
      .from('sports_events')
      .select('id, external_game_id, status, starts_at, season_type, week_number');

    const existingGamesMap = new Map(
      (existingGames || []).map(g => [g.external_game_id, g])
    );

    console.log(`📊 Found ${existingGames?.length || 0} existing games in database`);

    // Process each game from API
    for (const apiGame of allGamesFromAPI) {
      results.games_processed++;

      try {
        const homeTeamId = teamMap.get(apiGame.home_team.id.toString());
        const awayTeamId = teamMap.get(apiGame.visitor_team.id.toString());

        if (!homeTeamId || !awayTeamId) {
          console.warn(`⚠️ Missing team mapping for game ${apiGame.id}`);
          results.errors.push({
            game_id: apiGame.id,
            error: 'Missing team mapping',
            home_team: apiGame.home_team.abbreviation,
            away_team: apiGame.visitor_team.abbreviation
          });
          continue;
        }

        const gameData = {
          external_game_id: apiGame.id.toString(),
          home_team: apiGame.home_team.abbreviation,
          away_team: apiGame.visitor_team.abbreviation,
          home_team_id: homeTeamId,
          away_team_id: awayTeamId,
          starts_at: apiGame.date,
          status: apiGame.status.toLowerCase(),
          season_type: apiGame.postseason ? 'postseason' : 'regular',
          week_number: apiGame.week
        };

        if (dry_run) {
          if (existingGamesMap.has(gameData.external_game_id)) {
            results.games_updated++;
          } else {
            results.games_created++;
          }
          continue;
        }

        // Check if game exists
        const existingGame = existingGamesMap.get(gameData.external_game_id);

        if (existingGame) {
          // Update existing game
          const { error: updateError } = await supabaseAdmin
            .from('sports_events')
            .update(gameData)
            .eq('id', existingGame.id);

          if (updateError) {
            console.error(`❌ Error updating game ${gameData.external_game_id}:`, updateError);
            results.errors.push({
              game_id: apiGame.id,
              action: 'update',
              error: updateError.message
            });
          } else {
            results.games_updated++;
          }
        } else {
          // Create new game
          const { error: insertError } = await supabaseAdmin
            .from('sports_events')
            .insert(gameData);

          if (insertError) {
            console.error(`❌ Error creating game ${gameData.external_game_id}:`, insertError);
            results.errors.push({
              game_id: apiGame.id,
              action: 'create',
              error: insertError.message
            });
          } else {
            results.games_created++;
          }
        }

        // Log progress every 50 games
        if (results.games_processed % 50 === 0) {
          console.log(`  Processed ${results.games_processed}/${allGamesFromAPI.length} games...`);
        }

      } catch (error) {
        console.error(`❌ Error processing game ${apiGame.id}:`, error);
        results.errors.push({
          game_id: apiGame.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    console.log('\n✅ 2025 Season Data Sync Complete!');
    console.log(`   Games Processed: ${results.games_processed}`);
    console.log(`   Games Updated: ${results.games_updated}`);
    console.log(`   Games Created: ${results.games_created}`);
    console.log(`   Errors: ${results.errors.length}`);

    return NextResponse.json(results);

  } catch (error) {
    console.error('❌ Fatal error during 2025 season sync:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

