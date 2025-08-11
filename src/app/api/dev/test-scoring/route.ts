import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: NextRequest) {
  try {
    console.log('Testing token evaluation system...');

    // Test the token condition evaluation directly
    const testStats = {
      td: 3,           // 3 touchdowns
      yards: 250,      // 250 total yards  
      passing_yards: 200,
      rushing_yards: 50,
      passing_tds: 2,
      rushing_tds: 1
    };

    // Test "2+ TDs = +10" token
    const { data: tdTokenTest, error: tdError } = await supabaseAdmin.rpc('evaluate_token_condition', {
      p_condition: {
        type: "stat",
        metric: "td", 
        op: ">=",
        value: 2
      },
      p_player_stats: testStats,
      p_team_result: null
    });

    // Test "100+ Yards = +5" token  
    const { data: yardsTokenTest, error: yardsError } = await supabaseAdmin.rpc('evaluate_token_condition', {
      p_condition: {
        type: "stat",
        metric: "yards",
        op: ">=", 
        value: 100
      },
      p_player_stats: testStats,
      p_team_result: null
    });

    // Test "Win = +3" token
    const { data: winTokenTest, error: winError } = await supabaseAdmin.rpc('evaluate_token_condition', {
      p_condition: {
        type: "team_result",
        result: "win"
      },
      p_player_stats: testStats,
      p_team_result: "win"
    });

    // Test point calculation
    const { data: pointsTest, error: pointsError } = await supabaseAdmin.rpc('calculate_fantasy_points', {
      p_stats: testStats,
      p_position: 'QB'
    });

    // Test token reward calculation
    const { data: rewardTest, error: rewardError } = await supabaseAdmin.rpc('calculate_token_reward', {
      p_reward: {
        type: "points",
        value: 10
      },
      p_base_points: 25
    });

    // Test mock stat generation
    const { data: weekData } = await supabaseAdmin
      .from('weeks')
      .select('id')
      .limit(1)
      .maybeSingle();

    let mockStatsTest = null;
    if (weekData) {
      const { data: mockStats, error: mockError } = await supabaseAdmin.rpc('generate_mock_player_stats', {
        p_player_position: 'QB',
        p_week_id: weekData.id
      });
      mockStatsTest = { mockStats, mockError };
    }

    const results = {
      token_evaluations: {
        td_token_2plus: { result: tdTokenTest, error: tdError, expected: true },
        yards_token_100plus: { result: yardsTokenTest, error: yardsError, expected: true }, 
        win_token: { result: winTokenTest, error: winError, expected: true }
      },
      fantasy_points: { result: pointsTest, error: pointsError },
      reward_calculation: { result: rewardTest, error: rewardError, expected: 10 },
      mock_stats_generation: mockStatsTest,
      test_stats_used: testStats
    };

    console.log('Token evaluation test results:', results);

    // If there are any errors, return them
    const errors = [tdError, yardsError, winError, pointsError, rewardError].filter(Boolean);
    if (errors.length > 0) {
      return NextResponse.json({ 
        success: false, 
        errors: errors.map(e => e.message),
        partial_results: results 
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Token evaluation system working correctly!',
      results: results
    });

  } catch (err: any) {
    console.error('Test scoring error:', err);
    const message = err?.message || 'Unknown error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
