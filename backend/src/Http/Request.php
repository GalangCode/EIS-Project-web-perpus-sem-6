<?php

declare(strict_types=1);

namespace App\Http;

final class Request
{
    public function __construct(
        private readonly string $method,
        private readonly string $path,
        private readonly array $headers,
        private readonly string $body,
        private readonly array $query,
    ) {
    }

    public static function fromGlobals(): self
    {
        $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
        $uri = $_SERVER['REQUEST_URI'] ?? '/';
        $path = rawurldecode(parse_url($uri, PHP_URL_PATH) ?: '/');
        $queryString = (string) (parse_url($uri, PHP_URL_QUERY) ?? '');
        $query = [];
        if ($queryString !== '') {
            parse_str($queryString, $query);
            if (!is_array($query)) {
                $query = [];
            }
        }
        $scriptName = rawurldecode(str_replace('\\', '/', $_SERVER['SCRIPT_NAME'] ?? ''));
        $basePath = rtrim(str_replace('\\', '/', dirname($scriptName)), '/');

        if ($basePath !== '' && str_starts_with($path, $basePath)) {
            $path = substr($path, strlen($basePath)) ?: '/';
        }

        if ($path === '/index.php') {
            $path = '/';
        } elseif (str_starts_with($path, '/index.php/')) {
            $path = substr($path, strlen('/index.php')) ?: '/';
        }

        $headers = function_exists('getallheaders') ? getallheaders() : [];
        $body = file_get_contents('php://input') ?: '';

        return new self($method, $path, $headers, $body, $query);
    }

    public function method(): string
    {
        return $this->method;
    }

    public function path(): string
    {
        return $this->path;
    }

    public function header(string $name, ?string $default = null): ?string
    {
        foreach ($this->headers as $key => $value) {
            if (strcasecmp((string) $key, $name) === 0) {
                return is_array($value) ? implode(', ', $value) : (string) $value;
            }
        }

        if (strcasecmp($name, 'Authorization') === 0) {
            foreach (['HTTP_AUTHORIZATION', 'REDIRECT_HTTP_AUTHORIZATION'] as $serverKey) {
                if (!empty($_SERVER[$serverKey])) {
                    return (string) $_SERVER[$serverKey];
                }
            }
        }

        return $default;
    }

    public function json(): array
    {
        if ($this->body === '') {
            return [];
        }

        $decoded = json_decode($this->body, true);

        return is_array($decoded) ? $decoded : [];
    }

    public function body(): string
    {
        return $this->body;
    }

    public function query(?string $key = null, mixed $default = null): mixed
    {
        if ($key === null) {
            return $this->query;
        }

        return $this->query[$key] ?? $default;
    }
}
