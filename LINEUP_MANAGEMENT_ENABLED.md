# Lineup Management - Enabled! 🏈

## Overview
Users can now add cards from their collection to their starting lineup! The lineup auto-saves to the database and persists across sessions.

## Features Implemented

### 1. **Drag & Drop Lineup Building** ✨
- Add cards to lineup slots by dragging or clicking
- Position validation ensures cards only go in valid slots:
  - QB → QB slot only
  - RB → RB1, RB2, or FLEX
  - WR → WR1, WR2, or FLEX
  - TE → TE or FLEX
- Real-time position filtering

### 2. **Auto-Save to Database** 💾
Every lineup change is automatically saved:
```typescript
// When user adds/removes a card
handleLineupSlotChange(slotId, userCard)
  ↓
// Updates local state (instant feedback)
setLineupSlots(...)
  ↓
// Saves to database via API
POST /api/lineup/submit
  ↓
// Shows success/error message
"✅ Added Patrick Mahomes to QB"
```

### 3. **Persistent Lineups** 🔄
- Lineups load from database on page load
- Cards remain in slots across sessions
- Week-specific lineups (each week has own lineup)

### 4. **Position Name Mapping** 🔤
Database stores full names, UI uses abbreviations:
```typescript
positionToAbbr({
  'Quarterback' → 'QB'
  'Running Back' → 'RB'
  'Wide Receiver' → 'WR'
  'Tight End' → 'TE'
})
```

---

## How It Works

### Lineup Structure
```
┌─────────────────────────────────────┐
│  STARTING LINEUP (7 slots)          │
├─────────────────────────────────────┤
│  QB   - 1 Quarterback               │
│  RB1  - Running Back 1              │
│  RB2  - Running Back 2              │
│  WR1  - Wide Receiver 1             │
│  WR2  - Wide Receiver 2             │
│  TE   - Tight End                   │
│  FLEX - RB/WR/TE (your choice!)     │
└─────────────────────────────────────┘
```

### Adding a Card
**Option 1: Click Method**
1. Click on an empty lineup slot
2. Slot highlights and filters show only valid positions
3. Click a card from your collection
4. Card is added and saved automatically

**Option 2: Drag & Drop**
1. Drag a card from your collection
2. Drop it on a valid lineup slot
3. Card is added and saved automatically

### Removing a Card
1. Click the "×" button on a card in your lineup
2. Card is removed and returned to collection
3. Change is saved automatically

---

## API Updates

### Updated Endpoint: `/api/lineup/submit`
**What Changed:**
```typescript
// BEFORE - Only generic positions
slot: z.enum(['QB', 'RB', 'WR', 'TE', 'FLEX', 'BENCH'])

// AFTER - Specific position slots
slot: z.enum(['QB', 'RB1', 'RB2', 'WR1', 'WR2', 'TE', 'FLEX', 'BENCH'])
```

**Request Format:**
```json
{
  "weekId": "week-uuid",
  "slots": [
    {
      "slot": "QB",
      "user_card_id": "card-uuid",
      "applied_token_id": null
    },
    {
      "slot": "RB1",
      "user_card_id": "card-uuid",
      "applied_token_id": null
    }
    // ... all 7 slots
  ]
}
```

**Response:**
```json
{
  "ok": true,
  "lineup_id": "lineup-uuid",
  "message": "Lineup submitted for Week 1!",
  "validation": {
    "valid": true,
    "filled_slots": 7,
    "total_slots": 7
  }
}
```

---

## Database Schema

### Tables Involved

**lineups** - Main lineup record
```sql
id: uuid
team_id: uuid (FK to user_teams)
week_id: uuid (FK to weeks)
status: enum ('draft', 'submitted', 'locked', 'scored')
total_points: float
submitted_at: timestamp
created_at: timestamp
updated_at: timestamp
```

**lineup_slots** - Individual slot assignments
```sql
id: uuid
lineup_id: uuid (FK to lineups)
slot: varchar ('QB', 'RB1', 'RB2', 'WR1', 'WR2', 'TE', 'FLEX')
user_card_id: uuid (FK to user_cards) - nullable
applied_token_id: uuid (FK to user_tokens) - nullable
created_at: timestamp
updated_at: timestamp
```

