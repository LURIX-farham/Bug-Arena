<?php
declare(strict_types=1);

namespace BugArena\Middleware;

use BugArena\Core\Database;
use BugArena\Core\Response;

/**
 * Sliding-window rate limiter backed by the rate_limits table.
 */
final class RateLimitMiddleware
{
    public function __construct(
        private readonly int $maxHits,
        private readonly int $windowSeconds
    ) {
    }

    public function handle(string $bucket): void
    {
        $window = (int) floor(time() / $this->windowSeconds);
        $pdo = Database::pdo();
        $stmt = $pdo->prepare(
            'INSERT INTO rate_limits (bucket, window_start, hits) VALUES (?, ?, 1)
             ON DUPLICATE KEY UPDATE hits = hits + 1'
        );
        $stmt->execute([substr($bucket, 0, 64), $window]);
        $hits = $this->currentHits($bucket, $window);

        if ($hits > $this->maxHits) {
            header('Retry-After: ' . $this->windowSeconds);
            Response::error('rate_limited', 429, ['retryAfter' => $this->windowSeconds]);
        }

        // Opportunistic cleanup of stale windows.
        if (random_int(1, 100) <= 2) {
            $pdo->prepare('DELETE FROM rate_limits WHERE window_start < ?')
                ->execute([time() - 86400]);
        }
    }

    private function currentHits(string $bucket, int $window): int
    {
        $stmt = Database::pdo()->prepare(
            'SELECT hits FROM rate_limits WHERE bucket = ? AND window_start = ?'
        );
        $stmt->execute([substr($bucket, 0, 64), $window]);
        $row = $stmt->fetch();
        return $row === false ? 0 : (int) $row['hits'];
    }
}
