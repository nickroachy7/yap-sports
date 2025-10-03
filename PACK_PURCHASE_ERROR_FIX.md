# Pack Purchase Error Fix

## Issue
Error when purchasing packs from the store:
```
Error: Invalid request: null value in column "user_id" of relation "user_cards" violates not-null constraint
```

## Root Causes Found & Fixed

### 0. **CRITICAL: Missing `user_id` in Database Insert** ⚠️
**File:** `src/app/api/teams/purchase-pack/route.ts` (Line 148)

**Problem:** The API was not including `user_id` when inserting cards into the `user_cards` table, causing a database constraint violation.

**Fix:** Added `user_id` to the insert:
```typescript
// BEFORE (broken)
const userCards = grantedCards.map(card => ({
  team_id: teamId,  // ❌ Missing user_id
  card_id: card.id,
  // ...
}));

// AFTER (fixed)
const userCards = grantedCards.map(card => ({
  user_id: userId,  // ✅ Added user_id
  team_id: teamId,
  card_id: card.id,
  // ...
}));
```

**Also Fixed:** Updated `UserCard` interface in `src/types/api.ts` to include `user_id` field.

---

### 1. Missing `loadData()` Function
**File:** `src/app/dashboard/[teamId]/page.tsx` (Line 607)

**Problem:** The code called a non-existent `loadData()` function after purchasing a pack.

**Fix:** Replaced with proper data loading calls:
```typescript
// BEFORE (broken)
await loadData()

// AFTER (fixed)
if (user?.id) {
  await Promise.all([
    loadTeamCards(user.id, teamId),
    loadUserPacks()
  ])
}
```

### 2. Insufficient Error Details
**File:** `src/app/dashboard/[teamId]/page.tsx`

**Problem:** Generic error messages didn't show validation details from the API.

**Fix:** Enhanced error handling to show detailed validation errors:
```typescript
const errorMsg = result.details 
  ? `${result.error}: ${result.details}` 
  : result.error || 'Failed to purchase pack'
throw new Error(errorMsg)
```

### 3. Missing Input Validation
**File:** `src/app/dashboard/[teamId]/page.tsx`

**Problem:** No client-side validation before making API calls.

**Fix:** Added validation checks:
```typescript
// Validate inputs before making API call
if (!packId) {
  throw new Error('Pack ID is missing')
}
if (!currentTeam.id) {
  throw new Error('Team ID is missing')
}
```

### 4. Missing Pack ID Filter
**File:** `src/app/dashboard/[teamId]/page.tsx` (Line 1079)

**Problem:** Packs without valid IDs could be rendered.

**Fix:** Added ID check to pack filter:
```typescript
// BEFORE
availablePacks.filter(pack => pack && pack.name)

// AFTER
availablePacks.filter(pack => pack && pack.name && pack.id)
```

### 5. Enhanced Debugging
**File:** `src/app/dashboard/[teamId]/page.tsx`

**Added:** Console logging for debugging:
```typescript
console.log('Purchasing pack:', { packId, teamId: currentTeam.id, idempotencyKey })
console.log('Purchase response:', result)
```

## API Validation Requirements
The `/api/teams/purchase-pack` endpoint requires:
- `packId`: Must be a valid UUID string
- `teamId`: Must be a valid UUID string
- `idempotencyKey`: Must be a string with at least 10 characters

## Testing Steps

1. **Clear browser cache and reload**
   ```bash
   # In browser DevTools Console
   localStorage.clear()
   sessionStorage.clear()
   ```

2. **Open browser console** (F12 or Cmd+Option+I)

3. **Navigate to team dashboard** → Store tab

4. **Click "Purchase" on any pack**

5. **Check console for logs:**
   - Look for: `Purchasing pack: { packId, teamId, idempotencyKey }`
   - Look for: `Purchase response: { ... }`
   - If error occurs, you'll see detailed validation info

## Expected Behavior
- ✅ Pack purchase should succeed
- ✅ Cards should be added to inventory
- ✅ Team coins should be deducted
- ✅ Success message should display
- ✅ Collection tab should show new cards

## Debugging Next Steps

If the error persists after these fixes:

1. **Check the console logs** for the exact packId and teamId values
2. **Verify pack IDs** are UUIDs:
   ```sql
   SELECT id, name, price_coins FROM packs WHERE enabled = true;
   ```
3. **Verify team ID** is a UUID:
   ```sql
   SELECT id, name, coins FROM user_teams WHERE active = true;
   ```
4. **Check API logs** on the server side (look for the detailed error logging in the purchase-pack route)

## Related Documentation
- See `PACK_AUTO_GRANT_BUG_FIX.md` for previous similar issue
- See `PACK_AUTO_GRANT_IMPLEMENTED.md` for pack system overview

## Additional Updates

### 6. Position Filtering for Playable Cards
**Files:** 
- `src/app/api/teams/purchase-pack/route.ts`
- `src/app/api/packs/open/route.ts`
- `src/app/api/dev/grant-cards/route.ts`

**Added:** Filtering to only grant cards for playable positions (QB, RB, WR, TE):
```typescript
const PLAYABLE_POSITIONS = ['QB', 'RB', 'WR', 'TE'];

// In player queries
.in('position', PLAYABLE_POSITIONS)

// In card queries
.in('players.position', PLAYABLE_POSITIONS)
```

**Benefit:** All cards can now be placed in the starting lineup. No more kickers, defense, or other non-fantasy positions.

See `PLAYABLE_POSITIONS_ONLY.md` for full details.

---

## Status
✅ **FIXED** - Client-side validation and error handling improved
✅ **FIXED** - Missing `user_id` field added to card inserts
✅ **IMPROVED** - Only playable positions (QB, RB, WR, TE) are granted
🔍 **MONITORING** - Enhanced logging added for debugging

The error should now be completely resolved. All cards from packs will be QB, RB, WR, or TE and can be added to your lineup!

