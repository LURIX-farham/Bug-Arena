<?php
declare(strict_types=1);

namespace BugArena\Controllers;

use BugArena\Core\Database;
use BugArena\Core\Request;
use BugArena\Core\Response;
use BugArena\Middleware\AuthMiddleware;
use BugArena\Services\StatisticsService;
use BugArena\Utils\Helpers;

final class PlayerController
{
    public function show(): void
    {
        $userId = AuthMiddleware::requireAuth();
        Response::json(['ok' => true, 'user' => $this->userPayload($userId)]);
    }

    public function update(Request $request): void
    {
        $userId = AuthMiddleware::requireAuth();
        $body = $request->body;
        $pdo = Database::pdo();

        $stmt = $pdo->prepare('SELECT username, display_name FROM users WHERE id = ?');
        $stmt->execute([$userId]);
        $current = $stmt->fetch();

        $username = Helpers::cleanUsername($body['username'] ?? $current['username']);
        $displayName = Helpers::cleanDisplayName($body['displayName'] ?? $current['display_name'], strtoupper($username));
        if (strlen($username) < 3) {
            Helpers::fail('invalid_username', 422);
        }
        $stmt = $pdo->prepare('SELECT id FROM users WHERE username = ? AND id <> ? LIMIT 1');
        $stmt->execute([$username, $userId]);
        if ($stmt->fetch()) {
            Helpers::fail('username_taken', 409);
        }
        $pdo->prepare('UPDATE users SET username = ?, display_name = ?, last_active_at = NOW() WHERE id = ?')
            ->execute([$username, $displayName, $userId]);

        // Profile is a mass-assignment-safe whitelist — never pass raw body.
        // The client may send only identity fields (username/displayName); in
        // that case the stored profile must be left untouched.
        $profile = is_array($body['profile'] ?? null) ? $body['profile'] : [];
        if ($profile !== []) {
            $preferredLanguage = in_array($profile['preferred_language'] ?? 'en', ['en', 'fa'], true)
                ? ($profile['preferred_language'] ?? 'en') : 'en';
            $theme = in_array($profile['theme'] ?? 'dark', ['dark', 'light'], true)
                ? ($profile['theme'] ?? 'dark') : 'dark';
            $avatarColor = preg_match('/^#[0-9a-fA-F]{6}$/', (string) ($profile['avatar_color'] ?? ''))
                ? (string) $profile['avatar_color'] : '#7cff6b';
            $pdo->prepare(
                'INSERT INTO user_profiles (user_id, bio, country, preferred_language, theme, avatar_color)
                 VALUES (?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE bio = VALUES(bio), country = VALUES(country),
                   preferred_language = VALUES(preferred_language), theme = VALUES(theme), avatar_color = VALUES(avatar_color)'
            )->execute([
                $userId,
                substr(trim(strip_tags((string) ($profile['bio'] ?? ''))), 0, 280),
                substr(trim(strip_tags((string) ($profile['country'] ?? ''))), 0, 48),
                $preferredLanguage,
                $theme,
                $avatarColor,
            ]);
        }

        Response::json(['ok' => true, 'user' => $this->userPayload($userId)]);
    }

    private function userPayload(int $userId): array
    {
        Database::pdo()->prepare('UPDATE users SET last_active_at = NOW() WHERE id = ?')->execute([$userId]);
        $stmt = Database::pdo()->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
        $stmt->execute([$userId]);
        $user = $stmt->fetch();
        if (!$user) {
            Helpers::fail('user_not_found', 404);
        }
        $stats = StatisticsService::get($userId);
        $rankStmt = Database::pdo()->prepare(
            'SELECT 1 + COUNT(*) FROM users u
             WHERE u.is_bot = 0 AND u.status = "active" AND u.deleted_at IS NULL
               AND (u.rating > ? OR (u.rating = ? AND u.id < ?))'
        );
        $rankStmt->execute([(int) $user['rating'], (int) $user['rating'], $userId]);
        $stats['leaderboardRank'] = (int) $rankStmt->fetchColumn();

        $payload = Helpers::publicUser($user, $stats);
        $profileStmt = Database::pdo()->prepare(
            'SELECT bio, country, preferred_language, theme, avatar_color FROM user_profiles WHERE user_id = ?'
        );
        $profileStmt->execute([$userId]);
        $profile = $profileStmt->fetch();
        $payload['profile'] = $profile ?: [
            'bio' => '', 'country' => '', 'preferred_language' => 'en',
            'theme' => 'dark', 'avatar_color' => '#7cff6b',
        ];
        return $payload;
    }
}
