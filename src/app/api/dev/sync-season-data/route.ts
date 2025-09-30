import { NextRequest, NextResponse } from 'next/server';
import { fetchPlayerStats, fetchNFLGames } from '@/lib/nflProvider';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: NextRequest) {
  try {
    console.log('Syncing real NFL season data for testing...');

    const body = await req.json().catch(() => ({}));
    const { 
      sync_stats = true,
      sync_games = false, // Already have games
      test_season = 2024, // Use 2024 since 2025 hasn't started
      max_stats = 100
    } = body;

    const results: any = {
      success: true,
      message: 'Season data sync completed',
      timestamp: new Date().toISOString(),
      season_used: test_season
    };

    // Get our database players for mapping
    const { data: players, error: playersError } = await supabaseAdmin
      .from('players')
      .select('id, external_id, first_name, last_name, position, team')
      .eq('active', true)
      .limit(50); // Start with a subset for testing

    if (playersError) {
      throw new Error(`Failed to fetch players: ${playersError.message}`);
    }

    const playerMap = new Map(players.map(p => [p.external_id, p]));
    console.log(`Found ${players.length} active players for stat mapping`);

    if (sync_stats) {
      console.log(`Syncing player stats for ${test_season} season...`);
      
      try {
        // Get recent stats from 2024 season 
        const statsResponse = await fetchPlayerStats({
          seasons: [test_season],
          per_page: max_stats
        });

        console.log(`Fetched ${statsResponse.data?.length || 0} stat records from API`);
        
        if (statsResponse.data && statsResponse.data.length > 0) {
          const statsToInsert = [];
          
          for (const stat of statsResponse.data) {
            // Map external player to our player
            const ourPlayer = playerMap.get(stat.player.id.toString());
            if (!ourPlayer) {
              continue; // Skip players not in our system
            }

            // Create a test sports_event for this stat if needed
            const gameDate = new Date(stat.game.date);
            const gameKey = `${stat.game.id}`;
            
            // Check if we have this game in our sports_events
            const { data: existingEvent } = await supabaseAdmin
              .from('sports_events')
              .select('id')
              .eq('external_game_id', gameKey)
              .single();

            let sportsEventId = existingEvent?.id;
            
            if (!existingEvent) {
              // Create a sports_event for this stat
              const { data: newEvent, error: eventError } = await supabaseAdmin
                .from('sports_events')
                .insert({
                  external_game_id: gameKey,
                  home_team: stat.game.home_team?.abbreviation || 'UNK',
                  away_team: stat.game.visitor_team?.abbreviation || 'UNK',
                  starts_at: gameDate.toISOString(),
                  status: 'final', // Past games are final
                  season_type: 'regular',
                  week_number: 1 // Put in week 1 for testing
                })
                .select('id')
                .single();
              
              if (eventError) {
                console.error('Error creating sports_event:', eventError);
                continue;
              }
              
              sportsEventId = newEvent.id;
            }

            // Format the stat data with correct BallDontLie API field mapping
            const statData = {
              sports_event_id: sportsEventId,
              player_id: ourPlayer.id,
              external_game_id: gameKey,
              external_player_id: stat.player.id.toString(),
              game_date: gameDate.toISOString().split('T')[0],
              finalized: true,
              stat_json: {
                // Basic info
                player_name: `${stat.player.first_name} ${stat.player.last_name}`,
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
                
                // Receiving stats (note: API uses 'receptions', not 'receiving_receptions')
                receiving_targets: stat.receiving_targets || 0,
                receptions: stat.receptions || 0,
                receiving_yards: stat.receiving_yards || 0,
                receiving_touchdowns: stat.receiving_touchdowns || 0,
                yards_per_reception: stat.yards_per_reception || 0,
                
                // Other stats
                fumbles: stat.fumbles || 0,
                fumbles_lost: stat.fumbles_lost || 0,
                fumbles_recovered: stat.fumbles_recovered || 0,
                
                // Fantasy points calculation (standard scoring)
                fantasy_points: (
                  (stat.passing_yards || 0) * 0.04 +
                  (stat.passing_touchdowns || 0) * 4 +
                  (stat.passing_interceptions || 0) * -2 +
                  (stat.rushing_yards || 0) * 0.1 +
                  (stat.rushing_touchdowns || 0) * 6 +
                  (stat.receiving_yards || 0) * 0.1 +
                  (stat.receiving_touchdowns || 0) * 6 +
                  (stat.receptions || 0) * 1 +
                  (stat.fumbles_lost || 0) * -2
                ),
                
                // Meta
                source: 'ball_dont_lie_2024',
                game_date: stat.game.date,
                game_status: stat.game?.status || null,
                raw_stats: stat // Store full original data
              }
            };
            
            statsToInsert.push(statData);
          }

          if (statsToInsert.length > 0) {
            const { data: insertedStats, error: insertError } = await supabaseAdmin
              .from('player_game_stats')
              .insert(statsToInsert)
              .select('id');

            if (insertError) {
              console.error('Error inserting stats:', insertError);
              results.stats_error = insertError.message;
            } else {
              results.stats_inserted = insertedStats.length;
              console.log(`✓ Inserted ${insertedStats.length} player stat records`);
            }
          } else {
            results.stats_inserted = 0;
            results.stats_note = 'No stats matched our player database';
          }
        }

        results.stats_api_response = {
          total_fetched: statsResponse.data?.length || 0,
          sample: statsResponse.data?.slice(0, 2) || []
        };

      } catch (error) {
        console.error('Stats sync error:', error);
        results.stats_error = error instanceof Error ? error.message : 'Unknown stats error';
      }
    }

    // Check final state
    const { data: finalStats } = await supabaseAdmin
      .from('player_game_stats')
      .select('id, player_id, stat_json')
      .limit(5);

    results.final_state = {
      total_stats_in_db: finalStats?.length || 0,
      sample_stats: finalStats || []
    };

    return NextResponse.json(results);

  } catch (err: any) {
    console.error('Season data sync error:', err);
    return NextResponse.json({ 
      success: false,
      error: err?.message || 'Unknown error',
      details: err?.stack
    }, { status: 500 });
  }
}
