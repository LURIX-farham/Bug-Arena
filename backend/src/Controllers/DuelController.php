<?php
declare(strict_types=1);

namespace BugArena\Controllers;

use BugArena\Core\Database;
use BugArena\Core\Request;
use BugArena\Core\Response;
use BugArena\Middleware\AuthMiddleware;
use BugArena\Middleware\RateLimitMiddleware;
use BugArena\Services\AchievementService;
use BugArena\Services\ScoringService;
use BugArena\Services\SeasonService;
use BugArena\Services\StatisticsService;
use BugArena\Utils\Helpers;

/**
 * Human vs human 1v1 duels.
 *
 * Presence, invitations and match state are all poll-based (no websockets):
 * the client heartbeats every ~20s, polls its invitation inbox every few
 * seconds and polls the match while a duel is running. Every transition that
 * can be raced (first accept wins the seat, final resolve) happens inside a
 * transaction guarded by a conditional UPDATE or SELECT ... FOR UPDATE.
 */
final class DuelController
{
    private const ONLINE_WINDOW_SECONDS = 60;
    private const INVITATION_TTL_SECONDS = 90;
    private const EXPIRE_GRACE_SECONDS = 30;
    private const TIMEOUT_GRACE_SECONDS = 30;
    private const K_FACTOR = 32;

    private const DIFFICULTIES = ['Easy', 'Medium', 'Hard', 'Expert'];

    // ------------------------------------------------------------------
    // Presence
    // ------------------------------------------------------------------

    /** POST /duel/heartbeat — mark alive, list who else is online. */
    public function heartbeat(): void
    {
        $userId = AuthMiddleware::requireAuth();
        (new RateLimitMiddleware(30, 60))->handle('duel_hb:' . $userId);

        Database::pdo()->prepare('UPDATE users SET last_active_at = NOW() WHERE id = ?')
            ->execute([$userId]);

        Response::json(['ok' => true, 'online' => self::onlineUsers($userId)]);
    }

    /** @return array<int, array> non-bot users seen within the online window. */
    private static function onlineUsers(int $excludeUserId): array
    {
        $stmt = Database::pdo()->prepare(
            'SELECT u.public_id AS id, u.username, u.display_name AS displayName, u.rating,
                    COALESCE(p.avatar_color, "#7cff6b") AS avatarColor
             FROM users u
             LEFT JOIN user_profiles p ON p.user_id = u.id
             WHERE u.is_bot = 0 AND u.status = "active" AND u.deleted_at IS NULL
               AND u.id <> ?
               AND u.last_active_at >= NOW() - INTERVAL ' . self::ONLINE_WINDOW_SECONDS . ' SECOND
             ORDER BY u.last_active_at DESC
             LIMIT 50'
        );
        $stmt->execute([$excludeUserId]);
        return array_map(static fn (array $r) => [
            'id' => $r['id'],
            'username' => $r['username'],
            'displayName' => $r['displayName'],
            'rating' => (int) $r['rating'],
            'avatarColor' => $r['avatarColor'],
        ], $stmt->fetchAll());
    }

    // ------------------------------------------------------------------
    // Invitations
    // ------------------------------------------------------------------

