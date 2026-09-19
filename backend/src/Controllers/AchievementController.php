<?php
declare(strict_types=1);

namespace BugArena\Controllers;

use BugArena\Core\Request;
use BugArena\Core\Response;
use BugArena\Middleware\AuthMiddleware;
use BugArena\Services\AchievementService;
use BugArena\Services\StatisticsService;

final class AchievementController
{
    public function index(): void
    {
        $userId = AuthMiddleware::requireAuth();
        Response::json([
            'ok' => true,
            'achievements' => AchievementService::catalog($userId),
        ]);
    }

    /**
     * Notify the server that gameplay happened; the server evaluates all
     * definitions against real statistics. Clients cannot name keys.
     */
    public function evaluate(): void
    {
        $userId = AuthMiddleware::requireAuth();
        $unlocked = AchievementService::evaluate($userId);
        $stats = StatisticsService::get($userId);
        Response::json([
            'ok' => true,
            'unlockedAchievements' => $unlocked,
            'stats' => $stats,
        ]);
    }
}
