import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const BodySchema = z.object({ 
  userPackId: z.string().uuid(),
  teamId: z.string().uuid()
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const { userPackId, teamId } = BodySchema.parse(json);

    const authHeader = req.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const token = authHeader.replace('Bearer ', '');

    const { data: { user }, error: getUserError } = await supabaseAdmin.auth.getUser(token);
    if (getUserError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = user.id;

    // Verify team ownership
    const { data: team, error: teamError } = await supabaseAdmin
      .from('user_teams')
      .select('id')
      .eq('id', teamId)
      .eq('user_id', userId)
      .eq('active', true)
      .single();

    if (teamError || !team) {
      return NextResponse.json({ error: 'Team not found or not owned by user' }, { status: 403 });
    }

    // Get the user pack and verify it belongs to this team
    const { data: userPack, error: packErr } = await supabaseAdmin
      .from('user_packs')
      .select('id, pack_id, status, team_id')
      .eq('id', userPackId)
      .eq('user_id', userId)
      .eq('team_id', teamId)
      .eq('status', 'unopened')
      .maybeSingle();
      
    if (packErr || !userPack) {
      return NextResponse.json({ error: 'Pack not found, already opened, or not owned by this team' }, { status: 400 });
    }

    // Get pack contents schema
    const { data: pack, error: packSchemaErr } = await supabaseAdmin
      .from('packs')
      .select('contents_schema_json')
      .eq('id', userPack.pack_id)
      .maybeSingle();
      
    if (packSchemaErr || !pack) {
      return NextResponse.json({ error: 'Pack configuration not found' }, { status: 400 });
    }

    // Roll pack contents
    const contents = await rollPackContents(pack.contents_schema_json);
    console.log('Rolled contents for team:', teamId, contents);
    
    // Apply contents atomically using team-specific function
    const { data: result, error: applyErr } = await supabaseAdmin.rpc('open_pack_for_team', {
      p_user_pack_id: userPackId,
      p_user_id: userId,
      p_team_id: teamId,
      p_cards: contents.cards,
      p_tokens: contents.tokens,
    });
    
    if (applyErr) {
      console.error('Pack opening error:', applyErr);
      return NextResponse.json({ 
        error: 'Failed to open pack', 
        details: applyErr.message 
      }, { status: 500 });
    }

    // Get detailed card and token information for animations
    const detailedCards = await Promise.all(
      contents.cards.map(async (card: any) => {
        const { data: cardData } = await supabaseAdmin
          .from('cards')
          .select(`
            id, rarity, base_sell_value, base_contracts,
            players (
              id, first_name, last_name, position, 
              teams (abbreviation, name, primary_color)
            )
          `)
          .eq('id', card.id)
          .single();
        
        return {
          ...card,
          ...cardData,
          player_name: cardData?.players ? `${cardData.players.first_name} ${cardData.players.last_name}` : 'Unknown Player',
          team_info: cardData?.players?.teams || null
        };
      })
    );

    const detailedTokens = await Promise.all(
      contents.tokens.map(async (token: any) => {
        const { data: tokenData } = await supabaseAdmin
          .from('token_types')
          .select('id, name, description, rarity, condition_type, condition_value, bonus_type, bonus_value')
          .eq('id', token.id)
          .single();
        
        return {
          ...token,
          ...tokenData
        };
      })
    );

    return NextResponse.json({
      success: true,
      message: `Pack opened! Added ${result.cards_added} cards and ${result.tokens_added} tokens to team.`,
      contents: {
        cards: detailedCards,
        tokens: detailedTokens
      },
      stats: {
        cards_added: result.cards_added,
        tokens_added: result.tokens_added
      },
      pack_info: {
        pack_id: userPack.pack_id,
        pack_name: pack.name || 'Unknown Pack'
      }
    });

  } catch (err: any) {
    console.error('API Error:', err);
    return NextResponse.json({ 
      error: 'Invalid request', 
      details: err.message 
    }, { status: 400 });
  }
}

// Pack content rolling logic (same as before but isolated per team)
async function rollPackContents(schema: any) {
  const contents = { cards: [], tokens: [], coins: 0 };

  for (const slot of schema.slots) {
    const count = slot.count || 1;
    
    for (let i = 0; i < count; i++) {
      if (slot.type === 'card') {
        const rarity = rollRarity(slot.rarityWeights);
        const card = await getRandomCard(rarity);
        if (card) contents.cards.push(card);
      } else if (slot.type === 'token') {
        const rarity = rollRarity(slot.rarityWeights);
        const token = await getRandomToken(rarity);
        if (token) contents.tokens.push(token);
      } else if (slot.type === 'coins') {
        contents.coins += slot.amount || 0;
      }
    }
  }

  return contents;
}

function rollRarity(weights: any): string {
  const total = Object.values(weights).reduce((sum: number, weight: any) => sum + weight, 0);
  let roll = Math.random() * total;
  
  for (const [rarity, weight] of Object.entries(weights)) {
    roll -= weight as number;
    if (roll <= 0) return rarity;
  }
  
  return Object.keys(weights)[0]; // fallback
}

async function getRandomCard(rarity: string) {
  const { data: cards, error } = await supabaseAdmin
    .from('cards')
    .select('id, base_sell_value, base_contracts')
    .eq('rarity', rarity);
    
  if (error || !cards || cards.length === 0) return null;
  
  const card = cards[Math.floor(Math.random() * cards.length)];
  return {
    id: card.id,
    rarity,
    contracts: card.base_contracts,
    sell_value: card.base_sell_value
  };
}

async function getRandomToken(rarity: string) {
  const { data: tokens, error } = await supabaseAdmin
    .from('token_types')
    .select('id, max_uses')
    .eq('rarity', rarity);
    
  if (error || !tokens || tokens.length === 0) return null;
  
  const token = tokens[Math.floor(Math.random() * tokens.length)];
  return {
    id: token.id,
    rarity,
    uses: token.max_uses
  };
}
