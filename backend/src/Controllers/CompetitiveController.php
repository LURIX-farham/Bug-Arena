<?php
declare(strict_types=1);

namespace BugArena\Controllers;

use BugArena\Core\Database;
use BugArena\Core\Request;
use BugArena\Core\Response;
use BugArena\Middleware\AuthMiddleware;
use BugArena\Middleware\RateLimitMiddleware;
use BugArena\Services\AchievementService;
use BugArena\Services\RatingService;
use BugArena\Services\StatisticsService;
use BugArena\Utils\Helpers;

final class CompetitiveController
{
    /** Matchmaking pool: server-side opponents with live ratings. */
    public function opponents(): void
    {
        AuthMiddleware::requireAuth();
        $rows = Database::pdo()->query(
            'SELECT cp.user_id AS id, u.username AS handle, u.display_name AS displayName,
                    u.rating, cp.tier, cp.skill, cp.baseline
             FROM competitive_players cp
             JOIN users u ON u.id = cp.user_id
             WHERE cp.is_active = 1 AND u.is_bot = 1
             ORDER BY u.rating DESC'
        )->fetchAll();
        $opponents = array_map(static fn (array $r) => [
            'id' => (int) $r['id'],
            'handle' => $r['handle'],
            'displayName' => $r['displayName'],
            'rating' => (int) $r['rating'],
            'tier' => $r['tier'],
        ], $rows);
        Response::json(['ok' => true, 'opponents' => $opponents]);
    }

    public function matches(Request $request): void
    {
        $userId = AuthMiddleware::requireAuth();
        if ($request->method === 'GET') {
            $limit = min(200, max(1, $request->queryInt('limit', 100)));
            $stmt = Database::pdo()->prepare(
                'SELECT m.public_id AS id, m.mode, m.opponent_id AS opponentId, m.opponent_name AS opponent, m.opponent_score AS opponentScore,
                        m.challenge_id AS challengeId, m.result, m.solved,
                        m.rating_before AS ratingBefore, m.rating_delta AS ratingDelta, m.rating_after AS ratingAfter,
                        m.player_score AS playerScore, m.duration_ms AS durationMs, m.season_id AS seasonId,
                        m.played_at AS playedAt
                 FROM competitive_matches m WHERE m.user_id = ?
                 ORDER BY m.played_at DESC LIMIT ' . $limit
            );
            $stmt->execute([$userId]);
            $matches = array_map(static fn (array $row) => [
                'id' => $row['id'],
                'mode' => $row['mode'],
                'opponentId' => $row['opponentId'] === null ? null : (int) $row['opponentId'],
                'opponent' => $row['opponent'],
                'opponentScore' => (int) $row['opponentScore'],
                'challengeId' => (int) $row['challengeId'],
                'result' => $row['result'],
                'solved' => (bool) $row['solved'],
                'ratingBefore' => (int) $row['ratingBefore'],
                'ratingDelta' => (int) $row['ratingDelta'],
                'ratingAfter' => (int) $row['ratingAfter'],
                'playerScore' => (int) $row['playerScore'],
                'durationMs' => (int) $row['durationMs'],
                'seasonId' => $row['seasonId'] === null ? null : (int) $row['seasonId'],
                'playedAt' => $row['playedAt'],
            ], $stmt->fetchAll());

            $userStmt = Database::pdo()->prepare('SELECT rating, wins, losses, draws FROM users WHERE id = ?');
            $userStmt->execute([$userId]);
            $u = $userStmt->fetch() ?: ['rating' => 1000, 'wins' => 0, 'losses' => 0, 'draws' => 0];
            Response::json(['ok' => true, 'matches' => $matches, 'rating' => (int) $u['rating'],
                'wins' => (int) $u['wins'], 'losses' => (int) $u['losses'], 'draws' => (int) $u['draws']]);
        }

        // POST — record + resolve a match server-side (Elo + result simulation).
        (new RateLimitMiddleware(30, 60))->handle('matches:' . $userId);
        $result = self::recordMatch($userId, $request->body);
        Response::json($result['payload'], $result['http']);
    }

    /**
     * Shared match pipeline (HTTP POST + offline /sync batch).
     * Returns the response payload plus the HTTP status it should map to.
     */
    public static function recordMatch(int $userId, array $body): array
    {
        $publicId = substr(trim((string) ($body['id'] ?? '')), 0, 36);
        if (!preg_match('/^[a-zA-Z0-9-]{8,36}$/', $publicId)) {
            $publicId = Helpers::uuid();
        }
        $pdo = Database::pdo();

        $check = $pdo->prepare('SELECT public_id FROM competitive_matches WHERE public_id = ? LIMIT 1');
        $check->execute([$publicId]);
        if ($check->fetch()) {
            return ['http' => 200, 'payload' => ['ok' => true, 'existing' => true, 'id' => $publicId]];
        }

        $mode = in_array($body['mode'] ?? '', ['ranked', 'blitz', 'survival'], true)
            ? $body['mode'] : 'ranked';
        $challengeId = Helpers::clampInt($body['challengeId'] ?? 0, 1, 2147483647);
        $stmt = $pdo->prepare('SELECT id, title FROM challenges WHERE id = ? AND is_active = 1');
        $stmt->execute([$challengeId]);
        $challenge = $stmt->fetch();
        if (!$challenge) {
            Helpers::fail('challenge_not_found', 404);
        }

        $opponentStmt = $pdo->prepare(
            'SELECT cp.user_id, cp.handle, cp.skill, cp.baseline, u.rating
             FROM competitive_players cp JOIN users u ON u.id = cp.user_id
             WHERE cp.is_active = 1 AND u.is_bot = 1
               AND (cp.user_id = ? OR u.username = ? OR cp.handle = ?)
             LIMIT 1'
        );
        $rawOpponent = trim((string) ($body['opponentId'] ?? ''));
        $opponentId = filter_var($rawOpponent, FILTER_VALIDATE_INT);
        $opponentStmt->execute([
            $opponentId !== false ? (int) $opponentId : 0,
            substr($rawOpponent, 0, 40),
            substr($rawOpponent, 0, 40),
        ]);
        $opponent = $opponentStmt->fetch();
        if (!$opponent) {
            Helpers::fail('opponent_not_found', 404);
        }

        $userStmt = $pdo->prepare('SELECT id, rating FROM users WHERE id = ?');
        $userStmt->execute([$userId]);
        $user = $userStmt->fetch();

        $playerScore = Helpers::clampInt((int) ($body['playerScore'] ?? 0), 0, 2147483647);
        // playerScore is only trusted when it can be reproduced from the
        // server-scored submission; otherwise the server's own score wins.
        $subStmt = $pdo->prepare('SELECT score FROM submissions WHERE user_id = ? AND challenge_id = ?');
        $subStmt->execute([$userId, $challengeId]);
        $serverScore = (int) ($subStmt->fetchColumn() ?: 0);
        $solved = $serverScore > 0;
        $playerScore = min($playerScore, max($serverScore, 0));

        $match = RatingService::resolveMatch(
            $user, $opponent, $mode, $challengeId, $challenge['title'],
            $playerScore, $solved, Helpers::clampInt((int) ($body['durationMs'] ?? 0), 0, 86400000),
            $publicId
        );

        $unlocked = AchievementService::evaluate($userId);
        $stats = StatisticsService::get($userId);

        return ['http' => 201, 'payload' => [
            'ok' => true,
            'id' => $match['id'],
            'match' => $match,
            'stats' => $stats,
            'unlockedAchievements' => $unlocked,
        ]];
    }
}
