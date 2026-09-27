<?php
declare(strict_types=1);

namespace BugArena\Controllers;

use BugArena\Core\Database;
use BugArena\Core\Request;
use BugArena\Core\Response;
use BugArena\Middleware\AuthMiddleware;
use BugArena\Utils\Helpers;

/**
 * Admin dashboard APIs — users, challenges, submissions, system stats.
 * All endpoints require an authenticated is_admin = 1 session.
 */
final class AdminController
{
    public function overview(Request $request): void
    {
        AuthMiddleware::requireAdmin();
        $pdo = Database::pdo();

        $users = (int) $pdo->query(
            'SELECT COUNT(*) FROM users WHERE is_bot = 0 AND status = "active" AND deleted_at IS NULL'
        )->fetchColumn();
        $challenges = (int) $pdo->query(
            'SELECT COUNT(*) FROM challenges WHERE is_active = 1'
        )->fetchColumn();
        $submissions = (int) $pdo->query('SELECT COUNT(*) FROM submissions')->fetchColumn();
        $accepted = (int) $pdo->query(
            'SELECT COUNT(*) FROM submissions WHERE status = "accepted"'
        )->fetchColumn();
        $duels = (int) $pdo->query('SELECT COUNT(*) FROM duel_matches')->fetchColumn();
        $activeDuels = (int) $pdo->query(
            'SELECT COUNT(*) FROM duel_matches WHERE status IN ("pending","active")'
        )->fetchColumn();

        $recentUsers = $pdo->query(
            'SELECT public_id AS id, username, display_name AS displayName, created_at AS createdAt, last_active_at AS lastActiveAt
             FROM users
             WHERE is_bot = 0 AND deleted_at IS NULL
             ORDER BY created_at DESC
             LIMIT 8'
        )->fetchAll();

        $recentSubs = $pdo->query(
            'SELECT s.id, s.status, s.score, s.created_at AS createdAt,
                    u.username, c.title AS challengeTitle
             FROM submissions s
             JOIN users u ON u.id = s.user_id
             JOIN challenges c ON c.id = s.challenge_id
             ORDER BY s.created_at DESC
             LIMIT 10'
        )->fetchAll();

        Response::json([
            'ok' => true,
            'stats' => [
                'users' => $users,
                'challenges' => $challenges,
                'submissions' => $submissions,
                'acceptedSubmissions' => $accepted,
                'duels' => $duels,
                'activeDuels' => $activeDuels,
            ],
            'recentUsers' => $recentUsers,
            'recentSubmissions' => $recentSubs,
        ]);
    }

