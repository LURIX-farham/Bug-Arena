<?php
declare(strict_types=1);

namespace BugArena\Controllers;

use BugArena\Core\Database;
use BugArena\Core\Request;
use BugArena\Core\Response;
use BugArena\Middleware\AuthMiddleware;
use BugArena\Utils\Helpers;

final class AdminController
{
    public function overview(Request $request): void
    {
        AuthMiddleware::requireAdmin();
        $pdo = Database::pdo();

        $stats = [
            'users' => (int) $pdo->query('SELECT COUNT(*) FROM users WHERE is_bot = 0 AND deleted_at IS NULL')->fetchColumn(),
            'activeUsers' => (int) $pdo->query('SELECT COUNT(*) FROM users WHERE is_bot = 0 AND status = "active" AND deleted_at IS NULL')->fetchColumn(),
            'bannedUsers' => (int) $pdo->query('SELECT COUNT(*) FROM users WHERE status = "banned" AND deleted_at IS NULL')->fetchColumn(),
            'admins' => (int) $pdo->query('SELECT COUNT(*) FROM users WHERE is_admin = 1 AND deleted_at IS NULL')->fetchColumn(),
            'challenges' => (int) $pdo->query('SELECT COUNT(*) FROM challenges')->fetchColumn(),
            'activeChallenges' => (int) $pdo->query('SELECT COUNT(*) FROM challenges WHERE is_active = 1')->fetchColumn(),
            'submissions' => (int) $pdo->query('SELECT COUNT(*) FROM submissions')->fetchColumn(),
            'acceptedSubmissions' => (int) $pdo->query('SELECT COUNT(*) FROM submissions WHERE status = "accepted"')->fetchColumn(),
            'duels' => $this->safeCount($pdo, 'duel_matches'),
            'activeDuels' => $this->safeCount($pdo, 'duel_matches', 'status IN ("pending","active")'),
            'replays' => $this->safeCount($pdo, 'replay_sessions'),
            'events24h' => $this->safeCount($pdo, 'arena_events', 'created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)'),
        ];

        $recentUsers = $pdo->query(
            'SELECT public_id AS id, username, display_name AS displayName, status, is_admin AS isAdmin,
                    created_at AS createdAt, last_active_at AS lastActiveAt
             FROM users WHERE is_bot = 0 AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 10'
        )->fetchAll();
        foreach ($recentUsers as &$u) { $u['isAdmin'] = (int) $u['isAdmin'] === 1; }
        unset($u);

        $recentSubs = $pdo->query(
            'SELECT s.id, s.status, s.score, s.created_at AS createdAt, u.username,
                    c.title AS challengeTitle, c.id AS challengeId
             FROM submissions s JOIN users u ON u.id = s.user_id JOIN challenges c ON c.id = s.challenge_id
             ORDER BY s.created_at DESC LIMIT 12'
        )->fetchAll();

        $topPlayers = $pdo->query(
            'SELECT u.username, u.display_name AS displayName,
                    COALESCE(ps.total_score, 0) + COALESCE(ps.duel_points, 0) AS score,
                    COALESCE(ps.xp, 0) AS xp, COALESCE(ps.level, 1) AS level
             FROM users u LEFT JOIN player_statistics ps ON ps.user_id = u.id
             WHERE u.is_bot = 0 AND u.status = "active" AND u.deleted_at IS NULL
             ORDER BY score DESC, xp DESC LIMIT 8'
        )->fetchAll();

        $difficultyBreakdown = $pdo->query(
            'SELECT difficulty, COUNT(*) AS total, SUM(is_active = 1) AS active
             FROM challenges GROUP BY difficulty
             ORDER BY FIELD(difficulty, "Easy", "Medium", "Hard", "Expert")'
        )->fetchAll();

        Response::json([
            'ok' => true,
            'stats' => $stats,
            'recentUsers' => $recentUsers,
            'recentSubmissions' => $recentSubs,
            'topPlayers' => $topPlayers,
            'difficultyBreakdown' => $difficultyBreakdown,
            'serverTime' => date('c'),
        ]);
    }

