<?php
declare(strict_types=1);

namespace BugArena\Services\Execution;

use BugArena\Core\Logger;

/**
 * Isolated Python execution for challenge evaluation.
 * Local subprocess (dev) or remote runner via BUGARENA_PYTHON_RUNNER_URL.
 */
final class PythonExecutor
{
    private const DEFAULT_TIMEOUT_SEC = 8;
    private const DEFAULT_MEMORY_MB = 128;
    private const MAX_CODE_LENGTH = 200000;

    /**
     * @param array $tests [{id, name, type, args, expected}, ...]
     * @return array{status:string,results:list,corePassed:bool,hiddenPassed:bool,allPassed:bool,testsPassed:int,testsTotal:int,error:?string,wallMs:int}
     */
    public static function evaluate(string $code, string $functionName, array $tests, array $options = []): array
    {
        $started = hrtime(true);
        $timeoutSec = max(1, min(30, (int) ($options['timeoutSec'] ?? self::DEFAULT_TIMEOUT_SEC)));
        $memoryMb = max(32, min(512, (int) ($options['memoryMb'] ?? self::DEFAULT_MEMORY_MB)));

        if (strlen($code) > self::MAX_CODE_LENGTH) {
            return self::errorResult($tests, 'code_too_large', (int) ((hrtime(true) - $started) / 1e6));
        }
        if ($functionName === '' || !preg_match('/^[a-zA-Z_][a-zA-Z0-9_]*$/', $functionName)) {
            return self::errorResult($tests, 'invalid_function_name', (int) ((hrtime(true) - $started) / 1e6));
        }
        if ($tests === []) {
            return self::errorResult($tests, 'no_tests', (int) ((hrtime(true) - $started) / 1e6));
        }

        $config = $GLOBALS['bug_arena_config'] ?? [];
        $remoteUrl = trim((string) ($config['execution']['runner_url'] ?? getenv('BUGARENA_PYTHON_RUNNER_URL') ?: ''));

        if ($remoteUrl !== '') {
            $raw = self::callRemote($remoteUrl, $code, $functionName, $tests, $timeoutSec, $memoryMb);
        } else {
            $raw = self::callLocal($code, $functionName, $tests, $timeoutSec, $memoryMb);
        }

        return self::normalizeResult($raw, $tests, (int) ((hrtime(true) - $started) / 1e6));
    }

    public static function runPublic(string $code, string $functionName, array $allTests, array $options = []): array
    {
        $public = array_values(array_filter($allTests, static fn (array $t): bool => ($t['type'] ?? 'core') !== 'hidden'));
        return self::evaluate($code, $functionName, $public, $options);
    }

    public static function runFull(string $code, string $functionName, array $allTests, array $options = []): array
    {
        return self::evaluate($code, $functionName, $allTests, $options);
    }

    private static function callLocal(string $code, string $functionName, array $tests, int $timeoutSec, int $memoryMb): array
    {
        $workDir = sys_get_temp_dir() . '/bugarena_exec_' . bin2hex(random_bytes(8));
        if (!@mkdir($workDir, 0700, true) && !is_dir($workDir)) {
            return ['success' => false, 'error' => 'sandbox_init_failed', 'results' => []];
        }

        try {
            $payload = json_encode([
                'code' => $code,
                'function_name' => $functionName,
                'tests' => array_map(static fn (array $t): array => [
                    'id' => $t['id'] ?? 0,
                    'args' => $t['args'] ?? [],
                    'expected' => $t['expected'] ?? null,
                ], $tests),
            ], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);

            $payloadFile = $workDir . '/payload.json';
            $outFile = $workDir . '/out.json';
            file_put_contents($payloadFile, $payload);
            file_put_contents($workDir . '/harness.py', self::harnessScript());

            $python = self::findPython();
            $cmd = sprintf(
                'cd %s && ulimit -v %d 2>/dev/null; ulimit -f 1024 2>/dev/null; ' .
                'timeout -s KILL %d %s %s < %s > %s 2>%s',
                escapeshellarg($workDir),
                $memoryMb * 1024,
                $timeoutSec + 1,
                escapeshellarg($python),
                escapeshellarg($workDir . '/harness.py'),
                escapeshellarg($payloadFile),
                escapeshellarg($outFile),
                escapeshellarg($workDir . '/stderr.txt')
            );

            $exitCode = 0;
            exec($cmd, $output, $exitCode);

            $stderr = is_readable($workDir . '/stderr.txt') ? (string) file_get_contents($workDir . '/stderr.txt') : '';
            $stdout = is_readable($outFile) ? (string) file_get_contents($outFile) : '';

            if ($exitCode === 124 || $exitCode === 137) {
                return ['success' => false, 'error' => 'timeout', 'results' => []];
            }
            if ($stdout === '' && $stderr !== '') {
                if (stripos($stderr, 'MemoryError') !== false || stripos($stderr, 'Cannot allocate') !== false) {
                    return ['success' => false, 'error' => 'memory_limit', 'results' => []];
                }
                $err = self::sanitizeError($stderr);
                return ['success' => false, 'error' => $err !== '' ? $err : 'runtime_error', 'results' => []];
            }

            $decoded = json_decode($stdout, true);
            if (!is_array($decoded)) {
                return ['success' => false, 'error' => 'invalid_runner_output', 'results' => []];
            }
            return $decoded;
        } catch (\Throwable $e) {
            Logger::error('python_executor', $e->getMessage());
            return ['success' => false, 'error' => 'execution_error', 'results' => []];
        } finally {
            self::cleanupDir($workDir);
        }
    }

