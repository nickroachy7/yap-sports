import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { fetchNFLGames } from '@/lib/nflProvider';

export async function POST(req: NextRequest) {
  try {
    console.log('Starting NFL games sync...');

    // Parse request body for options
    const body = await req.json().catch(() => ({}));
    const { 
      season_year = null,
      per_page = 100,
      max_games = 500,
      test_mode = false 
    } = body;

    // Get current season if not specified
    let targetSeasonYear = season_year;
    if (!targetSeasonYear) {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      targetSeasonYear = currentMonth >= 8 ? currentYear : currentYear - 1;
    }

    console.log(`Syncing games for NFL ${targetSeasonYear} season...`);

    // Get our season and weeks for mapping
    const { data: season, error: seasonError } = await supabaseAdmin
      .from('seasons')
      .select('*')
      .eq('year', targetSeasonYear)
      .eq('league', 'NFL')
      .single();

    if (seasonError) {
      console.error('Error fetching season:', seasonError);
      return NextResponse.json({ 
        error: 'Season not found. Please setup the season first.',
        details: `No NFL ${targetSeasonYear} season found in database.`
      }, { status: 400 });
    }

    const { data: weeks, error: weeksError } = await supabaseAdmin
      .from('weeks')
      .select('*')
      .eq('season_id', season.id)
      .order('week_number');

    if (weeksError) {
      console.error('Error fetching weeks:', weeksError);
      return NextResponse.json({ 
        error: 'Failed to fetch weeks for season',
        details: weeksError.message 
      }, { status: 500 });
    }

    // Get teams for mapping
    const { data: teams, error: teamsError } = await supabaseAdmin
      .from('teams')
      .select('id, external_id, abbreviation, name');

    if (teamsError) {
      console.error('Error fetching teams:', teamsError);
      return NextResponse.json({ 
        error: 'Failed to fetch teams for game mapping',
        details: teamsError.message 
      }, { status: 500 });
    }

    // Create team lookup maps
    const teamIdMap = new Map(teams.map(t => [t.external_id, t.id]));
    const teamAbbrevMap = new Map(teams.map(t => [t.abbreviation, t.id]));

    console.log(`Found season ${season.year}, ${weeks.length} weeks, ${teams.length} teams`);

    const allGames = [];
    let cursor: string | null = null;
    let totalFetched = 0;

    // Fetch games from Ball Don't Lie API with pagination
    do {
      const response = await fetchNFLGames({
        seasons: [targetSeasonYear],
        per_page,
        cursor: cursor || undefined
      });

      if (!response.data) {
        break;
      }

      allGames.push(...response.data);
      totalFetched += response.data.length;
      cursor = response.meta?.next_cursor;

      console.log(`Fetched ${response.data.length} games (total: ${totalFetched})`);

      // Safety limits
      if (totalFetched >= max_games || (test_mode && totalFetched >= 50)) {
        console.log(`Reached limit of ${test_mode ? 50 : max_games} games`);
        break;
      }
    } while (cursor);

    console.log(`Total games fetched: ${allGames.length}`);

    if (allGames.length === 0) {
      return NextResponse.json({ 
        error: 'No games data received from API',
        details: `No games found for ${targetSeasonYear} season`
      }, { status: 400 });
    }

    let processedCount = 0;
    let insertedCount = 0;
    const updatedCount = 0;
    let weekMappedCount = 0;
    let teamMappedCount = 0;
    const errors = [];

    // Process games in batches
    const batchSize = 25;
    for (let i = 0; i < allGames.length; i += batchSize) {
      const batch = allGames.slice(i, i + batchSize);
      
      try {
        // Prepare batch data for upsert
        const gamesToUpsert = batch.map(game => {
          // Map teams
          const homeTeamId = teamIdMap.get(game.home_team?.id?.toString()) || 
                            teamAbbrevMap.get(game.home_team?.abbreviation) || null;
          const awayTeamId = teamIdMap.get(game.visitor_team?.id?.toString()) || 
                            teamAbbrevMap.get(game.visitor_team?.abbreviation) || null;

          if (homeTeamId || awayTeamId) teamMappedCount++;

          // Find appropriate week based on game date
          let weekId = null;
          if (game.date) {
            const gameDate = new Date(game.date);
            const matchingWeek = weeks.find(week => {
              const weekStart = new Date(week.start_at);
              const weekEnd = new Date(week.end_at);
              return gameDate >= weekStart && gameDate <= weekEnd;
            });
            
            if (matchingWeek) {
              weekId = matchingWeek.id;
              weekMappedCount++;
            }
          }

          // Determine game status
          let gameStatus = 'scheduled';
          if (game.status) {
            const status = game.status.toLowerCase();
            if (status.includes('final') || status.includes('completed')) {
              gameStatus = 'final';
            } else if (status.includes('live') || status.includes('progress') || status.includes('halftime')) {
              gameStatus = 'live';
            } else if (status.includes('postponed') || status.includes('cancelled')) {
              gameStatus = 'postponed';
            }
          }

          return {
            external_game_id: game.id.toString(),
            week_id: weekId,
            home_team: game.home_team?.abbreviation || null,
            away_team: game.visitor_team?.abbreviation || null,
            home_team_id: homeTeamId,
            away_team_id: awayTeamId,
            starts_at: game.date ? new Date(game.date).toISOString() : null,
            status: gameStatus,
            // Store additional game info
            season_type: game.season_type || null,
            week_number: game.week || null
          };
        });

        // Upsert batch
        const { data, error } = await supabaseAdmin
          .from('sports_events')
          .upsert(gamesToUpsert, {
            onConflict: 'external_game_id',
            ignoreDuplicates: false
          })
          .select('id, external_game_id');

        if (error) {
          console.error(`Error upserting batch ${i / batchSize + 1}:`, error);
          errors.push(`Batch ${i / batchSize + 1}: ${error.message}`);
        } else {
          processedCount += batch.length;
          if (data) {
            insertedCount += data.length; // Simplified - treating all as inserts for now
          }
          console.log(`✓ Processed batch ${i / batchSize + 1} (${batch.length} games, ${batch.filter(g => g.week_id).length} mapped to weeks)`);
        }
      } catch (err: any) {
        console.error(`Unexpected error processing batch ${i / batchSize + 1}:`, err);
        errors.push(`Batch ${i / batchSize + 1}: ${err.message}`);
      }

      // Small delay to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`Games sync complete: ${processedCount} processed, ${weekMappedCount} mapped to weeks, ${teamMappedCount} with teams, ${errors.length} errors`);

    return NextResponse.json({
      success: true,
      message: `Synced ${processedCount} NFL games for ${targetSeasonYear} season`,
      stats: {
        season_year: targetSeasonYear,
        total_fetched: allGames.length,
        processed: processedCount,
        inserted: insertedCount,
        updated: updatedCount,
        week_mapped: weekMappedCount,
        team_mapped: teamMappedCount,
        weeks_available: weeks.length,
        teams_available: teams.length,
        errors: errors.length
      },
      errors: errors.length > 0 ? errors.slice(0, 5) : undefined
    });

  } catch (err: unknown) {
    console.error('Games sync error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
