<?php
declare(strict_types=1);

namespace BugArena\Services;

/**
 * Level math lives ONLY here — the server is the single authority for
 * XP -> level -> rank title. Mirrors the classic curve: each level costs
 * round(250 * 1.35^(n-1)) more XP than the previous one.
 */
final class ProgressionService
{
    public const BASE_XP = 250;
    public const GROWTH = 1.35;

    private const RANK_TITLES = [
        15 => 'Master',
        10 => 'Elite',
        7 => 'Exterminator',
        5 => 'Hunter',
        3 => 'Explorer',
        1 => 'Rookie',
    ];

    /** Cumulative XP required to reach the given level. */
    public static function xpForLevel(int $level): int
    {
        $total = 0;
        for ($i = 1; $i < $level; $i++) {
            $total += (int) round(self::BASE_XP * pow(self::GROWTH, $i - 1));
        }
        return $total;
    }

    public static function levelFromXp(int $xp): int
    {
        $level = 1;
        while ($level < 999 && self::xpForLevel($level + 1) <= $xp) {
            $level++;
        }
        return $level;
    }

    public static function rankTitle(int $level): string
    {
        foreach (self::RANK_TITLES as $minLevel => $title) {
            if ($level >= $minLevel) {
                return $title;
            }
        }
        return 'Rookie';
    }

    /** @return array{level:int, rank:string, xp:int, nextLevelXp:int|null, currentLevelXp:int, progress:float} */
    public static function describe(int $xp): array
    {
        $level = self::levelFromXp($xp);
        $currentLevelXp = self::xpForLevel($level);
        $nextLevelXp = self::xpForLevel($level + 1);
        $needed = $nextLevelXp - $currentLevelXp;
        return [
            'level' => $level,
            'rank' => self::rankTitle($level),
            'xp' => max(0, $xp),
            'currentLevelXp' => $currentLevelXp,
            'nextLevelXp' => $nextLevelXp,
            'progress' => $needed > 0
                ? round(min(1.0, max(0.0, ($xp - $currentLevelXp) / $needed)), 4)
                : 1.0,
        ];
    }
}