    /** POST /duel/invitations — host opens a duel seat and fans out invites. */
    public function createInvite(Request $request): void
    {
        $userId = AuthMiddleware::requireAuth();
        (new RateLimitMiddleware(10, 60))->handle('duel_create:' . $userId);

        self::lazyExpire();

        // Normalize difficulty to either 'any' or one of Easy/Medium/Hard/Expert.
        // Previous code turned client 'any' into stored 'Any', which then failed
        // the pickChallenge filter (compared against lowercase 'any') and relied
        // only on the fallback path. Keep the stored value consistent.
        $difficultyRaw = strtolower(trim((string) ($request->body['difficulty'] ?? 'any')));
        if ($difficultyRaw === 'any' || $difficultyRaw === '') {
            $difficulty = 'any';
        } else {
            $difficulty = ucfirst($difficultyRaw);
            if (!in_array($difficulty, self::DIFFICULTIES, true)) {
                $difficulty = 'any';
            }
        }
        $bugType = Helpers::cleanEnum($request->body['bugType'] ?? 'any', 'any');
        if (strtolower($bugType) === 'any') {
            $bugType = 'any';
        }

        $pdo = Database::pdo();
        $season = SeasonService::current();
        $matchId = Helpers::uuid();

        $stmt = $pdo->prepare(
            'INSERT INTO duel_matches (public_id, host_id, difficulty, bug_type, status, season_id)
             VALUES (?, ?, ?, ?, "pending", ?)'
        );
        $stmt->execute([
            $matchId, $userId, $difficulty, $bugType,
            $season ? (int) $season['id'] : null,
        ]);
        $matchPk = (int) Database::pdo()->lastInsertId();

        // Fan out to every live human. The host's own heartbeat (or lobby
        // poll) refreshed its last_active_at, so the window is authoritative.
        $stmt = $pdo->prepare(
            'INSERT INTO duel_invitations (public_id, match_id, from_user_id, to_user_id, status, expires_at)
             SELECT UUID(), ?, ?, u.id, "sent", NOW() + INTERVAL ' . self::INVITATION_TTL_SECONDS . ' SECOND
             FROM users u
             WHERE u.is_bot = 0 AND u.status = "active" AND u.deleted_at IS NULL
               AND u.id <> ?
               AND u.last_active_at >= NOW() - INTERVAL ' . self::ONLINE_WINDOW_SECONDS . ' SECOND'
        );
        $stmt->execute([$matchPk, $userId, $userId]);
        $invited = $stmt->rowCount();

        Response::json(['ok' => true, 'matchId' => $matchId, 'invitedCount' => $invited], 201);
    }

    /** GET /duel/invitations — pending invites for the current user. */
    public function listInvites(): void
    {
        $userId = AuthMiddleware::requireAuth();
        (new RateLimitMiddleware(120, 60))->handle('duel_list:' . $userId);

        self::lazyExpire();

        $stmt = Database::pdo()->prepare(
            'SELECT i.public_id AS invitationId, i.expires_at AS expiresAt,
                    m.public_id AS matchId, m.difficulty, m.bug_type AS bugType, m.created_at AS createdAt,
                    u.public_id AS fromId, u.username, u.display_name AS displayName, u.rating,
                    COALESCE(p.avatar_color, "#7cff6b") AS avatarColor
             FROM duel_invitations i
             JOIN duel_matches m ON m.id = i.match_id
             JOIN users u ON u.id = i.from_user_id
             LEFT JOIN user_profiles p ON p.user_id = u.id
             WHERE i.to_user_id = ? AND i.status = "sent" AND i.expires_at >= NOW()
             ORDER BY i.created_at DESC
             LIMIT 5'
        );
        $stmt->execute([$userId]);
        $invitations = array_map(static fn (array $r) => [
            'invitationId' => $r['invitationId'],
            'matchId' => $r['matchId'],
            'expiresAt' => $r['expiresAt'],
            'difficulty' => $r['difficulty'],
            'bugType' => $r['bugType'],
            'from' => [
                'id' => $r['fromId'],
                'username' => $r['username'],
                'displayName' => $r['displayName'],
                'rating' => (int) $r['rating'],
                'avatarColor' => $r['avatarColor'],
            ],
        ], $stmt->fetchAll());

        Response::json(['ok' => true, 'invitations' => $invitations]);
    }