    public function listUsers(Request $request): void
    {
        AuthMiddleware::requireAdmin();
        $pdo = Database::pdo();
        $q = trim((string) ($request->query['q'] ?? ''));
        $limit = Helpers::clampInt($request->query['limit'] ?? 50, 1, 200);
        $offset = Helpers::clampInt($request->query['offset'] ?? 0, 0, 100000);

        $sql = 'SELECT u.public_id AS id, u.username, u.display_name AS displayName,
                       u.is_admin AS isAdmin, u.is_bot AS isBot, u.status, u.rating,
                       u.wins, u.losses, u.created_at AS createdAt, u.last_active_at AS lastActiveAt,
                       COALESCE(ps.total_score, 0) + COALESCE(ps.duel_points, 0) AS score,
                       COALESCE(ps.xp, 0) AS xp, COALESCE(ps.level, 1) AS level,
                       COALESCE(ps.solved_challenges, 0) AS solved
                FROM users u
                LEFT JOIN player_statistics ps ON ps.user_id = u.id
                WHERE u.deleted_at IS NULL';
        $params = [];
        if ($q !== '') {
            $sql .= ' AND (u.username LIKE ? OR u.display_name LIKE ?)';
            $like = '%' . $q . '%';
            $params[] = $like;
            $params[] = $like;
        }
        $sql .= ' ORDER BY u.created_at DESC LIMIT ' . $limit . ' OFFSET ' . $offset;

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();
        foreach ($rows as &$row) {
            $row['isAdmin'] = (int) $row['isAdmin'] === 1;
            $row['isBot'] = (int) $row['isBot'] === 1;
            $row['rating'] = (int) $row['rating'];
            $row['wins'] = (int) $row['wins'];
            $row['losses'] = (int) $row['losses'];
            $row['score'] = (int) $row['score'];
            $row['xp'] = (int) $row['xp'];
            $row['level'] = (int) $row['level'];
            $row['solved'] = (int) $row['solved'];
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
        if (!$user) {
            Helpers::fail('user_not_found', 404);
        }

        $status = isset($body['status']) ? Helpers::cleanEnum($body['status'], '', 20) : null;
        if ($status !== null && !in_array($status, ['active', 'banned', 'deleted'], true)) {
            Helpers::fail('invalid_status', 422);
        }

        if ($status === 'banned' || $status === 'deleted') {
            // Never lock out the last admin / self-lock safety: allow but keep admin flag.
            $pdo->prepare(
                'UPDATE users SET status = ?, deleted_at = IF(? = "deleted", NOW(), NULL) WHERE id = ?'
            )->execute([$status, $status, (int) $user['id']]);
        } elseif ($status === 'active') {
            $pdo->prepare(
                'UPDATE users SET status = "active", deleted_at = NULL WHERE id = ?'
            )->execute([(int) $user['id']]);
        }

        if (array_key_exists('isAdmin', $body) && (int) $user['id'] !== $adminId) {
            $isAdmin = !empty($body['isAdmin']) ? 1 : 0;
            $pdo->prepare('UPDATE users SET is_admin = ? WHERE id = ?')->execute([$isAdmin, (int) $user['id']]);
        }

        Response::json(['ok' => true]);
    }

    public function listChallenges(Request $request): void
    {
        AuthMiddleware::requireAdmin();
        $pdo = Database::pdo();
        $rows = $pdo->query(
            'SELECT id, slug, title, difficulty, language, bug_type AS bugType, category,
                    is_active AS isActive, base_score AS baseScore, xp_reward AS xpReward,
                    version, updated_at AS updatedAt
             FROM challenges
             ORDER BY id ASC'
        )->fetchAll();
        foreach ($rows as &$row) {
            $row['id'] = (int) $row['id'];
            $row['isActive'] = (int) $row['isActive'] === 1;
            $row['baseScore'] = (int) $row['baseScore'];
            $row['xpReward'] = (int) $row['xpReward'];
            $row['version'] = (int) $row['version'];
        }
        unset($row);
        Response::json(['ok' => true, 'challenges' => $rows]);
    }

    public function toggleChallenge(Request $request, array $params): void
    {
        AuthMiddleware::requireAdmin();
        $id = (int) ($params['id'] ?? 0);
        $active = !empty($request->body['isActive']) ? 1 : 0;
        $stmt = Database::pdo()->prepare('UPDATE challenges SET is_active = ? WHERE id = ?');
        $stmt->execute([$active, $id]);
        if ($stmt->rowCount() === 0) {
            // MySQL may report 0 when value unchanged — verify existence.
            $check = Database::pdo()->prepare('SELECT id FROM challenges WHERE id = ?');
            $check->execute([$id]);
            if (!$check->fetch()) {
                Helpers::fail('challenge_not_found', 404);
            }
        }
        Response::json(['ok' => true, 'id' => $id, 'isActive' => $active === 1]);
    }

    public function listSubmissions(Request $request): void
    {
        AuthMiddleware::requireAdmin();
        $limit = Helpers::clampInt($request->query['limit'] ?? 40, 1, 100);
        $pdo = Database::pdo();
        $rows = $pdo->query(
            'SELECT s.id, s.status, s.score, s.created_at AS createdAt,
                    u.username, u.public_id AS userId,
                    c.id AS challengeId, c.title AS challengeTitle
             FROM submissions s
             JOIN users u ON u.id = s.user_id
             JOIN challenges c ON c.id = s.challenge_id
             ORDER BY s.created_at DESC
             LIMIT ' . $limit
        )->fetchAll();
        Response::json(['ok' => true, 'submissions' => $rows]);
    }
}
