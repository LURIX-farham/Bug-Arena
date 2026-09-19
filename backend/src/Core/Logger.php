<?php
declare(strict_types=1);

namespace BugArena\Core;

final class Logger
{
    private static ?string $file = null;

    public static function configure(?string $file): void
    {
        self::$file = $file;
    }

    public static function info(string $channel, string $message): void
    {
        self::write('INFO', $channel, $message);
    }

    public static function error(string $channel, string $message): void
    {
        self::write('ERROR', $channel, $message);
    }

    private static function write(string $level, string $channel, string $message): void
    {
        $line = sprintf(
            "[%s] %s %s: %s\n",
            date('Y-m-d H:i:s'),
            $level,
            $channel,
            substr($message, 0, 2000)
        );
        if (self::$file !== null) {
            @file_put_contents(self::$file, $line, FILE_APPEND | LOCK_EX);
        }
        error_log($line);
    }
}
