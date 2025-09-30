import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { fetchNFLPlayers } from '@/lib/nflProvider';

/**
 * Update age and years_pro for existing players
 * This is needed because upsert doesn't always update existing records
 */
export async function POST(req: NextRequest) {
  try {
    console.log('📝 Updating player ages and years_pro...');

    const body = await req.json().catch(() => ({}));
    const { per_page = 100, max_players = null } = body;

    // Get all players from database
    const { data: dbPlayers, error: playersError } = await supabaseAdmin
      .from('players')
      .select('id, external_id, first_name, last_name, age, years_pro')
      .eq('active', true)
      .not('external_id', 'is', null)
      .limit(max_players || 11000);

    if (playersError) throw playersError;

    console.log(`Found ${dbPlayers?.length || 0} players to update`);

    let cursor: number | undefined = undefined;
    const apiPlayerMap = new Map<string, any>();

    // Fetch all players from API to build a map
    console.log('📥 Fetching players from API...');
    do {
      const params: any = {
        per_page,
        ...(cursor && { cursor })
      };

      const apiResponse = await fetchNFLPlayers(params);
      
      if (!apiResponse.data || apiResponse.data.length === 0) {
        break;
      }

      apiResponse.data.forEach(player => {
        if (player.id) {
          apiPlayerMap.set(player.id.toString(), player);
        }
      });

      cursor = apiResponse.meta?.next_cursor;
      
      // Small delay to avoid rate limiting
      if (cursor) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }

    } while (cursor);

    console.log(`✅ Fetched ${apiPlayerMap.size} players from API`);

    // Update each player
    const results = {
      total_checked: dbPlayers?.length || 0,
      updated: 0,
      skipped: 0,
      errors: [] as string[]
    };

    for (const dbPlayer of (dbPlayers || [])) {
      try {
        const apiPlayer = apiPlayerMap.get(dbPlayer.external_id);
        
        if (!apiPlayer) {
          results.skipped++;
          continue;
        }

        // Parse years_pro from "9th Season" to 9
        let years_pro = null;
        if (apiPlayer.experience) {
          const yearsMatch = apiPlayer.experience.match(/(\d+)/);
          years_pro = yearsMatch ? parseInt(yearsMatch[1]) : null;
        }

        const age = apiPlayer.age || null;

        // Only update if we have new data
        if ((age !== null && age !== dbPlayer.age) || 
            (years_pro !== null && years_pro !== dbPlayer.years_pro)) {
          
          const { error: updateError } = await supabaseAdmin
            .from('players')
            .update({
              age: age,
              years_pro: years_pro
            })
            .eq('id', dbPlayer.id);

          if (updateError) {
            results.errors.push(`${dbPlayer.first_name} ${dbPlayer.last_name}: ${updateError.message}`);
          } else {
            results.updated++;
            if (results.updated % 100 === 0) {
              console.log(`  Updated ${results.updated} players...`);
            }
          }
        } else {
          results.skipped++;
        }

      } catch (error: any) {
        results.errors.push(`${dbPlayer.first_name} ${dbPlayer.last_name}: ${error.message}`);
      }
    }

    console.log(`\n✅ Update complete!`);
    console.log(`Checked: ${results.total_checked}`);
    console.log(`Updated: ${results.updated}`);
    console.log(`Skipped: ${results.skipped}`);
    console.log(`Errors: ${results.errors.length}`);

    return NextResponse.json({
      success: true,
      message: `Updated ${results.updated} players with age and years_pro`,
      stats: results
    });

  } catch (err: any) {
    console.error('Update error:', err);
    return NextResponse.json({
      success: false,
      error: err?.message || 'Unknown error',
      details: err?.stack
    }, { status: 500 });
  }
}
