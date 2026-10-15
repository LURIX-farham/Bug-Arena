<?php
declare(strict_types=1);

namespace BugArena\Services;

use BugArena\Core\Logger;

/**
 * Server-side Python test runner.
 *
 * Two back-ends share one result shape:
 *  - remote: BUGARENA_PYTHON_RUNNER_URL (recommended for production; see
 *    scripts/python_runner_server.py) — receives tests incl. expected values
 *    because it is a trusted, private service.
 *  - local : a throw-away `python -I -S` subprocess (src/Services/python_harness.py).
 *    The subprocess only receives code + call arguments. Expected values are
 *    compared here in PHP, so player code can never read them.
 *
 * Infrastructure problems (no proc_open, no python, runner down) are reported
 * with `infra => true` so callers can distinguish "the player's code is wrong"
 * from "this host cannot execute code".
 */
final class PythonRunner
{
    private const DEFAULT_TIMEOUT_SEC = 8;
    private const MAX_OUTPUT_BYTES = 512_000;

    private static ?string $binaryCache = null;

    /** Error codes meaning the host (not the player) is at fault. */
    public const INFRA_ERRORS = [
        'python_not_found', 'proc_open_disabled', 'proc_open_failed',
        'execute_unavailable', 'invalid_runner_output', 'runner_unavailable',
        'harness_missing', 'bad_payload',
    ];

    /**
     * @param array<int, array{id?:mixed,name?:string,type?:string,args?:array,expected?:mixed}> $tests
     * @return array<string,mixed>
     */
    public static function run(string $code, string $functionName, array $tests, int $timeoutSec = self::DEFAULT_TIMEOUT_SEC): array
    {
        $started = hrtime(true);
        $wall = static fn (): int => (int) max(0, (hrtime(true) - $started) / 1_000_000);

        if ($functionName === '' || !preg_match('/^[A-Za-z_][A-Za-z0-9_]*$/', $functionName)) {
            return self::failure($tests, 'execution_error', 'function_name_invalid', $wall());
        }
        if ($tests === []) {
            return self::failure($tests, 'execution_error', 'no_tests', $wall());
        }

        $config = $GLOBALS['bug_arena_config']['execution'] ?? [];
        $timeoutSec = max(1, min(20, (int) ($config['timeout_sec'] ?? $timeoutSec)));
        $memoryMb = max(64, min(1024, (int) ($config['memory_mb'] ?? 256)));
        $remoteUrl = trim((string) ($config['runner_url'] ?? ''));

        $raw = $remoteUrl !== ''
            ? self::callRemote($remoteUrl, $code, $functionName, $tests, $timeoutSec, $memoryMb)
            : self::callLocal($code, $functionName, $tests, $timeoutSec, $memoryMb);

        if (!$raw['ok']) {
            $error = (string) $raw['error'];
            $status = in_array($error, ['execution_timeout', 'timeout'], true) ? 'timeout' : 'execution_error';
            return self::failure($tests, $status, $error, $wall());
        }
        return self::assemble($tests, $raw['results'], $wall());
    }

    /* ------------------------------------------------------------------ */
    /* Local subprocess                                                     */
    /* ------------------------------------------------------------------ */

