<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Http\Request;
use App\Http\Response;
use App\Support\Database;
use DateTimeImmutable;
use PDO;
use Throwable;

final class UserController extends BaseController
{
    public function list(Request $request, array $context): array
    {
        $identity = $this->requireExecutive($request, $context);
        if ($this->isErrorResponse($identity)) {
            return $identity;
        }

        $search = trim((string) ($request->query('q', $request->query('search', '')) ?? ''));
        $statusFilter = trim((string) ($request->query('status', 'all') ?? 'all'));
        $roleFilter = trim((string) ($request->query('role', 'all') ?? 'all'));

        try {
            $pdo = Database::connection($context['database']);
            $conditions = [];
            $params = [];

            if ($search !== '') {
                $conditions[] = '('
                    . 'u.username LIKE :search_username OR '
                    . 'u.email LIKE :search_email OR '
                    . 'u.full_name LIKE :search_full_name OR '
                    . 'u.phone LIKE :search_phone OR '
                    . 'u.unit LIKE :search_unit OR '
                    . 'u.nip LIKE :search_nip OR '
                    . 'r.name LIKE :search_role_name OR '
                    . 'r.code LIKE :search_role_code'
                    . ')';
                $searchValue = '%' . $search . '%';
                $params['search_username'] = $searchValue;
                $params['search_email'] = $searchValue;
                $params['search_full_name'] = $searchValue;
                $params['search_phone'] = $searchValue;
                $params['search_unit'] = $searchValue;
                $params['search_nip'] = $searchValue;
                $params['search_role_name'] = $searchValue;
                $params['search_role_code'] = $searchValue;
            }

            if (in_array($statusFilter, ['aktif', 'nonaktif'], true)) {
                $conditions[] = 'u.status = :status';
                $params['status'] = $statusFilter;
            }

            if ($roleFilter !== 'all') {
                $conditions[] = 'r.code = :role_code';
                $params['role_code'] = $roleFilter;
            }

            $sql = '
                SELECT
                    u.id,
                    u.username,
                    u.email,
                    u.full_name,
                    u.phone,
                    u.unit,
                    u.nip,
                    u.avatar_path,
                    u.status,
                    u.last_login_at,
                    u.created_at,
                    u.updated_at,
                    r.id AS role_id,
                    r.code AS role_code,
                    r.name AS role_name,
                    r.status AS role_status
                FROM users u
                INNER JOIN roles r ON r.id = u.role_id
            ';
            if ($conditions) {
                $sql .= ' WHERE ' . implode(' AND ', $conditions);
            }
            $sql .= ' ORDER BY u.status = "aktif" DESC, u.full_name ASC, u.id ASC';

            $statement = $pdo->prepare($sql);
            $statement->execute($params);
            $rows = $statement ? $statement->fetchAll(PDO::FETCH_ASSOC) : [];

            $items = array_map([$this, 'formatUser'], $rows ?: []);
            $summary = [
                'total' => count($items),
                'active' => 0,
                'inactive' => 0,
                'admin' => 0,
                'kepala' => 0,
                'recently_active' => 0,
            ];

            $recentThreshold = new DateTimeImmutable('-30 days');
            foreach ($items as $item) {
                if ($item['status'] === 'aktif') {
                    $summary['active']++;
                } else {
                    $summary['inactive']++;
                }

                if (($item['role']['code'] ?? '') === 'admin') {
                    $summary['admin']++;
                }
                if (($item['role']['code'] ?? '') === 'kepala') {
                    $summary['kepala']++;
                }

                $lastLoginAt = $item['last_login_at'] ? DateTimeImmutable::createFromFormat('Y-m-d H:i:s', (string) $item['last_login_at']) : null;
                if ($lastLoginAt instanceof DateTimeImmutable && $lastLoginAt >= $recentThreshold) {
                    $summary['recently_active']++;
                }
            }

            return Response::json([
                'success' => true,
                'message' => 'Daftar pengguna berhasil dimuat',
                'data' => [
                    'items' => $items,
                    'summary' => $summary,
                ],
            ]);
        } catch (Throwable $throwable) {
            return Response::json([
                'success' => false,
                'message' => 'Gagal memuat pengguna',
                'error' => $throwable->getMessage(),
            ], 500);
        }
    }