**Database Function Used:**
- `submit_lineup_txn()` - Atomic transaction for lineup submission
  - Creates/updates lineup record
  - Upserts all lineup slots
  - Validates position eligibility
  - Returns success/validation results

---

## User Experience Flow

### First Time Setup
1. User purchases packs → gets cards
2. Cards appear in "Collection" tab
3. User switches to "Lineup" tab
4. Sees 7 empty slots + "Available Cards" section below
5. Adds cards to slots
6. Each add auto-saves with success message

### Returning User
1. User opens dashboard → "Lineup" tab
2. Previously saved lineup loads automatically
3. Cards appear in their assigned slots
4. User can modify as needed
5. Changes auto-save

---

## Code Changes

### 1. Dashboard Component (`/dashboard/[teamId]/page.tsx`)

**Added Helper Function:**
```typescript
const positionToAbbr = (position: string): string => {
  const mapping: Record<string, string> = {
    'Quarterback': 'QB',
    'Running Back': 'RB',
    'Wide Receiver': 'WR',
    'Tight End': 'TE'
  }
  return mapping[position] || position
}
```

**Updated loadTeamLineup:**
- Now fetches existing lineup from database
- Loads cards already in slots
- Transforms position names to abbreviations

**Updated handleLineupSlotChange:**
- Updates local state (instant feedback)
- Saves to database via API call
- Shows success/error messages
- Reloads lineup on error (rollback)

**Updated loadTeamCards:**
- Converts position names to abbreviations
- Ensures compatibility with LineupBuilder

---

## Testing

### Test 1: Add Card to Lineup
1. Go to "Lineup" tab
2. Click on "QB" slot
3. Click a QB card from your collection
4. **Expected:**
   - Card appears in QB slot
   - "✅ Added [Player Name] to QB" message
   - Card no longer highlighted in available cards
   - Refresh page → card still in lineup

### Test 2: Position Validation
1. Try to add a RB card to the QB slot
2. **Expected:**
   - System prevents it (drag & drop won't work)
   - Only QBs are highlighted when QB slot is selected

### Test 3: FLEX Slot
1. Add a RB to FLEX slot
2. Remove it and add a WR
3. Remove it and add a TE
4. **Expected:**
   - All three work (FLEX accepts RB/WR/TE)
   - Each saves correctly
   - Refresh preserves last choice

### Test 4: Remove Card
1. Click × on a card in your lineup
2. **Expected:**
   - Card is removed from slot
   - "✅ Removed player from [slot]" message
   - Card reappears in available cards
   - Refresh page → card is gone from lineup

### Test 5: Persistence
1. Build a complete lineup (all 7 slots)
2. Refresh the page
3. **Expected:**
   - All 7 cards reload in correct slots
   - No data loss

---

## Error Handling

### Scenarios Covered

**No Week Available:**
- Shows message: "No current or upcoming week found"
- Lineup tab disabled

**Not Authenticated:**
- Redirects to auth page
- No lineup operations allowed

**Save Failure:**
- Shows error message
- Reloads lineup from database (rollback)
- User can try again

**Position Mismatch:**
- Client-side validation prevents
- Server-side validation as backup

---

## Future Enhancements

### Coming Soon
1. **Lineup Submission** - Lock in lineup before week starts
2. **Projected Points** - Show total projected score
3. **Optimal Lineup** - Auto-suggest best lineup
4. **Lineup History** - View past weeks' lineups
5. **Lineup Comparison** - Compare with other users
6. **Token Application** - Apply power-up tokens to slots

### Nice to Have
- Lineup templates (save/load)
- Multiple lineup drafts
- Undo/redo lineup changes
- Copy lineup from previous week
- Share lineup with friends

---

## Status
✅ **COMPLETE** - Users can now build and save lineups!
✅ **TESTED** - Position validation working
✅ **PERSISTENT** - Auto-save functional
✅ **READY** - Available in production

**Next Step:** Weekly lineup submission & scoring! 🏆

