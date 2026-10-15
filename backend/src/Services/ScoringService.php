<?php
declare(strict_types=1);

namespace BugArena\Services;

/**
 * Server-authoritative scoring. The client may only submit raw inputs
 * (tests passed/total, attempts, hardened flag, remaining time); every
 * point awarded is computed here from the challenge registry.
 */
final class ScoringService
{
    /**
     * @param array $challenge row from challenges table
     * @param int $coreTests number of core (non-hidden) tests for this challenge
     * @return array{score:int, baseScore:int, speedBonus:int, attemptBonus:int, hardeningBonus:int, hardened:bool}
     */
    public static function compute(
        array $challenge,
        int $attempts,
        bool $hardened,
        float $timeLeft,
        int $testsPassed,
        int $testsTotal,
        int $expectedTests,
        int $coreTests = 0
    ): array {
        $base = (int) $challenge['base_score'];
        $timeLimit = (int) $challenge['time_limit'];

        $timeRatio = $timeLimit > 0
            ? max(0.0, min(1.0, $timeLeft / $timeLimit))
            : 0.0;
        $speedBonus = (int) round($base * 0.4 * $timeRatio);

        $attemptBonus = match (true) {
            $attempts <= 1 => (int) round($base * 0.2),
            $attempts === 2 => (int) round($base * 0.12),
            $attempts === 3 => (int) round($base * 0.06),
            default => 0,
        };

        // When challenge_tests rows are missing, fall back to evaluation_tests JSON.
        if ($expectedTests <= 0 || $coreTests <= 0) {
            $fromJson = self::countsFromEvaluationJson($challenge);
            if ($expectedTests <= 0) {
                $expectedTests = $fromJson['expected'];
            }
            if ($coreTests <= 0) {
                $coreTests = $fromJson['core'];
            }
        }

        $effectiveHardened = $hardened;

        // Must have passed at least one test and passed everything that was run.
        if ($testsTotal < 1 || $testsPassed < 1 || $testsPassed < $testsTotal) {
            \BugArena\Utils\Helpers::fail('test_integrity_failed', 409, [
                'reason' => 'not_all_passed',
                'testsTotal' => $testsTotal,
                'testsPassed' => $testsPassed,
                'expectedTests' => $expectedTests,
                'coreTests' => $coreTests,
            ]);
        }

        // Accept a perfect run of the full suite or of the core suite, judged
        // against BOTH the challenge_tests table and the evaluation JSON
        // (legacy seeds can disagree). Any other count is rejected: a client
        // reporting "1 of 1 passed" must not earn points.
        $json = self::countsFromEvaluationJson($challenge);
        $fullCounts = array_values(array_unique(array_filter([$expectedTests, $json['expected']])));
        $coreCounts = array_values(array_unique(array_filter([$coreTests, $json['core']])));

        $isFullSuite = in_array($testsTotal, $fullCounts, true);
        $isCoreOnly = in_array($testsTotal, $coreCounts, true);

        if ($fullCounts === [] && $coreCounts === []) {
            // Challenge has no registered tests at all: nothing can be verified.
            \BugArena\Utils\Helpers::fail('test_integrity_failed', 409, ['reason' => 'challenge_has_no_tests']);
        }
        if (!$isFullSuite && !$isCoreOnly) {
            \BugArena\Utils\Helpers::fail('test_integrity_failed', 409, [
                'testsTotal' => $testsTotal,
                'testsPassed' => $testsPassed,
                'expectedTests' => $expectedTests,
                'coreTests' => $coreTests,
            ]);
        }
        if (!$isFullSuite) {
            // Core-only run: no hardening bonus.
            $effectiveHardened = false;
        }

        $hardeningBonus = $effectiveHardened
            ? (int) min((int) $challenge['hardening_bonus'], (int) round($base * 0.6))
            : 0;

        $score = $base + $speedBonus + $attemptBonus + $hardeningBonus;
        return [
            'score' => max(0, $score),
            'baseScore' => $base,
            'speedBonus' => $speedBonus,
            'attemptBonus' => $attemptBonus,
            'hardeningBonus' => $hardeningBonus,
            'hardened' => $effectiveHardened,
        ];
    }

    /** @return array{expected:int, core:int} */
    private static function countsFromEvaluationJson(array $challenge): array
    {
        $raw = $challenge['evaluation_tests'] ?? $challenge['evaluationTests'] ?? null;
        if (is_string($raw)) {
            $decoded = json_decode($raw, true);
        } elseif (is_array($raw)) {
            $decoded = $raw;
        } else {
            $decoded = [];
        }
        if (!is_array($decoded)) {
            return ['expected' => 0, 'core' => 0];
        }
        $expected = count($decoded);
        $core = 0;
        foreach ($decoded as $test) {
            if (!is_array($test)) {
                continue;
            }
            $type = (string) ($test['type'] ?? 'core');
            if ($type !== 'hidden') {
                $core++;
            }
        }
        return ['expected' => $expected, 'core' => $core];
    }
}
