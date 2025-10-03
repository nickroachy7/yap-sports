-- Fix lineup_slots unique constraint
-- This allows multiple cards in the same position type (e.g., RB1 and RB2 both save as 'RB')

-- 1. Drop the existing unique constraint
ALTER TABLE lineup_slots 
DROP CONSTRAINT IF EXISTS lineup_slots_lineup_id_slot_key;

-- 2. Optionally: Add a position_order column to track slot order (for future enhancement)
-- ALTER TABLE lineup_slots ADD COLUMN IF NOT EXISTS position_order INTEGER;

-- 3. Verify the constraint is removed
SELECT 
    conname as constraint_name,
    contype as constraint_type
FROM pg_constraint 
WHERE conrelid = 'lineup_slots'::regclass 
    AND conname LIKE '%slot%';

-- Expected: No results (constraint should be gone)