    /** POST /duel/invitations/{id}/accept — first accept claims the seat. */
    public function accept(Request $request, array $params): void
    {
        $userId = AuthMiddleware::requireAuth();
        (new RateLimitMiddleware(30, 60))->handle('duel_accept:' . $userId);
        $invitationId = (string) ($params['id'] ?? '');

        $payload = Database::transaction(function (\PDO $pdo) use ($userId, $invitationId) {
            $stmt = $pdo->prepare(
                'SELECT i.id AS inv_pk, i.to_user_id, i.match_id AS match_pk, i.status AS inv_status, i.expires_at,
                        m.public_id AS match_id, m.status AS match_status, m.guest_id, m.difficulty, m.bug_type
                 FROM duel_invitations i
                 JOIN duel_matches m ON m.id = i.match_id
                 WHERE i.public_id = ?
                 FOR UPDATE'
            );
            $stmt->execute([$invitationId]);
            $row = $stmt->fetch();
            if (!$row || (int) $row['to_user_id'] !== $userId) {
                Helpers::fail('invitation_not_found', 404);
            }
            if ($row['inv_status'] === 'accepted') {
                return ['existing' => true, 'matchId' => $row['match_id']];
            }
            if ($row['inv_status'] !== 'sent' || strtotime((string) $row['expires_at']) < time()
                || $row['match_status'] !== 'pending') {
                Helpers::fail('invitation_expired', 410);
            }

            // Pick the random bug challenge matching the host's filters; if
            // the filters match nothing, fall back to any active challenge.
            $challenge = self::pickChallenge((string) $row['difficulty'], (string) $row['bug_type']);
            if (!$challenge) {
                Helpers::fail('no_challenges_available', 503);
            }

            $claim = $pdo->prepare(
                'UPDATE duel_matches
                 SET guest_id = ?, status = "active", challenge_id = ?, started_at = NOW()
                 WHERE id = ? AND status = "pending" AND guest_id IS NULL'
            );
            $claim->execute([(int) $row['to_user_id'], (int) $challenge['id'], (int) $row['match_pk']]);
            if ($claim->rowCount() === 0) {
                Helpers::fail('seat_taken', 409);
            }

            $pdo->prepare('UPDATE duel_invitations SET status = "accepted" WHERE id = ?')
                ->execute([(int) $row['inv_pk']]);
            $pdo->prepare(
                'UPDATE duel_invitations SET status = "cancelled" WHERE match_id = ? AND id <> ? AND status = "sent"'
            )->execute([(int) $row['match_pk'], (int) $row['inv_pk']]);

            return ['existing' => false, 'matchId' => $row['match_id']];
        });

        Response::json(['ok' => true] + $payload);
    }

    /** POST /duel/invitations/{id}/decline */
    public function decline(Request $request, array $params): void
    {
        $userId = AuthMiddleware::requireAuth();
        $invitationId = (string) ($params['id'] ?? '');

        $stmt = Database::pdo()->prepare(
            'UPDATE duel_invitations SET status = "declined"
             WHERE public_id = ? AND to_user_id = ? AND status = "sent"'
        );
        $stmt->execute([$invitationId, $userId]);
        if ($stmt->rowCount() === 0) {
            Helpers::fail('invitation_not_found', 404);
        }
        Response::json(['ok' => true]);
    }

    /**
     * Pick a random challenge honouring the host's filters.
     * @return array|false row from challenges (id only is consumed)
     */
    private static function pickChallenge(string $difficulty, string $bugType): array|false
    {
        $pdo = Database::pdo();
        $conditions = ['is_active = 1'];
        $params = [];
        $difficultyNorm = strtolower(trim($difficulty));
        $bugTypeNorm = strtolower(trim($bugType));
        if ($difficultyNorm !== 'any' && $difficultyNorm !== '') {
            // DB stores canonical title-case (Easy/Medium/Hard/Expert)
            $conditions[] = 'difficulty = ?';
            $params[] = ucfirst($difficultyNorm);
        }
        if ($bugTypeNorm !== 'any' && $bugTypeNorm !== '') {
            $conditions[] = 'bug_type = ?';
            $params[] = $bugType; // keep original casing for bug_type values
        }
        $stmt = $pdo->prepare(
            'SELECT id FROM challenges WHERE ' . implode(' AND ', $conditions) . ' ORDER BY RAND() LIMIT 1'
        );
        $stmt->execute($params);
        $row = $stmt->fetch();
        if ($row) {
            return $row;
        }
        // Filtered pool is empty — any active challenge keeps the duel alive.
        return $pdo->query('SELECT id FROM challenges WHERE is_active = 1 ORDER BY RAND() LIMIT 1')->fetch();
    }

    // ------------------------------------------------------------------
    // Matches
    // ------------------------------------------------------------------

    /** GET /duel/matches/{id} — full state for a participant. */
    public function show(Request $request, array $params): void
    {
        $userId = AuthMiddleware::requireAuth();
        (new RateLimitMiddleware(120, 60))->handle('duel_show:' . $userId);

        $match = self::findMatchForViewer((string) ($params['id'] ?? ''), $userId);
        $match = self::lazyResolve($match);

        $payload = [
            'ok' => true,
            'match' => self::matchPayload($match, $userId),
        ];
        if ($match['status'] === 'finished') {
            AchievementService::evaluate($userId);
            $payload['stats'] = \BugArena\Services\StatisticsService::get($userId);
        }

        Response::json($payload);
    }

