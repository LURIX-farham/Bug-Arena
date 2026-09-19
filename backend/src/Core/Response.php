<?php
declare(strict_types=1);

namespace BugArena\Core;

final class Response
{
    public static function json(array $payload, int $status = 200): never
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store');
        header('X-Content-Type-Options: nosniff');
        echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    public static function error(string $code, int $status, array $extra = []): never
    {
        self::json(['ok' => false, 'error' => $code] + $extra, $status);
    }

    public static function ok(array $payload = []): never
    {
        self::json(['ok' => true] + $payload);
    }
}
