<?php
declare(strict_types=1);

namespace BugArena\Controllers;

use BugArena\Core\Database;
use BugArena\Core\Request;
use BugArena\Core\Response;
use BugArena\Middleware\AuthMiddleware;
use BugArena\Middleware\RateLimitMiddleware;
use BugArena\Services\PythonRunner;
use BugArena\Utils\Helpers;

/**
 * POST /execute — run a challenge's tests against submitted code.
 *
 * Body: { challengeId: int, code: string, scope?: "public" | "full" }
 *
 * Tests are ALWAYS loaded from the database. The client never supplies tests
 * or expected values (previously it did, which made this endpoint a free
 * code-execution service and let players "pass" with self-written tests).
 *
 * Hidden-test details (name, actual value, error text) are never returned.
 * If this host cannot execute Python the endpoint answers 503
 * `execution_unavailable` so the client can fall back to its local preview.
 */
final class ExecuteController
{
    public function run(Request $request): void
    {
        $userId = AuthMiddleware::requireAuth();
        (new RateLimitMiddleware(30, 60))->handle('execute:' . $userId);

        $body = $request->body;
        $challengeId = filter_var($body['challengeId'] ?? null, FILTER_VALIDATE_INT);
        if (!$challengeId || $challengeId < 1) {
            Helpers::fail('invalid_challenge', 422);
        }
        $code = (string) ($body['code'] ?? '');
        $maxLen = (int) ($GLOBALS['bug_arena_config']['max_code_length'] ?? 200000);
        if (strlen($code) > $maxLen) {
            Helpers::fail('code_too_large', 413);
        }
        if (trim($code) === '') {
            Helpers::fail('code_required', 422);
        }
        $full = ($body['scope'] ?? 'public') === 'full';

        $stmt = Database::pdo()->prepare('SELECT * FROM challenges WHERE id = ? AND is_active = 1 LIMIT 1');
        $stmt->execute([$challengeId]);
        $challenge = $stmt->fetch();
        if (!$challenge) {
            Helpers::fail('challenge_not_found', 404);
        }

        $functionName = trim((string) ($challenge['function_name'] ?? ''));
        $tests = SubmissionController::loadTests($challenge, $full);
        if ($functionName === '' || $tests === []) {
            Helpers::fail('challenge_not_executable', 422);
        }

        $result = PythonRunner::run($code, $functionName, $tests);
        if (!empty($result['infra'])) {
            Response::error('execution_unavailable', 503, ['reason' => $result['error']]);
        }

        // Never reveal what hidden tests contain.
        foreach ($result['results'] as &$row) {
            if (($row['type'] ?? 'core') === 'hidden') {
                $row['name'] = 'Hidden edge case';
                $row['actual'] = null;
                $row['error'] = $row['status'] === 'passed' ? null : 'hidden_test_failed';
            }
        }
        unset($row);

        Response::json($result);
    }
}
