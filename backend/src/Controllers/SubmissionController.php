<?php
declare(strict_types=1);

namespace BugArena\Controllers;

use BugArena\Core\Database;
use BugArena\Core\Request;
use BugArena\Core\Response;
use BugArena\Middleware\AuthMiddleware;
use BugArena\Middleware\RateLimitMiddleware;
use BugArena\Services\AchievementService;
use BugArena\Services\ScoringService;
use BugArena\Services\StatisticsService;
use BugArena\Utils\Helpers;

final class SubmissionController
{
    public function index(Request $request): void
    {
        $userId = AuthMiddleware::requireAuth();
        $limit = min(200, max(1, $request->queryInt('limit', 200)));
        $stmt = Database::pdo()->prepare(
            'SELECT s.challenge_id AS challengeId, s.challenge_title AS challengeTitle, s.status,
                    s.score, s.base_score AS baseScore, s.speed_bonus AS speedBonus,
                    s.attempt_bonus AS attemptBonus, s.hardening_bonus AS hardeningBonus,
                    s.attempts, s.tests_passed AS testsPassed, s.tests_total AS testsTotal,
                    s.hardened, s.time_left AS timeLeft, s.solve_seconds AS solveSeconds,
                    s.submitted_at AS submittedAt
             FROM submissions s WHERE s.user_id = ?
             ORDER BY s.submitted_at DESC LIMIT ' . $limit
        );
        $stmt->execute([$userId]);
        $rows = array_map(static fn (array $row) => self::castRow($row), $stmt->fetchAll());
        Response::json(['ok' => true, 'submissions' => $rows]);
    }

    /**
     * Record a submission. The score is RECOMPUTED server-side from the
     * challenge registry — client-supplied scores are ignored entirely.
     */
    public function store(Request $request): void
    {
        $userId = AuthMiddleware::requireAuth();
        (new RateLimitMiddleware(60, 60))->handle('submissions:' . $userId);
        $result = self::persist($userId, $request->body);
        Response::json($result['payload'], $result['http']);
    }

