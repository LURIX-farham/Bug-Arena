<?php
declare(strict_types=1);

namespace BugArena\Controllers;

use BugArena\Core\Database;
use BugArena\Core\Request;
use BugArena\Core\Response;
use BugArena\Middleware\AuthMiddleware;
use BugArena\Middleware\RateLimitMiddleware;
use BugArena\Utils\Helpers;

final class EventController
{
    /** Batched activity events (also serves as the sync-queue sink). */
    public function store(Request $request): void
    {
        $userId = AuthMiddleware::requireAuth();
        (new RateLimitMiddleware(120, 60))->handle('events:' . $userId);
        $body = $request->body;

        $events = isset($body['events']) && is_array($body['events'])
            ? array_filter($body['events'], 'is_array')
            : [$body];
        $count = self::insertEvents($userId, $events);
        Response::json(['ok' => true, 'count' => $count], 201);
    }

    /** Shared pipeline (HTTP + /sync batch). */
    public static function insertEvents(int $userId, array $events): int
    {
        $pdo = Database::pdo();
        $events = array_slice(array_filter($events, 'is_array'), 0, 100);
        if ($events === []) {
            Helpers::fail('no_events', 422);
        }

        $insert = $pdo->prepare('INSERT INTO arena_events (user_id, event_type, payload) VALUES (?, ?, ?)');
        $count = 0;
        foreach ($events as $event) {
            $payload = is_array($event['payload'] ?? null) ? $event['payload'] : [];
            $encoded = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            if ($encoded === false || strlen($encoded) > 10000) {
                $encoded = '{"truncated":true}';
            }
            $insert->execute([
                $userId,
                Helpers::cleanEnum($event['eventType'] ?? 'UNKNOWN', 'UNKNOWN', 60),
                $encoded,
            ]);
            $count++;
        }
        return $count;
    }
}
