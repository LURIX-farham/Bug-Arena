<?php
declare(strict_types=1);

namespace BugArena\Core;

final class Request
{
    public readonly string $method;
    public readonly string $path;
    public readonly array $body;
    public readonly array $query;
    public readonly string $ip;

    public function __construct(string $path)
    {
        $this->method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
        $this->path = $path;
        $this->query = $_GET;
        $this->ip = $this->clientIp();
        $this->body = $this->parseBody();
    }

    private function parseBody(): array
    {
        if (!in_array($this->method, ['POST', 'PUT', 'PATCH'], true)) {
            return [];
        }
        $raw = file_get_contents('php://input') ?: '';
        if ($raw === '') {
            return [];
        }
        if (strlen($raw) > 2_000_000) {
            Response::error('payload_too_large', 413);
        }
        $decoded = json_decode($raw, true);
        if (!is_array($decoded)) {
            Response::error('invalid_json', 400);
        }
        return $decoded;
    }

    private function clientIp(): string
    {
        $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
        return filter_var($ip, FILTER_VALIDATE_IP) ? $ip : '0.0.0.0';
    }

    public function input(string $key, mixed $default = null): mixed
    {
        return $this->body[$key] ?? $default;
    }

    public function queryInt(string $key, int $default): int
    {
        $value = filter_var($this->query[$key] ?? null, FILTER_VALIDATE_INT);
        return $value === false ? $default : max(0, $value);
    }
}
