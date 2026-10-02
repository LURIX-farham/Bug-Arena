-- =============================================================================
-- Bug Arena — Admin role + seed players
-- Safe to re-run: uses IF NOT EXISTS / INSERT IGNORE patterns.
-- =============================================================================

-- Admin flag on users (0 = normal, 1 = platform admin)
-- Portable across MySQL 5.7 / 8 / MariaDB: ignore duplicate-column errors at runtime.
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'is_admin'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE users ADD COLUMN is_admin TINYINT(1) NOT NULL DEFAULT 0 AFTER is_bot',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- -----------------------------------------------------------------------------
-- Platform admin: username admin / password 12345
-- password_hash below is PHP password_hash('admin123', PASSWORD_DEFAULT) bcrypt.
-- -----------------------------------------------------------------------------
INSERT INTO users (public_id, username, display_name, password_hash, is_bot, is_admin, rating, wins, losses, status)
SELECT
  '00000000-0000-4000-8000-000000000001',
  'admin',
  'Admin',
  '$2y$10$2W9eQwhukVf/RuTvkXqegeO0LywRZV/WoGPptkUhM4X66JtWQojoW',
  0,
  1,
  1500,
  0,
  0,
  'active'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin' LIMIT 1);

-- Ensure is_admin is set even if the row already existed without the flag.
UPDATE users SET is_admin = 1, status = 'active', deleted_at = NULL,
  password_hash = '$2y$10$2W9eQwhukVf/RuTvkXqegeO0LywRZV/WoGPptkUhM4X66JtWQojoW'
WHERE username = 'admin';

INSERT IGNORE INTO user_profiles (user_id, bio, preferred_language, theme, avatar_color)
SELECT id, 'Platform administrator', 'fa', 'dark', '#7cff6b' FROM users WHERE username = 'admin';

INSERT IGNORE INTO player_statistics (user_id, total_score, xp, level, solved_challenges, duel_points)
SELECT id, 0, 0, 1, 0, 0 FROM users WHERE username = 'admin';

-- -----------------------------------------------------------------------------
-- Fake competitive players so the leaderboard is never empty.
-- password for all bots/fakes: password (bcrypt of "password")
-- -----------------------------------------------------------------------------
INSERT INTO users (public_id, username, display_name, password_hash, is_bot, is_admin, rating, wins, losses, draws, status)
SELECT * FROM (
  SELECT '11111111-1111-4111-8111-111111111101' AS public_id, 'shadowfox' AS username, 'ShadowFox' AS display_name,
         '$2y$10$2W9eQwhukVf/RuTvkXqegeO0LywRZV/WoGPptkUhM4X66JtWQojoW' AS password_hash,
         0 AS is_bot, 0 AS is_admin, 1420 AS rating, 28 AS wins, 9 AS losses, 2 AS draws, 'active' AS status
  UNION ALL SELECT '11111111-1111-4111-8111-111111111102', 'codeweaver', 'CodeWeaver',
         '$2y$10$2W9eQwhukVf/RuTvkXqegeO0LywRZV/WoGPptkUhM4X66JtWQojoW', 0, 0, 1380, 24, 11, 1, 'active'
  UNION ALL SELECT '11111111-1111-4111-8111-111111111103', 'bugslayer', 'BugSlayer',
         '$2y$10$2W9eQwhukVf/RuTvkXqegeO0LywRZV/WoGPptkUhM4X66JtWQojoW', 0, 0, 1310, 19, 14, 3, 'active'
  UNION ALL SELECT '11111111-1111-4111-8111-111111111104', 'pythonic', 'Pythonic',
         '$2y$10$2W9eQwhukVf/RuTvkXqegeO0LywRZV/WoGPptkUhM4X66JtWQojoW', 0, 0, 1260, 17, 12, 0, 'active'
  UNION ALL SELECT '11111111-1111-4111-8111-111111111105', 'nullpointer', 'NullPointer',
         '$2y$10$2W9eQwhukVf/RuTvkXqegeO0LywRZV/WoGPptkUhM4X66JtWQojoW', 0, 0, 1190, 14, 16, 2, 'active'
  UNION ALL SELECT '11111111-1111-4111-8111-111111111106', 'stacktrace', 'StackTrace',
         '$2y$10$2W9eQwhukVf/RuTvkXqegeO0LywRZV/WoGPptkUhM4X66JtWQojoW', 0, 0, 1140, 12, 18, 1, 'active'
  UNION ALL SELECT '11111111-1111-4111-8111-111111111107', 'regexqueen', 'RegexQueen',
         '$2y$10$2W9eQwhukVf/RuTvkXqegeO0LywRZV/WoGPptkUhM4X66JtWQojoW', 0, 0, 1090, 10, 15, 4, 'active'
  UNION ALL SELECT '11111111-1111-4111-8111-111111111108', 'loopmaster', 'LoopMaster',
         '$2y$10$2W9eQwhukVf/RuTvkXqegeO0LywRZV/WoGPptkUhM4X66JtWQojoW', 0, 0, 1040, 8, 20, 2, 'active'
  UNION ALL SELECT '11111111-1111-4111-8111-111111111109', 'syntaxninja', 'SyntaxNinja',
         '$2y$10$2W9eQwhukVf/RuTvkXqegeO0LywRZV/WoGPptkUhM4X66JtWQojoW', 0, 0, 980, 6, 22, 1, 'active'
  UNION ALL SELECT '11111111-1111-4111-8111-111111111110', 'debugduck', 'DebugDuck',
         '$2y$10$2W9eQwhukVf/RuTvkXqegeO0LywRZV/WoGPptkUhM4X66JtWQojoW', 0, 0, 920, 4, 25, 0, 'active'
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.username = seed.username LIMIT 1);

