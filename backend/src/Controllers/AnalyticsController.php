<?php
declare(strict_types=1);

namespace BugArena\Controllers;

use BugArena\Core\Request;
use BugArena\Core\Response;
use BugArena\Middleware\AuthMiddleware;
use BugArena\Services\AnalyticsService;

final class AnalyticsController
{
    public function dashboard(): void
    {
        $userId = AuthMiddleware::requireAuth();
        Response::json(['ok' => true, 'analytics' => AnalyticsService::dashboard($userId)]);
    }
}
