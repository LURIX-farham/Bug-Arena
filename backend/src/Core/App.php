<?php
declare(strict_types=1);

namespace BugArena\Core;

use BugArena\Middleware\CorsMiddleware;
use Throwable;

/**
 * Application bootstrap: config, error handling, secure sessions on MySQL,
 * autoloading. Produces no output and performs no routing.
 */
final class App
{
    public static function boot(): array
    {
        $config = require dirname(__DIR__, 2) . '/config/config.php';
        $GLOBALS['bug_arena_config'] = $config;

        ini_set('display_errors', '0');
        ini_set('log_errors', '1');
        error_reporting(E_ALL);

        // Force PHP to UTC so every strtotime()/time()/date() call uses the
        // same frame of reference as MySQL NOW(). Without this, a php.ini
        // default like Asia/Tehran makes PHP interpret a UTC DATETIME column
        // as local wall time — so duel invitations look already expired the
        // moment they are written. Database::pdo() mirrors this on the MySQL
        // side with `SET time_zone = '+00:00'`.
        date_default_timezone_set('UTC');

        $logDir = dirname(__DIR__, 2) . '/logs';
        if (!is_dir($logDir)) {
            @mkdir($logDir, 0775, true);
        }
        // Register the autoloader before touching any other BugArena class.
        // The Autoloader class itself must be loaded manually first: it is the
        // bootstrapping class and cannot autoload itself.
        require_once __DIR__ . '/Autoloader.php';
        Autoloader::register();

        Logger::configure(is_dir($logDir) ? $logDir . '/api-' . date('Y-m-d') . '.log' : null);

        // MySQL-backed sessions with strict cookie flags + expiration.
        $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
            || (int) ($_SERVER['SERVER_PORT'] ?? 0) === 443;
        session_set_cookie_params([
            'lifetime' => 0,
            'path' => '/',
            'domain' => '',
            'secure' => $isHttps,
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
        ini_set('session.use_strict_mode', '1');
        ini_set('session.use_only_cookies', '1');
        ini_set('session.gc_maxlifetime', (string) ($config['session']['lifetime'] ?? 7200));
        session_name('BUGARENA_SESSION');

        Database::configure($config['db']);

        // CORS headers go out BEFORE anything can terminate the request. A DB
        // outage during session_start() must still reach the browser as a
        // readable 503 JSON, not an opaque "Failed to fetch" network error.
        CorsMiddleware::emitHeaders($config['cors']['allowed_origins'] ?? []);

        // CORS preflight must not require a live database/session. Otherwise a
        // DB outage masquerades as a CORS failure and the browser cannot even
        // report the real API problem.
        if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'OPTIONS') {
            try {
                session_set_save_handler(new DatabaseSessionHandler(), true);
                session_start();
            } catch (Throwable $e) {
                Logger::error('session_start', $e->getMessage());
                Response::json(['ok' => false, 'error' => 'database_unavailable'], 503);
            }
        }

        return $config;
    }

    public static function run(): void
    {
        $config = self::boot();

        $path = self::resolveRequestPath();

        $request = new Request($path);

        (new CorsMiddleware(array_merge(
            $config['cors']['allowed_origins'] ?? [],
            [$config['cors_origin'] ?? '']
        )))->handle($request);

        $router = new Router();
        (require dirname(__DIR__, 2) . '/routes/api.php')($router);
        $router->dispatch($request);
    }

    /**
     * Resolve the route path for hosts that mount the API under /api
     * (cPanel/LiteSpeed/Apache variants differ in REQUEST_URI / SCRIPT_NAME).
     */
    private static function resolveRequestPath(): string
    {
        // Prefer values that survive Apache/LiteSpeed rewrites to the front controller.
        $candidates = [
            $_SERVER['PATH_INFO'] ?? null,
            $_SERVER['ORIG_PATH_INFO'] ?? null,
            $_SERVER['REDIRECT_URL'] ?? null,
            $_SERVER['REDIRECT_REQUEST_URI'] ?? null,
            $_SERVER['HTTP_X_ORIGINAL_URL'] ?? null,
            $_SERVER['HTTP_X_REWRITE_URL'] ?? null,
            $_SERVER['REQUEST_URI'] ?? null,
        ];

        $path = '/';
        foreach ($candidates as $candidate) {
            if (!is_string($candidate) || $candidate === '') {
                continue;
            }
            $candidatePath = parse_url($candidate, PHP_URL_PATH);
            if (!is_string($candidatePath) || $candidatePath === '') {
                continue;
            }
            // Skip pure front-controller paths with no route info.
            $normalized = rtrim($candidatePath, '/');
            if ($normalized === '' || str_ends_with($normalized, '/index.php') || $normalized === '/index.php') {
                continue;
            }
            $path = $candidatePath;
            break;
        }

        // Fallback: SCRIPT_NAME dirname strip on REQUEST_URI
        if ($path === '/' || $path === '') {
            $path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
            $scriptName = str_replace('\\', '/', (string) ($_SERVER['SCRIPT_NAME'] ?? ''));
            $base = rtrim(dirname($scriptName), '/');
            if ($base !== '' && $base !== '/' && $base !== '.' && str_starts_with($path, $base)) {
                $remainder = substr($path, strlen($base)) ?: '/';
                if ($remainder !== '/index.php' && $remainder !== 'index.php') {
                    $path = $remainder;
                }
            }
        }

        $path = rawurldecode($path);

        foreach (['/api/public', '/api'] as $mount) {
            if ($path === $mount || str_starts_with($path, $mount . '/')) {
                $path = substr($path, strlen($mount)) ?: '/';
            }
        }

        if (str_starts_with($path, '/index.php/')) {
            $path = substr($path, strlen('/index.php')) ?: '/';
        } elseif ($path === '/index.php') {
            $path = '/';
        }

        // Drop probe scripts if they ever reach the router
        if (str_starts_with($path, '/probe-')) {
            $path = '/';
        }

        $path = '/' . trim($path, '/');
        if ($path !== '/') {
            $path = rtrim($path, '/') ?: '/';
        }
        return $path;
    }
}
