<?php
declare(strict_types=1);

namespace BugArena\Middleware;

use BugArena\Core\Database;
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

    public static function requireAdmin(): int
    {
        $userId = self::requireAuth();
        $stmt = Database::pdo()->prepare(
            'SELECT is_admin FROM users WHERE id = ? AND status = "active" AND deleted_at IS NULL LIMIT 1'
        );
        $stmt->execute([$userId]);
        $row = $stmt->fetch();
        if (!$row || (int) $row['is_admin'] !== 1) {
            Response::error('forbidden', 403);
        }
        return $userId;
    }
}