    /**
     * Shared submission pipeline (HTTP store + offline /sync batch).
     * Returns the response payload plus the HTTP status it should map to.
     */
    public static function persist(int $userId, array $body): array
    {
        $config = $GLOBALS['bug_arena_config'];

        $challengeId = filter_var($body['challengeId'] ?? null, FILTER_VALIDATE_INT);
        if (!$challengeId || $challengeId < 1) {
            Helpers::fail('invalid_submission', 422);
        }
        $code = (string) ($body['code'] ?? '');
        if (strlen($code) > (int) $config['max_code_length']) {
            Helpers::fail('code_too_large', 413);
        }

        $pdo = Database::pdo();
        $stmt = $pdo->prepare('SELECT * FROM challenges WHERE id = ? AND is_active = 1 LIMIT 1');
        $stmt->execute([$challengeId]);
        $challenge = $stmt->fetch();
        if (!$challenge) {
            Helpers::fail('challenge_not_found', 404);
        }

        $testStmt = $pdo->prepare('SELECT COUNT(*) FROM challenge_tests WHERE challenge_id = ?');
        $testStmt->execute([$challengeId]);
        $expectedTests = (int) $testStmt->fetchColumn();

        $coreStmt = $pdo->prepare(
            'SELECT COUNT(*) FROM challenge_tests WHERE challenge_id = ? AND test_type = "core"'
        );
        $coreStmt->execute([$challengeId]);
        $coreTests = (int) $coreStmt->fetchColumn();

        $attempts = Helpers::clampInt($body['attempts'] ?? 1, 1, 99);
        $hardened = (bool) ($body['hardened'] ?? false);
        $timeLeft = min((float) $challenge['time_limit'], max(0.0, (float) ($body['timeLeft'] ?? 0)));
        $solveSeconds = Helpers::clampInt((int) round((float) ($body['solveSeconds'] ?? 0)), 0, 86400);
        $testsPassed = Helpers::clampInt($body['testsPassed'] ?? 0, 0, 999);
        $testsTotal = Helpers::clampInt($body['testsTotal'] ?? 0, 0, 999);

        // Server-side scoring (throws 409 test_integrity_failed on mismatch).
        // Accepts core-only or full suite; forces hardened=false for core-only.
        $scoreParts = ScoringService::compute(
            $challenge, $attempts, $hardened, $timeLeft, $testsPassed, $testsTotal, $expectedTests, $coreTests
        );
        $score = $scoreParts['score'];
        $hardened = (bool) ($scoreParts['hardened'] ?? $hardened);

        $result = Database::transaction(function () use (
            $pdo, $userId, $challenge, $challengeId, $score, $scoreParts,
            $attempts, $hardened, $timeLeft, $solveSeconds, $testsPassed, $testsTotal, $code
        ): array {
            $stmt = $pdo->prepare('SELECT score FROM submissions WHERE user_id = ? AND challenge_id = ? FOR UPDATE');
            $stmt->execute([$userId, $challengeId]);
            $existing = $stmt->fetch();
            $previousBest = $existing ? (int) $existing['score'] : 0;

            if ($score <= $previousBest) {
                return ['improved' => false, 'bestScore' => $previousBest, 'score' => $score];
            }

            $stmt = $pdo->prepare(
                'INSERT INTO submissions
                   (user_id, challenge_id, challenge_title, status, score, base_score, speed_bonus,
                    attempt_bonus, hardening_bonus, attempts, tests_passed, tests_total, hardened,
                    time_left, solve_seconds, code, submitted_at)
                 VALUES (?, ?, ?, "accepted", ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                   challenge_title = VALUES(challenge_title), status = "accepted", score = VALUES(score),
                   base_score = VALUES(base_score), speed_bonus = VALUES(speed_bonus),
                   attempt_bonus = VALUES(attempt_bonus), hardening_bonus = VALUES(hardening_bonus),
                   attempts = VALUES(attempts), tests_passed = VALUES(tests_passed),
                   tests_total = VALUES(tests_total), hardened = VALUES(hardened),
                   time_left = VALUES(time_left), solve_seconds = VALUES(solve_seconds),
                   code = VALUES(code), submitted_at = VALUES(submitted_at)'
            );
            $stmt->execute([
                $userId, $challengeId, substr((string) $challenge['title'], 0, 160),
                $score, $scoreParts['baseScore'], $scoreParts['speedBonus'],
                $scoreParts['attemptBonus'], $scoreParts['hardeningBonus'],
                $attempts, $testsPassed, $testsTotal, $hardened ? 1 : 0,
                $timeLeft, $solveSeconds, $code, Helpers::safeDate('now'),
            ]);

            $xpDelta = $score - $previousBest;
            StatisticsService::applySubmission($userId, $xpDelta, true, $solveSeconds);
            StatisticsService::refreshStreaks($userId);

            return ['improved' => true, 'bestScore' => $score, 'score' => $score, 'xpDelta' => $xpDelta];
        });

        if (!$result['improved']) {
            return ['http' => 409, 'payload' => [
                'ok' => false,
                'error' => 'not_better',
                'bestScore' => $result['bestScore'],
                'score' => $result['score'],
            ]];
        }

        $stats = StatisticsService::get($userId);
        $unlocked = AchievementService::evaluate($userId);

        return ['http' => 201, 'payload' => [
            'ok' => true,
            'challengeId' => $challengeId,
            'submission' => [
                'score' => $scoreParts['score'],
                'baseScore' => $scoreParts['baseScore'],
                'speedBonus' => $scoreParts['speedBonus'],
                'attemptBonus' => $scoreParts['attemptBonus'],
                'hardeningBonus' => $scoreParts['hardeningBonus'],
                'attempts' => $attempts,
                'hardened' => $hardened,
                'submittedAt' => date('Y-m-d H:i:s'),
            ],
            'xpGained' => $result['xpDelta'] ?? 0,
            'stats' => $stats,
            'unlockedAchievements' => $unlocked,
        ]];
    }

    private static function castRow(array $row): array
    {
        foreach (['challengeId', 'score', 'baseScore', 'speedBonus', 'attemptBonus', 'hardeningBonus', 'attempts', 'testsPassed', 'testsTotal', 'solveSeconds'] as $intField) {
            $row[$intField] = (int) $row[$intField];
        }
        $row['hardened'] = (bool) $row['hardened'];
        $row['timeLeft'] = (float) $row['timeLeft'];
        $row['status'] = (string) $row['status'];
        return $row;
    }
}
