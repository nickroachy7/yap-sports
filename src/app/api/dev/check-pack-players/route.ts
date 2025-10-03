import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * Check what players are in each rarity tier with their stats
 * This helps diagnose why packs are giving bad players
 */
export async function GET(req: NextRequest) {
  try {
    const PLAYABLE_POSITIONS = ['Quarterback', 'Running Back', 'Wide Receiver', 'Tight End'];
    const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
    
    // Get 2024-2025 seasons
    const { data: seasons } = await supabaseAdmin
      .from('seasons')
      .select('id')
      .in('year', [2024, 2025])
      .eq('league', 'NFL');
    
    if (!seasons) {
      return NextResponse.json({ error: 'No seasons found' }, { status: 404 });
    }
    
    const seasonIds = seasons.map(s => s.id);
    
    const results: any = {};
    
    for (const rarity of RARITIES) {
      // Get all active cards of this rarity
      const { data: cards } = await supabaseAdmin
        .from('cards')
        .select(`
          id,
          rarity,
          players!inner (
            id,
            first_name,
            last_name,
            position,
            team,
            active
          )
        `)
        .eq('rarity', rarity)
        .eq('players.active', true)
        .in('players.position', PLAYABLE_POSITIONS)
        .limit(100);
      
      if (!cards || cards.length === 0) {
        results[rarity] = { total: 0, players: [] };
        continue;
      }
      
      const playersWithStats = [];
      
      for (const card of cards.slice(0, 20)) { // Sample first 20
        const player = Array.isArray(card.players) ? card.players[0] : card.players;
        if (!player) continue;
        
        // Get recent stats
        const { data: stats } = await supabaseAdmin
          .from('player_game_stats')
          .select('stat_json, game_date')
          .eq('player_id', player.id)
          .in('season_id', seasonIds)
          .gte('game_date', '2024-09-01');
        
        let avgFantasyPoints = 0;
        let gamesPlayed = 0;
        
        if (stats && stats.length > 0) {
          const totalPoints = stats.reduce((sum, stat) => {
            return sum + (stat.stat_json?.fantasy_points || 0);
          }, 0);
          gamesPlayed = stats.length;
          avgFantasyPoints = gamesPlayed > 0 ? totalPoints / gamesPlayed : 0;
        }
        
        playersWithStats.push({
          name: `${player.first_name} ${player.last_name}`,
          team: player.team,
          position: player.position,
          gamesPlayed,
          avgFantasyPoints: avgFantasyPoints.toFixed(1)
        });
      }
      
      // Sort by avg fantasy points
      playersWithStats.sort((a, b) => parseFloat(b.avgFantasyPoints) - parseFloat(a.avgFantasyPoints));
      
      results[rarity] = {
        total: cards.length,
        sample: playersWithStats
      };
    }
    
    return NextResponse.json({
      success: true,
      results,
      note: 'Sample of first 20 players per rarity, sorted by avg fantasy points'
    });
    
  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json({ 
      error: 'Failed to check players', 
      details: error.message 
    }, { status: 500 });
  }
}

