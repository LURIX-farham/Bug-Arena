<?php
declare(strict_types=1);

namespace BugArena\Services;

use BugArena\Core\Database;

/**
 * All analytics computed by SQL aggregates over real persisted activity.
 * No client-reported counters are trusted.
 */
final class AnalyticsService
{
    public static function dashboard(int $userId): array
    {
        $pdo = Database::pdo();
        StatisticsService::refreshDerived($userId);
        StatisticsService::refreshStreaks($userId);
        $stats = StatisticsService::get($userId);

        // --- difficulty performance -----------------------------------------
        $diffStmt = $pdo->prepare(
            'SELECT c.difficulty,
                    COUNT(s.id) AS solved,
                    COALESCE(AVG(s.score), 0) AS avgScore,
                    COALESCE(AVG(s.attempts), 0) AS avgAttempts,
                    COALESCE(AVG(s.solve_seconds), 0) AS avgSeconds
             FROM challenges c
             LEFT JOIN submissions s ON s.challenge_id = c.id AND s.user_id = ? AND s.status = "accepted"
             WHERE c.is_active = 1
             GROUP BY c.difficulty'
        );
        $diffStmt->execute([$userId]);
        $difficulty = array_map(static fn (array $r) => [
            'difficulty' => $r['difficulty'],
            'solved' => (int) $r['solved'],
            'avgScore' => (int) round((float) $r['avgScore']),
            'avgAttempts' => round((float) $r['avgAttempts'], 2),
            'avgSeconds' => (int) round((float) $r['avgSeconds']),
        ], $diffStmt->fetchAll());

        $totalStmt = $pdo->query(
            'SELECT difficulty, COUNT(*) AS total FROM challenges WHERE is_active = 1 GROUP BY difficulty'
        );
        $totals = [];
        foreach ($totalStmt->fetchAll() as $row) {
            $totals[$row['difficulty']] = (int) $row['total'];
        }
        foreach ($difficulty as &$d) {
            $d['total'] = $totals[$d['difficulty']] ?? 0;
            $d['successRate'] = $d['total'] > 0 ? round($d['solved'] / $d['total'], 4) : 0.0;
        }
        unset($d);

        // --- skill performance (from solved challenges' skill tags) ----------
        $skillStmt = $pdo->prepare(
            'SELECT c.skills, COUNT(s.id) AS solved, COALESCE(AVG(s.score / c.base_score), 0) AS mastery
             FROM challenges c
             JOIN submissions s ON s.challenge_id = c.id AND s.user_id = ? AND s.status = "accepted"
             GROUP BY c.id, c.skills'
        );
        $skillStmt->execute([$userId]);
        $skillMap = [];
        foreach ($skillStmt->fetchAll() as $row) {
            $skills = json_decode((string) $row['skills'], true);
            if (!is_array($skills)) {
                continue;
            }
            foreach ($skills as $skill) {
                $skill = (string) $skill;
                if (!isset($skillMap[$skill])) {
                    $skillMap[$skill] = ['solved' => 0, 'masterySum' => 0.0];
                }
                $skillMap[$skill]['solved']++;
                $skillMap[$skill]['masterySum'] += min(1.5, (float) $row['mastery']);
            }
        }
        $skills = [];
        foreach ($skillMap as $name => $data) {
            $skills[] = [
                'skill' => $name,
                'solved' => $data['solved'],
                'mastery' => round($data['masterySum'] / max(1, $data['solved']), 4),
            ];
        }
        usort($skills, static fn (array $a, array $b) => $b['mastery'] <=> $a['mastery']);

        // --- weekly progression (last 8 weeks) -------------------------------
        $weekStmt = $pdo->prepare(
            'SELECT YEARWEEK(submitted_at, 3) AS wk,
                    MIN(submitted_at) AS weekStart,
                    COUNT(*) AS solves,
                    SUM(score) AS score
             FROM submissions
             WHERE user_id = ? AND status = "accepted" AND submitted_at >= DATE_SUB(NOW(), INTERVAL 8 WEEK)
             GROUP BY wk ORDER BY wk ASC'
        );
        $weekStmt->execute([$userId]);
        $weekly = array_map(static fn (array $r) => [
            'weekStart' => $r['weekStart'],
            'solves' => (int) $r['solves'],
            'score' => (int) $r['score'],
        ], $weekStmt->fetchAll());

        // --- competitive ------------------------------------------------------
        $matchStmt = $pdo->prepare(
            'SELECT COUNT(*) AS matches,
                    SUM(result = "win") AS wins,
                    SUM(result = "loss") AS losses,
                    COALESCE(AVG(duration_ms), 0) AS avgDuration,
                    COALESCE(MAX(rating_delta), 0) AS bestDelta
             FROM competitive_matches WHERE user_id = ?'
        );
        $matchStmt->execute([$userId]);
        $m = $matchStmt->fetch() ?: [];
        $matches = (int) ($m['matches'] ?? 0);
        $wins = (int) ($m['wins'] ?? 0);
        $userStmt = $pdo->prepare('SELECT rating FROM users WHERE id = ?');
        $userStmt->execute([$userId]);
        $competitive = [
            'rating' => (int) ($userStmt->fetchColumn() ?: 1000),
            'matches' => $matches,
            'wins' => $wins,
            'losses' => (int) ($m['losses'] ?? 0),
            'winRate' => $matches > 0 ? round($wins / $matches, 4) : 0.0,
            'avgDurationMs' => (int) round((float) ($m['avgDuration'] ?? 0)),
            'bestRatingDelta' => (int) ($m['bestDelta'] ?? 0),
        ];

        // --- replay insight ---------------------------------------------------
        $replayStmt = $pdo->prepare(
            'SELECT COUNT(*) AS sessions,
                    SUM(status = "completed") AS completed,
                    COALESCE(AVG(test_runs), 0) AS avgTestRuns,
                    COALESCE(AVG(code_changes), 0) AS avgCodeChanges,
                    COALESCE(AVG(TIMESTAMPDIFF(SECOND, started_at, finished_at)), 0) AS avgSessionSeconds
             FROM replay_sessions WHERE user_id = ?'
        );
        $replayStmt->execute([$userId]);
        $r = $replayStmt->fetch() ?: [];
        $replays = [
            'sessions' => (int) ($r['sessions'] ?? 0),
            'completed' => (int) ($r['completed'] ?? 0),
            'avgTestRuns' => round((float) ($r['avgTestRuns'] ?? 0), 2),
            'avgCodeChanges' => round((float) ($r['avgCodeChanges'] ?? 0), 2),
            'avgSessionSeconds' => (int) round((float) ($r['avgSessionSeconds'] ?? 0)),
        ];

        // --- recent activity ---------------------------------------------------
        $recentStmt = $pdo->prepare(
            'SELECT challenge_title, score, attempts, hardened, submitted_at
             FROM submissions WHERE user_id = ? ORDER BY submitted_at DESC LIMIT 10'
        );
        $recentStmt->execute([$userId]);
        $recent = array_map(static fn (array $row) => [
            'challengeTitle' => $row['challenge_title'],
            'score' => (int) $row['score'],
            'attempts' => (int) $row['attempts'],
            'hardened' => (bool) $row['hardened'],
            'submittedAt' => $row['submitted_at'],
        ], $recentStmt->fetchAll());

        $successRate = $stats['totalSubmissions'] > 0
            ? round($stats['acceptedSubmissions'] / $stats['totalSubmissions'], 4)
            : 0.0;

        return [
            'overview' => [
                'totalScore' => $stats['totalScore'],
                'level' => $stats['level'],
                'rank' => $stats['rank'],
                'xp' => $stats['xp'],
                'solvedChallenges' => $stats['solvedChallenges'],
                'successRate' => $successRate,
                'avgSolveSeconds' => $stats['avgSolveSeconds'],
                'currentStreak' => $stats['currentStreak'],
                'bestStreak' => $stats['bestStreak'],
            ],
            'difficulty' => $difficulty,
            'skills' => [
                'strongest' => array_slice($skills, 0, 3),
                'weakest' => array_slice(array_reverse($skills), 0, 3),
                'all' => $skills,
            ],
            'weekly' => $weekly,
            'competitive' => $competitive,
            'replays' => $replays,
            'recentActivity' => $recent,
        ];
    }
}
