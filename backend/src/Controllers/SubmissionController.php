<?php
declare(strict_types=1);

namespace BugArena\Controllers;

use BugArena\Core\Database;
use BugArena\Core\Request;
use BugArena\Core\Response;
use BugArena\Middleware\AuthMiddleware;
use BugArena\Middleware\RateLimitMiddleware;
use BugArena\Services\AchievementService;
use BugArena\Services\PythonRunner;
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

    public function store(Request $request): void
    {
        $userId = AuthMiddleware::requireAuth();
        (new RateLimitMiddleware(60, 60))->handle('submissions:' . $userId);
        $result = self::persist($userId, $request->body);
        Response::json($result['payload'], $result['http']);
    }

    public static function persist(int $userId, array $body): array
    {
        $config = $GLOBALS['bug_arena_config'] ?? [];

        $challengeId = filter_var($body['challengeId'] ?? null, FILTER_VALIDATE_INT);
        if (!$challengeId || $challengeId < 1) {
            Helpers::fail('invalid_submission', 422);
        }
        $code = (string) ($body['code'] ?? '');
        $maxLen = (int) ($config['max_code_length'] ?? 200000);
        if (strlen($code) > $maxLen) {
            Helpers::fail('code_too_large', 413);
        }
        if (trim($code) === '') {
            Helpers::fail('invalid_submission', 422, ['message' => 'code_required']);
        }

        $pdo = Database::pdo();
        $stmt = $pdo->prepare('SELECT * FROM challenges WHERE id = ? AND is_active = 1 LIMIT 1');
        $stmt->execute([$challengeId]);
        $challenge = $stmt->fetch();
        if (!$challenge) {
            Helpers::fail('challenge_not_found', 404);
        }

        $attempts = Helpers::clampInt($body['attempts'] ?? 1, 1, 99);
        $hardened = (bool) ($body['hardened'] ?? false);
        $timeLeft = min((float) $challenge['time_limit'], max(0.0, (float) ($body['timeLeft'] ?? 0)));
        $solveSeconds = Helpers::clampInt((int) round((float) ($body['solveSeconds'] ?? 0)), 0, 86400);

        // Prefer authoritative server re-run of the submitted code.
        $functionName = trim((string) ($challenge['function_name'] ?? ''));
        $tests = self::loadTests($challenge, $hardened);
        $testsPassed = Helpers::clampInt($body['testsPassed'] ?? 0, 0, 999);
        $testsTotal = Helpers::clampInt($body['testsTotal'] ?? 0, 0, 999);

        $serverVerified = false;

        if ($functionName !== '' && $tests !== [] && class_exists(PythonRunner::class)) {
            $run = PythonRunner::run($code, $functionName, $tests);
            $runError = (string) ($run['error'] ?? '');
            $isInfraFail = !empty($run['infra']);

            if (!$isInfraFail) {
                $testsPassed = (int) ($run['testsPassed'] ?? 0);
                $testsTotal = (int) ($run['testsTotal'] ?? count($tests));
                $corePassed = !empty($run['corePassed']);
                $hiddenPassed = !empty($run['hiddenPassed']);
                if (!$corePassed) {
                    Helpers::fail('tests_not_passed', 422, [
                        'testsPassed' => $testsPassed,
                        'testsTotal' => $testsTotal,
                        'error' => $runError !== '' ? $runError : 'core_failed',
                        'results' => $run['results'] ?? [],
                        'source' => 'server_revalidate',
                    ]);
                }
                if ($hardened && !$hiddenPassed) {
                    // Hardening failed: award the core solve (without the bonus)
                    // instead of rejecting the whole submission.
                    $hardened = false;
                    $coreRows = array_filter($run['results'] ?? [], static fn ($r) => ($r['type'] ?? 'core') === 'core');
                    $testsTotal = count($coreRows);
                    $testsPassed = count(array_filter($coreRows, static fn ($r) => ($r['status'] ?? '') === 'passed'));
                }
                $serverVerified = true;
            }
            // Infrastructure failure: fall through to client-reported suite counts.
        }

        if (!$serverVerified) {
            // This host cannot execute Python. The result can only be taken on
            // the client's word, so be strict about what we accept:
            //  - operators can refuse unverified scores entirely
            //    (BUGARENA_REQUIRE_VERIFIED=1), recommended once a runner exists;
            //  - the reported counts must describe a PERFECT run of the real
            //    core suite (ScoringService re-checks them against the registry);
            //  - impossible solve times are rejected;
            //  - no hardening bonus without server verification.
            if (!empty($config['execution']['require_verified'])) {
                Helpers::fail('verification_unavailable', 503, [
                    'message' => 'Server-side verification is currently unavailable. Please try again later.',
                ]);
            }

            $clientPassed = Helpers::clampInt($body['testsPassed'] ?? 0, 0, 999);
            $clientTotal = Helpers::clampInt($body['testsTotal'] ?? 0, 0, 999);
            if ($clientTotal < 1 && isset($body['results']) && is_array($body['results'])) {
                $clientTotal = count($body['results']);
                $clientPassed = 0;
                foreach ($body['results'] as $row) {
                    if (is_array($row) && (($row['status'] ?? '') === 'passed' || !empty($row['passed']))) {
                        $clientPassed++;
                    }
                }
            }
            $testsPassed = $clientPassed;
            $testsTotal = $clientTotal;

            if ($testsTotal < 1 || $testsPassed !== $testsTotal) {
                Helpers::fail('tests_not_passed', 422, [
                    'testsPassed' => $testsPassed,
                    'testsTotal' => $testsTotal,
                    'error' => 'client_suite_incomplete',
                ]);
            }
            if ($solveSeconds < 3) {
                Helpers::fail('solve_time_implausible', 422, ['minSeconds' => 3]);
            }
            $hardened = false;
        }

        $testStmt = $pdo->prepare('SELECT COUNT(*) FROM challenge_tests WHERE challenge_id = ?');
        $testStmt->execute([$challengeId]);
        $expectedTests = (int) $testStmt->fetchColumn();

        $coreStmt = $pdo->prepare(
            'SELECT COUNT(*) FROM challenge_tests WHERE challenge_id = ? AND test_type = "core"'
        );
        $coreStmt->execute([$challengeId]);
        $coreTests = (int) $coreStmt->fetchColumn();

        $scoreParts = ScoringService::compute(
            $challenge,
            $attempts,
            $hardened,
            $timeLeft,
            $testsPassed,
            $testsTotal,
            $expectedTests,
            $coreTests
        );
        $score = $scoreParts['score'];
        $hardened = (bool) ($scoreParts['hardened'] ?? $hardened);

        StatisticsService::ensureRow($userId);

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
            $stats = StatisticsService::get($userId);
            return ['http' => 200, 'payload' => [
                'ok' => true,
                'improved' => false,
                'error' => 'not_better',
                'message' => 'Score not higher than your previous best.',
                'bestScore' => $result['bestScore'],
                'score' => $result['score'],
                'stats' => $stats,
            ]];
        }

        $stats = StatisticsService::get($userId);
        $unlocked = AchievementService::evaluate($userId);

        return ['http' => 201, 'payload' => [
            'ok' => true,
            'improved' => true,
            'challengeId' => $challengeId,
            'submission' => [
                'score' => $scoreParts['score'],
                'baseScore' => $scoreParts['baseScore'],
                'speedBonus' => $scoreParts['speedBonus'],
                'attemptBonus' => $scoreParts['attemptBonus'],
                'hardeningBonus' => $scoreParts['hardeningBonus'],
                'attempts' => $attempts,
                'hardened' => $hardened,
                'testsPassed' => $testsPassed,
                'testsTotal' => $testsTotal,
                'verified' => $serverVerified,
                'submittedAt' => date('Y-m-d H:i:s'),
            ],
            'xpGained' => $result['xpDelta'] ?? 0,
            'stats' => $stats,
            'unlockedAchievements' => $unlocked,
        ]];
    }

    /**
     * @return list<array{id:mixed,name:string,type:string,args:array,expected:mixed}>
     */
    public static function loadTests(array $challenge, bool $hardening): array
    {
        $raw = $challenge['evaluation_tests'] ?? $challenge['evaluationTests'] ?? null;
        if (is_string($raw)) {
            $decoded = json_decode($raw, true);
            // Some hosts store double-encoded JSON strings.
            if (is_string($decoded)) {
                $decoded = json_decode($decoded, true);
            }
        } elseif (is_array($raw)) {
            $decoded = $raw;
        } else {
            $decoded = [];
        }
        if (!is_array($decoded)) {
            $decoded = [];
        }

        $out = [];
        foreach ($decoded as $i => $test) {
            if (!is_array($test)) {
                continue;
            }
            $type = (string) ($test['type'] ?? 'core');
            if (!$hardening && $type === 'hidden') {
                continue;
            }
            $args = $test['args'] ?? $test['input'] ?? $test['inputs'] ?? [];
            if (!is_array($args)) {
                $args = [$args];
            }
            $expected = array_key_exists('expected', $test)
                ? $test['expected']
                : ($test['output'] ?? $test['result'] ?? null);
            $out[] = [
                'id' => $test['id'] ?? $i,
                'name' => (string) ($test['name'] ?? ('test-' . $i)),
                'type' => $type === 'hidden' ? 'hidden' : 'core',
                'args' => $args,
                'expected' => $expected,
            ];
        }
        return $out;
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
