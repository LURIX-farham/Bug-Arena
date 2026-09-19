<?php
declare(strict_types=1);

namespace BugArena\Core;

use RuntimeException;

final class ValidationException extends RuntimeException
{
    public function __construct(
        private readonly string $errorCode,
        private readonly int $statusCode = 422,
        private readonly array $extra = []
    ) {
        parent::__construct($errorCode);
    }

    public function getCode1(): string
    {
        return $this->errorCode;
    }

    public function getStatusCode(): int
    {
        return $this->statusCode;
    }

    public function getExtra(): array
    {
        return $this->extra;
    }
}
