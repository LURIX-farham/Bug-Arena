<?php
declare(strict_types=1);

namespace BugArena\Services;

use BugArena\Core\Database;

final class SeasonService
{
    /** @return array{id:int, name:string, starts_at:string, ends_at:string}|null */
    public static function current(): ?array
    {
        $pdo = Database::pdo();
        $stmt = $pdo->query(
            'SELECT id, name, starts_at, ends_at FROM seasons
             WHERE is_active = 1 AND NOW() BETWEEN starts_at AND ends_at
             ORDER BY starts_at DESC LIMIT 1'
        );
        $season = $stmt->fetch();
        if ($season) {
            return $season;
        }
        // Fall back to any active season (e.g. seed window drifted).
        $stmt = $pdo->query('SELECT id, name, starts_at, ends_at FROM seasons WHERE is_active = 1 ORDER BY id DESC LIMIT 1');
        return $stmt->fetch() ?: null;
    }
}
