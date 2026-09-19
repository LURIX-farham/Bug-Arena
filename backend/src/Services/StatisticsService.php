<?php
declare(strict_types=1);

namespace BugArena\Services;

use BugArena\Core\Database;

/**
 * Player statistics: recomputed from real rows inside the same transaction
 * as the gameplay event that produced them. XP increments are additive;
 * everything else is derived from source tables, so drift is impossible.
 */
final class StatisticsService
{
    public static function ensureRow(int $userId): void
    {
        Database::pdo()->prepare(
            'INSERT IGNORE INTO player_statistics (user_id) VALUES (?)'
        )->execute([$userId]);
    }

    /**
     * Record one submission attempt (accepted or failed).
     * $xpDelta is the score improvement awarded by the server.
     */
    public static function applySubmission(
        int $userId,
        int $scoreDelta,
        bool $improved,
        int $solveSeconds
    ): void {
        $pdo = Database::pdo();
        self::ensureRow($userId);

        $pdo->prepare(
            'UPDATE player_statistics SET
                total_submissions = total_submissions + 1,
                total_solve_seconds = total_solve_seconds + ?,
                xp = xp + ?
             WHERE user_id = ?'
        )->execute([max(0, $solveSeconds), max(0, $scoreDelta), $userId]);

        self::refreshDerived($userId);
    }

    public static function applyXp(int $userId, int $xpDelta): void
    {
        if ($xpDelta <= 0) {
            return;
        }
        self::ensureRow($userId);
        Database::pdo()->prepare('UPDATE player_statistics SET xp = xp + ? WHERE user_id = ?')
            ->execute([$xpDelta, $userId]);
        self::refreshDerived($userId);
    }

    /** Recompute all counters derivable from source tables + level from xp. */
    public static function refreshDerived(int $userId): void
    {
        $pdo = Database::pdo();
        self::ensureRow($userId);
        $pdo->prepare(
            'UPDATE player_statistics s SET
                total_score = COALESCE((SELECT SUM(score) FROM submissions WHERE user_id = s.user_id AND status = "accepted"), 0),
                solved_challenges = COALESCE((SELECT COUNT(*) FROM submissions WHERE user_id = s.user_id AND status = "accepted"), 0),
                accepted_submissions = COALESCE((SELECT COUNT(*) FROM submissions WHERE user_id = s.user_id AND status = "accepted"), 0),
                best_score = COALESCE((SELECT MAX(score) FROM submissions WHERE user_id = s.user_id AND status = "accepted"), 0),
                avg_solve_seconds = COALESCE((SELECT AVG(solve_seconds) FROM submissions WHERE user_id = s.user_id AND status = "accepted" AND solve_seconds > 0), 0)
             WHERE s.user_id = ?'
        )->execute([$userId]);

        $stmt = $pdo->prepare('SELECT xp FROM player_statistics WHERE user_id = ?');
        $stmt->execute([$userId]);
        $xp = (int) ($stmt->fetchColumn() ?: 0);
        $pdo->prepare('UPDATE player_statistics SET level = ? WHERE user_id = ?')
            ->execute([ProgressionService::levelFromXp($xp), $userId]);
    }

    /** Consecutive-day activity streak from submissions + matches. */
    public static function refreshStreaks(int $userId): void
    {
        $pdo = Database::pdo();
        self::ensureRow($userId);
        $stmt = $pdo->prepare(
            '(SELECT DATE(submitted_at) AS d FROM submissions WHERE user_id = ?)
             UNION
             (SELECT DATE(played_at) FROM competitive_matches WHERE user_id = ?)
             ORDER BY d DESC LIMIT 90'
        );
        $stmt->execute([$userId, $userId]);
        $dates = array_map(static fn (array $r) => $r['d'], $stmt->fetchAll());

        $current = 0;
        $best = 0;
        $run = 0;
        $prev = null;
        foreach ($dates as $date) {
            if ($prev !== null && strtotime($prev) - strtotime($date) === 86400) {
                $run++;
            } else {
                $run = 1;
            }
            $best = max($best, $run);
            $prev = $date;
        }
        // Current streak only counts if the latest activity is today/yesterday.
        if ($dates !== [] && strtotime(date('Y-m-d')) - strtotime($dates[0]) <= 86400) {
            $current = 0;
            $prev = null;
            foreach ($dates as $date) {
                if ($prev !== null && strtotime($prev) - strtotime($date) === 86400) {
                    $current++;
                } else {
                    $current = 1;
                }
                $prev = $date;
            }
        }

        $pdo->prepare('UPDATE player_statistics SET current_streak = ?, best_streak = GREATEST(best_streak, ?) WHERE user_id = ?')
            ->execute([$current, $best, $userId]);
    }

    /** @return array full statistics row + derived progression. */
    public static function get(int $userId): array
    {
        self::ensureRow($userId);
        $stmt = Database::pdo()->prepare('SELECT * FROM player_statistics WHERE user_id = ?');
        $stmt->execute([$userId]);
        $stats = $stmt->fetch();
        $xp = (int) $stats['xp'];
        $progression = ProgressionService::describe($xp);

        return [
            'totalScore' => (int) $stats['total_score'] + (int) ($stats['duel_points'] ?? 0),
            'xp' => $xp,
            'level' => $progression['level'],
            'rank' => $progression['rank'],
            'nextLevelXp' => $progression['nextLevelXp'],
            'currentLevelXp' => $progression['currentLevelXp'],
            'progress' => $progression['progress'],
            'solvedChallenges' => (int) $stats['solved_challenges'],
            'totalSubmissions' => (int) $stats['total_submissions'],
            'acceptedSubmissions' => (int) $stats['accepted_submissions'],
            'bestScore' => (int) $stats['best_score'],
            'currentStreak' => (int) $stats['current_streak'],
            'bestStreak' => (int) $stats['best_streak'],
            'avgSolveSeconds' => (int) $stats['avg_solve_seconds'],
        ];
    }
}
