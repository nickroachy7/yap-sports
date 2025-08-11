import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { fetchNFLPlayers } from '@/lib/nflProvider';

export async function POST(req: NextRequest) {
  try {
    console.log('Populating star players with real data...');

    // List of star players to populate first
    const starPlayers = [
      'Patrick Mahomes',
      'Josh Allen', 
      'Lamar Jackson',
      'Travis Kelce',
      'Tyreek Hill',
      'Cooper Kupp',
      'Derrick Henry',
      'CMC McCaffrey',
      'Stefon Diggs',
      'Davante Adams'
    ];

    const results = {
      success: true,
      processed: 0,
      enhanced: 0,
      errors: [] as string[],
      updates: [] as any[]
    };

    for (const playerName of starPlayers) {
      try {
        results.processed++;
        console.log(`Processing: ${playerName}`);

        // Find player in our database
        const nameParts = playerName.split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ');

        const { data: dbPlayers, error: dbError } = await supabaseAdmin
          .from('players')
          .select('id, first_name, last_name, position, team, height, weight, college')
          .ilike('first_name', `%${firstName}%`)
          .ilike('last_name', `%${lastName}%`)
          .eq('active', true)
          .limit(3);

        if (dbError || !dbPlayers || dbPlayers.length === 0) {
          results.errors.push(`${playerName}: Not found in database`);
          continue;
        }

        const dbPlayer = dbPlayers[0]; // Take first match

        // Check if already has data
        if (dbPlayer.height && dbPlayer.weight && dbPlayer.college) {
          console.log(`${playerName}: Already has complete data`);
          continue;
        }

        // Search Ball Don't Lie API
        console.log(`Searching Ball Don't Lie API for: ${playerName}`);
        const apiResponse = await fetchNFLPlayers({
          search: playerName,
          per_page: 5
        });

        if (!apiResponse.data || apiResponse.data.length === 0) {
          results.errors.push(`${playerName}: No API data found`);
          continue;
        }

        // Find best match
        let bestMatch = null;
        
        // Try exact name match
        bestMatch = apiResponse.data.find(p => 
          p.first_name?.toLowerCase().includes(firstName.toLowerCase()) &&
          p.last_name?.toLowerCase().includes(lastName.toLowerCase())
        );

        // Use first result if no good match
        if (!bestMatch) {
          bestMatch = apiResponse.data[0];
        }

        if (bestMatch) {
          const updateData = {
            height: bestMatch.height || dbPlayer.height,
            weight: bestMatch.weight || dbPlayer.weight,
            college: bestMatch.college || dbPlayer.college,
            jersey_number: bestMatch.jersey_number || null,
            years_pro: bestMatch.years_pro || null,
            age: bestMatch.age || null,
            external_id: bestMatch.id ? bestMatch.id.toString() : null
          };

          // Only update if we got new data
          const hasNewData = updateData.height || updateData.weight || updateData.college;
          
          if (hasNewData) {
            const { error: updateError } = await supabaseAdmin
              .from('players')
              .update(updateData)
              .eq('id', dbPlayer.id);

            if (updateError) {
              results.errors.push(`${playerName}: Update failed - ${updateError.message}`);
            } else {
              results.enhanced++;
              results.updates.push({
                player: playerName,
                id: dbPlayer.id,
                updates: updateData
              });
              console.log(`✓ Enhanced ${playerName} with real data`);
            }
          } else {
            results.errors.push(`${playerName}: No useful data from API`);
          }
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (playerError) {
        console.error(`Error processing ${playerName}:`, playerError);
        results.errors.push(`${playerName}: ${playerError.message}`);
      }
    }

    console.log(`Population complete: ${results.enhanced}/${results.processed} players enhanced`);

    return NextResponse.json(results);

  } catch (err: any) {
    console.error('Star player population error:', err);
    return NextResponse.json({ 
      success: false,
      error: err?.message || 'Unknown error',
      details: err?.stack
    }, { status: 500 });
  }
}
