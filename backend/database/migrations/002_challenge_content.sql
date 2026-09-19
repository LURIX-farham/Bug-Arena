-- Bug Arena schema v3: database-authoritative challenge content.
USE bug_arena;

ALTER TABLE challenges
  ADD COLUMN IF NOT EXISTS description TEXT NOT NULL AFTER title,
  ADD COLUMN IF NOT EXISTS language VARCHAR(20) NOT NULL DEFAULT 'Python' AFTER description,
  ADD COLUMN IF NOT EXISTS function_name VARCHAR(100) NOT NULL DEFAULT '' AFTER version,
  ADD COLUMN IF NOT EXISTS starter_code MEDIUMTEXT NOT NULL AFTER function_name,
  ADD COLUMN IF NOT EXISTS expected_behavior TEXT NULL AFTER starter_code,
  ADD COLUMN IF NOT EXISTS hints JSON NOT NULL AFTER expected_behavior,
  ADD COLUMN IF NOT EXISTS explanation TEXT NOT NULL AFTER hints,
  ADD COLUMN IF NOT EXISTS evaluation_tests JSON NOT NULL AFTER explanation;

UPDATE challenges
SET language = 'Python'
WHERE language IS NULL OR language = '';

-- Existing rows created by v2 may not have content. They remain valid metadata rows,
-- while the client can continue using its immutable local challenge bundle until
-- an administrator publishes full content through the seed/import pipeline.
