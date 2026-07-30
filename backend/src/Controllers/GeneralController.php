<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Http\Request;
use App\Http\Response;
use App\Support\Database;
use Throwable;
use PDO;

final class GeneralController extends BaseController
{
    public function index(Request $request, array $context): array
    {
        return Response::json([
            'success' => true,
            'message' => 'EIS Balangan backend bootstrap',
            'data' => [
                'routes' => [
                    'GET /api/health',
                    'GET /api/db/ping',
                    'POST /api/auth/login',
                    'GET /api/categories',
                    'POST /api/categories',
                    'PUT /api/categories',
                    'DELETE /api/categories',
                    'GET /api/loans',
                    'POST /api/loans',
                    'POST /api/loans/return',
                    'PUT /api/loans',
                    'POST /api/loans/cancel',
                    'GET /api/members',
                    'POST /api/members',
                    'PUT /api/members',
                    'DELETE /api/members',
                    'GET /api/users',
                    'POST /api/users',
                ],
            ],
        ]);
    }

    public function health(Request $request, array $context): array
    {
        return Response::json([
            'success' => true,
            'message' => 'API is running',
            'data' => [
                'app' => $context['app']['name'] ?? 'EIS Balangan',
                'env' => $context['app']['env'] ?? 'local',
                'timestamp' => date(DATE_ATOM),
            ],
        ]);
    }

    public function dbPing(Request $request, array $context): array
    {
        try {
            $pdo = Database::connection($context['database']);
            $statement = $pdo->query('SELECT 1 AS ok');
            $row = $statement ? $statement->fetch(PDO::FETCH_ASSOC) : null;

            return Response::json([
                'success' => true,
                'message' => 'Database connection is ready',
                'data' => [
                    'ok' => (int) ($row['ok'] ?? 0),
                ],
            ]);
        } catch (Throwable $throwable) {
            return Response::json([
                'success' => false,
                'message' => 'Database connection failed',
                'error' => $throwable->getMessage(),
            ], 500);
        }
    }
}
