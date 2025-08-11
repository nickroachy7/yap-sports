import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(req: NextRequest) {
  try {
    // Check if we can connect to database
    console.log('🔍 Starting data check...');
    
    // Check user_teams table
    const { data: teams, error: teamsError } = await supabaseAdmin
      .from('user_teams')
      .select('id, name, user_id, active')
      .limit(5);
    
    console.log('Teams query result:', { teams, teamsError });
    
    // Check players table
    const { data: players, error: playersError } = await supabaseAdmin
      .from('players')
      .select('id, first_name, last_name, position, team, active')
      .limit(5);
    
    console.log('Players query result:', { players, playersError });
    
    // Check user_cards table
    const { data: cards, error: cardsError } = await supabaseAdmin
      .from('user_cards')
      .select('id, team_id, remaining_contracts')
      .limit(5);
    
    console.log('Cards query result:', { cards, cardsError });
    
    // Check weeks table
    const { data: weeks, error: weeksError } = await supabaseAdmin
      .from('weeks')
      .select('id, week_number, status')
      .limit(5);
    
    console.log('Weeks query result:', { weeks, weeksError });
    
    return NextResponse.json({
      success: true,
      checks: {
        teams: {
          count: teams?.length || 0,
          data: teams,
          error: teamsError
        },
        players: {
          count: players?.length || 0,
          data: players,
          error: playersError
        },
        cards: {
          count: cards?.length || 0,
          data: cards,
          error: cardsError
        },
        weeks: {
          count: weeks?.length || 0,
          data: weeks,
          error: weeksError
        }
      }
    });

  } catch (err: any) {
    console.error('Data check error:', err);
    return NextResponse.json({ 
      success: false, 
      error: err.message 
    }, { status: 500 });
  }
}
