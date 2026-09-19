-- Bug Arena schema v4: human vs human 1v1 duel mode.
USE bug_arena;

-- duel_matches — one head-to-head duel between two authenticated humans.
-- Lifecycle: pending (host waiting) -> active (guest accepted, challenge
-- picked, editor running) -> finished | cancelled | expired.
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

-- duel_invitations — fan-out invites to every online user; the first accept
-- wins the seat, all sibling invites expire atomically.
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

-- Duel earnings are kept out of the submissions-derived total_score so the
-- authoritative recomputation in StatisticsService never wipes them.
-- (Conditional: MySQL 8 has no ADD COLUMN IF NOT EXISTS.)
SET @duel_points_missing := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'player_statistics' AND COLUMN_NAME = 'duel_points'
);
SET @add_duel_points := IF(
  @duel_points_missing = 0,
  'ALTER TABLE player_statistics ADD COLUMN duel_points INT NOT NULL DEFAULT 0 AFTER avg_solve_seconds',
  'SELECT 1'
);
PREPARE add_duel_points_stmt FROM @add_duel_points;
EXECUTE add_duel_points_stmt;
DEALLOCATE PREPARE add_duel_points_stmt;
