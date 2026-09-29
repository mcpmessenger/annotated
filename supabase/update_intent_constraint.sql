-- Migration: Update intent check constraint to Jason's tag vocabulary (lowercase)
-- Run this in: https://supabase.com/dashboard/project/dajadbvlldrmgzztdksn/sql/new

-- Step 1: Drop the old constraint
ALTER TABLE annotations
  DROP CONSTRAINT IF EXISTS annotations_intent_check;

-- Step 2: Migrate any existing rows that used old values to new equivalents
UPDATE annotations SET intent = 'hot take'   WHERE intent IN ('Hot Take', '🔥');
UPDATE annotations SET intent = 'fact check' WHERE intent IN ('Fact Check', '⚡', 'fact_check', '💯');
UPDATE annotations SET intent = 'steelman'   WHERE intent IN ('Steelmanning', '🤔', '💡');
UPDATE annotations SET intent = 'receipts'   WHERE intent IN ('Receipts', '👎');
UPDATE annotations SET intent = 'explainer'  WHERE intent IN ('Explainer');

-- Step 3: Add new constraint with Jason's vocabulary (also allow NULL for old annotations)
ALTER TABLE annotations
  ADD CONSTRAINT annotations_intent_check
  CHECK (
    intent IS NULL OR
    intent IN ('hot take', 'fact check', 'steelman', 'receipts', 'explainer')
  );