    /** POST /duel/matches/{id}/cancel — host aborts while nobody joined. */
    public function cancel(Request $request, array $params): void
    {
        $userId = AuthMiddleware::requireAuth();
        $stmt = Database::pdo()->prepare(
            'UPDATE duel_matches SET status = "cancelled"
             WHERE public_id = ? AND host_id = ? AND status = "pending"'
        );
        $stmt->execute([(string) ($params['id'] ?? ''), $userId]);
        if ($stmt->rowCount() === 0) {
            Helpers::fail('match_not_cancellable', 409);
        }
        Response::json(['ok' => true]);
    }

    /** POST /duel/matches/{id}/result — record one player's run, resolve when both are in. */
    public function result(Request $request, array $params): void
    {
        $userId = AuthMiddleware::requireAuth();
        (new RateLimitMiddleware(30, 60))->handle('duel_result:' . $userId);
        $publicId = (string) ($params['id'] ?? '');

        self::storeResult($publicId, $userId, $request->body);
        $match = self::findMatchForViewer($publicId, $userId);
        $match = self::lazyResolve($match);

        $payload = [
            'ok' => true,
            'match' => self::matchPayload($match, $userId),
        ];

        // When the duel is resolved, return authoritative stats so the client
        // can update topbar / leaderboard without a separate round-trip.
        if ($match['status'] === 'finished') {
            AchievementService::evaluate($userId);
            $payload['stats'] = \BugArena\Services\StatisticsService::get($userId);
        }

        Response::json($payload);
    }

    private static function storeResult(string $publicId, int $userId, array $body): void
    {
        Database::transaction(function (\PDO $pdo) use ($publicId, $userId, $body) {
            $stmt = $pdo->prepare(
                'SELECT m.*, c.base_score, c.time_limit, c.hardening_bonus
                 FROM duel_matches m
                 LEFT JOIN challenges c ON c.id = m.challenge_id
                 WHERE m.public_id = ?
                 FOR UPDATE'
            );
            $stmt->execute([$publicId]);
            $match = $stmt->fetch();
            if (!$match) {
                Helpers::fail('match_not_found', 404);
            }
            $isHost = (int) $match['host_id'] === $userId;
            $isGuest = (int) $match['guest_id'] === $userId;
            if (!$isHost && !$isGuest) {
                Helpers::fail('match_not_found', 404);
            }
            if ($match['status'] !== 'active') {
                if ($match['status'] === 'finished') {
                    return; // idempotent re-submit
                }
                Helpers::fail('match_not_active', 409);
            }
            $resultColumn = $isHost ? 'host_result' : 'guest_result';
            if ($match[$resultColumn] !== null) {
                return; // idempotent re-submit
            }

            $challengeId = (int) $match['challenge_id'];

            $solved = (bool) ($body['solved'] ?? false);
            $testsPassed = Helpers::clampInt($body['testsPassed'] ?? 0, 0, 999);
            $testsTotal = Helpers::clampInt($body['testsTotal'] ?? 0, 0, 999);
            $attempts = Helpers::clampInt($body['attempts'] ?? 1, 1, 99);
            $hardened = (bool) ($body['hardened'] ?? false);

            // Shared clock: remaining time is derived from started_at so neither
            // client can claim more (or less) time than the official window.
            $limit = (float) $match['time_limit'];
            $serverRemaining = $limit;
            if (!empty($match['started_at'])) {
                $startTs = strtotime((string) $match['started_at']);
                if ($startTs !== false) {
                    $elapsed = max(0.0, (float) (time() - $startTs));
                    $serverRemaining = max(0.0, $limit - $elapsed);
                }
            }
            $clientRemaining = max(0.0, (float) ($body['timeLeft'] ?? 0));
            // Trust the tighter (more conservative) of the two so a lagging
            // client cannot invent extra timeLeft for a bigger speed bonus.
            $timeLeft = min($limit, $serverRemaining, $clientRemaining);
            $solveSeconds = Helpers::clampInt(
                (int) round($limit - $timeLeft),
                0,
                86400
            );

            // A full solve is re-scored server-side from the raw inputs. The
            // registry test count cannot gate this duel path: the client
            // bundle and the challenge_tests table legitimately disagree on
            // per-challenge counts, so expectedTests is passed as 0 (check
            // disabled). Anything less than a full solve records as score 0.
            if ($solved) {
                $scoreParts = ScoringService::compute(
                    $match, $attempts, $hardened, $timeLeft, $testsPassed, $testsTotal, 0
                );
            } else {
                $scoreParts = [
                    'score' => 0, 'baseScore' => (int) $match['base_score'],
                    'speedBonus' => 0, 'attemptBonus' => 0, 'hardeningBonus' => 0,
                ];
            }

            $payload = json_encode([
                'score' => (int) $scoreParts['score'],
                'baseScore' => (int) $scoreParts['baseScore'],
                'speedBonus' => (int) $scoreParts['speedBonus'],
                'attemptBonus' => (int) $scoreParts['attemptBonus'],
                'hardeningBonus' => (int) $scoreParts['hardeningBonus'],
                'solved' => $solved,
                'testsPassed' => $testsPassed,
                'testsTotal' => $testsTotal,
                'attempts' => $attempts,
                'hardened' => $hardened,
                'solveSeconds' => $solveSeconds,
                'recordedAt' => date('Y-m-d H:i:s'),
            ], JSON_UNESCAPED_UNICODE);

            $pdo->prepare("UPDATE duel_matches SET {$resultColumn} = ? WHERE id = ?")
                ->execute([$payload, (int) $match['id']]);

            $fresh = $pdo->prepare('SELECT host_result, guest_result FROM duel_matches WHERE id = ?');
            $fresh->execute([(int) $match['id']]);
            $both = $fresh->fetch();
            if ($both['host_result'] !== null && $both['guest_result'] !== null) {
                self::finalize($pdo, array_merge($match, [
                    'host_result' => $both['host_result'],
                    'guest_result' => $both['guest_result'],
                ]));
            }
        });
    }

