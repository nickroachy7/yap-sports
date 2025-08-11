import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { fetchNFLPlayers } from '@/lib/nflProvider';
import type { ApiResponse } from '@/types/api';

export async function POST(req: NextRequest) {
  try {
    console.log('Starting NFL players sync...');

    // Parse request body for sync options
    const body = await req.json().catch(() => ({}));
    const { 
      per_page = 100, 
      max_players = 2000,
      test_mode = false 
    } = body;

    // First, get team mappings for foreign key relationships
    const { data: teams, error: teamsError } = await supabaseAdmin
      .from('teams')
      .select('id, external_id, abbreviation');

    if (teamsError) {
      console.error('Error fetching teams:', teamsError);
      return NextResponse.json({ 
        error: 'Failed to fetch teams for player mapping',
        details: teamsError.message 
      }, { status: 500 });
    }

    console.log(`Found ${teams.length} teams for player mapping`);

    // Create team lookup maps
    const teamIdMap = new Map(teams.map(t => [t.external_id, t.id]));
    const teamAbbrevMap = new Map(teams.map(t => [t.abbreviation, t.id]));

    const allPlayers = [];
    let cursor: string | null = null;
    let totalFetched = 0;

    // Fetch players from Ball Don't Lie API with pagination
    do {
      const response = await fetchNFLPlayers({
        per_page,
        cursor: cursor || undefined
      });

      if (!response.data) {
        break;
      }

      allPlayers.push(...response.data);
      totalFetched += response.data.length;
      cursor = response.meta?.next_cursor;

      console.log(`Fetched ${response.data.length} players (total: ${totalFetched})`);

      // Safety limits
      if (totalFetched >= max_players || (test_mode && totalFetched >= 200)) {
        console.log(`Reached limit of ${test_mode ? 200 : max_players} players`);
        break;
      }
    } while (cursor);

    console.log(`Total players fetched: ${allPlayers.length}`);

    if (allPlayers.length === 0) {
      return NextResponse.json({ 
        error: 'No players data received from API' 
      }, { status: 400 });
    }

    let processedCount = 0;
    let insertedCount = 0;
    const updatedCount = 0;
    let teamMappedCount = 0;
    const errors = [];

    // Process players in batches
    const batchSize = 50;
    for (let i = 0; i < allPlayers.length; i += batchSize) {
      const batch = allPlayers.slice(i, i + batchSize);
      
      try {
        // Prepare batch data for upsert with team mapping
        const playersToUpsert = batch.map(player => {
          // Find team_id from player's team info
          let team_id = null;
          if (player.team) {
            // Try to match by external_id first, then by abbreviation
            team_id = teamIdMap.get(player.team.id?.toString()) || 
                     teamAbbrevMap.get(player.team.abbreviation) || 
                     null;
            
            if (team_id) teamMappedCount++;
          }

          return {
            external_id: player.id.toString(),
            external_ref: player.id.toString(), // Keep for backwards compatibility
            first_name: player.first_name,
            last_name: player.last_name,
            position: player.position,
            team: player.team?.abbreviation || null, // Keep for backwards compatibility
            team_id: team_id,
            active: true
          };
        });

        // Upsert batch
        const { data, error } = await supabaseAdmin
          .from('players')
          .upsert(playersToUpsert, {
            onConflict: 'external_id',
            ignoreDuplicates: false
          })
          .select('id, first_name, last_name');

        if (error) {
          console.error(`Error upserting batch ${i / batchSize + 1}:`, error);
          errors.push(`Batch ${i / batchSize + 1}: ${error.message}`);
        } else {
          processedCount += batch.length;
          if (data) {
            insertedCount += data.length; // Simplified - treating all as inserts for now
          }
          console.log(`✓ Processed batch ${i / batchSize + 1} (${batch.length} players, ${batch.filter(p => p.team_id).length} with teams)`);
        }
      } catch (err: any) {
        console.error(`Unexpected error processing batch ${i / batchSize + 1}:`, err);
        errors.push(`Batch ${i / batchSize + 1}: ${err.message}`);
      }

      // Small delay to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    console.log(`Players sync complete: ${processedCount} processed, ${teamMappedCount} mapped to teams, ${errors.length} errors`);

    return NextResponse.json({
      success: true,
      message: `Synced ${processedCount} NFL players (${teamMappedCount} mapped to teams)`,
      stats: {
        total_fetched: allPlayers.length,
        processed: processedCount,
        inserted: insertedCount,
        updated: updatedCount,
        team_mapped: teamMappedCount,
        teams_available: teams.length,
        errors: errors.length
      },
      errors: errors.length > 0 ? errors.slice(0, 5) : undefined // Limit error reporting
    });

  } catch (err: unknown) {
    console.error('Players sync error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message } satisfies ApiResponse, { status: 500 });
  }
}
