<?php
declare(strict_types=1);

namespace BugArena\Controllers;

use BugArena\Core\Database;
use BugArena\Core\Request;
use BugArena\Core\Response;
use BugArena\Middleware\AuthMiddleware;
use BugArena\Middleware\RateLimitMiddleware;
use BugArena\Utils\Helpers;

final class ReplayController
{
    public function index(Request $request): void
    {
        $userId = AuthMiddleware::requireAuth();
        $pdo = Database::pdo();
        $limit = min(100, max(1, $request->queryInt('limit', 100)));
        $stmt = $pdo->prepare(
            'SELECT * FROM replay_sessions WHERE user_id = ? ORDER BY started_at DESC LIMIT ' . $limit
        );
        $stmt->execute([$userId]);
        $sessions = array_map(static fn (array $row) => self::publicRow($row), $stmt->fetchAll());

        if ($sessions !== []) {
            $ids = array_column($sessions, 'id');
            $placeholders = implode(',', array_fill(0, count($ids), '?'));
            $eventStmt = $pdo->prepare(
                "SELECT replay_session_id, event_type, elapsed_ms, payload, created_at
                 FROM replay_events WHERE replay_session_id IN ($placeholders) ORDER BY id ASC"
            );
            $eventStmt->execute($ids);
            $eventsBySession = [];
            foreach ($eventStmt->fetchAll() as $event) {
                $eventsBySession[(int) $event['replay_session_id']][] = [
                    'type' => $event['event_type'],
                    'at' => $event['created_at'],
                    'elapsedMs' => (int) $event['elapsed_ms'],
                    'payload' => Helpers::decodeJsonArray($event['payload']),
                ];
            }
            foreach ($sessions as &$session) {
                $session['events'] = $eventsBySession[$session['id']] ?? [];
                unset($session['id']);
            }
            unset($session);
        }

        Response::json(['ok' => true, 'sessions' => $sessions]);
    }

    public function store(Request $request): void
    {
        $userId = AuthMiddleware::requireAuth();
        (new RateLimitMiddleware(60, 60))->handle('replays:' . $userId);
        $result = self::createSession($userId, $request->body);
        Response::json($result['payload'], $result['http']);
    }

    /** Shared pipeline (HTTP + /sync batch). */
    public static function createSession(int $userId, array $body): array
    {
        $publicId = substr(trim((string) ($body['id'] ?? '')), 0, 36);
        if (!preg_match('/^[a-zA-Z0-9-]{8,36}$/', $publicId)) {
            $publicId = Helpers::uuid();
        }
        $pdo = Database::pdo();

        $stmt = $pdo->prepare('SELECT public_id FROM replay_sessions WHERE public_id = ? LIMIT 1');
        $stmt->execute([$publicId]);
        if ($stmt->fetch()) {
            return ['http' => 200, 'payload' => ['ok' => true, 'publicId' => $publicId, 'existing' => true]];
        }

        $challengeId = Helpers::clampInt($body['challengeId'] ?? 0, 0, 2147483647);
        if ($challengeId < 1) {
            Helpers::fail('invalid_replay', 422);
        }
        $stmt = $pdo->prepare(
            'INSERT INTO replay_sessions
               (public_id, user_id, challenge_id, challenge_title, difficulty, time_limit, mode, opponent_id, status, started_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, "active", ?)'
        );
        $stmt->execute([
            $publicId,
            $userId,
            $challengeId,
            substr(trim((string) ($body['challengeTitle'] ?? 'Challenge')), 0, 160),
            Helpers::cleanEnum($body['difficulty'] ?? 'unknown', 'unknown', 32),
            max(0.0, (float) ($body['timeLimit'] ?? 0)),
            Helpers::cleanEnum($body['mode'] ?? 'practice', 'practice', 32),
            isset($body['opponentId']) ? substr((string) $body['opponentId'], 0, 80) : null,
            Helpers::safeDate($body['startedAt'] ?? 'now'),
        ]);
        return ['http' => 201, 'payload' => ['ok' => true, 'publicId' => $publicId]];
    }

    public function addEvents(Request $request, array $params): void
    {
        $userId = AuthMiddleware::requireAuth();
        (new RateLimitMiddleware(120, 60))->handle('replay-events:' . $userId);
        $result = self::appendEvents($userId, (string) $params['id'], $request->body);
        Response::json($result['payload'], $result['http']);
    }