    /**
     * Resolve a finished duel: winner, points, Elo, statistics — all inside
     * the caller's transaction. Points come from the challenge base score:
     * winner 90% + 20% bonus, loser 10%, draw 10% each.
     */
    private static function finalize(\PDO $pdo, array $match): void
    {
        $host = json_decode((string) $match['host_result'], true) ?: [];
        $guest = json_decode((string) $match['guest_result'], true) ?: [];
        $hostScore = (int) ($host['score'] ?? 0);
        $guestScore = (int) ($guest['score'] ?? 0);
        $hostSeconds = (int) ($host['solveSeconds'] ?? 0);
        $guestSeconds = (int) ($guest['solveSeconds'] ?? 0);
        $base = max(0, (int) $match['base_score']);

        $hostId = (int) $match['host_id'];
        $guestId = (int) $match['guest_id'];

        if ($hostScore === $guestScore) {
            if ($hostScore === 0 || $hostSeconds === $guestSeconds) {
                $winnerId = null;
            } else {
                $winnerId = $hostSeconds < $guestSeconds ? $hostId : $guestId;
            }
        } else {
            $winnerId = $hostScore > $guestScore ? $hostId : $guestId;
        }
        $isDraw = $winnerId === null;

        if ($isDraw) {
            $hostPoints = (int) round($base * 0.1);
            $guestPoints = $hostPoints;
        } else {
            $winnerPoints = (int) round($base * 0.9) + (int) round($base * 0.2);
            $loserPoints = (int) round($base * 0.1);
            $hostPoints = $winnerId === $hostId ? $winnerPoints : $loserPoints;
            $guestPoints = $winnerId === $guestId ? $winnerPoints : $loserPoints;
        }

        // Elo between the two real ratings (K=32), mirrored like RatingService.
        $ratings = $pdo->prepare('SELECT id, rating FROM users WHERE id IN (?, ?)');
        $ratings->execute([$hostId, $guestId]);
        $ratingRows = $ratings->fetchAll();
        $hostRating = (int) ($ratingRows[0]['rating'] ?? 1000);
        $guestRating = (int) ($ratingRows[1]['rating'] ?? 1000);
        if ((int) $ratingRows[0]['id'] !== $hostId) {
            [$hostRating, $guestRating] = [$guestRating, $hostRating];
        }

        $hostActual = $isDraw ? 0.5 : ($winnerId === $hostId ? 1.0 : 0.0);
        $expected = 1.0 / (1.0 + 10.0 ** (($guestRating - $hostRating) / 400.0));
        $hostDelta = (int) round(self::K_FACTOR * ($hostActual - $expected));
        if (!$isDraw) {
            $hostDelta = $hostActual === 1.0 ? max(5, $hostDelta) : min(-5, $hostDelta);
        }
        $guestDelta = -$hostDelta;

        $season = SeasonService::current();
        $seasonId = $season ? (int) $season['id'] : null;

        $pdo->prepare(
            'UPDATE duel_matches
             SET status = "finished", winner_id = ?, is_draw = ?, host_points = ?, guest_points = ?,
                 season_id = COALESCE(season_id, ?), finished_at = NOW()
             WHERE id = ?'
        )->execute([
            $winnerId, $isDraw ? 1 : 0, $hostPoints, $guestPoints, $seasonId, (int) $match['id'],
        ]);

        // Two explicit updates keep the win/loss/draw bookkeeping readable.
        $hostStat = $isDraw
            ? 'draws = draws + 1'
            : ($winnerId === $hostId ? 'wins = wins + 1' : 'losses = losses + 1');
        $guestStat = $isDraw
            ? 'draws = draws + 1'
            : ($winnerId === $guestId ? 'wins = wins + 1' : 'losses = losses + 1');

        $pdo->prepare("UPDATE users SET rating = GREATEST(100, rating + ?), {$hostStat}, last_active_at = NOW() WHERE id = ?")
            ->execute([$hostDelta, $hostId]);
        $pdo->prepare("UPDATE users SET rating = GREATEST(100, rating + ?), {$guestStat} WHERE id = ?")
            ->execute([$guestDelta, $guestId]);

        $pdo->prepare('INSERT INTO ratings (user_id, season_id, match_id, rating, delta) VALUES (?, ?, NULL, ?, ?)')
            ->execute([$hostId, $seasonId, $hostRating + $hostDelta, $hostDelta]);
        $pdo->prepare('INSERT INTO ratings (user_id, season_id, match_id, rating, delta) VALUES (?, ?, NULL, ?, ?)')
            ->execute([$guestId, $seasonId, $guestRating + $guestDelta, $guestDelta]);

        self::applyDuelPoints($pdo, $hostId, $hostPoints);
        self::applyDuelPoints($pdo, $guestId, $guestPoints);

        $eventStmt = $pdo->prepare(
            'INSERT INTO arena_events (user_id, event_type, payload) VALUES (?, "duel_finished", ?)'
        );
        $eventStmt->execute([$hostId, json_encode([
            'matchId' => $match['public_id'], 'result' => $isDraw ? 'draw' : ($winnerId === $hostId ? 'win' : 'loss'),
            'points' => $hostPoints, 'opponentId' => $guestId,
        ], JSON_UNESCAPED_UNICODE)]);
        $eventStmt->execute([$guestId, json_encode([
            'matchId' => $match['public_id'], 'result' => $isDraw ? 'draw' : ($winnerId === $guestId ? 'win' : 'loss'),
            'points' => $guestPoints, 'opponentId' => $hostId,
        ], JSON_UNESCAPED_UNICODE)]);
    }

