import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { fetchNFLPlayers } from '@/lib/nflProvider';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ playerId: string }> }
) {
  try {
    const { playerId } = await params;
    
    if (!playerId) {
      return NextResponse.json({ 
        error: 'Player ID is required' 
      }, { status: 400 });
    }

    // Get the player from database
    const { data: playerData, error: playerError } = await supabaseAdmin
      .from('players')
      .select('*')
      .eq('id', playerId)
      .single();

    if (playerError || !playerData) {
      return NextResponse.json({ 
        error: 'Player not found' 
      }, { status: 404 });
    }

    // Check if player already has enhanced data
    const hasEnhancedData = playerData.height && playerData.weight && playerData.college;
    
    if (hasEnhancedData) {
      // Return existing data immediately
      return NextResponse.json({
        success: true,
        player: {
          id: playerData.id,
          name: `${playerData.first_name} ${playerData.last_name}`,
          position: playerData.position,
          team: playerData.team,
          jersey_number: playerData.jersey_number || 'N/A',
          height: playerData.height || 'N/A',
          weight: playerData.weight || 'N/A',
          age: playerData.age || undefined,
          college: playerData.college || 'N/A',
          years_pro: playerData.years_pro || undefined,
          data_source: 'database',
          enhanced: true
        }
      });
    }

    // If no enhanced data, try to fetch and update in background
    console.log(`Auto-enhancing player data for: ${playerData.first_name} ${playerData.last_name}`);
    
    try {
      // Search Ball Don't Lie API
      const searchTerm = `${playerData.first_name} ${playerData.last_name}`;
      const apiResponse = await fetchNFLPlayers({
        search: searchTerm,
        per_page: 5
      });

      let enhancedData = null;
      if (apiResponse.data && apiResponse.data.length > 0) {
        // Find the best match
        const exactMatch = apiResponse.data.find(p => 
          p.first_name?.toLowerCase().trim() === playerData.first_name?.toLowerCase().trim() &&
          p.last_name?.toLowerCase().trim() === playerData.last_name?.toLowerCase().trim()
        );

        const bestMatch = exactMatch || apiResponse.data[0];
        
        if (bestMatch) {
          enhancedData = {
            height: bestMatch.height || null,
            weight: bestMatch.weight || null,
            college: bestMatch.college || null,
            jersey_number: bestMatch.jersey_number || null,
            years_pro: bestMatch.years_pro || null,
            age: bestMatch.age || null,
            external_id: bestMatch.id ? bestMatch.id.toString() : playerData.external_id
          };

          // Update database in background (don't wait for it)
          supabaseAdmin
            .from('players')
            .update(enhancedData)
            .eq('id', playerId)
            .then(({ error }) => {
              if (error) {
                console.error(`Background update failed for ${searchTerm}:`, error);
              } else {
                console.log(`✓ Auto-enhanced ${searchTerm} in background`);
              }
            });
        }
      }

      // Return immediately with best available data
      return NextResponse.json({
        success: true,
        player: {
          id: playerData.id,
          name: `${playerData.first_name} ${playerData.last_name}`,
          position: playerData.position,
          team: playerData.team,
          jersey_number: enhancedData?.jersey_number || 'N/A',
          height: enhancedData?.height || 'N/A',
          weight: enhancedData?.weight || 'N/A',
          age: enhancedData?.age || undefined,
          college: enhancedData?.college || 'N/A',
          years_pro: enhancedData?.years_pro || undefined,
          data_source: enhancedData ? 'api_fresh' : 'basic',
          enhanced: !!enhancedData
        }
      });

    } catch (apiError) {
      console.warn(`API fetch failed for ${playerData.first_name} ${playerData.last_name}:`, apiError);
      
      // Return basic data if API fails
      return NextResponse.json({
        success: true,
        player: {
          id: playerData.id,
          name: `${playerData.first_name} ${playerData.last_name}`,
          position: playerData.position,
          team: playerData.team,
          jersey_number: 'N/A',
          height: 'N/A',
          weight: 'N/A',
          age: undefined,
          college: 'N/A',
          years_pro: undefined,
          data_source: 'basic',
          enhanced: false
        }
      });
    }

  } catch (err: any) {
    console.error('Auto-enhance error:', err);
    return NextResponse.json({ 
      error: err?.message || 'Unknown error'
    }, { status: 500 });
  }
}
