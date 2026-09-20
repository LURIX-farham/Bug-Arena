<?php
declare(strict_types=1);

/**
 * CLI diagnostic: replay SubmissionController::persist with the exact payloads
 * the client sends. Read the outcome, then restore the DB rows it touched.
 */

$config = require __DIR__ . '/config/config.php';
$GLOBALS['bug_arena_config'] = $config;
require_once __DIR__ . '/src/Core/Autoloader.php';
\BugArena\Core\Autoloader::register();
\BugArena\Core\Database::configure($config['db']);

use BugArena\Controllers\SubmissionController;
use BugArena\Core\Database;

$user = \BugArena\Core\Request::class; // unused; keep imports honest
$pdo = Database::pdo();

// Snapshot lurix (user 8) stats + any submission rows for the challenges we touch.
$snapshot = $pdo->query('SELECT * FROM player_statistics WHERE user_id = 8')->fetch();
$subBefore = $pdo->query('SELECT COUNT(*) FROM submissions WHERE user_id = 8')->fetchColumn();

function attempt(string $label, array $body): void
{
    echo "--- $label ---\n";
    try {
        $result = SubmissionController::persist(8, $body);
        echo json_encode($result, JSON_PRETTY_PRINT), "\n";
    } catch (\BugArena\Core\ValidationException $e) {
        echo 'ValidationException: ', $e->getCode(), ' / ', json_encode($e->extra() ?? []), ' / ', $e->getMessage(), "\n";
    } catch (\Throwable $e) {
        echo get_class($e), ': ', $e->getMessage(), "\n";
    }
}

// Case 1 — old client shape (no test fields).
attempt('old client (no tests)', [
    'challengeId' => 1002,
    'code' => 'def solve(x): return x',
    'attempts' => 1,
    'hardened' => false,
    'timeLeft' => 200.0,
    'solveSeconds' => 100,
]);

// Case 2 — new client shape, full suite passed (1002 has 4 tests).
attempt('new client (4/4 tests)', [
    'challengeId' => 1002,
    'code' => 'def solve(x): return x',
    'attempts' => 1,
    'hardened' => false,
    'timeLeft' => 200.0,
    'solveSeconds' => 100,
    'testsPassed' => 4,
    'testsTotal' => 4,
]);

// Case 3 — new client shape, wrong total (client catalog diverged).
attempt('new client (3/4 tests)', [
    'challengeId' => 1002,
    'code' => 'def solve(x): return x',
    'attempts' => 1,
    'hardened' => false,
    'timeLeft' => 200.0,
    'solveSeconds' => 100,
    'testsPassed' => 3,
    'testsTotal' => 3,
]);

// Restore the snapshot.
if ($snapshot) {
    $pdo->prepare(
        'UPDATE player_statistics SET xp = ?, total_score = ?, duel_points = ?, level = ?,
                solved_challenges = ?, total_submissions = ?, accepted_submissions = ?,
                best_score = ?, current_streak = ?, best_streak = ?, avg_solve_seconds = ?,
                total_solve_seconds = ?
         WHERE user_id = 8'
    )->execute([
        $snapshot['xp'], $snapshot['total_score'], $snapshot['duel_points'], $snapshot['level'],
        $snapshot['solved_challenges'], $snapshot['total_submissions'], $snapshot['accepted_submissions'],
        $snapshot['best_score'], $snapshot['current_streak'], $snapshot['best_streak'],
        $snapshot['avg_solve_seconds'], $snapshot['total_solve_seconds'],
    ]);
}
$pdo->prepare('DELETE FROM submissions WHERE user_id = 8 AND challenge_id = 1002')->execute();
echo "--- restored (submissions before: $subBefore, after: ",
    $pdo->query('SELECT COUNT(*) FROM submissions WHERE user_id = 8')->fetchColumn(), ") ---\n";
