import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: NextRequest) {
  try {
    console.log('Starting NFL season and week setup...');

    // Parse request body for options
    const body = await req.json().catch(() => ({}));
    const { 
      season_year = null,
      force_recreate = false 
    } = body;

    // Determine current NFL season year
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // JavaScript months are 0-indexed
    
    // NFL season typically runs from September of one year to February of the next
    // If it's January-July, we're in the previous season's playoffs/offseason
    // If it's August-December, we're in the current year's season
    const nflSeasonYear = season_year || (currentMonth >= 8 ? currentYear : currentYear - 1);
    
    console.log(`Current date: ${now.toISOString()}, Determined NFL season: ${nflSeasonYear}`);

    // Check if season already exists
    const { data: existingSeason, error: seasonCheckError } = await supabaseAdmin
      .from('seasons')
      .select('*')
      .eq('year', nflSeasonYear)
      .eq('league', 'NFL')
      .single();

    if (seasonCheckError && seasonCheckError.code !== 'PGRST116') {
      console.error('Error checking existing season:', seasonCheckError);
      return NextResponse.json({ 
        error: 'Failed to check existing season',
        details: seasonCheckError.message 
      }, { status: 500 });
    }

    let season = existingSeason;

    if (existingSeason && !force_recreate) {
      console.log(`Season ${nflSeasonYear} already exists with ID: ${existingSeason.id}`);
    } else {
      if (existingSeason && force_recreate) {
        console.log(`Force recreating season ${nflSeasonYear}...`);
        // Delete existing weeks and season
        await supabaseAdmin.from('weeks').delete().eq('season_id', existingSeason.id);
        await supabaseAdmin.from('seasons').delete().eq('id', existingSeason.id);
      }

      // Create new season
      console.log(`Creating new NFL season for ${nflSeasonYear}...`);
      
      const { data: newSeason, error: seasonError } = await supabaseAdmin
        .from('seasons')
        .insert({
          year: nflSeasonYear,
          league: 'NFL',
          start_date: `${nflSeasonYear}-09-01`, // Approximate start
          end_date: `${nflSeasonYear + 1}-02-28` // Approximate end (including playoffs)
        })
        .select()
        .single();

      if (seasonError) {
        console.error('Error creating season:', seasonError);
        return NextResponse.json({ 
          error: 'Failed to create season',
          details: seasonError.message 
        }, { status: 500 });
      }

      season = newSeason;
      console.log(`✓ Created season ${nflSeasonYear} with ID: ${season.id}`);
    }

    // Now create/update weeks for the season
    console.log('Setting up weeks for NFL season...');
    
    // NFL typically has 18 regular season weeks + 4 playoff weeks
    const totalWeeks = 22;
    const seasonStartDate = new Date(`${nflSeasonYear}-09-05`); // First Tuesday of September (approximate)
    
    const weeksToUpsert = [];
    
    for (let weekNum = 1; weekNum <= totalWeeks; weekNum++) {
      // Calculate week dates (each week starts on Tuesday, games mostly on weekends)
      const weekStart = new Date(seasonStartDate);
      weekStart.setDate(seasonStartDate.getDate() + (weekNum - 1) * 7);
      
      const weekLock = new Date(weekStart);
      weekLock.setDate(weekStart.getDate() + 3); // Lock on Friday
      weekLock.setHours(20, 0, 0, 0); // 8 PM lock time
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6); // End on Monday
      weekEnd.setHours(23, 59, 59, 999);

      // Determine week status based on current date
      let weekStatus = 'upcoming';
      if (now >= weekEnd) {
        weekStatus = 'completed';
      } else if (now >= weekLock) {
        weekStatus = 'locked';
      } else if (now >= weekStart) {
        weekStatus = 'active';
      }

      weeksToUpsert.push({
        season_id: season.id,
        week_number: weekNum,
        start_at: weekStart.toISOString(),
        lock_at: weekLock.toISOString(),
        end_at: weekEnd.toISOString(),
        status: weekStatus
      });
    }

    // Upsert weeks (this will update existing weeks or create new ones)
    const { data: weeks, error: weeksError } = await supabaseAdmin
      .from('weeks')
      .upsert(weeksToUpsert, {
        onConflict: 'season_id,week_number',
        ignoreDuplicates: false
      })
      .select();

    if (weeksError) {
      console.error('Error creating weeks:', weeksError);
      return NextResponse.json({ 
        error: 'Failed to create weeks',
        details: weeksError.message 
      }, { status: 500 });
    }

    console.log(`✓ Created/updated ${weeks.length} weeks for season ${nflSeasonYear}`);

    // Find current week
    const currentWeek = weeks.find(w => w.status === 'active') || 
                       weeks.find(w => w.status === 'upcoming') ||
                       weeks[0];

    console.log(`Season and week setup complete for ${nflSeasonYear}`);

    return NextResponse.json({
      success: true,
      message: `NFL ${nflSeasonYear} season setup complete`,
      season: {
        id: season.id,
        year: season.year,
        league: season.league,
        start_date: season.start_date,
        end_date: season.end_date
      },
      weeks: {
        total: weeks.length,
        current_week: currentWeek ? {
          id: currentWeek.id,
          week_number: currentWeek.week_number,
          status: currentWeek.status,
          start_at: currentWeek.start_at,
          lock_at: currentWeek.lock_at
        } : null
      },
      stats: {
        season_created: !existingSeason || force_recreate,
        weeks_created: weeks.length,
        current_week_number: currentWeek?.week_number || null
      }
    });

  } catch (err: any) {
    console.error('Season setup error:', err);
    const message = err?.message || 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
