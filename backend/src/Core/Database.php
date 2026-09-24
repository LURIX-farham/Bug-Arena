<?php
declare(strict_types=1);

namespace BugArena\Core;

use PDO;
use Throwable;

final class Database
{
    private static ?PDO $pdo = null;
    private static array $config = [];
    private static string $lastError = '';
    private static bool $autoSetup = false;

    public static function configure(array $config): void
    {
        self::$config = $config;
        self::$autoSetup = (bool) ($config['auto_setup'] ?? false);
    }

    /** Last connection error message (for diagnostics in debug mode). */
    public static function lastError(): string
    {
        return self::$lastError;
    }

    /** Was a connection ever established successfully? */
    public static function connected(): bool
    {
        return self::$pdo instanceof PDO;
    }

    public static function pdo(): PDO
    {
        if (self::$pdo instanceof PDO) {
            return self::$pdo;
        }
        $db = self::$config;
        $dsn = sprintf(
            'mysql:host=%s;port=%d;dbname=%s;charset=%s',
            $db['host'],
            (int) ($db['port'] ?? 3306),
            $db['name'],
            $db['charset'] ?? 'utf8mb4'
        );
        try {
            self::$pdo = new PDO($dsn, $db['user'], $db['password'], [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]);
        } catch (Throwable $e) {
            self::$lastError = $e->getMessage();
            Logger::error('db_connect', $e->getMessage());

            // Fresh local install? Provision database + schema + seed once,
            // then hand back a live connection. (Never enabled in production.)
            if (self::$autoSetup && !DatabaseSetup::isAttempted()) {
                $provisioned = DatabaseSetup::ensure($db);
                if ($provisioned instanceof PDO) {
                    Logger::info('db_connect', 'auto-setup completed, database ready');
                    try {
                        // Retry the canonical connection (consistent PDO flags).
                        self::$pdo = new PDO($dsn, $db['user'], $db['password'], [
                            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                            PDO::ATTR_EMULATE_PREPARES => false,
                        ]);
                    } catch (Throwable $e2) {
                        // Server reachable but retry failed — reuse provisioned handle.
                        self::$lastError = $e2->getMessage();
                        self::$pdo = $provisioned;
                    }
                    return self::$pdo;
                }
            }

            // Make sure the browser receives the real 503 JSON instead of a
            // CORS-blocked opaque "Failed to fetch" network error. The raw
            // PDO message is production-sensitive (it can name the DB host
            // or user), so it is only exposed when debug mode is on.
            \BugArena\Middleware\CorsMiddleware::emitHeaders();
            $debug = (bool) ($GLOBALS['bug_arena_config']['app']['debug'] ?? false);
            Response::json([
                'ok' => false,
                'error' => 'database_unavailable',
                'reason' => $debug ? self::$lastError : null,
            ], 503);
        }
        return self::$pdo;
    }

    /** Run a callable inside a transaction, rolling back on any throwable. */
    public static function transaction(callable $fn): mixed
    {
        $pdo = self::pdo();
        $pdo->beginTransaction();
        try {
            $result = $fn($pdo);
            $pdo->commit();
            return $result;
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }
    }
}
