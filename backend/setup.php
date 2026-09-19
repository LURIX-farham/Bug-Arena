<?php
declare(strict_types=1);

/**
 * Bug Arena — Database installer / doctor.
 *
 * Browser : http://localhost/BugArena-v1.9.0/backend/setup.php
 * CLI     : php backend/setup.php
 *
 * Checks the MySQL connection, then creates the database, imports the schema
 * and seeds the challenge catalogue when missing. Safe to re-run: existing
 * data is never dropped. Blocked when BUGARENA_ENV=production.
 */

$isCli = PHP_SAPI === 'cli';
$root = __DIR__; // backend/

if (!$isCli) {
    header('Content-Type: text/html; charset=utf-8');
}

$config = require $root . '/config/config.php';
if (($config['app']['environment'] ?? 'local') === 'production') {
    http_response_code(403);
    ($isCli ? print("FORBIDDEN: setup is disabled when BUGARENA_ENV=production\n")
            : print('<h1>Setup disabled in production</h1>'));
    exit;
}

require_once $root . '/src/Core/Autoloader.php';
\BugArena\Core\Autoloader::register();

require_once $root . '/src/Core/Logger.php';
\BugArena\Core\Logger::configure(null);

$lines = [];
$fail = static function (string $msg) use (&$lines, $isCli): never {
    $lines[] = ['fail', $msg];
    output($lines, $isCli, true);
    exit(1);
};
$ok = static function (string $msg) use (&$lines): void {
    $lines[] = ['ok', $msg];
};
$info = static function (string $msg) use (&$lines): void {
    $lines[] = ['info', $msg];
};

function output(array $lines, bool $cli, bool $failed = false): void
{
    if ($cli) {
        foreach ($lines as [$type, $msg]) {
            $icon = match ($type) { 'ok' => '[OK]  ', 'fail' => '[FAIL]', default => '[..]  ' };
            echo $icon . $msg . PHP_EOL;
        }
        return;
    }
    $bg = $failed ? '#8b1a1a' : '#1f2d1f';
    echo '<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8">'
        . '<title>Bug Arena Setup</title>'
        . '<style>body{background:#0d1117;color:#e6edf3;font-family:Tahoma,Arial,sans-serif;max-width:860px;margin:40px auto;padding:0 16px}'
        . 'h1{color:#7cff6b;font-size:20px}.l{padding:8px 12px;border-radius:6px;background:#161b22;margin:6px 0;font-size:14px;line-height:1.8}'
        . '.ok{border-right:4px solid #3fb950}.fail{border-right:4px solid #f85149;background:#2d1a1a}.info{border-right:4px solid #58a6ff}</style></head><body>';
    echo '<h1>' . ($failed ? '❌ نصب با خطا متوقف شد' : '✅ Bug Arena — نصب دیتابیس') . '</h1>';
    foreach ($lines as [$type, $msg]) {
        echo '<div class="' . htmlspecialchars($type) . '">' . htmlspecialchars($msg) . '</div>';
    }
    echo '</body></html>';
}

$db = $config['db'];
$info("اتصال به MySQL: {$db['host']}:{$db['port']} با کاربر «{$db['user']}»");

try {
    $server = new PDO(
        sprintf('mysql:host=%s;port=%d;charset=utf8mb4', $db['host'], (int) $db['port']),
        $db['user'],
        $db['password'],
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_TIMEOUT => 5]
    );
    $version = (string) $server->query('SELECT VERSION()')->fetchColumn();
    $ok("اتصال موفق — نسخه سرور: {$version}");
} catch (Throwable $e) {
    $fail('اتصال به MySQL برقرار نشد: ' . $e->getMessage()
        . ' — بررسی کنید که سرویس MySQL/WAMP روشن باشد و مقادیر backend/.env درست باشند.');
}

$name = str_replace('`', '', (string) $db['name']);
$server->exec("CREATE DATABASE IF NOT EXISTS `{$name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
$server->exec("USE `{$name}`");
$ok("دیتابیس «{$name}» آماده است");

$hasUsers = $server->query("SHOW TABLES LIKE 'users'")->fetch();
if ($hasUsers === false) {
    $statements = \BugArena\Core\DatabaseSetup::exportStatements(
        (string) file_get_contents($root . '/database/schema.sql')
    );
    foreach ($statements as $stmt) {
        if (trim($stmt) !== '') {
            $server->exec(trim($stmt));
        }
    }
    $ok('schema.sql با موفقیت import شد (۱۴ جدول)');
} else {
    $info('schema از قبل نصب بود — import رد شد');
}

$count = (int) $server->query('SELECT COUNT(*) FROM challenges')->fetchColumn();
if ($count === 0 && is_readable($root . '/database/seed_challenges.sql')) {
    $statements = \BugArena\Core\DatabaseSetup::exportStatements(
        (string) file_get_contents($root . '/database/seed_challenges.sql')
    );
    foreach ($statements as $stmt) {
        if (trim($stmt) !== '') {
            $server->exec(trim($stmt));
        }
    }
    $ok('seed_challenges.sql با موفقیت import شد');
} elseif ($count > 0) {
    $info("چالش‌ها از قبل موجود بودند ({$count} رکورد) — seed رد شد");
}

$tables = (int) $server->query(
    "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '{$name}'"
)->fetchColumn();
$users = (int) $server->query('SELECT COUNT(*) FROM users')->fetchColumn();

$ok("نصب کامل شد — {$tables} جدول، {$users} کاربر. حالا /health باید {\"ok\":true} بدهد.");

output($lines, $isCli, false);
