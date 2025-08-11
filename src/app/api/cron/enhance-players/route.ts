import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { fetchNFLPlayers } from '@/lib/nflProvider';

export async function GET(req: NextRequest) {
  try {
    console.log('Running scheduled player enhancement...');

    // Get players without enhanced data
    const { data: players, error: playersError } = await supabaseAdmin
      .from('players')
      .select('id, first_name, last_name, position, team, height, weight, college')
      .eq('active', true)
      .or('height.is.null,weight.is.null,college.is.null')
      .limit(20); // Process 20 players per run

    if (playersError) {
      throw new Error(`Failed to fetch players: ${playersError.message}`);
    }

    console.log(`Found ${players.length} players needing enhancement`);

    const results = {
      success: true,
      processed: 0,
      enhanced: 0,
      errors: [] as string[]
    };

    for (const player of players) {
      try {
        results.processed++;
        
        // Search Ball Don't Lie API
        const searchTerm = `${player.first_name} ${player.last_name}`;
        console.log(`Enhancing: ${searchTerm}`);

        const apiResponse = await fetchNFLPlayers({
          search: searchTerm,
          per_page: 3
        });

        if (apiResponse.data && apiResponse.data.length > 0) {
          // Find best match
          const exactMatch = apiResponse.data.find(p => 
            p.first_name?.toLowerCase().trim() === player.first_name?.toLowerCase().trim() &&
            p.last_name?.toLowerCase().trim() === player.last_name?.toLowerCase().trim()
          );

          const bestMatch = exactMatch || apiResponse.data[0];
          
          if (bestMatch && (bestMatch.height || bestMatch.weight || bestMatch.college)) {
            const updateData = {
              height: bestMatch.height || player.height,
              weight: bestMatch.weight || player.weight,
              college: bestMatch.college || player.college,
              jersey_number: bestMatch.jersey_number || null,
              years_pro: bestMatch.years_pro || null,
              age: bestMatch.age || null,
              external_id: bestMatch.id ? bestMatch.id.toString() : null
            };

            const { error: updateError } = await supabaseAdmin
              .from('players')
              .update(updateData)
              .eq('id', player.id);

            if (updateError) {
              results.errors.push(`${searchTerm}: ${updateError.message}`);
            } else {
              results.enhanced++;
              console.log(`✓ Enhanced ${searchTerm}`);
            }
          }
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (playerError) {
        results.errors.push(`${player.first_name} ${player.last_name}: ${playerError.message}`);
      }
    }

    console.log(`Enhancement complete: ${results.enhanced}/${results.processed} players enhanced`);

    return NextResponse.json(results);

  } catch (err: any) {
    console.error('Scheduled enhancement error:', err);
    return NextResponse.json({ 
      success: false,
      error: err?.message || 'Unknown error'
    }, { status: 500 });
  }
}
