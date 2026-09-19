<?php
declare(strict_types=1);

namespace BugArena\Controllers;

use BugArena\Core\Database;
use BugArena\Core\Response;

final class HealthController
{
    public function show(): void
    {
        $config = $GLOBALS['bug_arena_config'];
        try {
            Database::pdo()->query('SELECT 1');
            Response::json([
                'ok' => true,
                'service' => 'bug-arena-api',
                'version' => $config['app']['version'] ?? '2.0.0',
                'database' => 'mysql',
                'time' => date('c'),
            ]);
        } catch (\Throwable) {
            Response::json(['ok' => false, 'error' => 'database_unavailable'], 503);
        }
    }
}
