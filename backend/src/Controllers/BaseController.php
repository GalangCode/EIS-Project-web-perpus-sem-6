<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Http\Request;
use App\Middleware\AuthMiddleware;

abstract class BaseController
{
    protected function requireAdmin(Request $request, array $context): array
    {
        $secret = (string) ($context['app']['auth_secret'] ?? 'change-this-secret');
        return AuthMiddleware::requireRole($request, $secret, ['admin']) ?? [];
    }

    protected function requireExecutive(Request $request, array $context): array
    {
        $secret = (string) ($context['app']['auth_secret'] ?? 'change-this-secret');
        return AuthMiddleware::requireRole($request, $secret, ['admin', 'kepala']) ?? [];
    }

    protected function isErrorResponse(array $identity): bool
    {
        return array_key_exists('status', $identity);
    }
}