    public function create(Request $request, array $context): array
    {
        $identity = $this->requireExecutive($request, $context);
        if ($this->isErrorResponse($identity)) {
            return $identity;
        }

        $payload = $request->json();
        $username = trim((string) ($payload['username'] ?? ''));
        $email = trim((string) ($payload['email'] ?? ''));
        $fullName = trim((string) ($payload['full_name'] ?? ''));
        $phone = trim((string) ($payload['phone'] ?? ''));
        $unit = trim((string) ($payload['unit'] ?? ''));
        $nip = trim((string) ($payload['nip'] ?? ''));
        $password = (string) ($payload['password'] ?? '');
        $passwordConfirmation = (string) ($payload['password_confirmation'] ?? '');
        $roleCode = trim((string) ($payload['role_code'] ?? $payload['role'] ?? ''));
        $status = trim((string) ($payload['status'] ?? 'aktif'));

        if ($username === '' || $email === '' || $fullName === '' || $password === '' || $roleCode === '') {
            return Response::json([
                'success' => false,
                'message' => 'Username, email, nama lengkap, peran, dan kata sandi wajib diisi',
            ], 422);
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return Response::json([
                'success' => false,
                'message' => 'Format email tidak valid',
            ], 422);
        }

        if (strlen($password) < 8) {
            return Response::json([
                'success' => false,
                'message' => 'Kata sandi minimal 8 karakter',
            ], 422);
        }

        if ($password !== $passwordConfirmation) {
            return Response::json([
                'success' => false,
                'message' => 'Konfirmasi kata sandi tidak cocok',
            ], 422);
        }

        if (!in_array($status, ['aktif', 'nonaktif'], true)) {
            $status = 'aktif';
        }

        try {
            $pdo = Database::connection($context['database']);
            $role = $this->getRoleByCode($pdo, $roleCode);
            if (!$role) {
                return Response::json([
                    'success' => false,
                    'message' => 'Peran pengguna tidak ditemukan',
                ], 404);
            }

            if (($role['status'] ?? '') !== 'aktif') {
                return Response::json([
                    'success' => false,
                    'message' => 'Peran nonaktif tidak bisa dipakai',
                ], 422);
            }

            $duplicateStatement = $pdo->prepare(
                'SELECT
                    SUM(username = :username) AS username_exists,
                    SUM(email = :email) AS email_exists
                 FROM users
                 WHERE username = :username_check OR email = :email_check'
            );
            $duplicateStatement->execute([
                'username' => $username,
                'email' => $email,
                'username_check' => $username,
                'email_check' => $email,
            ]);
            $duplicate = $duplicateStatement->fetch(PDO::FETCH_ASSOC) ?: [];

            if ((int) ($duplicate['username_exists'] ?? 0) > 0) {
                return Response::json([
                    'success' => false,
                    'message' => 'Username sudah digunakan',
                ], 409);
            }

            if ((int) ($duplicate['email_exists'] ?? 0) > 0) {
                return Response::json([
                    'success' => false,
                    'message' => 'Email sudah digunakan',
                ], 409);
            }

            $insert = $pdo->prepare(
                'INSERT INTO users (
                    role_id,
                    username,
                    email,
                    password_hash,
                    full_name,
                    phone,
                    unit,
                    nip,
                    avatar_path,
                    status,
                    last_login_at
                 ) VALUES (
                    :role_id,
                    :username,
                    :email,
                    :password_hash,
                    :full_name,
                    :phone,
                    :unit,
                    :nip,
                    :avatar_path,
                    :status,
                    NULL
                 )'
            );
            $insert->execute([
                'role_id' => (int) $role['id'],
                'username' => $username,
                'email' => $email,
                'password_hash' => password_hash($password, PASSWORD_DEFAULT),
                'full_name' => $fullName,
                'phone' => $phone !== '' ? $phone : null,
                'unit' => $unit !== '' ? $unit : null,
                'nip' => $nip !== '' ? $nip : null,
                'avatar_path' => null,
                'status' => $status,
            ]);

            $newId = (int) $pdo->lastInsertId();
            $statement = $pdo->prepare(
                'SELECT
                    u.id,
                    u.username,
                    u.email,
                    u.full_name,
                    u.phone,
                    u.unit,
                    u.nip,
                    u.avatar_path,
                    u.status,
                    u.last_login_at,
                    u.created_at,
                    u.updated_at,
                    r.id AS role_id,
                    r.code AS role_code,
                    r.name AS role_name,
                    r.status AS role_status
                 FROM users u
                 INNER JOIN roles r ON r.id = u.role_id
                 WHERE u.id = :id
                 LIMIT 1'
            );
            $statement->execute(['id' => $newId]);
            $row = $statement->fetch(PDO::FETCH_ASSOC);
            $created = is_array($row) ? $this->formatUser($row) : null;

            try {
                $audit = $pdo->prepare(
                    'INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, before_data, after_data, ip_address, user_agent)
                     VALUES (:actor_user_id, :action, :entity_type, :entity_id, :before_data, :after_data, :ip_address, :user_agent)'
                );
                $audit->execute([
                    'actor_user_id' => (int) $identity['user_id'],
                    'action' => 'create',
                    'entity_type' => 'user',
                    'entity_id' => $newId,
                    'before_data' => null,
                    'after_data' => json_encode(['id' => $newId, 'username' => $username, 'role_code' => $roleCode], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                    'ip_address' => $_SERVER['REMOTE_ADDR'] ?? null,
                    'user_agent' => $request->header('User-Agent'),
                ]);
            } catch (Throwable) {
                // Audit user creation bersifat non-blocking.
            }

            return Response::json([
                'success' => true,
                'message' => 'Pengguna berhasil disimpan',
                'data' => $created,
            ], 201);
        } catch (Throwable $throwable) {
            return Response::json([
                'success' => false,
                'message' => 'Gagal menyimpan pengguna',
                'error' => $throwable->getMessage(),
            ], 500);
        }
    }

    public function formatUser(array $row): array
    {
        return [
            'id' => (int) $row['id'],
            'username' => (string) $row['username'],
            'email' => (string) $row['email'],
            'full_name' => (string) $row['full_name'],
            'phone' => $row['phone'],
            'unit' => $row['unit'],
            'nip' => $row['nip'],
            'avatar_path' => $row['avatar_path'],
            'status' => (string) $row['status'],
            'last_login_at' => $row['last_login_at'],
            'created_at' => $row['created_at'],
            'updated_at' => $row['updated_at'],
            'role' => [
                'id' => (int) $row['role_id'],
                'code' => (string) $row['role_code'],
                'name' => (string) $row['role_name'],
                'status' => (string) $row['role_status'],
            ],
        ];
    }

    public function getRoleByCode(PDO $pdo, string $code): ?array
    {
        $statement = $pdo->prepare('SELECT * FROM roles WHERE code = :code LIMIT 1');
        $statement->execute(['code' => $code]);
        $row = $statement->fetch(PDO::FETCH_ASSOC);

        return is_array($row) ? $row : null;
    }
}
