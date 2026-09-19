<?php
declare(strict_types=1);

namespace BugArena\Middleware;

use BugArena\Core\Request;
use BugArena\Core\Response;

/**
 * CORS headers + CSRF defense: for state-changing requests the Origin/Referer
 * (when present, i.e. a browser) must match an allowed frontend origin.
 * Combined with SameSite=Lax session cookies this blocks cross-site forgery.
 */
final class CorsMiddleware
{
    public function __construct(private readonly array $allowedOrigins)
    {
    }

    /**
     * Emit CORS headers as early as possible.
     *
     * If a fatal database failure happens during bootstrap (session_start
     * reads sessions from MySQL), the response must still carry CORS headers.
     * Without them the browser swallows the real 503 and the frontend only
     * sees an opaque "TypeError: Failed to fetch".
     */
    public static function emitHeaders(?array $allowedOrigins = null): void
    {
        $origins = $allowedOrigins ?? ($GLOBALS['bug_arena_config']['cors']['allowed_origins'] ?? []);
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        if ($origin === '') {
            return;
        }

        $allowed = array_map(static fn (string $url): string => rtrim($url, '/'), $origins);
        if (in_array(rtrim($origin, '/'), $allowed, true)) {
            header('Access-Control-Allow-Origin: ' . $origin);
            header('Vary: Origin');
            header('Access-Control-Allow-Credentials: true');
            header('Access-Control-Allow-Headers: Content-Type, X-CSRF-Token');
            header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        }
    }

    public function handle(Request $request): void
    {
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        $allowed = array_map(static fn (string $url): string => rtrim($url, '/'), $this->allowedOrigins);

        if ($origin !== '' && in_array(rtrim($origin, '/'), $allowed, true)) {
            self::emitHeaders($this->allowedOrigins);
        }

        if ($request->method === 'OPTIONS') {
            http_response_code(204);
            exit;
        }

        if (in_array($request->method, ['GET', 'HEAD', 'OPTIONS'], true)) {
            return;
        }

        $referer = $_SERVER['HTTP_REFERER'] ?? '';
        $hasSessionCookie = ($_COOKIE[session_name()] ?? '') !== '';

        if ($origin === '' && $referer === '') {
            if ($hasSessionCookie) {
                // A request that carries our session cookie but no browser
                // origin headers is not a plain curl call — reject it.
                Response::error('origin_not_allowed', 403);
            }
            return; // non-browser client without a session (tests, curl)
        }

        foreach (array_filter([$origin, $referer]) as $header) {
            $parts = parse_url($header);
            if (isset($parts['scheme'], $parts['host'])) {
                $candidate = $parts['scheme'] . '://' . $parts['host']
                    . (isset($parts['port']) ? ':' . $parts['port'] : '');
                if (in_array(rtrim($candidate, '/'), $allowed, true)) {
                    return;
                }
            }
        }

        Response::error('origin_not_allowed', 403);
    }
}
