<?php
declare(strict_types=1);

namespace BugArena\Core;

/**
 * MySQL-backed PHP session handler: real expiration, per-user binding and
 * revocation. Session data never trusted from the client.
 */
final class DatabaseSessionHandler implements \SessionHandlerInterface
{
    public function open(string $path, string $name): bool
    {
        return true;
    }

    public function close(): bool
    {
        return true;
    }

    public function read(string $id): string|false
    {
        $stmt = Database::pdo()->prepare(
            'SELECT payload FROM sessions WHERE id = ? AND last_activity > ? LIMIT 1'
        );
        $stmt->execute([$id, time() - $this->lifetime()]);
        $row = $stmt->fetch();
        return $row === false ? '' : (string) $row['payload'];
    }

    public function write(string $id, string $data): bool
    {
        $userId = $_SESSION['user_id'] ?? null;
        $stmt = Database::pdo()->prepare(
            'INSERT INTO sessions (id, user_id, ip_address, user_agent, payload, last_activity)
             VALUES (?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
               user_id = VALUES(user_id), payload = VALUES(payload), last_activity = VALUES(last_activity)'
        );
        $stmt->execute([
            $id,
            $userId !== null ? (int) $userId : null,
            substr($_SERVER['REMOTE_ADDR'] ?? '', 0, 45),
            substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 255),
            $data,
            time(),
        ]);
        return true;
    }

    public function destroy(string $id): bool
    {
        Database::pdo()->prepare('DELETE FROM sessions WHERE id = ?')->execute([$id]);
        return true;
    }

    /** Garbage-collect expired sessions. */
    public function gc(int $max_lifetime): int|false
    {
        $stmt = Database::pdo()->prepare('DELETE FROM sessions WHERE last_activity < ?');
        $stmt->execute([time() - $max_lifetime]);
        return $stmt->rowCount();
    }

    private function lifetime(): int
    {
        return (int) (ini_get('session.gc_maxlifetime') ?: 7200);
    }
}
