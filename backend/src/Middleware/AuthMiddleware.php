<?php

declare(strict_types=1);

namespace App\Middleware;

use App\Http\Request;
use App\Http\Response;
use App\Support\Token;

final class AuthMiddleware
{
    public static function authenticate(Request $request, string $secret): array|null
    {
        $token = self::bearerToken($request);

        if ($token === null) {
            return Response::json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 401);
        }

        $claims = Token::decode($token, $secret);

        if (!is_array($claims) || ($claims['exp'] ?? 0) < time()) {
            return Response::json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 401);
        }

        return [
            'user_id' => (int) ($claims['sub'] ?? 0),
            'role' => (string) ($claims['role'] ?? ''),
            'claims' => $claims,
        ];
    }

    public static function requireRole(Request $request, string $secret, array $allowedRoles): array|null
    {
        $identity = self::authenticate($request, $secret);

        if ($identity === null) {
            return Response::json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 401);
        }

        if (is_array($identity) && array_key_exists('status', $identity)) {
            return $identity;
        }

        if (!isset($identity['role'])) {
            return Response::json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 401);
        }

        if (!in_array($identity['role'], $allowedRoles, true)) {
            return Response::json([
                'success' => false,
                'message' => 'Forbidden',
            ], 403);
        }

        return $identity;
    }

    private static function bearerToken(Request $request): ?string
    {
        $authorization = $request->header('Authorization');

        if ($authorization === null || !preg_match('/^Bearer\s+(.+)$/i', $authorization, $matches)) {
            return null;
        }

        return trim($matches[1]);
    }
}
