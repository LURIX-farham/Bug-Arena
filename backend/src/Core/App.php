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

        $path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
        $base = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/')), '/');
        if ($base !== '' && $base !== '.' && str_starts_with($path, $base)) {
            $path = substr($path, strlen($base)) ?: '/';
        }
        if ($path === '') {
            $path = '/';
        }

        $request = new Request($path);
        (new CorsMiddleware(array_merge(
            $config['cors']['allowed_origins'] ?? [],
            [$config['cors_origin'] ?? '']
        )))->handle($request);

        $router = new Router();
        (require dirname(__DIR__, 2) . '/routes/api.php')($router);
        $router->dispatch($request);
    }
}
