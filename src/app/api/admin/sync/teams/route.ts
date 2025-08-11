import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { fetchNFLTeams } from '@/lib/nflProvider';
import type { ApiResponse, SyncStats } from '@/types/api';

export async function POST(_req: NextRequest) {
  try {
    console.log('Starting NFL teams sync...');

    // Fetch teams from Ball Don't Lie API
    const response = await fetchNFLTeams();
    console.log('Fetched teams from API:', response.data?.length || 0);

    if (!response.data || response.data.length === 0) {
      return NextResponse.json({ 
        error: 'No teams data received from API' 
      }, { status: 400 });
    }

    let insertedCount = 0;
    const updatedCount = 0;
    const errors = [];

    // Process each team
    for (const team of response.data) {
      try {
        // Upsert team data with enhanced NFL fields
        const { error } = await supabaseAdmin
          .from('teams')
          .upsert({
            external_id: team.id.toString(),
            name: team.full_name,
            abbreviation: team.abbreviation,
            city: team.city,
            conference: team.conference,
            division: team.division,
            full_name: team.full_name,
            logo_url: team.logo_url || null,
            primary_color: team.primary_color || null,
            secondary_color: team.secondary_color || null,
            active: true
          }, { 
            onConflict: 'external_id',
            ignoreDuplicates: false 
          });

        if (error) {
          console.error(`Error upserting team ${team.full_name}:`, error);
          errors.push(`${team.full_name}: ${error.message}`);
        } else {
          // Check if it was an insert or update (simplified)
          insertedCount++;
          console.log(`✓ Synced team: ${team.full_name} (${team.abbreviation})`);
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error(`Unexpected error processing team ${team.full_name}:`, err);
        errors.push(`${team.full_name}: ${errorMessage}`);
      }
    }

    console.log(`Teams sync complete: ${insertedCount} processed, ${errors.length} errors`);

    return NextResponse.json({
      success: true,
      message: `Synced ${insertedCount} NFL teams`,
      total_teams: response.data.length,
      processed: insertedCount,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (err: unknown) {
    console.error('Teams sync error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message } satisfies ApiResponse, { status: 500 });
  }
}
