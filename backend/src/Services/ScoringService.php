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

        // Integrity: accept either the full suite (core + hidden) or the
        // core-only suite. Core-only solves cannot claim the hardening bonus.
        // Any other testsTotal value is rejected as tampering / stale client.
        $effectiveHardened = $hardened;
        if ($expectedTests > 0) {
            $isFullSuite = ($testsTotal === $expectedTests && $testsPassed === $expectedTests);
            $isCoreOnly = ($coreTests > 0
                && $testsTotal === $coreTests
                && $testsPassed === $coreTests);

            if ($isFullSuite) {
                // Full suite passed — hardening flag from client is trusted.
            } elseif ($isCoreOnly) {
                // Core fixed without hidden tests — force non-hardened scoring.
                $effectiveHardened = false;
            } else {
                \BugArena\Utils\Helpers::fail('test_integrity_failed', 409, [
                    'testsTotal' => $testsTotal,
                    'testsPassed' => $testsPassed,
                    'expectedTests' => $expectedTests,
                    'coreTests' => $coreTests,
                ]);
            }
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
}
