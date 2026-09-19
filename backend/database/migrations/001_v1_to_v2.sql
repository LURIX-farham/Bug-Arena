-- =============================================================================
-- One-shot migration: Bug Arena schema v1 -> v2 (MySQL 8.x)
-- Run ONCE on an existing v1 database. For fresh installs use
-- schema.sql + seed_challenges.sql instead.
-- =============================================================================

USE bug_arena;

-- users: bots, status, soft-delete, updated_at
ALTER TABLE users
  ADD COLUMN is_bot TINYINT(1) NOT NULL DEFAULT 0 AFTER password_hash,
  ADD COLUMN status ENUM('active','banned','deleted') NOT NULL DEFAULT 'active' AFTER draws,
  ADD COLUMN deleted_at DATETIME NULL AFTER status,
  ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER created_at;

-- submissions: server-scored columns
ALTER TABLE submissions
  ADD COLUMN status ENUM('accepted','failed') NOT NULL DEFAULT 'accepted' AFTER challenge_title,
  ADD COLUMN tests_passed INT UNSIGNED NOT NULL DEFAULT 0 AFTER attempts,
  ADD COLUMN tests_total INT UNSIGNED NOT NULL DEFAULT 0 AFTER tests_passed,
  ADD COLUMN solve_seconds INT UNSIGNED NOT NULL DEFAULT 0 AFTER time_left,
  ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER created_at;

-- replay_sessions: richer recording
ALTER TABLE replay_sessions
  ADD COLUMN test_runs INT UNSIGNED NOT NULL DEFAULT 0 AFTER attempts,
  ADD COLUMN passed_tests INT UNSIGNED NOT NULL DEFAULT 0 AFTER test_runs,
  ADD COLUMN failed_tests INT UNSIGNED NOT NULL DEFAULT 0 AFTER passed_tests,
  ADD COLUMN code_changes INT UNSIGNED NOT NULL DEFAULT 0 AFTER failed_tests;

-- competitive_matches: season + opponent snapshot
ALTER TABLE competitive_matches
  ADD COLUMN season_id INT UNSIGNED NULL AFTER user_id,
  ADD COLUMN opponent_name VARCHAR(24) NOT NULL DEFAULT '' AFTER opponent_id,
  ADD COLUMN opponent_score INT UNSIGNED NOT NULL DEFAULT 0 AFTER opponent_name,
  ADD COLUMN solved TINYINT(1) NOT NULL DEFAULT 0 AFTER result;

-- v1 kept user unlocks in `achievements`; v2 renames it and adds definitions.
RENAME TABLE achievements TO user_achievements;

-- Apply the v2 base schema (creates every new table + seeds).
SOURCE schema.sql;
SOURCE seed_challenges.sql;
