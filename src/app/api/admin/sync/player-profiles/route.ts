import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { fetchNFLPlayers } from '@/lib/nflProvider';

export async function POST(req: NextRequest) {
  try {
    console.log('Starting NFL player profile sync...');

    const body = await req.json().catch(() => ({}));
    const { 
      batch_size = 50,
      max_players = 200,
      update_existing = false
    } = body;

    // First, let's add columns to store this data if they don't exist
    try {
      await supabaseAdmin.rpc('create_player_profile_columns');
    } catch (columnError) {
      // Columns might already exist, that's fine
      console.log('Player profile columns already exist or were created');
    }

    // Get our current players
    const { data: players, error: playersError } = await supabaseAdmin
      .from('players')
      .select('id, first_name, last_name, position, team, external_id, height, weight, college')
      .eq('active', true)
      .limit(max_players);

    if (playersError) {
      throw new Error(`Failed to fetch players: ${playersError.message}`);
    }

    console.log(`Found ${players.length} players to sync`);

    const results = {
      success: true,
      total_players: players.length,
      updated_count: 0,
      skipped_count: 0,
      error_count: 0,
      errors: [] as string[],
      sample_updates: [] as any[]
    };

    // Process players in batches
    for (let i = 0; i < players.length; i += batch_size) {
      const batch = players.slice(i, i + batch_size);
      console.log(`Processing batch ${Math.floor(i / batch_size) + 1}/${Math.ceil(players.length / batch_size)}`);

      for (const player of batch) {
        try {
          // Skip if already has data and not updating existing
          if (!update_existing && player.height && player.weight && player.college) {
            results.skipped_count++;
            continue;
          }

          // Search Ball Don't Lie API for this player
          const searchTerm = `${player.first_name} ${player.last_name}`;
          console.log(`Searching for: ${searchTerm}`);

          const apiResponse = await fetchNFLPlayers({
            search: searchTerm,
            per_page: 5
          });

          if (!apiResponse.data || apiResponse.data.length === 0) {
            console.log(`No API data found for ${searchTerm}`);
            results.skipped_count++;
            continue;
          }

          // Find the best match
          let bestMatch = null;
          
          // Try exact name match first
          bestMatch = apiResponse.data.find(p => 
            p.first_name?.toLowerCase().trim() === player.first_name?.toLowerCase().trim() &&
            p.last_name?.toLowerCase().trim() === player.last_name?.toLowerCase().trim()
          );

          // If no exact match, try partial matches
          if (!bestMatch) {
            bestMatch = apiResponse.data.find(p => 
              p.last_name?.toLowerCase().includes(player.last_name?.toLowerCase()) &&
              (p.first_name?.toLowerCase().includes(player.first_name?.toLowerCase()) ||
               player.first_name?.toLowerCase().includes(p.first_name?.toLowerCase()))
            );
          }

          // Use first result if no good match
          if (!bestMatch) {
            bestMatch = apiResponse.data[0];
          }

          if (bestMatch) {
            // Update player with enhanced data
            const updateData = {
              height: bestMatch.height || null,
              weight: bestMatch.weight || null,
              college: bestMatch.college || null,
              jersey_number: bestMatch.jersey_number || null,
              years_pro: bestMatch.years_pro || null,
              age: bestMatch.age || null,
              external_id: bestMatch.id ? bestMatch.id.toString() : player.external_id,
              birthdate: bestMatch.birthdate || null,
              hometown: bestMatch.hometown || null
            };

            const { error: updateError } = await supabaseAdmin
              .from('players')
              .update(updateData)
              .eq('id', player.id);

            if (updateError) {
              console.error(`Error updating player ${searchTerm}:`, updateError);
              results.error_count++;
              results.errors.push(`${searchTerm}: ${updateError.message}`);
            } else {
              console.log(`✓ Updated ${searchTerm} with API data`);
              results.updated_count++;
              
              if (results.sample_updates.length < 5) {
                results.sample_updates.push({
                  player: searchTerm,
                  updates: updateData
                });
              }
            }
          }

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (playerError) {
          console.error(`Error processing ${player.first_name} ${player.last_name}:`, playerError);
          results.error_count++;
          results.errors.push(`${player.first_name} ${player.last_name}: ${playerError.message}`);
        }
      }

      // Longer delay between batches
      if (i + batch_size < players.length) {
        console.log('Waiting between batches...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log(`Sync complete: ${results.updated_count} updated, ${results.skipped_count} skipped, ${results.error_count} errors`);

    return NextResponse.json(results);

  } catch (err: any) {
    console.error('Player profile sync error:', err);
    return NextResponse.json({ 
      success: false,
      error: err?.message || 'Unknown error',
      details: err?.stack
    }, { status: 500 });
  }
}