    /**
     * Duel earnings: xp + dedicated duel_points (never wiped by refreshDerived).
     * Also recomputes level from the new XP so leaderboard/profile stay in sync.
     */
    private static function applyDuelPoints(\PDO $pdo, int $userId, int $points): void
    {
        if ($points <= 0) {
            return;
        }
        $pdo->prepare('INSERT IGNORE INTO player_statistics (user_id) VALUES (?)')->execute([$userId]);
        $pdo->prepare('UPDATE player_statistics SET xp = xp + ?, duel_points = duel_points + ? WHERE user_id = ?')
            ->execute([$points, $points, $userId]);

        $stmt = $pdo->prepare('SELECT xp FROM player_statistics WHERE user_id = ?');
        $stmt->execute([$userId]);
        $xp = (int) ($stmt->fetchColumn() ?: 0);
        $pdo->prepare('UPDATE player_statistics SET level = ? WHERE user_id = ?')
            ->execute([\BugArena\Services\ProgressionService::levelFromXp($xp), $userId]);
    }

    // ------------------------------------------------------------------
    // Shared helpers
    // ------------------------------------------------------------------

    private static function findMatchForViewer(string $publicId, int $userId): array
    {
        $stmt = Database::pdo()->prepare(
            'SELECT m.*, c.title AS c_title, c.difficulty AS c_difficulty, c.bug_type AS c_bug_type,
                    c.base_score AS c_base_score, c.time_limit AS c_time_limit
             FROM duel_matches m
             LEFT JOIN challenges c ON c.id = m.challenge_id
             WHERE m.public_id = ?
             LIMIT 1'
        );
        $stmt->execute([$publicId]);
        $match = $stmt->fetch();
        if (!$match || ((int) $match['host_id'] !== $userId && (int) $match['guest_id'] !== $userId)) {
            Helpers::fail('match_not_found', 404);
        }
        return $match;
    }

