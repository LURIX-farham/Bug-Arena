<?php
declare(strict_types=1);

namespace BugArena\Controllers;

use BugArena\Core\Request;
use BugArena\Core\Response;
use BugArena\Middleware\AuthMiddleware;
use BugArena\Middleware\RateLimitMiddleware;
use BugArena\Services\PythonRunner;
use BugArena\Utils\Helpers;

/**
 * POST /execute — run challenge tests against submitted code (server-side).
 *
 * Body:
 *  - code: string
 *  - functionName: string
 *  - tests: array<{id,name,type,args,expected}>
 *  - hardening?: bool  (if false, only core tests are run)
 */
final class ExecuteController
{
    public function run(Request $request): void
    {
        $userId = AuthMiddleware::requireAuth();
        (new RateLimitMiddleware(30, 60))->handle('execute:' . $userId);

        $body = $request->body;
        $code = (string) ($body['code'] ?? '');
        $functionName = trim((string) ($body['functionName'] ?? $body['function_name'] ?? ''));
        $hardening = !empty($body['hardening']);
        $tests = $body['tests'] ?? [];

        $config = $GLOBALS['bug_arena_config'] ?? [];
        $maxLen = (int) ($config['max_code_length'] ?? 200000);
        if (strlen($code) > $maxLen) {
            Helpers::fail('code_too_large', 413);
        }
        if ($functionName === '') {
            Helpers::fail('invalid_function_name', 422);
        }
        if (!is_array($tests) || $tests === []) {
            Helpers::fail('invalid_tests', 422);
        }

        // Normalize tests; drop hidden unless hardening
        $normalized = [];
        foreach ($tests as $test) {
            if (!is_array($test)) {
                continue;
            }
            $type = (string) ($test['type'] ?? 'core');
            if (!$hardening && $type === 'hidden') {
                continue;
            }
            $normalized[] = [
                'id' => $test['id'] ?? null,
                'name' => (string) ($test['name'] ?? 'test'),
                'type' => $type === 'hidden' ? 'hidden' : 'core',
                'args' => is_array($test['args'] ?? null) ? $test['args'] : [],
                'expected' => $test['expected'] ?? null,
            ];
        }
        if ($normalized === []) {
            Helpers::fail('invalid_tests', 422);
        }

        $result = PythonRunner::run($code, $functionName, $normalized);
        Response::json(array_merge(['ok' => true], $result));
    }
}