    private static function callRemote(string $url, string $code, string $functionName, array $tests, int $timeoutSec, int $memoryMb): array
    {
        $body = json_encode([
            'code' => $code,
            'function_name' => $functionName,
            'tests' => $tests,
            'timeout_sec' => $timeoutSec,
            'memory_mb' => $memoryMb,
        ], JSON_UNESCAPED_UNICODE);

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Accept: application/json'],
            CURLOPT_POSTFIELDS => $body,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => $timeoutSec + 5,
            CURLOPT_CONNECTTIMEOUT => 5,
        ]);
        $response = curl_exec($ch);
        $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlErr = curl_error($ch);
        curl_close($ch);

        if ($response === false || $httpCode >= 500) {
            Logger::error('python_remote', $curlErr !== '' ? $curlErr : "HTTP $httpCode");
            return ['success' => false, 'error' => 'runner_unavailable', 'results' => []];
        }
        $decoded = json_decode((string) $response, true);
        if (!is_array($decoded)) {
            return ['success' => false, 'error' => 'invalid_runner_output', 'results' => []];
        }
        return $decoded;
    }

    private static function harnessScript(): string
    {
        return <<<'PY'
import json, sys, math
payload = json.load(sys.stdin)
namespace = {}
try:
    exec(payload["code"], namespace, namespace)
except Exception as exc:
    print(json.dumps({"success": False, "error": type(exc).__name__ + ": " + str(exc)[:500], "results": []}))
    sys.exit(0)
fn = namespace.get(payload["function_name"])
if not callable(fn):
    print(json.dumps({"success": False, "error": "function_not_found", "results": []}))
    sys.exit(0)

def equal(a, b):
    if type(a) != type(b) and not (isinstance(a, (int, float)) and isinstance(b, (int, float))):
        return False
    if isinstance(a, float) and isinstance(b, float):
        if math.isnan(a) and math.isnan(b):
            return True
        return abs(a - b) < 1e-9
    if isinstance(a, list) and isinstance(b, list):
        return len(a) == len(b) and all(equal(x, y) for x, y in zip(a, b))
    if isinstance(a, dict) and isinstance(b, dict):
        return a.keys() == b.keys() and all(equal(a[k], b[k]) for k in a)
    return a == b

results = []
for test in payload["tests"]:
    tid = test.get("id")
    try:
        actual = fn(*test.get("args", []))
        try:
            dumped = json.dumps(actual, allow_nan=False)
            if len(dumped) > 20000:
                actual = {"__truncated__": True}
        except Exception:
            actual = str(actual)[:2000]
        ok = equal(actual, test.get("expected"))
        results.append({
            "id": tid,
            "status": "passed" if ok else "wrong_answer",
            "actual": actual if not ok else None,
            "error": None,
        })
    except Exception as exc:
        results.append({
            "id": tid,
            "status": "runtime_error",
            "actual": None,
            "error": type(exc).__name__ + ": " + str(exc)[:400],
        })
print(json.dumps({"success": True, "error": None, "results": results}, allow_nan=False))
PY;
    }

    private static function findPython(): string
    {
        foreach (['python3', 'python', '/usr/bin/python3', '/usr/local/bin/python3'] as $bin) {
            $which = trim((string) shell_exec('command -v ' . escapeshellarg($bin) . ' 2>/dev/null'));
            if ($which !== '') {
                return $which;
            }
            if (is_executable($bin)) {
                return $bin;
            }
        }
        return 'python3';
    }

    private static function normalizeResult(array $raw, array $tests, int $wallMs): array
    {
        if (!($raw['success'] ?? false)) {
            $err = (string) ($raw['error'] ?? 'execution_error');
            $status = match (true) {
                $err === 'timeout' => 'timeout',
                $err === 'memory_limit' => 'memory_limit',
                default => 'execution_error',
            };
            return [
                'status' => $status,
                'results' => array_map(static fn (array $t) => [
                    'id' => $t['id'] ?? 0,
                    'name' => $t['name'] ?? '',
                    'type' => $t['type'] ?? 'core',
                    'status' => $status === 'timeout' ? 'timeout' : 'failed',
                    'error' => $err,
                ], $tests),
                'corePassed' => false,
                'hiddenPassed' => false,
                'allPassed' => false,
                'testsPassed' => 0,
                'testsTotal' => count($tests),
                'error' => $err,
                'wallMs' => $wallMs,
            ];
        }

        $byId = [];
        foreach ($raw['results'] ?? [] as $r) {
            if (isset($r['id'])) {
                $byId[$r['id']] = $r;
            }
        }

        $results = [];
        $passed = 0;
        $coreOk = true;
        $hiddenOk = true;
        $hasCore = false;
        $hasHidden = false;

        foreach ($tests as $t) {
            $id = $t['id'] ?? 0;
            $type = $t['type'] ?? 'core';
            $r = $byId[$id] ?? null;
            $st = $r['status'] ?? 'failed';
            if ($st === 'passed') {
                $passed++;
            } else {
                if ($type === 'hidden') {
                    $hiddenOk = false;
                } else {
                    $coreOk = false;
                }
            }
            if ($type === 'hidden') {
                $hasHidden = true;
            } else {
                $hasCore = true;
            }
            $entry = [
                'id' => $id,
                'name' => $t['name'] ?? ('Test ' . $id),
                'type' => $type,
                'status' => $st,
                'error' => $r['error'] ?? null,
            ];
            if ($type !== 'hidden' && $st !== 'passed') {
                $entry['actual'] = $r['actual'] ?? null;
            }
            $results[] = $entry;
        }

        if (!$hasCore) {
            $coreOk = false;
        }
        if (!$hasHidden) {
            $hiddenOk = true;
        }

        $allPassed = $coreOk && $hiddenOk && $passed === count($tests);
        $status = $allPassed ? 'success' : 'wrong_answer';
        foreach ($results as $r) {
            if (($r['status'] ?? '') === 'runtime_error') {
                $status = 'runtime_error';
                break;
            }
            if (($r['status'] ?? '') === 'timeout') {
                $status = 'timeout';
                break;
            }
        }

        return [
            'status' => $status,
            'results' => $results,
            'corePassed' => $coreOk && $hasCore,
            'hiddenPassed' => $hiddenOk,
            'allPassed' => $allPassed,
            'testsPassed' => $passed,
            'testsTotal' => count($tests),
            'error' => null,
            'wallMs' => $wallMs,
        ];
    }

    private static function errorResult(array $tests, string $error, int $wallMs): array
    {
        return [
            'status' => 'execution_error',
            'results' => array_map(static fn (array $t) => [
                'id' => $t['id'] ?? 0,
                'name' => $t['name'] ?? '',
                'type' => $t['type'] ?? 'core',
                'status' => 'failed',
                'error' => $error,
            ], $tests),
            'corePassed' => false,
            'hiddenPassed' => false,
            'allPassed' => false,
            'testsPassed' => 0,
            'testsTotal' => count($tests),
            'error' => $error,
            'wallMs' => $wallMs,
        ];
    }

    private static function sanitizeError(string $raw): string
    {
        $line = trim(explode("\n", $raw)[0] ?? '');
        $line = preg_replace('/\/tmp\/[^\s:]+/', '<sandbox>', $line) ?? $line;
        return substr($line, 0, 400);
    }

    private static function cleanupDir(string $dir): void
    {
        if (!is_dir($dir)) {
            return;
        }
        foreach (scandir($dir) ?: [] as $f) {
            if ($f === '.' || $f === '..') {
                continue;
            }
            $path = $dir . '/' . $f;
            if (is_file($path)) {
                @unlink($path);
            }
        }
        @rmdir($dir);
    }
}
