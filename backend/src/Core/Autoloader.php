<?php
declare(strict_types=1);

namespace BugArena\Core;

/**
 * Minimal PSR-4 style autoloader: BugArena\ => backend/src/
 */
final class Autoloader
{
    public static function register(): void
    {
        spl_autoload_register(static function (string $class): void {
            $prefix = 'BugArena\\';
            if (!str_starts_with($class, $prefix)) {
                return;
            }
            $relative = substr($class, strlen($prefix));
            $file = dirname(__DIR__) . '/' . str_replace('\\', '/', $relative) . '.php';
            if (is_file($file)) {
                require $file;
            }
        });
    }
}
