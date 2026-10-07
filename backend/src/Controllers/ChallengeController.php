<?php
declare(strict_types=1);

namespace BugArena\Controllers;

use BugArena\Core\Database;
use BugArena\Core\Request;
use BugArena\Core\Response;
use BugArena\Utils\Helpers;

final class ChallengeController
{
    public function index(Request $request): void
    {
        $limit = min(100, max(1, $request->queryInt('limit', 50)));
        $difficulty = trim((string) ($request->query['difficulty'] ?? ''));
        $sql = 'SELECT id, slug, title, description, language, difficulty, bug_type AS bugType,
                       category, skills, tags, estimated_minutes AS estimatedTime,
                       time_limit AS timeLimit, base_score AS baseScore,
                       hardening_bonus AS hardeningBonus, xp_reward AS xpReward,
                       version, function_name AS functionName, starter_code AS code,
                       expected_behavior AS expectedBehavior, hints, explanation,
                       evaluation_tests AS evaluationTests
                FROM challenges WHERE is_active = 1';
        $params = [];
        if (in_array($difficulty, ['Easy','Medium','Hard','Expert'], true)) {
            $sql .= ' AND difficulty = ?';
            $params[] = $difficulty;
        }
        $sql .= ' ORDER BY difficulty, id LIMIT ' . $limit;
        $stmt = Database::pdo()->prepare($sql);
        $stmt->execute($params);
        $rows = array_map([self::class, 'decode'], $stmt->fetchAll());
        Response::json(['ok' => true, 'challenges' => $rows]);
    }

    public function show(Request $request, array $params): void
    {
        $id = filter_var($params['id'] ?? null, FILTER_VALIDATE_INT);
        if (!$id || $id < 1) {
            Helpers::fail('invalid_challenge_id', 422);
        }
        $stmt = Database::pdo()->prepare(
            'SELECT id, slug, title, description, language, difficulty, bug_type AS bugType,
                    category, skills, tags, estimated_minutes AS estimatedTime,
                    time_limit AS timeLimit, base_score AS baseScore,
                    hardening_bonus AS hardeningBonus, xp_reward AS xpReward,
                    version, function_name AS functionName, starter_code AS code,
                    expected_behavior AS expectedBehavior, hints, explanation,
                    evaluation_tests AS evaluationTests
             FROM challenges WHERE id = ? AND is_active = 1 LIMIT 1'
        );
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) {
            Helpers::fail('challenge_not_found', 404);
        }
        Response::json(['ok' => true, 'challenge' => self::decode($row)]);
    }

    private static function decode(array $row): array
    {
        foreach (['skills', 'tags', 'hints'] as $field) {
            $decoded = json_decode((string) $row[$field], true);
            $row[$field] = is_array($decoded) ? $decoded : [];
        }

        // Public surface only: core tests keep args/expected.
        // Hidden tests reduced to metadata — never args or expected.
        $rawTests = json_decode((string) ($row['evaluationTests'] ?? '[]'), true);
        $publicTests = [];
        $hiddenCount = 0;
        if (is_array($rawTests)) {
            foreach ($rawTests as $test) {
                if (!is_array($test)) {
                    continue;
                }
                $type = (string) ($test['type'] ?? 'core');
                if ($type === 'hidden') {
                    $hiddenCount++;
                    $publicTests[] = [
                        'id' => $test['id'] ?? 0,
                        'name' => $test['name'] ?? 'Hidden',
                        'type' => 'hidden',
                    ];
                } else {
                    $publicTests[] = [
                        'id' => $test['id'] ?? 0,
                        'name' => $test['name'] ?? 'Test',
                        'type' => $type,
                        'args' => $test['args'] ?? [],
                        'expected' => $test['expected'] ?? null,
                    ];
                }
            }
        }
        $row['evaluationTests'] = $publicTests;
        $row['hiddenTestCount'] = $hiddenCount;
        $row['publicTestCount'] = count($publicTests) - $hiddenCount;

        $row['id'] = (int) $row['id'];
        foreach (['estimatedTime', 'timeLimit', 'baseScore', 'hardeningBonus', 'xpReward', 'version'] as $field) {
            $row[$field] = (int) $row[$field];
        }
        return $row;
    }

    /**
     * Full authoritative tests (core + hidden with args/expected) — server only.
     * @return list<array>
     */
    public static function loadFullTests(int $challengeId): array
    {
        $stmt = Database::pdo()->prepare(
            'SELECT evaluation_tests FROM challenges WHERE id = ? AND is_active = 1 LIMIT 1'
        );
        $stmt->execute([$challengeId]);
        $raw = $stmt->fetchColumn();
        $decoded = json_decode((string) $raw, true);
        if (!is_array($decoded)) {
            return [];
        }
        $out = [];
        foreach ($decoded as $test) {
            if (!is_array($test)) {
                continue;
            }
            $out[] = [
                'id' => $test['id'] ?? 0,
                'name' => $test['name'] ?? 'Test',
                'type' => (string) ($test['type'] ?? 'core'),
                'args' => $test['args'] ?? [],
                'expected' => $test['expected'] ?? null,
            ];
        }
        return $out;
    }
}
