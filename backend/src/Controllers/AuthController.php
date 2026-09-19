<?php
declare(strict_types=1);

namespace BugArena\Controllers;

use BugArena\Core\Database;
use BugArena\Core\Logger;
use BugArena\Core\Request;
use BugArena\Core\Response;
use BugArena\Middleware\AuthMiddleware;
use BugArena\Middleware\CsrfMiddleware;
use BugArena\Middleware\RateLimitMiddleware;
use BugArena\Services\StatisticsService;
use BugArena\Utils\Helpers;

final class AuthController
{
    public function __construct(private readonly int $sessionLifetime = 7200)
    {
    }

    public function register(Request $request): void
    {
        (new RateLimitMiddleware(10, 300))->handle('register:' . $request->ip);
        $body = $request->body;
        $username = Helpers::cleanUsername($body['username'] ?? '');
        if (strlen($username) < 3) {
            Helpers::fail('invalid_username', 422, ['message' => 'Username must be 3-20 characters (a-z, 0-9, _ -).']);
        }
        $password = $this->validatePassword($body['password'] ?? '');
        $displayName = Helpers::cleanDisplayName($body['displayName'] ?? '', strtoupper($username));

        $pdo = Database::pdo();
        $stmt = $pdo->prepare('SELECT id FROM users WHERE username = ? LIMIT 1');
        $stmt->execute([$username]);
        if ($stmt->fetch()) {
            Logger::info('auth', "register rejected username_taken ip={$request->ip}");
            Helpers::fail('username_taken', 409);
        }

        try {
            $stmt = $pdo->prepare(
                'INSERT INTO users (public_id, username, display_name, password_hash) VALUES (?, ?, ?, ?)'
            );
            $stmt->execute([Helpers::uuid(), $username, $displayName, password_hash($password, PASSWORD_DEFAULT)]);
        } catch (\PDOException $e) {
            // Two registers racing past the SELECT are settled by the UNIQUE key.
            if ((int) ($e->errorInfo[1] ?? 0) === 1062) {
                Helpers::fail('username_taken', 409);
            }
            throw $e;
        }
        $id = (int) $pdo->lastInsertId();
        $pdo->prepare('INSERT IGNORE INTO user_profiles (user_id) VALUES (?)')->execute([$id]);

        session_regenerate_id(true);
        $_SESSION['user_id'] = $id;
        $_SESSION['created_at'] = time();
        Logger::info('auth', "register ok user={$username} ip={$request->ip}");
        Response::json(['ok' => true, 'user' => $this->userPayload($id), 'csrfToken' => CsrfMiddleware::token()], 201);
    }

    public function login(Request $request): void
    {
        $body = $request->body;
        $username = Helpers::cleanUsername($body['username'] ?? '');
        (new RateLimitMiddleware(10, 300))->handle('login:' . $request->ip . ':' . $username);
        $password = (string) ($body['password'] ?? '');

        $stmt = Database::pdo()->prepare('SELECT * FROM users WHERE username = ? LIMIT 1');
        $stmt->execute([$username]);
        $user = $stmt->fetch();
        // Constant-ish response regardless of which factor failed.
        if (!$user || (int) $user['is_bot'] === 1 || !password_verify($password, $user['password_hash'])) {
            Logger::info('auth', "login failed ip={$request->ip} username={$username}");
            Response::json(['ok' => false, 'error' => 'invalid_credentials'], 401);
        }
        if ($user['status'] !== 'active' || $user['deleted_at'] !== null) {
            Helpers::fail('account_disabled', 403);
        }

        session_regenerate_id(true);
        $_SESSION['user_id'] = (int) $user['id'];
        $_SESSION['created_at'] = time();
        Logger::info('auth', "login ok user={$username} ip={$request->ip}");
        Database::pdo()->prepare('UPDATE users SET last_active_at = NOW() WHERE id = ?')
            ->execute([(int) $user['id']]);
        Response::json(['ok' => true, 'user' => $this->userPayload((int) $user['id']), 'csrfToken' => CsrfMiddleware::token()]);
    }

    public function me(): void
    {
        $userId = AuthMiddleware::userId();
        if (!$userId) {
            Response::json(['ok' => true, 'authenticated' => false]);
        }
        try {
            Response::json(['ok' => true, 'authenticated' => true, 'user' => $this->userPayload($userId), 'csrfToken' => CsrfMiddleware::token()]);
        } catch (\Throwable) {
            $_SESSION = [];
            Response::json(['ok' => true, 'authenticated' => false]);
        }
    }

    public function logout(): void
    {
        CsrfMiddleware::verify();
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000, $params['path'], '', $params['secure'], $params['httponly']);
        }
        session_destroy();
        Response::json(['ok' => true]);
    }

    private function validatePassword(mixed $value): string
    {
        $value = (string) $value;
        if (strlen($value) < 8 || strlen($value) > 200) {
            Helpers::fail('invalid_password', 422, ['message' => 'Password must be 8-200 characters.']);
        }
        return $value;
    }

    /** Public user + server-computed statistics + leaderboard position. */
    private function userPayload(int $userId): array
    {
        $pdo = Database::pdo();
        $stmt = $pdo->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
        $stmt->execute([$userId]);
        $user = $stmt->fetch();
        if (!$user) {
            Helpers::fail('user_not_found', 404);
        }
        $stats = StatisticsService::get($userId);
        $rankStmt = $pdo->prepare(
            'SELECT 1 + COUNT(*) AS position FROM users u
             WHERE u.is_bot = 0 AND u.status = "active" AND u.deleted_at IS NULL
               AND (u.rating > ? OR (u.rating = ? AND u.id < ?))'
        );
        $rankStmt->execute([(int) $user['rating'], (int) $user['rating'], $userId]);
        $stats['leaderboardRank'] = (int) $rankStmt->fetchColumn();

        $payload = Helpers::publicUser($user, $stats);
        $profileStmt = $pdo->prepare('SELECT bio, country, preferred_language, theme, avatar_color FROM user_profiles WHERE user_id = ?');
        $profileStmt->execute([$userId]);
        $profile = $profileStmt->fetch();
        $payload['profile'] = $profile ?: [
            'bio' => '', 'country' => '', 'preferred_language' => 'en',
            'theme' => 'dark', 'avatar_color' => '#7cff6b',
        ];
        return $payload;
    }
}
