import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { fetchNFLPlayers } from '@/lib/nflProvider';

/**
 * Sync ALL active NFL players from BallDontLie API
 * This ensures we have every active player in the database with complete data
 */
export async function POST(req: NextRequest) {
  try {
    console.log('🏈 Starting sync of ALL active NFL players...');

    const body = await req.json().catch(() => ({}));
    const { per_page = 100 } = body;

    // Get team mapping first
    const { data: teams, error: teamsError } = await supabaseAdmin
      .from('teams')
      .select('id, external_id, abbreviation');

    if (teamsError) throw teamsError;

    const teamIdMap = new Map(teams?.map(t => [t.external_id, t.id]) || []);
    const teamAbbrevMap = new Map(teams?.map(t => [t.abbreviation, t.id]) || []);

    let allPlayers: any[] = [];
    let cursor: number | undefined = undefined;
    let pageCount = 0;

    // Fetch ALL active players using pagination
    console.log('📥 Fetching all active players from API...');
    
    do {
      const params: any = {
        per_page,
        ...(cursor && { cursor })
      };

      const apiResponse = await fetchNFLPlayers(params);
      
      if (!apiResponse.data || apiResponse.data.length === 0) {
        break;
      }

      allPlayers = allPlayers.concat(apiResponse.data);
      cursor = apiResponse.meta?.next_cursor;
      pageCount++;

      console.log(`  Page ${pageCount}: Fetched ${apiResponse.data.length} players (Total: ${allPlayers.length})`);

      // Small delay to avoid rate limiting
      if (cursor) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }

    } while (cursor);

    console.log(`✅ Total players fetched: ${allPlayers.length}`);

    // Process and upsert players
    const results = {
      total_fetched: allPlayers.length,
      processed: 0,
      inserted: 0,
      updated: 0,
      team_mapped: 0,
      errors: [] as string[]
    };

    const batchSize = 100;
    for (let i = 0; i < allPlayers.length; i += batchSize) {
      const batch = allPlayers.slice(i, i + batchSize);
      
      try {
        const playersToUpsert = batch.map(player => {
          let team_id = null;
          if (player.team) {
            team_id = teamIdMap.get(player.team.id?.toString()) || 
                     teamAbbrevMap.get(player.team.abbreviation) || 
                     null;
            
            if (team_id) results.team_mapped++;
          }

          // Parse weight from "225 lbs" to 225
          let weight = null;
          if (player.weight) {
            const weightMatch = player.weight.match(/(\d+)/);
            weight = weightMatch ? parseInt(weightMatch[1]) : null;
          }

          // Parse years_pro from "9th Season" to 9
          let years_pro = null;
          if (player.experience) {
            const yearsMatch = player.experience.match(/(\d+)/);
            years_pro = yearsMatch ? parseInt(yearsMatch[1]) : null;
          }

          return {
            external_id: player.id.toString(),
            external_ref: player.id.toString(),
            first_name: player.first_name,
            last_name: player.last_name,
            position: player.position,
            team: player.team?.abbreviation || null,
            team_id: team_id,
            active: true,
            // Enhanced data (height, weight, college, etc.)
            height: player.height || null, // Keep as string "6' 2""
            weight: weight,
            college: player.college || null,
            jersey_number: player.jersey_number || null,
            years_pro: years_pro,
            age: player.age || null
          };
        });

        // Use upsert to insert new players or update existing ones
        const { data, error } = await supabaseAdmin
          .from('players')
          .upsert(playersToUpsert, {
            onConflict: 'external_id',
            ignoreDuplicates: false,
            // Explicitly update all fields on conflict
          })
          .select('id');

        if (error) {
          console.error(`❌ Error upserting batch ${i / batchSize + 1}:`, error);
          results.errors.push(`Batch ${i / batchSize + 1}: ${error.message}`);
        } else {
          results.processed += batch.length;
          if (data) {
            results.inserted += data.length;
          }
          console.log(`✅ Processed batch ${i / batchSize + 1}/${Math.ceil(allPlayers.length / batchSize)} (${batch.length} players)`);
        }
      } catch (err: any) {
        console.error(`❌ Error processing batch ${i / batchSize + 1}:`, err);
        results.errors.push(`Batch ${i / batchSize + 1}: ${err.message}`);
      }
    }

    console.log(`\n🎉 Sync complete!`);
    console.log(`Total fetched: ${results.total_fetched}`);
    console.log(`Processed: ${results.processed}`);
    console.log(`With teams: ${results.team_mapped}`);
    console.log(`Errors: ${results.errors.length}`);

    // Get final count in database
    const { count: dbCount } = await supabaseAdmin
      .from('players')
      .select('*', { count: 'exact', head: true })
      .eq('active', true);

    return NextResponse.json({
      success: true,
      message: `Synced ${results.processed} active NFL players`,
      stats: {
        ...results,
        database_count: dbCount || 0,
        teams_available: teams?.length || 0
      }
    });

  } catch (err: any) {
    console.error('Sync error:', err);
    return NextResponse.json({
      success: false,
      error: err?.message || 'Unknown error',
      details: err?.stack
    }, { status: 500 });
  }
}