    /** @return array{ok:bool,error:?string,results:array} */
    private static function callLocal(string $code, string $fn, array $tests, int $timeoutSec, int $memoryMb): array
    {
        if (!function_exists('proc_open')) {
            return ['ok' => false, 'error' => 'proc_open_disabled', 'results' => []];
        }
        $harness = __DIR__ . '/python_harness.py';
        if (!is_readable($harness)) {
            return ['ok' => false, 'error' => 'harness_missing', 'results' => []];
        }
        $binary = self::findPythonBinary();
        if ($binary === null) {
            return ['ok' => false, 'error' => 'python_not_found', 'results' => []];
        }

        $payload = json_encode([
            'code' => $code,
            'function_name' => $fn,
            // Arguments only — never the expected values.
            'tests' => array_values(array_map(static fn (array $t): array => [
                'id' => $t['id'] ?? null,
                'args' => $t['args'] ?? [],
            ], $tests)),
            'cpu_seconds' => $timeoutSec,
            'memory_mb' => $memoryMb,
        ], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
        if ($payload === false) {
            return ['ok' => false, 'error' => 'bad_payload', 'results' => []];
        }

        // Explicit, minimal environment: the PHP process env contains DB credentials.
        $env = [
            'PATH' => '/usr/local/bin:/usr/bin:/bin',
            'LANG' => 'C.UTF-8',
            'PYTHONIOENCODING' => 'utf-8',
            'PYTHONDONTWRITEBYTECODE' => '1',
            'HOME' => '/nonexistent',
        ];
        $proc = @proc_open(
            [$binary, '-I', '-S', $harness],
            [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']],
            $pipes,
            sys_get_temp_dir(),
            $env,
            ['bypass_shell' => true]
        );
        if (!is_resource($proc)) {
            return ['ok' => false, 'error' => 'proc_open_failed', 'results' => []];
        }

        stream_set_blocking($pipes[1], false);
        stream_set_blocking($pipes[2], false);
        stream_set_blocking($pipes[0], true);
        @fwrite($pipes[0], $payload);
        @fclose($pipes[0]);

        $deadline = microtime(true) + $timeoutSec;
        $stdout = '';
        $stderr = '';
        $timedOut = false;
        while (true) {
            $status = proc_get_status($proc);
            $stdout .= (string) stream_get_contents($pipes[1]);
            $stderr .= (string) stream_get_contents($pipes[2]);
            if (strlen($stdout) + strlen($stderr) > self::MAX_OUTPUT_BYTES || microtime(true) >= $deadline) {
                $timedOut = true;
                break;
            }
            if (!$status['running']) {
                break;
            }
            usleep(10_000);
        }
        if ($timedOut) {
            proc_terminate($proc, 9);
        }
        $stdout .= (string) stream_get_contents($pipes[1]);
        $stderr .= (string) stream_get_contents($pipes[2]);
        fclose($pipes[1]);
        fclose($pipes[2]);
        proc_close($proc);

        if ($timedOut) {
            return ['ok' => false, 'error' => 'execution_timeout', 'results' => []];
        }

        $lines = array_values(array_filter(array_map('trim', explode("\n", $stdout)), static fn ($l) => $l !== ''));
        $decoded = $lines !== [] ? json_decode($lines[array_key_last($lines)], true) : null;
        if (!is_array($decoded)) {
            // Killed by RLIMIT_CPU / RLIMIT_AS leaves no JSON behind.
            $hint = stripos($stderr, 'MemoryError') !== false ? 'memory_limit' : 'execution_timeout';
            return ['ok' => false, 'error' => $stdout === '' && $stderr === '' ? $hint : 'invalid_runner_output', 'results' => []];
        }
        if (empty($decoded['ok'])) {
            $err = (string) ($decoded['error'] ?? 'execution_error');
            Logger::info('python_runner', 'player_error ' . substr($err, 0, 120));
            return ['ok' => false, 'error' => $err, 'results' => []];
        }
        return ['ok' => true, 'error' => null, 'results' => self::compareLocal($tests, (array) ($decoded['results'] ?? []))];
    }

    /**
     * Turn raw {id, actual, error} rows into {id, status, actual, error} by
     * comparing against the expected values that never left PHP.
     */
    private static function compareLocal(array $tests, array $rows): array
    {
        $out = [];
        foreach ($tests as $i => $test) {
            $row = $rows[$i] ?? null;
            if (!is_array($row)) {
                $out[] = ['id' => $test['id'] ?? null, 'status' => 'failed', 'actual' => null, 'error' => 'no_result'];
                continue;
            }
            if (($row['error'] ?? null) !== null) {
                $out[] = ['id' => $test['id'] ?? null, 'status' => 'failed', 'actual' => null, 'error' => (string) $row['error']];
                continue;
            }
            $ok = self::deepEqual($row['actual'] ?? null, $test['expected'] ?? null);
            $out[] = [
                'id' => $test['id'] ?? null,
                'status' => $ok ? 'passed' : 'failed',
                'actual' => $row['actual'] ?? null,
                'error' => $ok ? null : 'assertion_failed',
            ];
        }
        return $out;
    }

    private static function deepEqual(mixed $a, mixed $b): bool
    {
        return json_encode(self::normalize($a), JSON_UNESCAPED_UNICODE | JSON_PARTIAL_OUTPUT_ON_ERROR)
            === json_encode(self::normalize($b), JSON_UNESCAPED_UNICODE | JSON_PARTIAL_OUTPUT_ON_ERROR);
    }

    private static function normalize(mixed $v): mixed
    {
        if (is_float($v)) {
            if (is_nan($v) || is_infinite($v)) {
                return (string) $v;
            }
            // Whole-number floats compare equal to ints (2.0 == 2); otherwise 10 d.p.
            return abs($v - round($v)) < 1e-9 ? (int) round($v) : round($v, 10);
        }
        if (is_array($v)) {
            if (array_is_list($v)) {
                return array_map([self::class, 'normalize'], $v);
            }
            ksort($v, SORT_STRING);
            return array_map([self::class, 'normalize'], $v);
        }
        return $v;
    }

    /* ------------------------------------------------------------------ */
    /* Remote runner                                                        */
    /* ------------------------------------------------------------------ */

    /** @return array{ok:bool,error:?string,results:array} */
    private static function callRemote(string $url, string $code, string $fn, array $tests, int $timeoutSec, int $memoryMb): array
    {
        if (!function_exists('curl_init')) {
            return ['ok' => false, 'error' => 'runner_unavailable', 'results' => []];
        }
        $body = json_encode([
            'code' => $code, 'function_name' => $fn, 'tests' => array_values($tests),
            'timeout_sec' => $timeoutSec, 'memory_mb' => $memoryMb,
        ], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);

        $headers = ['Content-Type: application/json', 'Accept: application/json'];
        $token = (string) getenv('BUGARENA_PYTHON_RUNNER_TOKEN');
        if ($token !== '') {
            $headers[] = 'Authorization: Bearer ' . $token;
        }
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_POSTFIELDS => $body,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => $timeoutSec + 5,
            CURLOPT_CONNECTTIMEOUT => 5,
        ]);
        $response = curl_exec($ch);
        $http = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err = curl_error($ch);
        curl_close($ch);

        if ($response === false || $http >= 500 || $http === 0 || $http === 401 || $http === 403) {
            Logger::error('python_remote', $err !== '' ? $err : "HTTP $http");
            return ['ok' => false, 'error' => 'runner_unavailable', 'results' => []];
        }
        $decoded = json_decode((string) $response, true);
        if (!is_array($decoded)) {
            return ['ok' => false, 'error' => 'invalid_runner_output', 'results' => []];
        }
        if (!($decoded['success'] ?? false)) {
            return ['ok' => false, 'error' => (string) ($decoded['error'] ?? 'execution_error'), 'results' => []];
        }
        $byId = [];
        foreach ((array) ($decoded['results'] ?? []) as $r) {
            if (is_array($r) && array_key_exists('id', $r)) {
                $byId[(string) $r['id']] = $r;
            }
        }
        $rows = [];
        foreach ($tests as $t) {
            $r = $byId[(string) ($t['id'] ?? '')] ?? null;
            $passed = is_array($r) && ($r['status'] ?? '') === 'passed';
            $rows[] = [
                'id' => $t['id'] ?? null,
                'status' => $passed ? 'passed' : 'failed',
                'actual' => $r['actual'] ?? null,
                'error' => $passed ? null : (string) ($r['error'] ?? 'assertion_failed'),
            ];
        }
        return ['ok' => true, 'error' => null, 'results' => $rows];
    }

