<?php
declare(strict_types=1);

namespace BugArena\Middleware;

use BugArena\Core\Response;

/**
 * Identity always comes from the server session — never from client data.
 */
final class AuthMiddleware
{
    public static function userId(): ?int
    {
        return isset($_SESSION['user_id']) ? (int) $_SESSION['user_id'] : null;
    }

    public static function requireAuth(): int
    {
        $userId = self::userId();
        if (!$userId) {
            Response::error('unauthorized', 401);
        }
        return $userId;
    }
}
