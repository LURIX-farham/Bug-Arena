<?php
declare(strict_types=1);

namespace BugArena\Utils;

use BugArena\Core\Response;
use BugArena\Core\ValidationException;

final class Helpers
{
    public static function uuid(): string
    {
        $data = random_bytes(16);
        $data[6] = chr((ord($data[6]) & 0x0f) | 0x40);
        $data[8] = chr((ord($data[8]) & 0x3f) | 0x80);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }

    public static function cleanUsername(mixed $value): string
    {
        $value = trim((string) $value);
        $value = preg_replace('/[^a-zA-Z0-9_-]/', '', $value) ?? '';
        return substr(strtolower($value), 0, 20);
    }

    public static function cleanDisplayName(mixed $value, string $fallback): string
    {
        $value = trim((string) $value);
        $value = preg_replace('/[\p{Cc}\p{Cf}]/u', '', $value) ?? '';
        $value = trim(strip_tags($value));
        return substr($value !== '' ? $value : $fallback, 0, 24);
    }

    /** Strict enum-safe token: alphanumerics plus a small separator set. */
    public static function cleanEnum(mixed $value, string $fallback, int $max = 40): string
    {
        $value = trim((string) $value);
        $value = preg_replace('/[^a-zA-Z0-9._-]/', '', $value) ?? '';
        return substr($value !== '' ? $value : $fallback, 0, $max);
    }

    public static function safeDate(mixed $value): string
    {
        $timestamp = strtotime((string) $value);
        return $timestamp === false ? date('Y-m-d H:i:s') : date('Y-m-d H:i:s', $timestamp);
    }

    public static function clampInt(mixed $value, int $min, int $max): int
    {
        return max($min, min($max, (int) $value));
    }

    /** @return array<int, array> */
    public static function decodeJsonArray(mixed $value): array
    {
        if (is_array($value)) {
            return array_values(array_filter($value, 'is_array'));
        }
        if (is_string($value) && $value !== '') {
            $decoded = json_decode($value, true);
            if (is_array($decoded)) {
                return array_values(array_filter($decoded, 'is_array'));
            }
        }
        return [];
    }

    public static function publicUser(array $user, array $stats = []): array
    {
        $public = [
            'id' => $user['public_id'],
            'username' => $user['username'],
            'displayName' => $user['display_name'],
            'rating' => (int) $user['rating'],
            'wins' => (int) $user['wins'],
            'losses' => (int) $user['losses'],
            'draws' => (int) $user['draws'],
            'createdAt' => $user['created_at'],
        ];
        if ($stats !== []) {
            $public['stats'] = $stats;
        }
        return $public;
    }

    public static function fail(string $code, int $status = 422, array $extra = []): never
    {
        throw new ValidationException($code, $status, $extra);
    }
}