    /* ------------------------------------------------------------------ */
    /* Result shaping                                                       */
    /* ------------------------------------------------------------------ */

    private static function assemble(array $tests, array $rows, int $wallMs): array
    {
        $results = [];
        $passed = 0;
        foreach ($tests as $i => $test) {
            $row = $rows[$i] ?? ['status' => 'failed', 'actual' => null, 'error' => 'no_result'];
            $isPassed = ($row['status'] ?? '') === 'passed';
            $passed += $isPassed ? 1 : 0;
            $results[] = [
                'id' => $test['id'] ?? null,
                'name' => $test['name'] ?? 'test',
                'type' => ($test['type'] ?? 'core') === 'hidden' ? 'hidden' : 'core',
                'status' => $isPassed ? 'passed' : 'failed',
                'actual' => $row['actual'] ?? null,
                'error' => $row['error'] ?? null,
            ];
        }
        $core = array_filter($results, static fn ($r) => $r['type'] === 'core');
        $hidden = array_filter($results, static fn ($r) => $r['type'] === 'hidden');
        $corePassed = $core !== [] && count(array_filter($core, static fn ($r) => $r['status'] !== 'passed')) === 0;
        $hiddenPassed = count(array_filter($hidden, static fn ($r) => $r['status'] !== 'passed')) === 0;

        return [
            'ok' => true,
            'infra' => false,
            'status' => $corePassed ? ($hiddenPassed ? 'passed' : 'partial') : 'failed',
            'error' => $corePassed ? null : 'tests_failed',
            'wallMs' => $wallMs,
            'results' => $results,
            'testsPassed' => $passed,
            'testsTotal' => count($results),
            'corePassed' => $corePassed,
            'hiddenPassed' => $hiddenPassed,
            'allPassed' => $corePassed && $hiddenPassed,
            'authoritative' => true,
            'source' => 'server',
        ];
    }