    /** Lazy state transitions so abandoned matches never block anyone. */
    private static function lazyResolve(array $match): array
    {
        if ($match['status'] === 'pending'
            && strtotime((string) $match['created_at']) < time() - self::INVITATION_TTL_SECONDS - self::EXPIRE_GRACE_SECONDS) {
            Database::pdo()->prepare('UPDATE duel_matches SET status = "expired" WHERE id = ? AND status = "pending"')
                ->execute([(int) $match['id']]);
            $match['status'] = 'expired';
        }
        if ($match['status'] === 'active' && $match['started_at'] !== null) {
            $deadline = strtotime((string) $match['started_at']) + (int) $match['c_time_limit'] + self::TIMEOUT_GRACE_SECONDS;
            if (time() > $deadline) {
                $stmt = Database::pdo()->prepare(
                    'SELECT host_result, guest_result FROM duel_matches WHERE id = ? FOR UPDATE'
                );
                $stmt->execute([(int) $match['id']]);
                $row = $stmt->fetch();
                if ($row['host_result'] === null && $row['guest_result'] === null) {
                    Database::pdo()->prepare('UPDATE duel_matches SET status = "cancelled", finished_at = NOW() WHERE id = ?')
                        ->execute([(int) $match['id']]);
                    $match['status'] = 'cancelled';
                } else {
                    // Fill in the missing side as a failed run, then resolve.
                    $missing = json_encode([
                        'score' => 0, 'baseScore' => (int) $match['c_base_score'],
                        'speedBonus' => 0, 'attemptBonus' => 0, 'hardeningBonus' => 0,
                        'testsPassed' => 0, 'testsTotal' => 0, 'attempts' => 0, 'hardened' => false,
                        'solveSeconds' => (int) $match['c_time_limit'], 'timedOut' => true,
                    ], JSON_UNESCAPED_UNICODE);
                    if ($row['host_result'] === null) {
                        $match['host_result'] = $missing;
                    }
                    if ($row['guest_result'] === null) {
                        $match['guest_result'] = $missing;
                    }
                    // finalize() reads the plain challenge columns (storeResult
                    // shape); findMatchForViewer aliases them with a c_ prefix.
                    $match['base_score'] = (int) $match['c_base_score'];
                    Database::transaction(function (\PDO $pdo) use ($match) {
                        self::finalize($pdo, $match);
                    });
                    $match['status'] = 'finished';
                }
            }
        }
        return $match;
    }

    private static function lazyExpire(): void
    {
        $pdo = Database::pdo();
        $pdo->prepare(
            'UPDATE duel_invitations SET status = "expired" WHERE status = "sent" AND expires_at < NOW()'
        )->execute();
        $pdo->prepare(
            'UPDATE duel_matches m
             LEFT JOIN duel_invitations i ON i.match_id = m.id AND i.status = "accepted"
             SET m.status = "expired", m.finished_at = NOW()
             WHERE m.status = "pending"
               AND m.created_at < NOW() - INTERVAL ' . (self::INVITATION_TTL_SECONDS + self::EXPIRE_GRACE_SECONDS) . ' SECOND
               AND i.id IS NULL'
        )->execute();
    }

