<?php
declare(strict_types=1);

namespace BugArena\Services;

use BugArena\Core\Database;
use BugArena\Utils\Helpers;

/**
 * Server-authoritative competitive matches. The client only reports *what it
 * did* (which challenge, which opponent, its server-scored result, duration);
 * the opponent's score, win/loss and the entire Elo transaction happen here.
 */
final class RatingService
{
    private const K_BY_MODE = ['ranked' => 32, 'blitz' => 24, 'survival' => 20];

    /**
     * Simulate the opponent's run server-side from the matchmaking row.
     */
    public static function opponentScore(array $opponent): int
    {
        $jitter = random_int(75, 115) / 100;
        return max(40, (int) round(((int) $opponent['baseline']) * ((float) $opponent['skill']) * $jitter));
    }

    /**
     * Resolve a match: computes the result, applies Elo, persists everything
     * inside one transaction and returns the full match record.
     *
     * @param array $user row from users (id, rating)
     * @param array $opponent row from competitive_players (+ users rating)
     */
    public static function resolveMatch(
        array $user,
        array $opponent,
        string $mode,
        int $challengeId,
        string $challengeTitle,
        int $playerScore,
        bool $solved,
        int $durationMs,
        string $publicId
    ): array {
        $userId = (int) $user['id'];
        $opponentUserId = (int) $opponent['user_id'];
        $ratingBefore = (int) $user['rating'];
        $opponentRating = (int) $opponent['rating'];
        $oppScore = self::opponentScore($opponent);

        $result = ($solved && $playerScore >= $oppScore) ? 'win' : 'loss';
        $score = $result === 'win' ? 1.0 : 0.0;
        $expected = 1.0 / (1.0 + 10.0 ** (($opponentRating - $ratingBefore) / 400.0));
        $k = self::K_BY_MODE[$mode] ?? 32;
        $delta = (int) round($k * ($score - $expected));
        // Winning is never free and losing never bankrupts below the floor.
        $delta = ($result === 'win') ? max(5, $delta) : min(-5, $delta);
        $ratingAfter = max(100, $ratingBefore + $delta);

        $season = SeasonService::current();
        $seasonId = $season ? (int) $season['id'] : null;

        return Database::transaction(function (\PDO $pdo) use (
            $opponent, $opponentRating, $userId, $opponentUserId, $seasonId, $mode, $challengeId, $challengeTitle,
            $playerScore, $oppScore, $solved, $result,
            $ratingBefore, $delta, $ratingAfter, $durationMs, $publicId
        ): array {
            $pdo->prepare(
                'INSERT INTO competitive_matches
                   (public_id, user_id, season_id, mode, opponent_id, opponent_name, opponent_score,
                    challenge_id, result, solved, rating_before, rating_delta, rating_after,
                    player_score, duration_ms, played_at)
                 VALUES (?, ?, ?, ?, ?, (SELECT username FROM users WHERE id = ?), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
            )->execute([
                $publicId, $userId, $seasonId, $mode, $opponentUserId, $opponentUserId,
                $oppScore, $challengeId, $result, $solved ? 1 : 0,
                $ratingBefore, $delta, $ratingAfter, $playerScore, $durationMs,
                Helpers::safeDate('now'),
            ]);

            // Capture the auto-increment id immediately: PDO's lastInsertId()
            // is taken from the latest statement's OK packet and any later
            // UPDATE resets it to 0.
            $matchId = (int) Database::pdo()->lastInsertId();

            $opponentDelta = -$delta;
            $winInc = $result === 'win' ? 1 : 0;
            $lossInc = $result === 'loss' ? 1 : 0;
            $pdo->prepare(
                'UPDATE users SET rating = ?, wins = wins + ?, losses = losses + ?, last_active_at = NOW() WHERE id = ?'
            )->execute([$ratingAfter, $winInc, $lossInc, $userId]);
            $pdo->prepare(
                'UPDATE users SET rating = GREATEST(100, rating + ?), wins = wins + ?, losses = losses + ? WHERE id = ?'
            )->execute([$opponentDelta, $lossInc, $winInc, $opponentUserId]);

            $pdo->prepare('INSERT INTO ratings (user_id, season_id, match_id, rating, delta) VALUES (?, ?, ?, ?, ?)')
                ->execute([$userId, $seasonId, $matchId, $ratingAfter, $delta]);

            StatisticsService::refreshStreaks($userId);

            return [
                'id' => $publicId,
                'mode' => $mode,
                'challengeId' => $challengeId,
                'challengeTitle' => $challengeTitle,
                'opponent' => ['id' => $opponentUserId, 'name' => $opponent['handle'], 'rating' => $opponentRating],
                'opponentScore' => $oppScore,
                'result' => $result,
                'solved' => $solved,
                'ratingBefore' => $ratingBefore,
                'ratingDelta' => $delta,
                'ratingAfter' => $ratingAfter,
                'playerScore' => $playerScore,
                'durationMs' => $durationMs,
                'seasonId' => $seasonId,
                'playedAt' => date('Y-m-d H:i:s'),
            ];
        });
    }
}