    public function listUsers(Request $request): void
    {
        AuthMiddleware::requireAdmin();
        $pdo = Database::pdo();
        $q = trim((string) ($request->query['q'] ?? ''));
        $status = Helpers::cleanEnum($request->query['status'] ?? '', '', 20);
        $limit = Helpers::clampInt($request->query['limit'] ?? 80, 1, 200);
        $offset = Helpers::clampInt($request->query['offset'] ?? 0, 0, 100000);

        $sql = 'SELECT u.public_id AS id, u.username, u.display_name AS displayName,
                       u.is_admin AS isAdmin, u.is_bot AS isBot, u.status, u.rating,
                       u.wins, u.losses, u.draws, u.created_at AS createdAt, u.last_active_at AS lastActiveAt,
                       COALESCE(ps.total_score, 0) AS totalScore, COALESCE(ps.duel_points, 0) AS duelPoints,
                       COALESCE(ps.total_score, 0) + COALESCE(ps.duel_points, 0) AS score,
                       COALESCE(ps.xp, 0) AS xp, COALESCE(ps.level, 1) AS level,
                       COALESCE(ps.solved_challenges, 0) AS solved,
                       COALESCE(ps.total_submissions, 0) AS totalSubmissions
                FROM users u LEFT JOIN player_statistics ps ON ps.user_id = u.id
                WHERE u.deleted_at IS NULL';
        $params = [];
        if ($q !== '') {
            $sql .= ' AND (u.username LIKE ? OR u.display_name LIKE ?)';
            $like = '%' . $q . '%';
            $params[] = $like; $params[] = $like;
        }
        if (in_array($status, ['active', 'banned', 'deleted'], true)) {
            $sql .= ' AND u.status = ?';
            $params[] = $status;
        }
        $sql .= ' ORDER BY u.created_at DESC LIMIT ' . $limit . ' OFFSET ' . $offset;
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();
        foreach ($rows as &$row) {
            $row['isAdmin'] = (int) $row['isAdmin'] === 1;
            $row['isBot'] = (int) $row['isBot'] === 1;
            foreach (['rating','wins','losses','draws','totalScore','duelPoints','score','xp','level','solved','totalSubmissions'] as $k) {
                $row[$k] = (int) $row[$k];
            }
        }
        unset($row);
        Response::json(['ok' => true, 'users' => $rows]);
    }

    public function updateUser(Request $request, array $params): void
    {
        $adminId = AuthMiddleware::requireAdmin();
        $publicId = (string) ($params['id'] ?? '');
        $body = $request->body;
        $pdo = Database::pdo();

        $stmt = $pdo->prepare('SELECT id, username, is_admin FROM users WHERE public_id = ? LIMIT 1');
        $stmt->execute([$publicId]);
        $user = $stmt->fetch();
        if (!$user) { Helpers::fail('user_not_found', 404); }
        $userId = (int) $user['id'];

        if (isset($body['status'])) {
            $status = Helpers::cleanEnum($body['status'], '', 20);
            if (!in_array($status, ['active', 'banned', 'deleted'], true)) { Helpers::fail('invalid_status', 422); }
            if ($userId === $adminId && $status !== 'active') { Helpers::fail('cannot_disable_self', 422); }
            $pdo->prepare('UPDATE users SET status = ?, deleted_at = IF(? = "deleted", NOW(), NULL) WHERE id = ?')
                ->execute([$status, $status, $userId]);
        }

        if (array_key_exists('isAdmin', $body) && $userId !== $adminId) {
            $pdo->prepare('UPDATE users SET is_admin = ? WHERE id = ?')
                ->execute([!empty($body['isAdmin']) ? 1 : 0, $userId]);
        }

        if (isset($body['displayName'])) {
            $dn = Helpers::cleanDisplayName($body['displayName'], $user['username']);
            $pdo->prepare('UPDATE users SET display_name = ? WHERE id = ?')->execute([$dn, $userId]);
        }

        if (!empty($body['password']) && is_string($body['password'])) {
            $pass = (string) $body['password'];
            if (strlen($pass) < 5) { Helpers::fail('invalid_password', 422); }
            $pdo->prepare('UPDATE users SET password_hash = ? WHERE id = ?')
                ->execute([password_hash($pass, PASSWORD_DEFAULT), $userId]);
        }

        $hasStats = isset($body['xp']) || isset($body['totalScore']) || isset($body['level'])
            || isset($body['duelPoints']) || isset($body['solved']);
        if ($hasStats) {
            $pdo->prepare('INSERT IGNORE INTO player_statistics (user_id) VALUES (?)')->execute([$userId]);
            $fields = []; $vals = [];
            if (isset($body['xp'])) { $fields[] = 'xp = ?'; $vals[] = Helpers::clampInt($body['xp'], 0, 99999999); }
            if (isset($body['totalScore'])) { $fields[] = 'total_score = ?'; $vals[] = Helpers::clampInt($body['totalScore'], 0, 99999999); }
            if (isset($body['level'])) { $fields[] = 'level = ?'; $vals[] = Helpers::clampInt($body['level'], 1, 999); }
            if (isset($body['duelPoints'])) { $fields[] = 'duel_points = ?'; $vals[] = (int) $body['duelPoints']; }
            if (isset($body['solved'])) { $fields[] = 'solved_challenges = ?'; $vals[] = Helpers::clampInt($body['solved'], 0, 99999); }
            if ($fields) {
                $vals[] = $userId;
                $pdo->prepare('UPDATE player_statistics SET ' . implode(', ', $fields) . ' WHERE user_id = ?')->execute($vals);
            }
        }

        if (isset($body['rating'])) {
            $pdo->prepare('UPDATE users SET rating = ? WHERE id = ?')
                ->execute([Helpers::clampInt($body['rating'], 0, 5000), $userId]);
        }

        Response::json(['ok' => true]);
    }

