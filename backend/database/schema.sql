-- =============================================================================
-- Bug Arena — MySQL Schema v2
-- MySQL is the single source of truth for every user-owned entity.
-- Engine: InnoDB, charset utf8mb4. Target: MySQL 8.x / MariaDB 10.6+
-- =============================================================================

CREATE DATABASE IF NOT EXISTS bug_arena
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE bug_arena;

-- -----------------------------------------------------------------------------
-- users — accounts. Bots (is_bot = 1) are server-side competitive opponents.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_id      CHAR(36) NOT NULL,
  username       VARCHAR(20) NOT NULL,
  display_name   VARCHAR(24) NOT NULL,
  password_hash  VARCHAR(255) NOT NULL,
  is_bot         TINYINT(1) NOT NULL DEFAULT 0,
  rating         INT NOT NULL DEFAULT 1000,
  wins           INT UNSIGNED NOT NULL DEFAULT 0,
  losses         INT UNSIGNED NOT NULL DEFAULT 0,
  draws          INT UNSIGNED NOT NULL DEFAULT 0,
  status         ENUM('active','banned','deleted') NOT NULL DEFAULT 'active',
  deleted_at     DATETIME NULL,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_active_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_public_id (public_id),
  UNIQUE KEY uq_users_username (username),
  KEY idx_users_rating (rating DESC),
  KEY idx_users_last_active (last_active_at),
  KEY idx_users_bot_rating (is_bot, rating)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- user_profiles — non-identity profile data (1:1 with users).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id       BIGINT UNSIGNED NOT NULL,
  bio           VARCHAR(280) NOT NULL DEFAULT '',
  country       VARCHAR(48) NOT NULL DEFAULT '',
  preferred_language ENUM('en','fa') NOT NULL DEFAULT 'en',
  theme         ENUM('dark','light') NOT NULL DEFAULT 'dark',
  avatar_color  CHAR(7) NOT NULL DEFAULT '#7cff6b',
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- seasons — competitive seasons. One active season at any moment.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS seasons (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name       VARCHAR(60) NOT NULL,
  starts_at  DATETIME NOT NULL,
  ends_at    DATETIME NOT NULL,
  is_active  TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_seasons_name (name),
  KEY idx_seasons_active (is_active, starts_at)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- challenges — registry of challenge metadata (content lives in the client
-- bundle; this table is authoritative for difficulty, scoring and progress).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS challenges (
  id               INT UNSIGNED NOT NULL,
  slug             VARCHAR(80) NOT NULL,
  title            VARCHAR(160) NOT NULL,
  description      TEXT NOT NULL,
  language         VARCHAR(20) NOT NULL DEFAULT 'Python',
  difficulty       ENUM('Easy','Medium','Hard','Expert') NOT NULL,
  bug_type         VARCHAR(40) NOT NULL DEFAULT 'logic',
  category         VARCHAR(40) NOT NULL DEFAULT 'Logic',
  skills           JSON NOT NULL,
  tags             JSON NOT NULL,
  estimated_minutes INT UNSIGNED NOT NULL DEFAULT 10,
  time_limit       INT UNSIGNED NOT NULL DEFAULT 600,
  base_score       INT UNSIGNED NOT NULL DEFAULT 500,
  hardening_bonus  INT UNSIGNED NOT NULL DEFAULT 250,
  xp_reward        INT UNSIGNED NOT NULL DEFAULT 100,
  version          INT UNSIGNED NOT NULL DEFAULT 1,
  function_name    VARCHAR(100) NOT NULL DEFAULT '',
  starter_code     MEDIUMTEXT NOT NULL,
  expected_behavior TEXT NULL,
  hints            JSON NOT NULL,
  explanation      TEXT NOT NULL,
  evaluation_tests JSON NOT NULL,
  is_active        TINYINT(1) NOT NULL DEFAULT 1,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_challenges_slug (slug),
  KEY idx_challenges_difficulty (difficulty, is_active)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- challenge_tests — canonical test suite per challenge.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS challenge_tests (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  challenge_id  INT UNSIGNED NOT NULL,
  test_index    INT UNSIGNED NOT NULL,
  name          VARCHAR(120) NOT NULL,
  test_type     ENUM('core','hidden') NOT NULL DEFAULT 'core',
  is_hidden     TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_challenge_test (challenge_id, test_index),
  CONSTRAINT fk_tests_challenge FOREIGN KEY (challenge_id) REFERENCES challenges(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- submissions — best submission per (user, challenge), server-scored.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS submissions (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id         BIGINT UNSIGNED NOT NULL,
  challenge_id    INT UNSIGNED NOT NULL,
  challenge_title VARCHAR(160) NOT NULL,
  status          ENUM('accepted','failed') NOT NULL DEFAULT 'accepted',
  score           INT UNSIGNED NOT NULL DEFAULT 0,
  base_score      INT UNSIGNED NOT NULL DEFAULT 0,
  speed_bonus     INT UNSIGNED NOT NULL DEFAULT 0,
  attempt_bonus   INT UNSIGNED NOT NULL DEFAULT 0,
  hardening_bonus INT UNSIGNED NOT NULL DEFAULT 0,
  attempts        INT UNSIGNED NOT NULL DEFAULT 1,
  tests_passed    INT UNSIGNED NOT NULL DEFAULT 0,
  tests_total     INT UNSIGNED NOT NULL DEFAULT 0,
  hardened        TINYINT(1) NOT NULL DEFAULT 0,
  time_left       DECIMAL(10,3) NOT NULL DEFAULT 0,
  solve_seconds   INT UNSIGNED NOT NULL DEFAULT 0,
  code            MEDIUMTEXT NOT NULL,
  submitted_at    DATETIME NOT NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_submission_best (user_id, challenge_id),
  KEY idx_submissions_user_time (user_id, submitted_at),
  KEY idx_submissions_challenge (challenge_id, score DESC),
  CONSTRAINT fk_submissions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_submissions_challenge FOREIGN KEY (challenge_id) REFERENCES challenges(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- replay_sessions / replay_events — full debug session recording.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS replay_sessions (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_id       CHAR(36) NOT NULL,
  user_id         BIGINT UNSIGNED NOT NULL,
  challenge_id    INT UNSIGNED NOT NULL,
  challenge_title VARCHAR(160) NOT NULL,
  difficulty      VARCHAR(32) NOT NULL,
  time_limit      DECIMAL(10,3) NOT NULL DEFAULT 0,
  mode            VARCHAR(32) NOT NULL DEFAULT 'practice',
  opponent_id     VARCHAR(80) NULL,
  status          ENUM('active','completed','abandoned') NOT NULL DEFAULT 'active',
  final_score     INT UNSIGNED NULL,
  attempts        INT UNSIGNED NULL,
  test_runs       INT UNSIGNED NOT NULL DEFAULT 0,
  passed_tests    INT UNSIGNED NOT NULL DEFAULT 0,
  failed_tests    INT UNSIGNED NOT NULL DEFAULT 0,
  hardened        TINYINT(1) NULL,
  code_changes    INT UNSIGNED NOT NULL DEFAULT 0,
  final_code      MEDIUMTEXT NULL,
  started_at      DATETIME NOT NULL,
  finished_at     DATETIME NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_replay_public_id (public_id),
  KEY idx_replay_user_time (user_id, started_at),
  KEY idx_replay_challenge (challenge_id, status),
  CONSTRAINT fk_replay_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_replay_challenge FOREIGN KEY (challenge_id) REFERENCES challenges(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS replay_events (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  replay_session_id BIGINT UNSIGNED NOT NULL,
  event_type        VARCHAR(40) NOT NULL,
  payload           JSON NOT NULL,
  elapsed_ms        INT UNSIGNED NOT NULL DEFAULT 0,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_replay_events_session (replay_session_id, id),
  CONSTRAINT fk_replay_events_session FOREIGN KEY (replay_session_id) REFERENCES replay_sessions(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- competitive_matches — one row per played match, Elo applied server-side.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS competitive_matches (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_id      CHAR(36) NOT NULL,
  user_id        BIGINT UNSIGNED NOT NULL,
  season_id      INT UNSIGNED NULL,
  mode           ENUM('ranked','blitz','survival') NOT NULL DEFAULT 'ranked',
  opponent_id    BIGINT UNSIGNED NULL,
  opponent_name  VARCHAR(24) NOT NULL DEFAULT '',
  opponent_score INT UNSIGNED NOT NULL DEFAULT 0,
  challenge_id   INT UNSIGNED NOT NULL,
  result         ENUM('win','loss','draw') NOT NULL,
  solved         TINYINT(1) NOT NULL DEFAULT 0,
  rating_before  INT NOT NULL,
  rating_delta   INT NOT NULL,
  rating_after   INT NOT NULL,
  player_score   INT UNSIGNED NOT NULL DEFAULT 0,
  duration_ms    INT UNSIGNED NOT NULL DEFAULT 0,
  played_at      DATETIME NOT NULL,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_match_public_id (public_id),
  KEY idx_matches_user_time (user_id, played_at),
  KEY idx_matches_season (season_id, played_at),
  KEY idx_matches_mode (user_id, mode),
  CONSTRAINT fk_matches_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_matches_season FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE SET NULL,
  CONSTRAINT fk_matches_opponent FOREIGN KEY (opponent_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_matches_challenge FOREIGN KEY (challenge_id) REFERENCES challenges(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- competitive_players — matchmaking pool configuration (rows reference bot
-- users created by the seeder).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS competitive_players (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     BIGINT UNSIGNED NOT NULL,
  handle      VARCHAR(40) NOT NULL,
  tier        ENUM('rookie','contender','veteran','elite','master') NOT NULL DEFAULT 'rookie',
  skill       DECIMAL(4,3) NOT NULL DEFAULT 0.800,
  baseline    INT UNSIGNED NOT NULL DEFAULT 300,
  is_active   TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY uq_competitive_handle (handle),
  KEY idx_competitive_tier (tier, is_active),
  CONSTRAINT fk_competitive_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- ratings — rating history snapshots (one per match, per user).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ratings (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    BIGINT UNSIGNED NOT NULL,
  season_id  INT UNSIGNED NULL,
  match_id   BIGINT UNSIGNED NULL,
  rating     INT NOT NULL,
  delta      INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ratings_user_time (user_id, created_at),
  CONSTRAINT fk_ratings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_ratings_season FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE SET NULL,
  CONSTRAINT fk_ratings_match FOREIGN KEY (match_id) REFERENCES competitive_matches(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- achievements (definitions) + user_achievements (unlocks).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS achievements (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  achievement_key VARCHAR(80) NOT NULL,
  title        VARCHAR(120) NOT NULL,
  description  VARCHAR(280) NOT NULL,
  icon         VARCHAR(24) NOT NULL DEFAULT 'medal',
  category     ENUM('progress','skill','competitive','streak','mastery') NOT NULL DEFAULT 'progress',
  metric       VARCHAR(40) NOT NULL,
  target       INT UNSIGNED NOT NULL DEFAULT 1,
  xp_reward    INT UNSIGNED NOT NULL DEFAULT 0,
  sort_order   INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_achievement_key (achievement_key)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS user_achievements (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id         BIGINT UNSIGNED NOT NULL,
  achievement_key VARCHAR(80) NOT NULL,
  unlocked_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_achievement (user_id, achievement_key),
  KEY idx_user_achievements_time (user_id, unlocked_at),
  CONSTRAINT fk_user_achievements_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_achievements_definition FOREIGN KEY (achievement_key) REFERENCES achievements(achievement_key) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- player_statistics — server-computed progression snapshot per user.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS player_statistics (
  user_id              BIGINT UNSIGNED NOT NULL,
  total_score          INT UNSIGNED NOT NULL DEFAULT 0,
  xp                   INT UNSIGNED NOT NULL DEFAULT 0,
  level                INT UNSIGNED NOT NULL DEFAULT 1,
  solved_challenges    INT UNSIGNED NOT NULL DEFAULT 0,
  total_submissions    INT UNSIGNED NOT NULL DEFAULT 0,
  accepted_submissions INT UNSIGNED NOT NULL DEFAULT 0,
  best_score           INT UNSIGNED NOT NULL DEFAULT 0,
  current_streak       INT UNSIGNED NOT NULL DEFAULT 0,
  best_streak          INT UNSIGNED NOT NULL DEFAULT 0,
  avg_solve_seconds    INT UNSIGNED NOT NULL DEFAULT 0,
  duel_points          INT NOT NULL DEFAULT 0,
  total_solve_seconds  INT UNSIGNED NOT NULL DEFAULT 0,
  updated_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  KEY idx_stats_xp (xp DESC),
  KEY idx_stats_score (total_score DESC),
  CONSTRAINT fk_stats_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- arena_events — raw activity stream.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS arena_events (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    BIGINT UNSIGNED NULL,
  event_type VARCHAR(60) NOT NULL,
  payload    JSON NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_events_user_time (user_id, created_at),
  KEY idx_events_type_time (event_type, created_at),
  CONSTRAINT fk_events_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- sync_actions — offline sync queue mirror (dedupe + audit on the server).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sync_actions (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_id   CHAR(36) NOT NULL,
  user_id     BIGINT UNSIGNED NOT NULL,
  action_type VARCHAR(60) NOT NULL,
  payload     JSON NOT NULL,
  status      ENUM('pending','processing','synced','failed') NOT NULL DEFAULT 'pending',
  attempts    INT UNSIGNED NOT NULL DEFAULT 0,
  last_error  VARCHAR(500) NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sync_public_id (public_id),
  KEY idx_sync_user_status (user_id, status, created_at),
  CONSTRAINT fk_sync_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- sessions — server-side PHP session storage (custom session handler).
-- Enables real session expiration, revocation and per-device audit.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
  id             CHAR(64) NOT NULL,
  user_id        BIGINT UNSIGNED NULL,
  ip_address     VARCHAR(45) NOT NULL DEFAULT '',
  user_agent     VARCHAR(255) NOT NULL DEFAULT '',
  payload        MEDIUMTEXT NOT NULL,
  last_activity  INT UNSIGNED NOT NULL,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_sessions_user (user_id),
  KEY idx_sessions_activity (last_activity)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- rate_limits — sliding-window rate limiter storage.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rate_limits (
  bucket       CHAR(64) NOT NULL,
  window_start INT UNSIGNED NOT NULL,
  hits         INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket, window_start)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- duel_matches — human vs human 1v1 duels. Lifecycle: pending (host waiting)
-- -> active (guest accepted, challenge picked) -> finished | cancelled | expired.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS duel_matches (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_id     CHAR(36) NOT NULL,
  host_id       BIGINT UNSIGNED NOT NULL,
  guest_id      BIGINT UNSIGNED NULL,
  challenge_id  INT UNSIGNED NULL,
  difficulty    VARCHAR(10) NOT NULL DEFAULT 'any',
  bug_type      VARCHAR(40) NOT NULL DEFAULT 'any',
  status        ENUM('pending','active','finished','cancelled','expired') NOT NULL DEFAULT 'pending',
  host_result   JSON NULL,
  guest_result  JSON NULL,
  winner_id     BIGINT UNSIGNED NULL,
  is_draw       TINYINT(1) NOT NULL DEFAULT 0,
  host_points   INT NOT NULL DEFAULT 0,
  guest_points  INT NOT NULL DEFAULT 0,
  season_id     INT UNSIGNED NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  started_at    DATETIME NULL,
  finished_at   DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_duel_public_id (public_id),
  KEY idx_duel_host (host_id, status),
  KEY idx_duel_guest (guest_id, status),
  CONSTRAINT fk_duel_host FOREIGN KEY (host_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_duel_guest FOREIGN KEY (guest_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_duel_challenge FOREIGN KEY (challenge_id) REFERENCES challenges(id) ON DELETE SET NULL,
  CONSTRAINT fk_duel_season FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- duel_invitations — fan-out invites to every online user; the first accept
-- wins the seat, all sibling invites expire atomically.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS duel_invitations (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_id    CHAR(36) NOT NULL,
  match_id     BIGINT UNSIGNED NOT NULL,
  from_user_id BIGINT UNSIGNED NOT NULL,
  to_user_id   BIGINT UNSIGNED NOT NULL,
  status       ENUM('sent','accepted','declined','expired','cancelled') NOT NULL DEFAULT 'sent',
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at   DATETIME NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_duel_inv_public (public_id),
  KEY idx_duel_inv_to (to_user_id, status, expires_at),
  KEY idx_duel_inv_match (match_id),
  CONSTRAINT fk_duel_inv_match FOREIGN KEY (match_id) REFERENCES duel_matches(id) ON DELETE CASCADE,
  CONSTRAINT fk_duel_inv_from FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_duel_inv_to FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =============================================================================
-- SEED DATA
-- =============================================================================

-- Current season (extended window; a cron/rollforward can close it later).
INSERT INTO seasons (name, starts_at, ends_at, is_active)
SELECT 'Season 1 — Genesis', '2026-01-01 00:00:00', '2026-12-31 23:59:59', 1
WHERE NOT EXISTS (SELECT 1 FROM seasons);

-- Achievement definitions (unlocked server-side from real statistics).
INSERT INTO achievements (achievement_key, title, description, icon, category, metric, target, xp_reward, sort_order)
SELECT * FROM (
  SELECT 'first_blood'   AS achievement_key, 'First Blood'   AS title, 'Solve your first challenge.'        AS description, 'zap'      AS icon, 'progress'    AS category, 'accepted_submissions' AS metric, 1  AS target, 50  AS xp_reward, 1  AS sort_order UNION ALL
  SELECT 'five_solved',         'Bug Hunter',      'Solve 5 challenges.',                            'target',   'progress',    'accepted_submissions', 5,   100, 2 UNION ALL
  SELECT 'ten_solved',          'Exterminator',    'Solve 10 challenges.',                           'crosshair','progress',    'accepted_submissions', 10,  250, 3 UNION ALL
  SELECT 'twenty_solved',       'Arena Veteran',   'Solve 20 challenges.',                           'shield',   'progress',    'accepted_submissions', 20,  500, 4 UNION ALL
  SELECT 'flawless',            'Flawless',        'Solve a challenge on the first attempt.',        'star',     'skill',       'first_try_solves',     1,   100, 5 UNION ALL
  SELECT 'hardener',            'Hardener',        'Harden 5 solved challenges.',                    'lock',     'skill',       'hardened_count',       5,   150, 6 UNION ALL
  SELECT 'speed_demon',         'Speed Demon',     'Finish a solve with over 80% time remaining.',   'timer',    'skill',       'fast_solves',          1,   100, 7 UNION ALL
  SELECT 'streak_3',            'On Fire',         'Reach a 3-day activity streak.',                 'flame',    'streak',      'best_streak',          3,   100, 8 UNION ALL
  SELECT 'streak_7',            'Unstoppable',     'Reach a 7-day activity streak.',                 'flame',    'streak',      'best_streak',          7,   300, 9 UNION ALL
  SELECT 'first_win',           'First Victory',   'Win your first competitive match.',              'trophy',   'competitive', 'wins',                 1,   100, 10 UNION ALL
  SELECT 'wins_10',             'Contender',       'Win 10 competitive matches.',                    'medal',    'competitive', 'wins',                 10,  250, 11 UNION ALL
  SELECT 'rating_1100',         'Rising Star',     'Reach a rating of 1100.',                        'trending', 'competitive', 'rating',               1100,150, 12 UNION ALL
  SELECT 'rating_1300',         'Elite',           'Reach a rating of 1300.',                        'crown',    'competitive', 'rating',               1300,400, 13 UNION ALL
  SELECT 'level_5',             'Seasoned',        'Reach level 5.',                                 'arrow-up', 'mastery',     'level',                5,   150, 14 UNION ALL
  SELECT 'level_10',            'Master',          'Reach level 10.',                                'crown',    'mastery',     'level',                10,  500, 15
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM achievements);

-- Competitive opponents (server-side bots). These are real user rows with
-- is_bot = 1 so Elo, history and leaderboard math stay uniform.
INSERT INTO users (public_id, username, display_name, password_hash, is_bot, rating)
SELECT * FROM (
  SELECT UUID() AS public_id, 'shadow'     AS username, 'Shadow'     AS display_name, '' AS password_hash, 1 AS is_bot, 1180 AS rating UNION ALL
  SELECT UUID(), 'codehunter',  'CodeHunter',  '', 1, 1105 UNION ALL
  SELECT UUID(), 'bugslayer',   'BugSlayer',   '', 1, 1040 UNION ALL
  SELECT UUID(), 'nullpointer', 'NullPointer', '', 1,  975 UNION ALL
  SELECT UUID(), 'bytemaster',  'ByteMaster',  '', 1,  910 UNION ALL
  SELECT UUID(), 'debugger',    'Debugger',    '', 1,  845
) AS bots
WHERE NOT EXISTS (SELECT 1 FROM users WHERE is_bot = 1);

INSERT INTO competitive_players (user_id, handle, tier, skill, baseline)
SELECT u.id, u.username,
       CASE u.username
         WHEN 'shadow' THEN 'master'
         WHEN 'codehunter' THEN 'elite'
         WHEN 'bugslayer' THEN 'veteran'
         WHEN 'nullpointer' THEN 'contender'
         WHEN 'bytemaster' THEN 'contender'
         ELSE 'rookie' END,
       CASE u.username
         WHEN 'shadow' THEN 1.050
         WHEN 'codehunter' THEN 0.980
         WHEN 'bugslayer' THEN 0.920
         WHEN 'nullpointer' THEN 0.860
         WHEN 'bytemaster' THEN 0.810
         ELSE 0.760 END,
       CASE u.username
         WHEN 'shadow' THEN 620
         WHEN 'codehunter' THEN 560
         WHEN 'bugslayer' THEN 500
         WHEN 'nullpointer' THEN 440
         WHEN 'bytemaster' THEN 390
         ELSE 330 END
FROM users u
WHERE u.is_bot = 1
  AND NOT EXISTS (SELECT 1 FROM competitive_players cp WHERE cp.user_id = u.id);
