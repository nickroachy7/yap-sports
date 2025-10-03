import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { fetchPlayerStats } from '@/lib/nflProvider';

export async function POST(req: NextRequest) {
  try {
    console.log('Starting NFL player stats sync...');

    // Parse request body for options
    const body = await req.json().catch(() => ({}));
    const { 
      game_ids = null,
      player_ids = null,
      dates = null,
      season_year = null,
      per_page = 100,
      max_stats = 1000,
      test_mode = false 
    } = body;

    // Determine target date range if not specified
    let targetDates = dates;
    if (!targetDates && !game_ids) {
      // Default to current week if no specific dates provided
      const now = new Date();
      const today = now.toISOString().split('T')[0]; // YYYY-MM-DD format
      targetDates = [today];
    }

    // Determine season year if not specified
    let targetSeasonYear = season_year;
    if (!targetSeasonYear) {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      targetSeasonYear = currentMonth >= 8 ? currentYear : currentYear - 1;
    }

    console.log(`Syncing stats for season ${targetSeasonYear}, dates: ${targetDates?.join(', ') || 'N/A'}`);

    // Get our players for mapping external IDs (fetch ALL in batches to bypass 1,000 row limit)
    console.log('📥 Loading all active players for stat mapping...');
    let allPlayers: any[] = [];
    let playerFrom = 0;
    const playerBatchSize = 1000;
    let hasMorePlayers = true;

    while (hasMorePlayers) {
      const { data: playerBatch, error: playersError } = await supabaseAdmin
        .from('players')
        .select('id, external_id, first_name, last_name, position, team')
        .eq('active', true)
        .order('id', { ascending: true })
        .range(playerFrom, playerFrom + playerBatchSize - 1);

      if (playersError) {
        console.error('Error fetching players:', playersError);
        return NextResponse.json({ 
          error: 'Failed to fetch players for stat mapping',
          details: playersError.message 
        }, { status: 500 });
      }

      if (playerBatch && playerBatch.length > 0) {
        allPlayers = allPlayers.concat(playerBatch);
        console.log(`  Loaded player batch: ${playerBatch.length} players (total: ${allPlayers.length})`);

        if (playerBatch.length < playerBatchSize) {
          hasMorePlayers = false; // Last batch
        } else {
          playerFrom += playerBatchSize;
        }
      } else {
        hasMorePlayers = false;
      }
    }

    // Create player lookup map
    const playerMap = new Map(allPlayers.map(p => [p.external_id, p]));
    console.log(`✅ Found ${allPlayers.length} active players for stat mapping`);

    // Get sports events for context (optional)
    let sportsEventsMap = new Map();
    if (targetDates || game_ids) {
      const { data: events } = await supabaseAdmin
        .from('sports_events')
        .select('id, external_game_id, starts_at, status');
      
      if (events) {
        sportsEventsMap = new Map(events.map(e => [e.external_game_id, e]));
        console.log(`Found ${events.length} sports events for context`);
      }
    }

    const allStats = [];
    let cursor: string | null = null;
    let totalFetched = 0;

    // Fetch player stats from Ball Don't Lie API with pagination
    do {
      const params: Record<string, unknown> = {
        seasons: [targetSeasonYear],
        per_page,
        cursor: cursor || undefined
      };

      if (targetDates) params.dates = targetDates;
      if (player_ids) params.player_ids = player_ids;

      const response = await fetchPlayerStats(params);

      if (!response.data) {
        break;
      }

      allStats.push(...response.data);
      totalFetched += response.data.length;
      cursor = response.meta?.next_cursor;

      console.log(`Fetched ${response.data.length} stat records (total: ${totalFetched})`);

      // Safety limits
      if (totalFetched >= max_stats || (test_mode && totalFetched >= 100)) {
        console.log(`Reached limit of ${test_mode ? 100 : max_stats} stat records`);
        break;
      }
    } while (cursor);

    console.log(`Total stat records fetched: ${allStats.length}`);

    if (allStats.length === 0) {
      return NextResponse.json({ 
        error: 'No stats data received from API',
        details: `No stats found for the specified criteria`
      }, { status: 400 });
    }

    let processedCount = 0;
    let insertedCount = 0;
    const updatedCount = 0;
    let playerMappedCount = 0;
    let gameMappedCount = 0;
    const errors = [];

    // Process stats in batches
    const batchSize = 50;
    for (let i = 0; i < allStats.length; i += batchSize) {
      const batch = allStats.slice(i, i + batchSize);
      
      try {
        // Prepare batch data for upsert
        const statsToUpsert = batch.map(stat => {
          // Map player
          const player = playerMap.get(stat.player?.id?.toString());
          if (player) playerMappedCount++;

          // Map game/event
          const sportsEvent = sportsEventsMap.get(stat.game?.id?.toString());
          if (sportsEvent) gameMappedCount++;

          // Calculate fantasy points (standard PPR scoring)
          const fantasyPoints = (
            (stat.passing_yards || 0) * 0.04 +           // 1 pt per 25 yards
            (stat.passing_touchdowns || 0) * 4 +          // 4 pts per TD
            (stat.passing_interceptions || 0) * -2 +      // -2 pts per INT
            (stat.rushing_yards || 0) * 0.1 +             // 1 pt per 10 yards
            (stat.rushing_touchdowns || 0) * 6 +          // 6 pts per TD
            (stat.receiving_yards || 0) * 0.1 +           // 1 pt per 10 yards
            (stat.receiving_touchdowns || 0) * 6 +        // 6 pts per TD
            (stat.receptions || 0) * 1 +                  // 1 pt per reception (PPR)
            (stat.fumbles_lost || 0) * -2                 // -2 pts per fumble lost
          );

          // Extract key stats for easy querying
          const statJson = {
            // Basic info
            player_name: stat.player ? `${stat.player.first_name} ${stat.player.last_name}` : null,
            team: stat.team?.abbreviation || null,
            position: stat.player?.position || null,
            
            // Passing stats
            passing_attempts: stat.passing_attempts || 0,
            passing_completions: stat.passing_completions || 0,
            passing_yards: stat.passing_yards || 0,
            passing_touchdowns: stat.passing_touchdowns || 0,
            passing_interceptions: stat.passing_interceptions || 0,
            yards_per_pass_attempt: stat.yards_per_pass_attempt || 0,
            qb_rating: stat.qb_rating || 0,
            sacks: stat.sacks || 0,
            
            // Rushing stats
            rushing_attempts: stat.rushing_attempts || 0,
            rushing_yards: stat.rushing_yards || 0,
            rushing_touchdowns: stat.rushing_touchdowns || 0,
            yards_per_rush_attempt: stat.yards_per_rush_attempt || 0,
            
            // Receiving stats
            receiving_targets: stat.receiving_targets || 0,
            receiving_receptions: stat.receptions || 0, // API uses "receptions" not "receiving_receptions"
            receptions: stat.receptions || 0, // Store as both for compatibility
            receiving_yards: stat.receiving_yards || 0,
            receiving_touchdowns: stat.receiving_touchdowns || 0,
            yards_per_reception: stat.yards_per_reception || 0,
            
            // Other stats
            fumbles: stat.fumbles || 0,
            fumbles_lost: stat.fumbles_lost || 0,
            fumbles_recovered: stat.fumbles_recovered || 0,
            
            // Fantasy points
            fantasy_points: fantasyPoints,
            
            // Meta
            game_date: stat.game?.date || null,
            game_status: stat.game?.status || null,
            raw_stats: stat // Store full original data
          };

          return {
            sports_event_id: sportsEvent?.id || null,
            player_id: player?.id || null,
            stat_json: statJson,
            finalized: stat.game?.status?.toLowerCase().includes('final') || false,
            
            // Additional fields for easier querying
            external_game_id: stat.game?.id?.toString() || null,
            external_player_id: stat.player?.id?.toString() || null,
            game_date: stat.game?.date || null
          };
        });

        // Filter out stats without player mapping (for now)
        const validStats = statsToUpsert.filter(s => s.player_id);
        
        if (validStats.length === 0) {
          console.log(`Batch ${i / batchSize + 1}: No valid stats to process`);
          continue;
        }

        // Upsert batch - need a composite key for uniqueness
        // For now, we'll use a combination approach
        for (const statRecord of validStats) {
          const { data, error } = await supabaseAdmin
            .from('player_game_stats')
            .upsert({
              sports_event_id: statRecord.sports_event_id,
              player_id: statRecord.player_id,
              stat_json: statRecord.stat_json,
              finalized: statRecord.finalized,
              game_date: statRecord.game_date,  // Include game_date!
              external_game_id: statRecord.external_game_id,
              external_player_id: statRecord.external_player_id
            }, {
              onConflict: 'sports_event_id,player_id',
              ignoreDuplicates: false
            })
            .select('id');

          if (error) {
            console.error(`Error upserting stat for player ${statRecord.player_id}:`, error);
            errors.push(`Player ${statRecord.player_id}: ${error.message}`);
          } else {
            if (data && data.length > 0) {
              insertedCount++;
            }
          }
        }

        processedCount += validStats.length;
        console.log(`✓ Processed batch ${i / batchSize + 1} (${validStats.length} valid stats, ${batch.length - validStats.length} skipped)`);

      } catch (err: any) {
        console.error(`Unexpected error processing batch ${i / batchSize + 1}:`, err);
        errors.push(`Batch ${i / batchSize + 1}: ${err.message}`);
      }

      // Small delay to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`Stats sync complete: ${processedCount} processed, ${playerMappedCount} with player mapping, ${gameMappedCount} with game mapping, ${errors.length} errors`);

    return NextResponse.json({
      success: true,
      message: `Synced ${processedCount} player stat records for ${targetSeasonYear} season`,
      stats: {
        season_year: targetSeasonYear,
        dates: targetDates,
        total_fetched: allStats.length,
        processed: processedCount,
        inserted: insertedCount,
        updated: updatedCount,
        player_mapped: playerMappedCount,
        game_mapped: gameMappedCount,
        players_available: allPlayers.length,
        games_available: sportsEventsMap.size,
        errors: errors.length
      },
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined
    });

  } catch (err: unknown) {
    console.error('Stats sync error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
