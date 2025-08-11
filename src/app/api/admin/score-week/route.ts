import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: NextRequest) {
  try {
    console.log('Starting week scoring pipeline...');

    // Parse request body for options
    const body = await req.json().catch(() => ({}));
    const { 
      week_id = null,
      week_number = null,
      force_rescore = false,
      test_mode = false 
    } = body;

    // Find the target week
    let targetWeek;
    if (week_id) {
      const { data: week, error } = await supabaseAdmin
        .from('weeks')
        .select('*')
        .eq('id', week_id)
        .single();
      
      if (error) {
        return NextResponse.json({ 
          error: 'Week not found',
          details: error.message 
        }, { status: 400 });
      }
      targetWeek = week;
    } else if (week_number) {
      // Get current season and find week by number
      const currentYear = new Date().getMonth() >= 8 ? new Date().getFullYear() : new Date().getFullYear() - 1;
      
      const { data: season } = await supabaseAdmin
        .from('seasons')
        .select('id')
        .eq('year', currentYear)
        .eq('league', 'NFL')
        .single();

      if (!season) {
        return NextResponse.json({ 
          error: 'Current season not found' 
        }, { status: 400 });
      }

      const { data: week, error } = await supabaseAdmin
        .from('weeks')
        .select('*')
        .eq('season_id', season.id)
        .eq('week_number', week_number)
        .single();
      
      if (error) {
        return NextResponse.json({ 
          error: `Week ${week_number} not found`,
          details: error.message 
        }, { status: 400 });
      }
      targetWeek = week;
    } else {
      // Default to most recently completed week
      const { data: week, error } = await supabaseAdmin
        .from('weeks')
        .select('*')
        .eq('status', 'completed')
        .order('week_number', { ascending: false })
        .limit(1)
        .single();
      
      if (error) {
        return NextResponse.json({ 
          error: 'No completed weeks found',
          details: error.message 
        }, { status: 400 });
      }
      targetWeek = week;
    }

    console.log(`Scoring week ${targetWeek.week_number} (ID: ${targetWeek.id})`);

    // Get all submitted lineups for this week
    const { data: lineups, error: lineupsError } = await supabaseAdmin
      .from('lineups')
      .select(`
        *,
        lineup_slots (
          *,
          user_cards (
            *,
            cards (
              *,
              players (
                id,
                first_name,
                last_name,
                position,
                team,
                external_id
              )
            )
          ),
          user_tokens (
            *,
            token_types (
              *
            )
          )
        )
      `)
      .eq('week_id', targetWeek.id)
      .in('status', ['submitted', 'locked', 'scored']);

    if (lineupsError) {
      console.error('Error fetching lineups:', lineupsError);
      return NextResponse.json({ 
        error: 'Failed to fetch lineups',
        details: lineupsError.message 
      }, { status: 500 });
    }

    console.log(`Found ${lineups.length} lineups to score`);

    if (lineups.length === 0) {
      return NextResponse.json({
        success: true,
        message: `No lineups found for week ${targetWeek.week_number}`,
        stats: { lineups_processed: 0 }
      });
    }

    // Get games/stats for this week
    const { data: weekGames, error: gamesError } = await supabaseAdmin
      .from('sports_events')
      .select('*')
      .eq('week_id', targetWeek.id);

    if (gamesError) {
      console.error('Error fetching week games:', gamesError);
      return NextResponse.json({ 
        error: 'Failed to fetch week games',
        details: gamesError.message 
      }, { status: 500 });
    }

    // Get all player stats for this week's games
    const gameIds = weekGames.map(g => g.id);
    const { data: weekStats, error: statsError } = await supabaseAdmin
      .from('player_game_stats')
      .select('*')
      .in('sports_event_id', gameIds)
      .eq('finalized', true);

    if (statsError) {
      console.error('Error fetching week stats:', statsError);
      return NextResponse.json({ 
        error: 'Failed to fetch week stats',
        details: statsError.message 
      }, { status: 500 });
    }

    console.log(`Found ${weekStats.length} finalized stat records for ${weekGames.length} games`);

    // Create player stats lookup
    const playerStatsMap = new Map();
    weekStats.forEach(stat => {
      if (stat.player_id) {
        playerStatsMap.set(stat.player_id, stat.stat_json);
      }
    });

    let lineupsProcessed = 0;
    let lineupsScored = 0;
    let totalSlots = 0;
    let totalTokens = 0;
    const errors = [];

    // Process each lineup
    for (const lineup of lineups) {
      try {
        // Skip if already scored and not forcing rescore
        if (lineup.status === 'scored' && !force_rescore && !test_mode) {
          console.log(`Skipping already scored lineup ${lineup.id}`);
          continue;
        }

        console.log(`Scoring lineup ${lineup.id} for user ${lineup.user_id}`);

        let lineupTotal = 0;
        const slotResults = [];
        const tokenEvaluations = [];

        // Score each slot
        for (const slot of lineup.lineup_slots) {
          if (!slot.user_cards?.cards?.players) {
            continue; // Empty slot
          }

          const player = slot.user_cards.cards.players;
          const playerStats = playerStatsMap.get(player.id);
          
          let slotPoints = 0;
          let tokenBonus = 0;

          // Calculate base fantasy points
          if (playerStats) {
            slotPoints = calculateFantasyPoints(playerStats, player.position);
          }

          // Evaluate token if applied
          if (slot.applied_token_id && slot.user_tokens?.token_types) {
            const tokenType = slot.user_tokens.token_types;
            const tokenEvaluation = await evaluateToken(tokenType, playerStats, player);
            
            if (tokenEvaluation.satisfied) {
              tokenBonus = tokenEvaluation.points_awarded;
              totalTokens++;
            }

            tokenEvaluations.push({
              lineup_slot_id: slot.id,
              token_id: slot.applied_token_id,
              satisfied: tokenEvaluation.satisfied,
              points_awarded: tokenEvaluation.points_awarded,
              rule_snapshot: tokenType.rule_json,
              evaluated_at: new Date().toISOString()
            });
          }

          const totalSlotPoints = slotPoints + tokenBonus;
          lineupTotal += totalSlotPoints;
          totalSlots++;

          slotResults.push({
            slot_id: slot.id,
            player_name: `${player.first_name} ${player.last_name}`,
            position: player.position,
            base_points: slotPoints,
            token_bonus: tokenBonus,
            total_points: totalSlotPoints,
            had_stats: !!playerStats
          });

          console.log(`  ${slot.slot}: ${player.first_name} ${player.last_name} = ${totalSlotPoints} pts (${slotPoints} base + ${tokenBonus} token)`);
        }

        // Update lineup with total score
        const { error: updateError } = await supabaseAdmin
          .from('lineups')
          .update({
            total_points: lineupTotal,
            status: 'scored'
          })
          .eq('id', lineup.id);

        if (updateError) {
          console.error(`Error updating lineup ${lineup.id}:`, updateError);
          errors.push(`Lineup ${lineup.id}: ${updateError.message}`);
          continue;
        }

        // Insert token evaluations
        if (tokenEvaluations.length > 0) {
          const { error: tokenError } = await supabaseAdmin
            .from('token_evaluations')
            .upsert(tokenEvaluations, {
              onConflict: 'lineup_slot_id,token_id',
              ignoreDuplicates: false
            });

          if (tokenError) {
            console.error(`Error inserting token evaluations for lineup ${lineup.id}:`, tokenError);
            errors.push(`Token evaluations ${lineup.id}: ${tokenError.message}`);
          }
        }

        lineupsScored++;
        console.log(`✓ Scored lineup ${lineup.id}: ${lineupTotal} points (${slotResults.length} slots, ${tokenEvaluations.filter(t => t.satisfied).length} token bonuses)`);

      } catch (err: any) {
        console.error(`Error processing lineup ${lineup.id}:`, err);
        errors.push(`Lineup ${lineup.id}: ${err.message}`);
      }

      lineupsProcessed++;
    }

    console.log(`Week scoring complete: ${lineupsScored} lineups scored, ${totalSlots} slots processed, ${totalTokens} token bonuses applied`);

    return NextResponse.json({
      success: true,
      message: `Scored ${lineupsScored} lineups for week ${targetWeek.week_number}`,
      stats: {
        week_id: targetWeek.id,
        week_number: targetWeek.week_number,
        lineups_processed: lineupsProcessed,
        lineups_scored: lineupsScored,
        total_slots: totalSlots,
        token_bonuses: totalTokens,
        games_available: weekGames.length,
        stats_available: weekStats.length,
        errors: errors.length
      },
      errors: errors.length > 0 ? errors.slice(0, 5) : undefined
    });

  } catch (err: any) {
    console.error('Week scoring error:', err);
    const message = err?.message || 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Helper function to calculate fantasy points
function calculateFantasyPoints(stats: any, position: string): number {
  let points = 0;

  // Standard fantasy scoring
  if (stats.passing_yards) points += stats.passing_yards * 0.04; // 1 pt per 25 yards
  if (stats.passing_touchdowns) points += stats.passing_touchdowns * 4;
  if (stats.passing_interceptions) points -= stats.passing_interceptions * 2;

  if (stats.rushing_yards) points += stats.rushing_yards * 0.1; // 1 pt per 10 yards
  if (stats.rushing_touchdowns) points += stats.rushing_touchdowns * 6;

  if (stats.receiving_yards) points += stats.receiving_yards * 0.1; // 1 pt per 10 yards
  if (stats.receiving_receptions) points += stats.receiving_receptions * 1; // PPR
  if (stats.receiving_touchdowns) points += stats.receiving_touchdowns * 6;

  if (stats.fumbles_lost) points -= stats.fumbles_lost * 2;

  return Math.round(points * 100) / 100; // Round to 2 decimal places
}

// Helper function to evaluate token conditions
async function evaluateToken(tokenType: any, playerStats: any, player: any): Promise<{ satisfied: boolean; points_awarded: number }> {
  try {
    if (!tokenType.rule_json || !playerStats) {
      return { satisfied: false, points_awarded: 0 };
    }

    const rule = tokenType.rule_json;
    const condition = rule.condition;
    const reward = rule.reward;

    // Evaluate condition
    let satisfied = false;

    if (condition.type === 'stat') {
      const statValue = playerStats[condition.metric] || 0;
      
      switch (condition.op) {
        case '>=':
          satisfied = statValue >= condition.value;
          break;
        case '>':
          satisfied = statValue > condition.value;
          break;
        case '=':
        case '==':
          satisfied = statValue === condition.value;
          break;
        case '<':
          satisfied = statValue < condition.value;
          break;
        case '<=':
          satisfied = statValue <= condition.value;
          break;
      }
    }

    // Calculate reward if satisfied
    let pointsAwarded = 0;
    if (satisfied && reward.type === 'points') {
      pointsAwarded = reward.value || 0;
    }

    return { satisfied, points_awarded: pointsAwarded };

  } catch (err) {
    console.error('Error evaluating token:', err);
    return { satisfied: false, points_awarded: 0 };
  }
}