    private static function participant(int $userId): ?array
    {
        $stmt = Database::pdo()->prepare(
            'SELECT u.public_id AS id, u.username, u.display_name AS displayName, u.rating,
                    u.wins, u.losses, u.draws,
                    COALESCE(p.avatar_color, "#7cff6b") AS avatarColor
             FROM users u
             LEFT JOIN user_profiles p ON p.user_id = u.id
             WHERE u.id = ?
             LIMIT 1'
        );
        $stmt->execute([$userId]);
        $row = $stmt->fetch();
        if (!$row) {
            return null;
        }
        return [
            'id' => $row['id'],
            'username' => $row['username'],
            'displayName' => $row['displayName'],
            'rating' => (int) $row['rating'],
            'wins' => (int) $row['wins'],
            'losses' => (int) $row['losses'],
            'draws' => (int) $row['draws'],
            'avatarColor' => $row['avatarColor'],
        ];
    }

    private static function decodeResult(mixed $raw): ?array
    {
        if ($raw === null) {
            return null;
        }
        $decoded = json_decode((string) $raw, true);
        return is_array($decoded) ? $decoded : null;
    }

    private static function matchPayload(array $match, int $viewerId): array
    {
        $host = self::participant((int) $match['host_id']);
        $guest = $match['guest_id'] !== null ? self::participant((int) $match['guest_id']) : null;
        $challenge = $match['challenge_id'] === null ? null : [
            'id' => (int) $match['challenge_id'],
            'title' => $match['c_title'],
            'difficulty' => $match['c_difficulty'],
            'bugType' => $match['c_bug_type'],
            'baseScore' => (int) $match['c_base_score'],
            'timeLimit' => (int) $match['c_time_limit'],
        ];
        $winnerPublicId = null;
        if ($match['winner_id'] !== null) {
            $winnerStmt = Database::pdo()->prepare('SELECT public_id FROM users WHERE id = ?');
            $winnerStmt->execute([(int) $match['winner_id']]);
            $winnerPublicId = $winnerStmt->fetchColumn() ?: null;
        }

        $viewerRole = (int) $match['host_id'] === $viewerId ? 'host' : 'guest';
        $rivalRole = $viewerRole === 'host' ? 'guest' : 'host';

        $results = [
            'host' => self::decodeResult($match['host_result']),
            'guest' => self::decodeResult($match['guest_result']),
        ];

        // While the duel is still live, the rival's raw result stays
        // hidden (no score spoilers). Only the "finished" flag leaks
        // through, so the waiting screen can show live progress.
        $progress = [
            'host' => $match['host_result'] !== null,
            'guest' => $match['guest_result'] !== null,
        ];
        if (($match['status'] ?? '') === 'active') {
            $results[$rivalRole] = null;
        }

        // Shared duel clock: both clients must count down from the same
        // server-side deadline (started_at + challenge time_limit).
        $timeLimit = (int) ($match['c_time_limit'] ?? 0);
        $startedAt = $match['started_at'] ?? null;
        $endsAt = null;
        $remainingSeconds = null;
        if ($startedAt !== null && $timeLimit > 0) {
            $startTs = strtotime((string) $startedAt);
            if ($startTs !== false) {
                $endTs = $startTs + $timeLimit;
                $endsAt = date('c', $endTs);
                $remainingSeconds = max(0, $endTs - time());
            }
        }

        return [
            'id' => $match['public_id'],
            'status' => $match['status'],
            'difficulty' => $match['difficulty'],
            'bugType' => $match['bug_type'],
            'viewerRole' => $viewerRole,
            'host' => $host,
            'guest' => $guest,
            'challenge' => $challenge,
            'startedAt' => $startedAt,
            'endsAt' => $endsAt,
            'remainingSeconds' => $remainingSeconds,
            'serverTime' => date('c'),
            'createdAt' => $match['created_at'],
            'finishedAt' => $match['finished_at'],
            'isDraw' => (bool) $match['is_draw'],
            'winnerId' => $winnerPublicId,
            'points' => [
                'host' => (int) $match['host_points'],
                'guest' => (int) $match['guest_points'],
            ],
            'progress' => $progress,
            'results' => $results,
        ];
    }
}