    public function listChallenges(Request $request): void
    {
        AuthMiddleware::requireAdmin();
        $rows = Database::pdo()->query(
            'SELECT c.id, c.slug, c.title, c.difficulty, c.language, c.bug_type AS bugType,
                    c.category, c.is_active AS isActive, c.base_score AS baseScore,
                    c.xp_reward AS xpReward, c.version, c.updated_at AS updatedAt,
                    (SELECT COUNT(*) FROM submissions s WHERE s.challenge_id = c.id) AS submissionCount,
                    (SELECT COUNT(*) FROM submissions s WHERE s.challenge_id = c.id AND s.status = "accepted") AS acceptedCount
             FROM challenges c ORDER BY c.id ASC'
        )->fetchAll();
        foreach ($rows as &$row) {
            $row['id'] = (int) $row['id'];
            $row['isActive'] = (int) $row['isActive'] === 1;
            $row['baseScore'] = (int) $row['baseScore'];
            $row['xpReward'] = (int) $row['xpReward'];
            $row['version'] = (int) $row['version'];
            $row['submissionCount'] = (int) $row['submissionCount'];
            $row['acceptedCount'] = (int) $row['acceptedCount'];
        }
        unset($row);
        Response::json(['ok' => true, 'challenges' => $rows]);
    }

    public function toggleChallenge(Request $request, array $params): void
    {
        AuthMiddleware::requireAdmin();
        $id = (int) ($params['id'] ?? 0);
        $active = !empty($request->body['isActive']) ? 1 : 0;
        Database::pdo()->prepare('UPDATE challenges SET is_active = ? WHERE id = ?')->execute([$active, $id]);
        $check = Database::pdo()->prepare('SELECT id FROM challenges WHERE id = ?');
        $check->execute([$id]);
        if (!$check->fetch()) { Helpers::fail('challenge_not_found', 404); }
        Response::json(['ok' => true, 'id' => $id, 'isActive' => $active === 1]);
    }

    public function updateChallenge(Request $request, array $params): void
    {
        AuthMiddleware::requireAdmin();
        $id = (int) ($params['id'] ?? 0);
        $body = $request->body;
        $pdo = Database::pdo();
        $check = $pdo->prepare('SELECT id FROM challenges WHERE id = ?');
        $check->execute([$id]);
        if (!$check->fetch()) { Helpers::fail('challenge_not_found', 404); }

        $sets = []; $vals = [];
        if (isset($body['baseScore'])) { $sets[] = 'base_score = ?'; $vals[] = Helpers::clampInt($body['baseScore'], 1, 99999); }
        if (isset($body['xpReward'])) { $sets[] = 'xp_reward = ?'; $vals[] = Helpers::clampInt($body['xpReward'], 1, 99999); }
        if (isset($body['difficulty'])) {
            $diff = Helpers::cleanEnum($body['difficulty'], '', 20);
            if (!in_array($diff, ['Easy', 'Medium', 'Hard', 'Expert'], true)) { Helpers::fail('invalid_difficulty', 422); }
            $sets[] = 'difficulty = ?'; $vals[] = $diff;
        }
        if (isset($body['title']) && is_string($body['title']) && trim($body['title']) !== '') {
            $sets[] = 'title = ?'; $vals[] = substr(trim(strip_tags($body['title'])), 0, 120);
        }
        if (!$sets) { Helpers::fail('nothing_to_update', 422); }
        $vals[] = $id;
        $pdo->prepare('UPDATE challenges SET ' . implode(', ', $sets) . ' WHERE id = ?')->execute($vals);
        Response::json(['ok' => true, 'id' => $id]);
    }

