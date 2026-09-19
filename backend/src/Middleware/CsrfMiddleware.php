<?php
declare(strict_types=1);

namespace BugArena\Middleware;

use BugArena\Core\Response;

final class CsrfMiddleware
{
    public static function token(): string
    {
        if (!isset($_SESSION['csrf_token']) || !is_string($_SESSION['csrf_token']) || strlen($_SESSION['csrf_token']) < 32) {
            $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        }
        return $_SESSION['csrf_token'];
    }

    public static function verify(): void
    {
        $expected = $_SESSION['csrf_token'] ?? '';
        $provided = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
        if (!is_string($expected) || strlen($expected) < 32 || !is_string($provided) || !hash_equals($expected, $provided)) {
            Response::error('csrf_failed', 403);
        }
    }
}