-- Profiles for seeded players
INSERT IGNORE INTO user_profiles (user_id, bio, preferred_language, theme, avatar_color)
SELECT u.id,
  CASE u.username
    WHEN 'shadowfox' THEN 'Top ladder hunter'
    WHEN 'codeweaver' THEN 'Refactor everything'
    WHEN 'bugslayer' THEN 'Ship it fixed'
    WHEN 'pythonic' THEN 'import this'
    WHEN 'nullpointer' THEN 'None is not nothing'
    WHEN 'stacktrace' THEN 'Read the traceback'
    WHEN 'regexqueen' THEN '/.*patterns.*/'
    WHEN 'loopmaster' THEN 'O(n) or bust'
    WHEN 'syntaxninja' THEN 'Indentation warrior'
    WHEN 'debugduck' THEN 'Rubber duck debugging'
    ELSE ''
  END,
  'en', 'dark',
  CASE u.username
    WHEN 'shadowfox' THEN '#7cff6b'
    WHEN 'codeweaver' THEN '#59f3c4'
    WHEN 'bugslayer' THEN '#7c5cff'
    WHEN 'pythonic' THEN '#f5c542'
    WHEN 'nullpointer' THEN '#ff6b8a'
    WHEN 'stacktrace' THEN '#5b9dff'
    WHEN 'regexqueen' THEN '#ff9f43'
    WHEN 'loopmaster' THEN '#2dd4bf'
    WHEN 'syntaxninja' THEN '#c084fc'
    WHEN 'debugduck' THEN '#f472b6'
    ELSE '#7cff6b'
  END
FROM users u
WHERE u.username IN (
  'shadowfox','codeweaver','bugslayer','pythonic','nullpointer',
  'stacktrace','regexqueen','loopmaster','syntaxninja','debugduck'
);

-- Statistics so leaderboard ranks by score/xp
INSERT INTO player_statistics (
  user_id, total_score, xp, level, solved_challenges,
  total_submissions, accepted_submissions, best_score,
  current_streak, best_streak, duel_points
)
SELECT u.id, s.total_score, s.xp, s.level, s.solved,
       s.total_subs, s.accepted, s.best, s.streak, s.best_streak, s.duel_pts
FROM users u
JOIN (
  SELECT 'shadowfox' AS username, 2840 AS total_score, 9200 AS xp, 12 AS level, 14 AS solved, 40 AS total_subs, 22 AS accepted, 320 AS best, 5 AS streak, 8 AS best_streak, 180 AS duel_pts
  UNION ALL SELECT 'codeweaver', 2510, 8100, 11, 12, 36, 19, 300, 3, 7, 140
  UNION ALL SELECT 'bugslayer', 2180, 7000, 10, 11, 33, 17, 280, 2, 6, 110
  UNION ALL SELECT 'pythonic', 1920, 6100, 9, 10, 30, 15, 260, 4, 5, 90
  UNION ALL SELECT 'nullpointer', 1650, 5200, 8, 9, 28, 13, 240, 1, 4, 70
  UNION ALL SELECT 'stacktrace', 1420, 4400, 7, 8, 25, 11, 220, 0, 3, 55
  UNION ALL SELECT 'regexqueen', 1180, 3600, 6, 7, 22, 10, 200, 2, 3, 40
  UNION ALL SELECT 'loopmaster', 960, 2900, 5, 6, 20, 8, 180, 1, 2, 25
  UNION ALL SELECT 'syntaxninja', 720, 2100, 4, 5, 18, 7, 160, 0, 2, 15
  UNION ALL SELECT 'debugduck', 480, 1400, 3, 3, 14, 5, 140, 1, 1, 10
) s ON s.username = u.username
ON DUPLICATE KEY UPDATE
  total_score = VALUES(total_score),
  xp = VALUES(xp),
  level = VALUES(level),
  solved_challenges = VALUES(solved_challenges),
  total_submissions = VALUES(total_submissions),
  accepted_submissions = VALUES(accepted_submissions),
  best_score = VALUES(best_score),
  current_streak = VALUES(current_streak),
  best_streak = VALUES(best_streak),
  duel_points = VALUES(duel_points);
