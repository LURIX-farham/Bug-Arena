<?php

/**
 * Central configuration.
 *
 * Values resolve in this order:
 *   1. A .env file at the project root (KEY=VALUE lines, # comments).
 *   2. Real environment variables (getenv).
 *   3. The defaults below (safe for a stock WampServer install).
 */

$envFile = dirname(__DIR__, 2) . '/.env';
if (is_readable($envFile)) {
    foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) {
            continue;
        }
        [$key, $value] = explode('=', $line, 2);
        $key = trim($key);
        $value = trim($value, " \t\n\r\0\x0B\"'");
        if ($key !== '' && getenv($key) === false) {
            putenv("$key=$value");
        }
    }
}

$env = static fn (string $key, string $fallback): string => getenv($key) !== false ? (string) getenv($key) : $fallback;

$environment = $env('BUGARENA_ENV', 'local');
$isProduction = $environment === 'production';

return [
    'app' => [
        'name' => 'Bug Arena API',
        'version' => '2.1.0',
        'environment' => $environment,
        'debug' => !$isProduction && $env('BUGARENA_DEBUG', '1') === '1',
    ],

    'db' => [
        'host' => $env('BUGARENA_DB_HOST', 'localhost'),
        'port' => (int) $env('BUGARENA_DB_PORT', '3306'),
        'name' => $env('BUGARENA_DB_NAME', 'bug_arena'),
        'user' => $env('BUGARENA_DB_USER', 'root'),
        'password' => $env('BUGARENA_DB_PASSWORD', ''),
        'charset' => 'utf8mb4',
        // Automatically create the bug_arena database and import schema +
        // seed on the first request of a fresh local install. Disabled
        // implicitly in production. Set BUGARENA_AUTO_SETUP=0 to opt out.
        'auto_setup' => !$isProduction && $env('BUGARENA_AUTO_SETUP', '1') === '1',
    ],

    'session' => [
        'lifetime' => (int) $env('BUGARENA_SESSION_LIFETIME', '7200'), // seconds of inactivity before expiry
    ],

    'cors' => [
        'allowed_origins' => array_values(array_filter(
            array_map(
                'trim',
                explode(',', $env(
                    'BUGARENA_CORS_ORIGINS',
                    'http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173,http://localhost,http://127.0.0.1'
                ))
            ),
            static fn (string $origin): bool => $origin !== ''
        )),
    ],

    'max_code_length' => (int) $env('BUGARENA_MAX_CODE_LENGTH', '200000'),
    // Batch sync ceiling: max queued actions accepted per /sync request.
    'max_sync_batch' => 50,
];
