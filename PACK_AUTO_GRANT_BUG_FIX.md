# 🐛 Pack Auto-Grant Bug Fix

## Issue
When purchasing a pack, the system threw an error:
```
Error: Invalid request
```

## Root Cause
The `user_cards` table in the database uses the column name `team_id`, but the API was trying to insert records with the field name `user_team_id`.

## Files Fixed

### 1. `/src/app/api/teams/purchase-pack/route.ts`
**Changed:**
```typescript
// BEFORE (incorrect)
const userCards = grantedCards.map(card => ({
  user_team_id: teamId,  // ❌ Wrong column name
  card_id: card.id,
  // ...
}));

// AFTER (correct)
const userCards = grantedCards.map(card => ({
  team_id: teamId,  // ✅ Correct column name
  card_id: card.id,
  // ...
}));
```

### 2. `/src/types/api.ts`
Updated type definitions to match actual database schema:

**UserCard Interface:**
```typescript
export interface UserCard {
  id: string;
  team_id: string;  // Changed from user_team_id
  card_id: string;
  // ...
}
```

**UserPack Interface:**
```typescript
export interface UserPack {
  id: string;
  team_id: string;  // Changed from user_team_id
  pack_id: string;
  // ...
}
```

**Lineup Interface:**
```typescript
export interface Lineup {
  id: string;
  team_id: string;  // Changed from user_team_id
  week_id: string;
  // ...
}
```

**UserToken Interface:**
```typescript
export interface UserToken {
  id: string;
  team_id: string;  // Changed from user_team_id
  token_type_id: string;
  // ...
}
```

## Database Schema
The correct column name across all tables is `team_id`:
- ✅ `user_cards.team_id`
- ✅ `user_packs.team_id`
- ✅ `lineups.team_id`
- ✅ `user_tokens.team_id`

## Testing
1. Navigate to team dashboard
2. Go to "Store" tab
3. Click "Purchase" on a pack
4. ✅ Pack purchase should succeed
5. ✅ 5 random cards should be added to inventory
6. ✅ Success message displays received cards
7. ✅ Collection tab shows new cards

## Additional Improvements
Added enhanced error logging to help debug future issues:
```typescript
catch (err: any) {
  console.error('Pack purchase API Error:', err);
  console.error('Error stack:', err.stack);
  return NextResponse.json({ 
    error: 'Invalid request', 
    details: err.message || String(err),
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  }, { status: 400 });
}
```

## Status
✅ **FIXED** - Pack purchases now work correctly and grant random cards to the team's inventory.

