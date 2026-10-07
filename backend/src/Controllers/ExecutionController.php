<?php
declare(strict_types=1);

namespace BugArena\Controllers;

use BugArena\Core\Database;
use BugArena\Core\Request;
use BugArena\Core\Response;
use BugArena\Middleware\AuthMiddleware;
use BugArena\Middleware\RateLimitMiddleware;
use BugArena\Services\Execution\PythonExecutor;
use BugArena\Utils\Helpers;

final class ExecutionController
{
    /** POST /execute — public (core) tests only. */
    public function run(Request $request): void
    {
        $userId = AuthMiddleware::requireAuth();
        (new RateLimitMiddleware(30, 60))->handle('execute:' . $userId);

        $body = $request->body;
        $challengeId = filter_var($body['challengeId'] ?? null, FILTER_VALIDATE_INT);
        if (!$challengeId || $challengeId < 1) {
            Helpers::fail('invalid_challenge_id', 422);
        }

        $code = (string) ($body['code'] ?? '');
        $config = $GLOBALS['bug_arena_config'];
        if (strlen($code) > (int) $config['max_code_length']) {
            Helpers::fail('code_too_large', 413);
        }

        $stmt = Database::pdo()->prepare(
            'SELECT id, function_name, language FROM challenges WHERE id = ? AND is_active = 1 LIMIT 1'
        );
        $stmt->execute([$challengeId]);
        $challenge = $stmt->fetch();
        if (!$challenge) {
            Helpers::fail('challenge_not_found', 404);
        }

        $functionName = (string) ($challenge['function_name'] ?? '');
        $allTests = ChallengeController::loadFullTests($challengeId);
        $options = [
            'timeoutSec' => (int) ($config['execution']['timeout_sec'] ?? 8),
            'memoryMb' => (int) ($config['execution']['memory_mb'] ?? 128),
        ];

        $scope = strtolower(trim((string) ($body['scope'] ?? 'public')));
        if ($scope === 'full') {
            // Hardening check: run full suite but never leak hidden args/expected/actual.
            $result = PythonExecutor::runFull($code, $functionName, $allTests, $options);
            $safeResults = array_map(static function (array $r): array {
                if (($r['type'] ?? '') === 'hidden') {
                    return [
                        'id' => $r['id'] ?? 0,
                        'name' => $r['name'] ?? 'Hidden',
                        'type' => 'hidden',
                        'status' => $r['status'] ?? 'failed',
                    ];
                }
                return $r;
            }, $result['results'] ?? []);
            Response::json([
                'ok' => true,
                'status' => $result['status'],
                'results' => $safeResults,
                'corePassed' => $result['corePassed'],
                'hiddenPassed' => $result['hiddenPassed'],
                'allPassed' => $result['allPassed'],
                'testsPassed' => $result['testsPassed'],
                'testsTotal' => $result['testsTotal'],
                'wallMs' => $result['wallMs'],
                'error' => $result['error'],
                'scope' => 'full',
            ]);
            return;
        }

        $result = PythonExecutor::runPublic($code, $functionName, $allTests, $options);

        Response::json([
            'ok' => true,
            'status' => $result['status'],
            'results' => $result['results'],
            'corePassed' => $result['corePassed'],
            'hiddenPassed' => false,
            'allPassed' => $result['corePassed'],
            'testsPassed' => $result['testsPassed'],
            'testsTotal' => $result['testsTotal'],
            'wallMs' => $result['wallMs'],
            'error' => $result['error'],
            'scope' => 'public',
        ]);
    }
}
