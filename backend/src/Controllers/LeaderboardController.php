<?php
declare(strict_types=1);

namespace BugArena\Controllers;

use BugArena\Core\Database;
use BugArena\Core\Request;
use BugArena\Core\Response;
use BugArena\Services\SeasonService;

/**
 * Public read-only leaderboard (top players by rating, with real stats).
 */
final class LeaderboardController
{
    public function index(Request $request): void
    {
        $limit = min(100, max(1, $request->queryInt('limit', 50)));
        $season = SeasonService::current();

        $pdo = Database::pdo();
        $stmt = $pdo->prepare(
            'SELECT u.public_id AS id, u.username, u.display_name AS displayName, u.rating,
                    u.wins, u.losses, u.draws,
                    COALESCE(ps.level, 1) AS level,
                    COALESCE(ps.total_score, 0) + COALESCE(ps.duel_points, 0) AS score,
                    COALESCE(ps.solved_challenges, 0) AS solved,
                    COALESCE(ps.xp, 0) AS xp
             FROM users u
             LEFT JOIN player_statistics ps ON ps.user_id = u.id
             WHERE u.is_bot = 0 AND u.status = "active" AND u.deleted_at IS NULL
             ORDER BY u.rating DESC, ps.total_score DESC, u.created_at ASC
             LIMIT ' . $limit
        );
        $stmt->execute();

        $players = [];
        $position = 1;
        foreach ($stmt->fetchAll() as $row) {
            $players[] = [
                'id' => $row['id'],
                'position' => $position++,
                'username' => $row['username'],
                'displayName' => $row['displayName'],
                'rating' => (int) $row['rating'],
                'wins' => (int) $row['wins'],
                'losses' => (int) $row['losses'],
                'draws' => (int) $row['draws'],
                'level' => (int) $row['level'],
                'score' => (int) $row['score'],
                'solved' => (int) $row['solved'],
                'xp' => (int) $row['xp'],
            ];
        }

        $totalStmt = $pdo->query(
            'SELECT COUNT(*) FROM users WHERE is_bot = 0 AND status = "active" AND deleted_at IS NULL'
        );
        Response::json([
            'ok' => true,
            'season' => $season ? [
                'id' => (int) $season['id'],
                'name' => $season['name'],
                'startsAt' => $season['starts_at'],
                'endsAt' => $season['ends_at'],
            ] : null,
            'totalPlayers' => (int) $totalStmt->fetchColumn(),
            'players' => $players,
        ]);
    }
}
