import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const BodySchema = z.object({ userPackId: z.string().uuid() });

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const { userPackId } = BodySchema.parse(json);

    const authHeader = req.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const token = authHeader.replace('Bearer ', '');

    const { data: { user }, error: getUserError } = await supabaseAdmin.auth.getUser(token);
    if (getUserError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = user.id;

    // Get the user pack and verify ownership
    const { data: userPack, error: packErr } = await supabaseAdmin
      .from('user_packs')
      .select('id, pack_id, status')
      .eq('id', userPackId)
      .eq('user_id', userId)
      .eq('status', 'unopened')
      .maybeSingle();
    if (packErr || !userPack) {
      return NextResponse.json({ error: 'Pack not found or already opened' }, { status: 400 });
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
    console.log('Rolled contents:', contents);
    
    // Apply contents atomically
    const { data: result, error: applyErr } = await supabaseAdmin.rpc('open_pack_txn', {
      p_user_pack_id: userPackId,
      p_user_id: userId,
      p_cards: contents.cards,
      p_tokens: contents.tokens,
    });
    if (applyErr) {
      console.error('Pack opening error:', applyErr);
      throw applyErr;
    }

    console.log('Pack opened successfully:', result);
    return NextResponse.json({ ok: true, contents, result });
  } catch (err: any) {
    const message = err?.message || 'Unknown error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

async function rollPackContents(schema: any) {
  const slots = schema.slots || [];
  const cards: string[] = [];
  const tokens: string[] = [];

  for (const slot of slots) {
    if (slot.type === 'card') {
      const cardId = await rollCard(slot.rarityWeights);
      if (cardId) cards.push(cardId);
    } else if (slot.type === 'token') {
      const tokenTypeId = await rollToken(slot.rarityWeights);
      if (tokenTypeId) tokens.push(tokenTypeId);
    }
  }

  return { cards, tokens };
}

async function rollCard(rarityWeights: Record<string, number>) {
  const rarity = weightedRandom(rarityWeights);
  
  // Get available cards by rarity
  const { data: cards } = await supabaseAdmin
    .from('cards')
    .select('id')
    .eq('rarity', rarity)
    .limit(50);
  
  if (!cards || cards.length === 0) return null;
  return cards[Math.floor(Math.random() * cards.length)].id;
}

async function rollToken(rarityWeights: Record<string, number>) {
  const rarity = weightedRandom(rarityWeights);
  
  // Get available token types by rarity
  const { data: tokenTypes } = await supabaseAdmin
    .from('token_types')
    .select('id')
    .eq('rarity', rarity)
    .eq('enabled', true)
    .limit(50);
  
  if (!tokenTypes || tokenTypes.length === 0) return null;
  return tokenTypes[Math.floor(Math.random() * tokenTypes.length)].id;
}

function weightedRandom(weights: Record<string, number>): string {
  const total = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
  let random = Math.random() * total;
  
  for (const [key, weight] of Object.entries(weights)) {
    random -= weight;
    if (random <= 0) return key;
  }
  
  return Object.keys(weights)[0]; // fallback
}
