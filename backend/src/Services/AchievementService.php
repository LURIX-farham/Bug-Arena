<?php
declare(strict_types=1);

namespace BugArena\Services;

use BugArena\Core\Database;

/**
 * Achievements are evaluated SERVER-SIDE from real persisted activity.
 * The client can notify ("evaluate") but can never unlock a specific key.
 */
final class AchievementService
{
    /** @return array<int, array> definitions the user has unlocked */
    public static function forUser(int $userId): array
    {
        $pdo = Database::pdo();
        $stmt = $pdo->prepare(
            'SELECT a.achievement_key, a.title, a.description, a.icon, a.category,
                    a.metric, a.target, a.xp_reward, ua.unlocked_at
             FROM user_achievements ua
             JOIN achievements a ON a.achievement_key = ua.achievement_key
             WHERE ua.user_id = ?
             ORDER BY ua.unlocked_at ASC'
        );
        $stmt->execute([$userId]);
        return array_map(static fn (array $r) => [
            'key' => $r['achievement_key'],
            'title' => $r['title'],
            'description' => $r['description'],
            'icon' => $r['icon'],
            'category' => $r['category'],
            'xpReward' => (int) $r['xp_reward'],
            'unlockedAt' => $r['unlocked_at'],
        ], $stmt->fetchAll());
    }

    /** @return array<int, array> all definitions + locked/unlocked state */
    public static function catalog(int $userId): array
    {
        $pdo = Database::pdo();
        $unlocked = [];
        foreach (self::forUser($userId) as $row) {
            $unlocked[$row['key']] = $row['unlockedAt'];
        }
        $rows = $pdo->query(
            'SELECT achievement_key, title, description, icon, category, metric, target, xp_reward, sort_order
             FROM achievements ORDER BY sort_order ASC'
        )->fetchAll();
        return array_map(static fn (array $r) => [
            'key' => $r['achievement_key'],
            'title' => $r['title'],
            'description' => $r['description'],
            'icon' => $r['icon'],
            'category' => $r['category'],
            'target' => (int) $r['target'],
            'xpReward' => (int) $r['xp_reward'],
            'unlocked' => isset($unlocked[$r['achievement_key']]),
            'unlockedAt' => $unlocked[$r['achievement_key']] ?? null,
        ], $rows);
    }

    /**
     * Evaluate every locked definition against the user's live statistics and
     * unlock + reward whatever now qualifies. Returns newly unlocked rows.
     *
     * @return array<int, array>
     */
    public static function evaluate(int $userId): array
    {
        $pdo = Database::pdo();
        StatisticsService::refreshDerived($userId);
        StatisticsService::refreshStreaks($userId);

        $stmt = $pdo->prepare('SELECT * FROM player_statistics WHERE user_id = ?');
        $stmt->execute([$userId]);
        $stats = $stmt->fetch();
        if (!$stats) {
            return [];
        }

        $metrics = self::buildMetrics($userId, $stats);
        $level = ProgressionService::levelFromXp((int) $stats['xp']);
        $metrics['level'] = $level;
        $userStmt = $pdo->prepare('SELECT rating, wins FROM users WHERE id = ?');
        $userStmt->execute([$userId]);
        $userRow = $userStmt->fetch();
        if ($userRow) {
            $metrics['rating'] = (int) $userRow['rating'];
            $metrics['wins'] = (int) $userRow['wins'];
        }

        $definitions = $pdo->query(
            'SELECT * FROM achievements
             WHERE achievement_key NOT IN (SELECT achievement_key FROM user_achievements WHERE user_id = ' . (int) $userId . ')'
        )->fetchAll();

        $newlyUnlocked = [];
        foreach ($definitions as $def) {
            $metric = $def['metric'];
            if (!isset($metrics[$metric])) {
                continue;
            }
            if ((int) $metrics[$metric] >= (int) $def['target']) {
                $insert = $pdo->prepare(
                    'INSERT IGNORE INTO user_achievements (user_id, achievement_key) VALUES (?, ?)'
                );
                $insert->execute([$userId, $def['achievement_key']]);
                if ($insert->rowCount() > 0) {
                    $newlyUnlocked[] = [
                        'key' => $def['achievement_key'],
                        'title' => $def['title'],
                        'description' => $def['description'],
                        'icon' => $def['icon'],
                        'xpReward' => (int) $def['xp_reward'],
                    ];
                }
            }
        }

        foreach ($newlyUnlocked as $achievement) {
            StatisticsService::applyXp($userId, $achievement['xpReward']);
        }

        return $newlyUnlocked;
    }

    private static function buildMetrics(int $userId, array $stats): array
    {
        $pdo = Database::pdo();
        // time_limit lives on the challenges table, not on submissions — join it.
        $extra = $pdo->prepare(
            'SELECT
                SUM(s.attempts = 1) AS first_try_solves,
                SUM(s.hardened = 1) AS hardened_count,
                SUM(s.time_left >= c.time_limit * 0.8) AS fast_solves
             FROM submissions s
             JOIN challenges c ON c.id = s.challenge_id
             WHERE s.user_id = ? AND s.status = "accepted"'
        );
        $extra->execute([$userId]);
        $row = $extra->fetch() ?: [];

        return [
            'accepted_submissions' => (int) $stats['accepted_submissions'],
            'best_streak' => (int) $stats['best_streak'],
            'first_try_solves' => (int) ($row['first_try_solves'] ?? 0),
            'hardened_count' => (int) ($row['hardened_count'] ?? 0),
            'fast_solves' => (int) ($row['fast_solves'] ?? 0),
        ];
    }
}
