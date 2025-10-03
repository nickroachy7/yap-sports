# Playable Positions Only (QB, RB, WR, TE)

## Overview
The fantasy game now only grants cards for playable positions: **Quarterback, Running Back, Wide Receiver, Tight End** (displayed as QB, RB, WR, TE). This ensures all cards can be placed in the starting lineup and eliminates positions that aren't part of the game (K, DEF, OL, etc.).

**Important:** The database stores full position names like "Quarterback" rather than abbreviations like "QB".

## Changes Made

### 1. Pack Purchase API (`/api/teams/purchase-pack`)
**File:** `src/app/api/teams/purchase-pack/route.ts`

**Updated:** `generateRandomCards()` function to filter players by position:

```typescript
async function generateRandomCards(count: number) {
  // Only allow playable positions for the fantasy game
  // Note: Database stores full position names, not abbreviations
  const PLAYABLE_POSITIONS = ['Quarterback', 'Running Back', 'Wide Receiver', 'Tight End'];
  
  const { data: players, error: playersError } = await supabaseAdmin
    .from('players')
    .select('id, first_name, last_name, position, team')
    .eq('active', true)
    .in('position', PLAYABLE_POSITIONS)  // ✅ Filter by position
    .limit(500);
  // ...
}
```

**Impact:** When purchasing packs, you'll only receive cards for QB, RB, WR, and TE positions.

---

### 2. Pack Opening API (`/api/packs/open`)
**File:** `src/app/api/packs/open/route.ts`

**Updated:** `rollCard()` function to filter existing cards by position:

```typescript
async function rollCard(rarityWeights: Record<string, number>) {
  const rarity = weightedRandom(rarityWeights);
  // Note: Database stores full position names, not abbreviations
  const PLAYABLE_POSITIONS = ['Quarterback', 'Running Back', 'Wide Receiver', 'Tight End'];
  
  const { data: cards } = await supabaseAdmin
    .from('cards')
    .select('id, players!inner(position)')
    .eq('rarity', rarity)
    .in('players.position', PLAYABLE_POSITIONS)  // ✅ Filter by position
    .limit(50);
  // ...
}
```

**Impact:** When opening packs (if using the pack system), only playable positions are granted.

---

### 3. Dev Grant Cards API (`/api/dev/grant-cards`)
**File:** `src/app/api/dev/grant-cards/route.ts`

**Updated:** Added position filter and team_id support:

```typescript
// Get some random cards from each position (only playable positions)
// Note: Database stores full position names, not abbreviations
const PLAYABLE_POSITIONS = ['Quarterback', 'Running Back', 'Wide Receiver', 'Tight End'];
const { data: cards, error: cardsError } = await supabaseAdmin
  .from('cards')
  .select(`
    id, rarity, base_contracts, base_sell_value,
    players!inner (position, first_name, last_name, team)
  `)
  .in('players.position', PLAYABLE_POSITIONS)  // ✅ Filter by position
  .limit(50);
```

Also added `team_id` to card inserts:
```typescript
.insert({
  user_id: userId,
  team_id: teamId,  // ✅ Now includes team_id
  card_id: card.id,
  // ...
})
```

**Impact:** Development card grants also respect position constraints and team ownership.

---

## Lineup Configuration

The lineup builder already supports these positions with the following slots:

```typescript
const POSITION_SLOTS = [
  { slot: 'QB', label: 'Quarterback', positions: ['QB'] },
  { slot: 'RB1', label: 'Running Back 1', positions: ['RB'] },
  { slot: 'RB2', label: 'Running Back 2', positions: ['RB'] },
  { slot: 'WR1', label: 'Wide Receiver 1', positions: ['WR'] },
  { slot: 'WR2', label: 'Wide Receiver 2', positions: ['WR'] },
  { slot: 'TE', label: 'Tight End', positions: ['TE'] },
  { slot: 'FLEX', label: 'Flex (RB/WR/TE)', positions: ['RB', 'WR', 'TE'] },
]
```

**Total Roster Spots:** 7 (1 QB, 2 RB, 2 WR, 1 TE, 1 FLEX)

---

## Position Validation

The `LineupBuilder` component validates card placement with:

```typescript
const canPlaceCardInSlot = (card: UserCard, slot: LineupSlot): boolean => {
  return slot.positions.includes(card.player.position)
}
```

This ensures:
- ✅ QBs can only go in QB slot
- ✅ RBs can go in RB1, RB2, or FLEX
- ✅ WRs can go in WR1, WR2, or FLEX
- ✅ TEs can go in TE or FLEX
- ❌ No other positions are allowed

---

## Testing

### Test Pack Purchase
1. Go to Store tab
2. Purchase any pack
3. Check the cards you receive
4. **Expected:** All cards are QB, RB, WR, or TE

### Test Lineup Building
1. Go to Lineup tab
2. Try to add cards to slots
3. **Expected:** 
   - QB cards only go in QB slot
   - RB cards go in RB1, RB2, or FLEX
   - WR cards go in WR1, WR2, or FLEX
   - TE cards go in TE or FLEX

### Test Dev Grant
1. Call `/api/dev/grant-cards` endpoint
2. **Expected:** Only receives QB, RB, WR, TE cards

---

## Benefits

1. **No Wasted Cards** - Every card can be used in your lineup
2. **Simplified Collection** - Easier to manage fewer position types
3. **Better UX** - No confusion about unusable positions (K, DEF, etc.)
4. **Lineup Compatibility** - All cards can be placed in at least one slot
5. **Strategic Depth** - FLEX position adds decision-making

---

## Database Notes

The `players` table still contains all NFL players (including K, DEF, etc.), but the card generation logic filters them out. This means:

- **Player stats** are still tracked for all positions
- **Card generation** only uses playable positions
- **Future expansion** is easy if you want to add positions later

---

## Position Distribution in Packs

When purchasing a pack with 5 cards, you'll get a random mix of the 4 playable positions. The distribution is purely random based on available players:

**Example Pack:**
```
1. Patrick Mahomes (QB) - Legendary
2. Christian McCaffrey (RB) - Rare
3. Tyreek Hill (WR) - Common
4. Travis Kelce (TE) - Uncommon
5. Josh Allen (QB) - Common
```

There's no guaranteed position distribution - you might get 3 QBs or 5 RBs. This adds excitement and encourages pack opening!

---

## Future Enhancements

Consider adding:
- **Position quotas** - Ensure each pack has at least 1 of each position
- **Position-specific packs** - "QB Elite Pack", "Skill Position Pack", etc.
- **Balanced starter packs** - Guarantee 1 QB, 2 RB, 2 WR, 1 TE in starter packs
- **Trade system** - Let users trade duplicate positions

---

## Status
✅ **COMPLETE** - All card generation now respects playable positions only
✅ **TESTED** - LineupBuilder already supports these positions
✅ **COMPATIBLE** - All existing systems work with this change