    private static function failure(array $tests, string $status, string $error, int $wallMs): array
    {
        $infra = in_array($error, self::INFRA_ERRORS, true);
        $results = [];
        foreach ($tests as $test) {
            $results[] = [
                'id' => $test['id'] ?? null,
                'name' => $test['name'] ?? 'test',
                'type' => ($test['type'] ?? 'core') === 'hidden' ? 'hidden' : 'core',
                'status' => 'failed',
                'actual' => null,
                'error' => $error,
            ];
        }
        return [
            'ok' => false,
            'infra' => $infra,
            'status' => $status,
            'error' => $error,
            'wallMs' => $wallMs,
            'results' => $results,
            'testsPassed' => 0,
            'testsTotal' => count($tests),
            'corePassed' => false,
            'hiddenPassed' => false,
            'allPassed' => false,
            'authoritative' => !$infra,
            'source' => 'server',
        ];
    }

    private static function findPythonBinary(): ?string
    {
        if (self::$binaryCache !== null) {
            return self::$binaryCache !== '' ? self::$binaryCache : null;
        }
        $configured = trim((string) getenv('BUGARENA_PYTHON_BIN'));
        $candidates = array_filter([$configured, '/usr/bin/python3', '/usr/local/bin/python3', '/usr/bin/python', 'python3', 'python']);
        foreach ($candidates as $bin) {
            if (str_contains($bin, '/') && !is_executable($bin)) {
                continue;
            }
            $proc = @proc_open([$bin, '--version'], [1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $pipes, null, null, ['bypass_shell' => true]);
            if (!is_resource($proc)) {
                continue;
            }
            $out = (string) stream_get_contents($pipes[1]) . (string) stream_get_contents($pipes[2]);
            fclose($pipes[1]);
            fclose($pipes[2]);
            if (proc_close($proc) === 0 && str_contains($out, 'Python 3')) {
                return self::$binaryCache = $bin;
            }
        }
        self::$binaryCache = '';
        return null;
    }
}