    public function listSubmissions(Request $request): void
    {
        AuthMiddleware::requireAdmin();
        $limit = Helpers::clampInt($request->query['limit'] ?? 50, 1, 150);
        $status = Helpers::cleanEnum($request->query['status'] ?? '', '', 20);
        $sql = 'SELECT s.id, s.status, s.score, s.created_at AS createdAt, u.username, u.public_id AS userId,
                       c.id AS challengeId, c.title AS challengeTitle
                FROM submissions s JOIN users u ON u.id = s.user_id JOIN challenges c ON c.id = s.challenge_id';
        $params = [];
        if (in_array($status, ['accepted', 'failed'], true)) { $sql .= ' WHERE s.status = ?'; $params[] = $status; }
        $sql .= ' ORDER BY s.created_at DESC LIMIT ' . $limit;
        $stmt = Database::pdo()->prepare($sql);
        $stmt->execute($params);
        Response::json(['ok' => true, 'submissions' => $stmt->fetchAll()]);
    }

    public function listDuels(Request $request): void
    {
        AuthMiddleware::requireAdmin();
        $pdo = Database::pdo();
        if (!$this->tableExists($pdo, 'duel_matches')) { Response::json(['ok' => true, 'duels' => []]); return; }
        $limit = Helpers::clampInt($request->query['limit'] ?? 40, 1, 100);
        try {
            $rows = $pdo->query('SELECT id, status, created_at AS createdAt, finished_at AS finishedAt FROM duel_matches ORDER BY created_at DESC LIMIT ' . $limit)->fetchAll();
        } catch (\Throwable) { $rows = []; }
        Response::json(['ok' => true, 'duels' => $rows]);
    }

    public function cancelDuel(Request $request, array $params): void
    {
        AuthMiddleware::requireAdmin();
        $id = (int) ($params['id'] ?? 0);
        $pdo = Database::pdo();
        if (!$this->tableExists($pdo, 'duel_matches')) { Helpers::fail('not_supported', 404); }
        try {
            $pdo->prepare('UPDATE duel_matches SET status = "cancelled", finished_at = NOW() WHERE id = ? AND status IN ("pending","active")')->execute([$id]);
        } catch (\Throwable) {
            $pdo->prepare('UPDATE duel_matches SET status = "cancelled" WHERE id = ?')->execute([$id]);
        }
        Response::json(['ok' => true, 'id' => $id]);
    }

    public function listEvents(Request $request): void
    {
        AuthMiddleware::requireAdmin();
        $pdo = Database::pdo();
        if (!$this->tableExists($pdo, 'arena_events')) { Response::json(['ok' => true, 'events' => []]); return; }
        $limit = Helpers::clampInt($request->query['limit'] ?? 50, 1, 150);
        $rows = $pdo->query(
            'SELECT e.id, e.event_type AS eventType, e.payload, e.created_at AS createdAt, u.username
             FROM arena_events e LEFT JOIN users u ON u.id = e.user_id
             ORDER BY e.created_at DESC LIMIT ' . $limit
        )->fetchAll();
        foreach ($rows as &$row) {
            if (is_string($row['payload'] ?? null)) {
                $decoded = json_decode($row['payload'], true);
                $row['payload'] = is_array($decoded) ? $decoded : $row['payload'];
            }
        }
        unset($row);
        Response::json(['ok' => true, 'events' => $rows]);
    }

    public function systemHealth(Request $request): void
    {
        AuthMiddleware::requireAdmin();
        $pdo = Database::pdo();
        $tables = [];
        foreach (['users','challenges','submissions','player_statistics','duel_matches','sessions'] as $t) {
            $tables[$t] = $this->tableExists($pdo, $t);
        }
        Response::json([
            'ok' => true,
            'php' => PHP_VERSION,
            'database' => (string) $pdo->query('SELECT DATABASE()')->fetchColumn(),
            'tables' => $tables,
            'serverTime' => date('c'),
            'timezone' => date_default_timezone_get(),
        ]);
    }

    private function safeCount(\PDO $pdo, string $table, string $where = '1=1'): int
    {
        if (!$this->tableExists($pdo, $table)) return 0;
        try { return (int) $pdo->query("SELECT COUNT(*) FROM `{$table}` WHERE {$where}")->fetchColumn(); }
        catch (\Throwable) { return 0; }
    }

    private function tableExists(\PDO $pdo, string $table): bool
    {
        try {
            $stmt = $pdo->prepare('SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? LIMIT 1');
            $stmt->execute([$table]);
            return (bool) $stmt->fetchColumn();
        } catch (\Throwable) { return false; }
    }
}
