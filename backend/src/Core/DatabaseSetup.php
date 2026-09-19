<?php
declare(strict_types=1);

namespace BugArena\Core;

use PDO;
use Throwable;

/**
 * One-time database provisioning.
 *
 * Historically BugArena required the developer to open phpMyAdmin and import
 * backend/database/schema.sql (and seed_challenges.sql) by hand. Forgetting
 * that step produced the infamous {"ok":false,"error":"database_unavailable"}
 * health response and a "Failed to fetch" error on every register attempt.
 *
 * This class removes that manual step for local environments (WAMP/XAMPP/
 * Laragon): on the first request it creates the database, imports the schema
 * and seeds the challenge catalogue. It is opt-out via BUGARENA_AUTO_SETUP=0
 * and never runs in production environments.
 */
final class DatabaseSetup
{
    /** @var bool Prevent repeated attempts within the same request. */
    private static bool $attempted = false;

    public static function isAttempted(): bool
    {
        return self::$attempted;
    }

    /**
     * Ensure host -> database -> schema -> seed chain, returning a PDO bound
     * to the configured database, or null when provisioning was disabled or
     * the MySQL server itself could not be reached.
     *
     * @param array $db {host, port, name, user, password, charset, auto_setup?}
     */
    public static function ensure(array $db): ?PDO
    {
        self::$attempted = true;

        $charset = $db['charset'] ?? 'utf8mb4';
        $dsn = sprintf(
            'mysql:host=%s;port=%d;charset=%s',
            $db['host'],
            (int) ($db['port'] ?? 3306),
            $charset
        );

        try {
            $server = new PDO($dsn, $db['user'], $db['password'], [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_TIMEOUT => 5,
            ]);
        } catch (Throwable $e) {
            // MySQL server itself unreachable (not running, wrong port, …).
            Logger::error('db_setup', 'server unreachable: ' . $e->getMessage());
            return null;
        }

        try {
            $name = str_replace('`', '', (string) $db['name']);
            $server->exec(
                "CREATE DATABASE IF NOT EXISTS `{$name}`
                 CHARACTER SET " . ($charset === '' ? 'utf8mb4' : $charset) . "
                 COLLATE utf8mb4_unicode_ci"
            );
            $server->exec("USE `{$name}`");

            // Schema import only when the core table is missing, so existing
            // installations are never touched.
            $hasUsers = $server->query("SHOW TABLES LIKE 'users'")->fetch();
            if ($hasUsers === false) {
                self::runSqlFile($server, dirname(__DIR__, 2) . '/database/schema.sql');
                Logger::info('db_setup', 'schema.sql imported');
            }

            // Seed the challenge catalogue only for a fresh install.
            $count = (int) $server->query('SELECT COUNT(*) FROM challenges')->fetchColumn();
            if ($count === 0) {
                self::runSqlFile($server, dirname(__DIR__, 2) . '/database/seed_challenges.sql');
                Logger::info('db_setup', 'seed_challenges.sql imported');
            }
        } catch (Throwable $e) {
            Logger::error('db_setup', $e->getMessage());
            return null;
        }

        return $server;
    }

    /**
     * Public helper for backend/setup.php: parse a SQL dump into individual
     * statements without executing them.
     *
     * @return string[]
     */
    public static function exportStatements(string $sql): array
    {
        return self::splitStatements($sql);
    }

    /**
     * Execute a .sql dump: strips SQL comments, splits on semicolons that sit
     * outside string literals and runs each statement separately. This works
     * on every pdo_mysql build regardless of multi-statement support.
     */
    private static function runSqlFile(PDO $pdo, string $path): void
    {
        if (!is_readable($path)) {
            throw new \RuntimeException("SQL file not readable: {$path}");
        }

        $sql = (string) file_get_contents($path);
        foreach (self::splitStatements($sql) as $statement) {
            $trimmed = trim($statement);
            if ($trimmed !== '') {
                $pdo->exec($trimmed);
            }
        }
    }

    /** @return string[] */
    private static function splitStatements(string $sql): array
    {
        $statements = [];
        $current = '';
        $length = strlen($sql);
        $inSingle = false;
        $inDouble = false;
        $inLineComment = false;
        $inBlockComment = false;

        for ($i = 0; $i < $length; $i++) {
            $char = $sql[$i];
            $next = $i + 1 < $length ? $sql[$i + 1] : '';

            if ($inLineComment) {
                if ($char === "\n") {
                    $inLineComment = false;
                    $current .= $char;
                }
                continue;
            }

            if ($inBlockComment) {
                if ($char === '*' && $next === '/') {
                    $inBlockComment = false;
                    $i++;
                }
                continue;
            }

            if (!$inSingle && !$inDouble && !$inBlockComment && $char === '-' && $next === '-') {
                $inLineComment = true;
                $i++;
                continue;
            }

            if (!$inSingle && !$inDouble && !$inBlockComment && $char === '#') {
                $inLineComment = true;
                continue;
            }

            if (!$inSingle && !$inDouble && $char === '/' && $next === '*') {
                $inBlockComment = true;
                $i++;
                continue;
            }

            if (!$inDouble && $inSingle && $char === "'") {
                // Handle escaped quotes inside single-quoted strings.
                if (isset($sql[$i + 1]) && ($sql[$i + 1] === "'" || $sql[$i + 1] === '\\')) {
                    $current .= $char . $sql[$i + 1];
                    $i++;
                    continue;
                }
                $inSingle = false;
                $current .= $char;
                continue;
            }

            if (!$inSingle && $inDouble && $char === '"') {
                if (isset($sql[$i + 1]) && ($sql[$i + 1] === '"' || $sql[$i + 1] === '\\')) {
                    $current .= $char . $sql[$i + 1];
                    $i++;
                    continue;
                }
                $inDouble = false;
                $current .= $char;
                continue;
            }

            if (!$inSingle && !$inDouble && !$inBlockComment && !$inLineComment && $char === "'") {
                $inSingle = true;
                $current .= $char;
                continue;
            }

            if (!$inSingle && !$inDouble && !$inBlockComment && !$inLineComment && $char === '"') {
                $inDouble = true;
                $current .= $char;
                continue;
            }

            if (!$inSingle && !$inDouble && !$inBlockComment && !$inLineComment && $char === ';') {
                $statements[] = $current;
                $current = '';
                continue;
            }

            $current .= $char;
        }

        if (trim($current) !== '') {
            $statements[] = $current;
        }

        return $statements;
    }
}
