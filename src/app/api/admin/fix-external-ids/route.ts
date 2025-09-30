import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { fetchNFLPlayers } from '@/lib/nflProvider';

/**
 * Fix missing external_ids by matching players against BallDontLie API
 * 
 * This fixes the issue where players were synced but external_id wasn't set
 */
export async function POST(req: NextRequest) {
  try {
    console.log('🔧 Starting external_id fix...');

    const body = await req.json().catch(() => ({}));
    const {
      batch_size = 50,
      max_players = 2000
    } = body;

    // Get all players with null external_id
    const { data: players, error: playersError } = await supabaseAdmin
      .from('players')
      .select('id, first_name, last_name, position, team, external_id')
      .is('external_id', null)
      .limit(max_players);

    if (playersError) {
      throw new Error(`Failed to fetch players: ${playersError.message}`);
    }

    console.log(`Found ${players?.length || 0} players with missing external_id`);

    if (!players || players.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All players already have external_id set',
        updated: 0
      });
    }

    const results = {
      total_players: players.length,
      updated: 0,
      skipped: 0,
      errors: [] as string[]
    };

    // Process in batches
    for (let i = 0; i < players.length; i += batch_size) {
      const batch = players.slice(i, i + batch_size);
      console.log(`Processing batch ${Math.floor(i / batch_size) + 1}/${Math.ceil(players.length / batch_size)}`);

      for (const player of batch) {
        try {
          // Search API for this player (use last name only - API doesn't support full name search)
          const searchTerm = player.last_name;
          console.log(`  Searching for: ${player.first_name} ${player.last_name} (searching: ${searchTerm})`);

          const apiResponse = await fetchNFLPlayers({
            search: searchTerm,
            per_page: 10 // Get more results to find exact match
          });

          if (!apiResponse.data || apiResponse.data.length === 0) {
            console.log(`  ⚠️  No API data for ${searchTerm}`);
            results.skipped++;
            continue;
          }

          // Find best match
          const exactMatch = apiResponse.data.find(p => 
            p.first_name?.toLowerCase() === player.first_name?.toLowerCase() &&
            p.last_name?.toLowerCase() === player.last_name?.toLowerCase()
          );

          const apiPlayer = exactMatch || apiResponse.data[0];

          if (apiPlayer && apiPlayer.id) {
            // Update external_id
            const { error: updateError } = await supabaseAdmin
              .from('players')
              .update({ 
                external_id: apiPlayer.id.toString(),
                external_ref: apiPlayer.id.toString()
              })
              .eq('id', player.id);

            if (updateError) {
              console.error(`  ❌ Error updating ${searchTerm}:`, updateError.message);
              results.errors.push(`${searchTerm}: ${updateError.message}`);
            } else {
              console.log(`  ✅ Updated ${searchTerm} → external_id: ${apiPlayer.id}`);
              results.updated++;
            }
          } else {
            results.skipped++;
          }

          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 150));

        } catch (error: any) {
          console.error(`  ❌ Error processing ${player.first_name} ${player.last_name}:`, error.message);
          results.errors.push(`${player.first_name} ${player.last_name}: ${error.message}`);
        }
      }

      // Pause between batches
      if (i + batch_size < players.length) {
        console.log('Pausing between batches...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log(`\n✅ Fix complete!`);
    console.log(`Updated: ${results.updated}`);
    console.log(`Skipped: ${results.skipped}`);
    console.log(`Errors: ${results.errors.length}`);

    return NextResponse.json({
      success: true,
      message: `Fixed external_id for ${results.updated} players`,
      stats: results
    });

  } catch (err: any) {
    console.error('Fix error:', err);
    return NextResponse.json({
      success: false,
      error: err?.message || 'Unknown error',
      details: err?.stack
    }, { status: 500 });
  }
}