    /** Shared pipeline (HTTP + /sync batch). */
    public static function appendEvents(int $userId, string $publicId, array $body): array
    {
        $pdo = Database::pdo();

        $stmt = $pdo->prepare('SELECT id FROM replay_sessions WHERE public_id = ? AND user_id = ? LIMIT 1');
        $stmt->execute([$publicId, $userId]);
        $replayId = $stmt->fetchColumn();
        if (!$replayId) {
            Helpers::fail('replay_not_found', 404);
        }

        $events = isset($body['events']) && is_array($body['events'])
            ? array_filter($body['events'], 'is_array')
            : [$body];
        $events = array_slice($events, 0, 200);
        if ($events === []) {
            Helpers::fail('no_events', 422);
        }

        $insert = $pdo->prepare(
            'INSERT INTO replay_events (replay_session_id, event_type, payload, elapsed_ms, created_at)
             VALUES (?, ?, ?, ?, ?)'
        );
        $count = 0;
        foreach ($events as $event) {
            $payload = $event['payload'] ?? [];
            if (!is_array($payload)) {
                $payload = [];
            }
            // Cap individual payloads so a rogue client cannot bloat the DB.
            $encoded = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            if ($encoded === false || strlen($encoded) > 20000) {
                $encoded = '{"truncated":true}';
            }
            $insert->execute([
                (int) $replayId,
                Helpers::cleanEnum($event['type'] ?? 'event', 'event', 40),
                $encoded,
                Helpers::clampInt((int) ($event['elapsedMs'] ?? 0), 0, 2147483647),
                Helpers::safeDate($event['at'] ?? 'now'),
            ]);
            $count++;
        }
        return ['http' => 200, 'payload' => ['ok' => true, 'count' => $count]];
    }

    public function finish(Request $request, array $params): void
    {
        $userId = AuthMiddleware::requireAuth();
        (new RateLimitMiddleware(60, 60))->handle('replays:' . $userId);
        $result = self::closeSession($userId, (string) $params['id'], $request->body);
        Response::json($result['payload'], $result['http']);
    }

    /** Shared pipeline (HTTP + /sync batch). */
    public static function closeSession(int $userId, string $publicId, array $body): array
    {
        $config = $GLOBALS['bug_arena_config'];
        $pdo = Database::pdo();

        $status = in_array($body['status'] ?? '', ['completed', 'abandoned'], true)
            ? $body['status'] : 'completed';
        $stmt = $pdo->prepare(
            'UPDATE replay_sessions SET status = ?, final_score = ?, attempts = ?,
                    test_runs = ?, passed_tests = ?, failed_tests = ?, hardened = ?,
                    code_changes = ?, final_code = ?, finished_at = ?
             WHERE public_id = ? AND user_id = ? AND status = "active"'
        );
        $stmt->execute([
            $status,
            Helpers::clampInt((int) ($body['score'] ?? 0), 0, 2147483647),
            Helpers::clampInt((int) ($body['attempts'] ?? 0), 0, 999),
            Helpers::clampInt((int) ($body['testRuns'] ?? 0), 0, 99999),
            Helpers::clampInt((int) ($body['passedTests'] ?? 0), 0, 99999),
            Helpers::clampInt((int) ($body['failedTests'] ?? 0), 0, 99999),
            !empty($body['hardened']) ? 1 : 0,
            Helpers::clampInt((int) ($body['codeChanges'] ?? 0), 0, 99999),
            substr((string) ($body['code'] ?? ''), 0, (int) $config['max_code_length']),
            Helpers::safeDate($body['finishedAt'] ?? 'now'),
            $publicId,
            $userId,
        ]);
        if ($stmt->rowCount() < 1) {
            // Idempotent finish: already-finished replays succeed silently.
            $check = $pdo->prepare('SELECT 1 FROM replay_sessions WHERE public_id = ? AND user_id = ?');
            $check->execute([$publicId, $userId]);
            if (!$check->fetch()) {
                Helpers::fail('replay_not_found', 404);
            }
        }
        return ['http' => 200, 'payload' => ['ok' => true]];
    }

    private static function publicRow(array $row): array
    {
        $public = [
            'id' => $row['public_id'],
            'challengeId' => (int) $row['challenge_id'],
            'challengeTitle' => $row['challenge_title'],
            'difficulty' => $row['difficulty'],
            'timeLimit' => (float) $row['time_limit'],
            'mode' => $row['mode'],
            'opponentId' => $row['opponent_id'],
            'status' => $row['status'],
            'finalScore' => $row['final_score'] === null ? 0 : (int) $row['final_score'],
            'attempts' => $row['attempts'] === null ? 0 : (int) $row['attempts'],
            'testRuns' => (int) $row['test_runs'],
            'passedTests' => (int) $row['passed_tests'],
            'failedTests' => (int) $row['failed_tests'],
            'hardened' => (bool) $row['hardened'],
            'codeChanges' => (int) $row['code_changes'],
            'finalCode' => $row['final_code'],
            'startedAt' => $row['started_at'],
            'finishedAt' => $row['finished_at'],
            'durationMs' => $row['finished_at']
                ? max(0, (strtotime($row['finished_at']) - strtotime($row['started_at'])) * 1000)
                : null,
        ];
        return $public;
    }
}
