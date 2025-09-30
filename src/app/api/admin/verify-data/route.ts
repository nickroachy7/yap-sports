import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { fetchNFLPlayers, fetchPlayerStats } from '@/lib/nflProvider';

/**
 * Verification endpoint to compare our database data with BallDontLie API
 * 
 * This ensures our player data and stats match the source of truth
 */
export async function POST(req: NextRequest) {
  try {
    console.log('🔍 Starting data verification against BallDontLie API...');

    const body = await req.json().catch(() => ({}));
    const {
      verify_players = true,
      verify_stats = true,
      sample_size = 10,
      player_name = null // Optional: verify specific player
    } = body;

    const results: any = {
      success: true,
      timestamp: new Date().toISOString(),
      verification: {}
    };

    // ===== VERIFY PLAYERS =====
    if (verify_players) {
      console.log('\n📋 Verifying Player Data...');
      
      let dbPlayers;
      
      if (player_name) {
        // Verify specific player
        const names = player_name.split(' ');
        const { data, error } = await supabaseAdmin
          .from('players')
          .select('*')
          .or(`first_name.ilike.%${names[0]}%,last_name.ilike.%${names[names.length - 1]}%`)
          .limit(5);
        
        if (error) throw error;
        dbPlayers = data || [];
      } else {
        // Sample random players
        const { data, error } = await supabaseAdmin
          .from('players')
          .select('*')
          .eq('active', true)
          .limit(sample_size);
        
        if (error) throw error;
        dbPlayers = data || [];
      }

      console.log(`Checking ${dbPlayers.length} players against API...`);

      const playerVerification = {
        total_checked: dbPlayers.length,
        matches: 0,
        discrepancies: [] as any[],
        samples: [] as any[]
      };

      for (const dbPlayer of dbPlayers) {
        try {
          // Search API for this player
          const searchTerm = `${dbPlayer.first_name} ${dbPlayer.last_name}`;
          const apiResponse = await fetchNFLPlayers({
            search: searchTerm,
            per_page: 5
          });

          if (!apiResponse.data || apiResponse.data.length === 0) {
            playerVerification.discrepancies.push({
              player: searchTerm,
              issue: 'Not found in API',
              db_data: {
                external_id: dbPlayer.external_id,
                position: dbPlayer.position,
                team: dbPlayer.team
              }
            });
            continue;
          }

          // Find exact match
          const apiPlayer = apiResponse.data.find(p => 
            p.first_name?.toLowerCase() === dbPlayer.first_name?.toLowerCase() &&
            p.last_name?.toLowerCase() === dbPlayer.last_name?.toLowerCase()
          ) || apiResponse.data[0];

          // Compare data
          const comparison: any = {
            player: searchTerm,
            matches: true,
            differences: []
          };

          // Check external_id
          if (dbPlayer.external_id !== apiPlayer.id?.toString()) {
            comparison.matches = false;
            comparison.differences.push({
              field: 'external_id',
              db: dbPlayer.external_id,
              api: apiPlayer.id?.toString()
            });
          }

          // Check position
          if (dbPlayer.position !== apiPlayer.position) {
            comparison.matches = false;
            comparison.differences.push({
              field: 'position',
              db: dbPlayer.position,
              api: apiPlayer.position
            });
          }

          // Check team
          if (dbPlayer.team !== apiPlayer.team?.abbreviation) {
            comparison.matches = false;
            comparison.differences.push({
              field: 'team',
              db: dbPlayer.team,
              api: apiPlayer.team?.abbreviation
            });
          }

          // Check enhanced data if available
          if (apiPlayer.height && dbPlayer.height !== apiPlayer.height) {
            comparison.differences.push({
              field: 'height',
              db: dbPlayer.height || 'NULL',
              api: apiPlayer.height
            });
          }

          if (apiPlayer.college && dbPlayer.college !== apiPlayer.college) {
            comparison.differences.push({
              field: 'college',
              db: dbPlayer.college || 'NULL',
              api: apiPlayer.college
            });
          }

          if (comparison.matches) {
            playerVerification.matches++;
          } else {
            playerVerification.discrepancies.push(comparison);
          }

          if (playerVerification.samples.length < 3) {
            playerVerification.samples.push({
              player: searchTerm,
              db: {
                external_id: dbPlayer.external_id,
                position: dbPlayer.position,
                team: dbPlayer.team,
                height: dbPlayer.height,
                college: dbPlayer.college
              },
              api: {
                id: apiPlayer.id,
                position: apiPlayer.position,
                team: apiPlayer.team?.abbreviation,
                height: apiPlayer.height,
                college: apiPlayer.college
              }
            });
          }

          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error: any) {
          playerVerification.discrepancies.push({
            player: `${dbPlayer.first_name} ${dbPlayer.last_name}`,
            issue: 'Error checking API',
            error: error.message
          });
        }
      }

      results.verification.players = playerVerification;
    }

    // ===== VERIFY STATS =====
    if (verify_stats) {
      console.log('\n📊 Verifying Player Stats...');

      // Get a sample of our stats
      const { data: dbStats, error: statsError } = await supabaseAdmin
        .from('player_game_stats')
        .select('*, players!inner(first_name, last_name, external_id)')
        .limit(sample_size);

      if (statsError) throw statsError;

      const statsVerification = {
        total_checked: dbStats?.length || 0,
        matches: 0,
        discrepancies: [] as any[],
        samples: [] as any[]
      };

      if (dbStats && dbStats.length > 0) {
        for (const dbStat of dbStats.slice(0, 5)) { // Check first 5 to avoid rate limits
          try {
            const player = dbStat.players as any;
            const gameDate = dbStat.stat_json?.game_date;

            if (!gameDate) continue;

            // Fetch stats from API for this player and date
            const apiResponse = await fetchPlayerStats({
              dates: [gameDate],
              player_ids: [parseInt(dbStat.external_player_id)],
              per_page: 10
            });

            if (!apiResponse.data || apiResponse.data.length === 0) {
              statsVerification.discrepancies.push({
                player: `${player.first_name} ${player.last_name}`,
                date: gameDate,
                issue: 'Stats not found in API for this date'
              });
              continue;
            }

            const apiStat = apiResponse.data[0];
            
            // Compare key stats
            const comparison: any = {
              player: `${player.first_name} ${player.last_name}`,
              date: gameDate,
              matches: true,
              differences: []
            };

            // Check passing yards
            if ((dbStat.stat_json?.passing_yards || 0) !== (apiStat.passing_yards || 0)) {
              comparison.matches = false;
              comparison.differences.push({
                stat: 'passing_yards',
                db: dbStat.stat_json?.passing_yards || 0,
                api: apiStat.passing_yards || 0
              });
            }

            // Check rushing yards
            if ((dbStat.stat_json?.rushing_yards || 0) !== (apiStat.rushing_yards || 0)) {
              comparison.matches = false;
              comparison.differences.push({
                stat: 'rushing_yards',
                db: dbStat.stat_json?.rushing_yards || 0,
                api: apiStat.rushing_yards || 0
              });
            }

            // Check receiving yards
            if ((dbStat.stat_json?.receiving_yards || 0) !== (apiStat.receiving_yards || 0)) {
              comparison.matches = false;
              comparison.differences.push({
                stat: 'receiving_yards',
                db: dbStat.stat_json?.receiving_yards || 0,
                api: apiStat.receiving_yards || 0
              });
            }

            // Check receptions (CRITICAL - this was our bug!)
            if ((dbStat.stat_json?.receptions || 0) !== (apiStat.receptions || 0)) {
              comparison.matches = false;
              comparison.differences.push({
                stat: 'receptions',
                db: dbStat.stat_json?.receptions || 0,
                api: apiStat.receptions || 0
              });
            }

            if (comparison.matches) {
              statsVerification.matches++;
            } else {
              statsVerification.discrepancies.push(comparison);
            }

            if (statsVerification.samples.length < 3) {
              statsVerification.samples.push({
                player: `${player.first_name} ${player.last_name}`,
                date: gameDate,
                db_stats: {
                  passing_yards: dbStat.stat_json?.passing_yards || 0,
                  rushing_yards: dbStat.stat_json?.rushing_yards || 0,
                  receiving_yards: dbStat.stat_json?.receiving_yards || 0,
                  receptions: dbStat.stat_json?.receptions || 0,
                  touchdowns: (dbStat.stat_json?.passing_touchdowns || 0) + 
                             (dbStat.stat_json?.rushing_touchdowns || 0) + 
                             (dbStat.stat_json?.receiving_touchdowns || 0),
                  fantasy_points: dbStat.stat_json?.fantasy_points || 0
                },
                api_stats: {
                  passing_yards: apiStat.passing_yards || 0,
                  rushing_yards: apiStat.rushing_yards || 0,
                  receiving_yards: apiStat.receiving_yards || 0,
                  receptions: apiStat.receptions || 0,
                  touchdowns: (apiStat.passing_touchdowns || 0) + 
                             (apiStat.rushing_touchdowns || 0) + 
                             (apiStat.receiving_touchdowns || 0)
                }
              });
            }

            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 200));

          } catch (error: any) {
            statsVerification.discrepancies.push({
              stat_id: dbStat.id,
              issue: 'Error checking API',
              error: error.message
            });
          }
        }
      }

      results.verification.stats = statsVerification;
    }

    // ===== SUMMARY =====
    const summary = {
      players: verify_players ? {
        accuracy: results.verification.players.total_checked > 0 
          ? `${Math.round((results.verification.players.matches / results.verification.players.total_checked) * 100)}%`
          : 'N/A',
        checked: results.verification.players.total_checked,
        matches: results.verification.players.matches,
        discrepancies: results.verification.players.discrepancies.length
      } : 'Not checked',
      stats: verify_stats ? {
        accuracy: results.verification.stats.total_checked > 0
          ? `${Math.round((results.verification.stats.matches / results.verification.stats.total_checked) * 100)}%`
          : 'N/A',
        checked: results.verification.stats.total_checked,
        matches: results.verification.stats.matches,
        discrepancies: results.verification.stats.discrepancies.length
      } : 'Not checked'
    };

    results.summary = summary;

    console.log('\n✅ Verification complete!');
    console.log('Player accuracy:', summary.players);
    console.log('Stats accuracy:', summary.stats);

    return NextResponse.json(results);

  } catch (err: any) {
    console.error('Verification error:', err);
    return NextResponse.json({
      success: false,
      error: err?.message || 'Unknown error',
      details: err?.stack
    }, { status: 500 });
  }
}
