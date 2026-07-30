<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Http\Request;
use App\Http\Response;
use App\Support\Database;
use App\Support\Token;
use PDO;
use Throwable;

final class AuthController extends BaseController
{
    public function login(Request $request, array $context): array
    {
        $payload = $request->json();
        $identifier = trim((string) ($payload['identifier'] ?? $payload['username'] ?? $payload['email'] ?? ''));
        $password = (string) ($payload['password'] ?? '');

        if ($identifier === '' || $password === '') {
            return Response::json([
                'success' => false,
                'message' => 'Identifier dan password wajib diisi',
            ], 422);
        }

        try {
            $pdo = Database::connection($context['database']);
            $statement = $pdo->prepare(
                'SELECT
                    u.id,
                    u.role_id,
                    u.username,
                    u.email,
                    u.password_hash,
                    u.full_name,
                    u.phone,
                    u.unit,
                    u.nip,
                    u.avatar_path,
                    u.status AS user_status,
                    u.last_login_at,
                    r.code AS role_code,
                    r.name AS role_name,
                    r.status AS role_status
                FROM users u
                INNER JOIN roles r ON r.id = u.role_id
                WHERE (u.username = :identifier_username OR u.email = :identifier_email)
                LIMIT 1'
            );
            $statement->execute([
                'identifier_username' => $identifier,
                'identifier_email' => $identifier,
            ]);
            $user = $statement->fetch(PDO::FETCH_ASSOC);

            if (!$user || $user['user_status'] !== 'aktif' || $user['role_status'] !== 'aktif' || !password_verify($password, (string) $user['password_hash'])) {
                return Response::json([
                    'success' => false,
                    'message' => 'Username/email atau password salah',
                ], 401);
            }

            $now = date('Y-m-d H:i:s');
            $update = $pdo->prepare('UPDATE users SET last_login_at = :last_login_at, updated_at = CURRENT_TIMESTAMP WHERE id = :id');
            $update->execute([
                'last_login_at' => $now,
                'id' => (int) $user['id'],
            ]);

            try {
                $audit = $pdo->prepare(
                    'INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, before_data, after_data, ip_address, user_agent)
                     VALUES (:actor_user_id, :action, :entity_type, :entity_id, :before_data, :after_data, :ip_address, :user_agent)'
                );
                $audit->execute([
                    'actor_user_id' => (int) $user['id'],
                    'action' => 'login',
                    'entity_type' => 'auth',
                    'entity_id' => (int) $user['id'],
                    'before_data' => null,
                    'after_data' => json_encode(['last_login_at' => $now], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                    'ip_address' => $_SERVER['REMOTE_ADDR'] ?? null,
                    'user_agent' => $request->header('User-Agent'),
                ]);
            } catch (Throwable) {
                // Audit login bersifat non-blocking.
            }

            $secret = (string) ($context['app']['auth_secret'] ?? 'change-this-secret');
            $expiresIn = 60 * 60 * 8;
            $token = Token::encode([
                'iss' => $context['app']['name'] ?? 'EIS Balangan',
                'sub' => (int) $user['id'],
                'role' => (string) $user['role_code'],
                'iat' => time(),
                'exp' => time() + $expiresIn,
            ], $secret);

            return Response::json([
                'success' => true,
                'message' => 'Login berhasil',
                'data' => [
                    'token_type' => 'Bearer',
                    'access_token' => $token,
                    'expires_in' => $expiresIn,
                    'user' => [
                        'id' => (int) $user['id'],
                        'username' => $user['username'],
                        'email' => $user['email'],
                        'full_name' => $user['full_name'],
                        'phone' => $user['phone'],
                        'unit' => $user['unit'],
                        'nip' => $user['nip'],
                        'avatar_path' => $user['avatar_path'],
                        'last_login_at' => $now,
                        'status' => $user['user_status'],
                        'role' => [
                            'id' => (int) $user['role_id'],
                            'code' => $user['role_code'],
                            'name' => $user['role_name'],
                        ],
                    ],
                ],
            ]);
        } catch (Throwable $throwable) {
            return Response::json([
                'success' => false,
                'message' => 'Login gagal karena kesalahan server',
                'error' => $throwable->getMessage(),
            ], 500);
        }
    }
}
