<?php

declare(strict_types=1);

namespace App\Http;

final class Response
{
    public static function json(array $payload, int $status = 200, array $headers = []): array
    {
        return [
            'status' => $status,
            'headers' => array_merge([
                'Content-Type' => 'application/json; charset=utf-8',
            ], $headers),
            'body' => $payload,
        ];
    }

    public static function emit(array $response): void
    {
        http_response_code($response['status'] ?? 200);

        foreach ($response['headers'] ?? [] as $name => $value) {
            header($name . ': ' . $value);
        }

        echo json_encode($response['body'] ?? [], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
}

