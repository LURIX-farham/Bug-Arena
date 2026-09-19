<?php
declare(strict_types=1);

namespace BugArena\Controllers;

use BugArena\Core\Database;
use BugArena\Core\Request;
use BugArena\Core\Response;
use BugArena\Middleware\AuthMiddleware;
use BugArena\Middleware\RateLimitMiddleware;
use BugArena\Utils\Helpers;

/**
 * Batched offline-sync endpoint.
 *
 * The client queues actions while offline (or while the network fails) and
 * flushes them here. Each action carries a stable client-generated id; the
 * sync_actions table guarantees idempotency (unique public_id), so replaying
 * the same batch never duplicates submissions, matches or replays.
 */
final class SyncController
{
    private const HANDLED_TYPES = [
        'SUBMISSION_CREATED',
        'MATCH_FINISHED',
        'REPLAY_STARTED',
        'REPLAY_EVENTS',
        'REPLAY_FINISHED',
        'EVENT',
        'PLAYER_UPDATED',
    ];

    public function store(Request $request): void
    {
        $userId = AuthMiddleware::requireAuth();
        (new RateLimitMiddleware(20, 60))->handle('sync:' . $userId);
        $config = $GLOBALS['bug_arena_config'];
        $body = $request->body;

        $actions = array_values(array_filter($body['actions'] ?? [], 'is_array'));
        $actions = array_slice($actions, 0, (int) ($config['max_sync_batch'] ?? 50));
        if ($actions === []) {
            Helpers::fail('no_actions', 422);
        }

        $pdo = Database::pdo();
        $results = [];
        $applied = 0;
        $duplicates = 0;
        $failed = 0;

        foreach ($actions as $action) {
            $actionId = substr(trim((string) ($action['id'] ?? '')), 0, 36);
            $type = strtoupper(Helpers::cleanEnum($action['type'] ?? '', 'UNKNOWN', 40));
            $payload = is_array($action['payload'] ?? null) ? $action['payload'] : [];

            if ($actionId === '' || !in_array($type, self::HANDLED_TYPES, true)) {
                $failed++;
                $results[] = ['id' => $actionId ?: null, 'type' => $type, 'status' => 'rejected'];
                continue;
            }

            try {
                $existing = $pdo->prepare('SELECT id FROM sync_actions WHERE public_id = ? LIMIT 1');
                $existing->execute([$actionId]);
                if ($existing->fetch()) {
                    $duplicates++;
                    $results[] = ['id' => $actionId, 'type' => $type, 'status' => 'duplicate'];
                    continue;
                }

                $insert = $pdo->prepare(
                    'INSERT INTO sync_actions (public_id, user_id, action_type, status, payload)
                     VALUES (?, ?, ?, "synced", ?)'
                );
                $insert->execute([
                    $actionId,
                    $userId,
                    $type,
                    json_encode(['size' => strlen(json_encode($payload) ?: '')], JSON_UNESCAPED_SLASHES),
                ]);

                self::dispatch($type, $userId, $payload);
                $applied++;
                $results[] = ['id' => $actionId, 'type' => $type, 'status' => 'applied'];
            } catch (\BugArena\Core\ValidationException $e) {
                $failed++;
                $results[] = ['id' => $actionId, 'type' => $type, 'status' => 'failed', 'error' => $e->getCode1()];
            } catch (\Throwable $e) {
                $failed++;
                $results[] = ['id' => $actionId, 'type' => $type, 'status' => 'failed', 'error' => 'internal_error'];
            }
        }

        Response::json([
            'ok' => true,
            'applied' => $applied,
            'duplicates' => $duplicates,
            'failed' => $failed,
            'results' => $results,
        ]);
    }

    private static function dispatch(string $type, int $userId, array $payload): void
    {
        switch ($type) {
            case 'SUBMISSION_CREATED':
                SubmissionController::persist($userId, $payload);
                break;
            case 'MATCH_FINISHED':
                CompetitiveController::recordMatch($userId, $payload);
                break;
            case 'REPLAY_STARTED':
                ReplayController::createSession($userId, $payload);
                break;
            case 'REPLAY_EVENTS':
                $publicId = self::requireActionId($payload, 'id', 'sessionId');
                ReplayController::appendEvents($userId, $publicId, ['events' => $payload['events'] ?? []]);
                break;
            case 'REPLAY_FINISHED':
                // The client queues REPLAY_FINISHED with a `sessionId` key;
                // accept the historical `id` key too.
                $publicId = self::requireActionId($payload, 'id', 'sessionId');
                unset($payload['id'], $payload['sessionId']);
                ReplayController::closeSession($userId, $publicId, $payload);
                break;
            case 'EVENT':
                EventController::insertEvents($userId, [$payload]);
                break;
            case 'PLAYER_UPDATED':
                self::updatePlayerIdentity($userId, $payload);
                break;
        }
    }

    /** Offline identity sync: same whitelist rules as PlayerController::update. */
    private static function updatePlayerIdentity(int $userId, array $payload): void
    {
        $pdo = Database::pdo();
        $stmt = $pdo->prepare('SELECT username FROM users WHERE id = ?');
        $stmt->execute([$userId]);
        $current = $stmt->fetch();
        if (!$current) {
            Helpers::fail('user_not_found', 404);
        }
        $username = Helpers::cleanUsername($payload['username'] ?? $current['username']);
        if (strlen($username) < 3) {
            Helpers::fail('invalid_username', 422);
        }
        $displayName = Helpers::cleanDisplayName(
            $payload['displayName'] ?? strtoupper($username),
            strtoupper($username)
        );
        $dupe = $pdo->prepare('SELECT id FROM users WHERE username = ? AND id <> ? LIMIT 1');
        $dupe->execute([$username, $userId]);
        if ($dupe->fetch()) {
            Helpers::fail('username_taken', 409);
        }
        $pdo->prepare('UPDATE users SET username = ?, display_name = ?, last_active_at = NOW() WHERE id = ?')
            ->execute([$username, $displayName, $userId]);
    }

    private static function requireActionId(array $payload, string ...$keys): string
    {
        foreach ($keys as $key) {
            if (!isset($payload[$key])) {
                continue;
            }
            $value = substr(trim((string) $payload[$key]), 0, 36);
            if (preg_match('/^[a-zA-Z0-9-]{8,36}$/', $value)) {
                return $value;
            }
        }
        Helpers::fail('invalid_action_id', 422);
    }
}
