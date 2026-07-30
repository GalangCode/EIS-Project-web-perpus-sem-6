<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Http\Request;
use App\Http\Response;
use App\Support\Database;
use App\Support\MemberValidation;
use PDO;
use PDOException;
use Throwable;

final class MemberController extends BaseController
{
    public function list(Request $request, array $context): array
    {
        $identity = $this->requireAdmin($request, $context);
        if ($this->isErrorResponse($identity)) {
            return $identity;
        }

        $search = MemberValidation::sanitizeInput($request->query('q', $request->query('search', '')) ?? '');
        $statusFilter = MemberValidation::normalizeStatusValue($request->query('status', 'all') ?? 'all');
        $genderFilter = MemberValidation::normalizeGenderValue($request->query('gender', 'all') ?? 'all');
        $ageRange = MemberValidation::sanitizeInput($request->query('age_range', 'all') ?? 'all');

        try {
            $pdo = Database::connection($context['database']);
            $conditions = [];
            $params = [];

            if ($search !== '') {
                $conditions[] = '('
                    . 'LOWER(COALESCE(member_code, "")) LIKE :search_member_code OR '
                    . 'LOWER(COALESCE(full_name, "")) LIKE :search_full_name OR '
                    . 'COALESCE(nik, "") LIKE :search_nik OR '
                    . 'COALESCE(phone, "") LIKE :search_phone'
                    . ')';
                $searchLower = function_exists('mb_strtolower') ? mb_strtolower($search) : strtolower($search);
                $searchValue = '%' . $searchLower . '%';
                $params['search_member_code'] = $searchValue;
                $params['search_full_name'] = $searchValue;
                $params['search_nik'] = $searchValue;
                $params['search_phone'] = $searchValue;
            }

            if (in_array($statusFilter, ['Aktif', 'Nonaktif'], true)) {
                $conditions[] = 'status = :status';
                $params['status'] = $statusFilter;
            }

            if (in_array($genderFilter, ['Laki-laki', 'Perempuan'], true)) {
                $conditions[] = 'gender = :gender';
                $params['gender'] = $genderFilter;
            }

            if (in_array($ageRange, ['0-17', '18-25', '26-40', '41-60', '60+'], true)) {
                if ($ageRange === '60+') {
                    $conditions[] = 'TIMESTAMPDIFF(YEAR, birth_date, CURDATE()) >= :age_min';
                    $params['age_min'] = 60;
                } else {
                    [$ageMin, $ageMax] = array_map('intval', explode('-', $ageRange, 2));
                    $conditions[] = 'TIMESTAMPDIFF(YEAR, birth_date, CURDATE()) BETWEEN :age_min AND :age_max';
                    $params['age_min'] = $ageMin;
                    $params['age_max'] = $ageMax;
                }
            }

            $sql = 'SELECT * FROM members';
            if ($conditions) {
                $sql .= ' WHERE ' . implode(' AND ', $conditions);
            }
            $sql .= ' ORDER BY created_at DESC, id DESC';

            $statement = $pdo->prepare($sql);
            $statement->execute($params);
            $rows = $statement ? $statement->fetchAll(PDO::FETCH_ASSOC) : [];
            $items = array_map([$this, 'formatMember'], $rows);

            $activeCount = 0;
            $inactiveCount = 0;
            $newThisMonth = 0;
            $currentMonth = date('Y-m');

            $summaryStatement = $pdo->query('SELECT status, joined_at FROM members');
            $summaryRows = $summaryStatement ? $summaryStatement->fetchAll(PDO::FETCH_ASSOC) : [];

            foreach ($summaryRows as $summaryRow) {
                $summaryStatus = MemberValidation::normalizeStatusValue((string) ($summaryRow['status'] ?? ''));
                if ($summaryStatus === 'Aktif') {
                    $activeCount++;
                } else {
                    $inactiveCount++;
                }
                if (!empty($summaryRow['joined_at']) && str_starts_with((string) $summaryRow['joined_at'], $currentMonth)) {
                    $newThisMonth++;
                }
            }

            return Response::json([
                'success' => true,
                'message' => 'Daftar anggota berhasil dimuat',
                'data' => [
                    'items' => $items,
                    'summary' => [
                        'total' => count($summaryRows),
                        'active' => $activeCount,
                        'inactive' => $inactiveCount,
                        'new_this_month' => $newThisMonth,
                    ],
                ],
            ]);
        } catch (Throwable $throwable) {
            return Response::json([
                'success' => false,
                'message' => 'Gagal memuat anggota',
                'error' => $throwable->getMessage(),
            ], 500);
        }
    }

    public function create(Request $request, array $context): array
    {
        $identity = $this->requireAdmin($request, $context);
        if ($this->isErrorResponse($identity)) {
            return $identity;
        }

        $payload = $request->json();
        $validation = MemberValidation::validateMemberData($payload);
        if (!$validation['valid']) {
            return Response::json([
                'success' => false,
                'message' => MemberValidation::firstError($validation['errors']),
                'errors' => $validation['errors'],
            ], 422);
        }

        try {
            $pdo = Database::connection($context['database']);
            if ($validation['data']['nik'] !== null) {
                $nikStatement = $pdo->prepare('SELECT id FROM members WHERE nik = :nik LIMIT 1');
                $nikStatement->execute(['nik' => $validation['data']['nik']]);
                if ($nikStatement->fetch(PDO::FETCH_ASSOC)) {
                    return Response::json([
                        'success' => false,
                        'message' => 'NIK sudah terdaftar.',
                        'errors' => ['nik' => 'NIK sudah terdaftar.'],
                    ], 422);
                }
            }

            $code = $this->getNextMemberCode($pdo);
            $statement = $pdo->prepare(
                'INSERT INTO members (
                    member_code, full_name, nik, birth_date, gender, address, city, phone, email, status, joined_at, created_by, updated_by
                ) VALUES (
                    :member_code, :full_name, :nik, :birth_date, :gender, :address, :city, :phone, :email, :status, :joined_at, :created_by, :updated_by
                )'
            );
            $statement->execute([
                'member_code' => $code,
                'full_name' => $validation['data']['full_name'],
                'nik' => $validation['data']['nik'],
                'birth_date' => $validation['data']['birth_date'],
                'gender' => $validation['data']['gender'],
                'address' => $validation['data']['address'],
                'city' => $validation['data']['city'],
                'phone' => $validation['data']['phone'],
                'email' => $validation['data']['email'],
                'status' => $validation['data']['status'],
                'joined_at' => date('Y-m-d'),
                'created_by' => $identity['user_id'],
                'updated_by' => $identity['user_id'],
            ]);

            $created = $this->getMemberById($pdo, (int) $pdo->lastInsertId());

            return Response::json([
                'success' => true,
                'message' => 'Anggota berhasil ditambahkan',
                'data' => $created ? $this->formatMember($created) : null,
            ], 201);
        } catch (Throwable $throwable) {
            if ($this->isDuplicateMemberNikException($throwable)) {
                return Response::json([
                    'success' => false,
                    'message' => 'NIK sudah terdaftar.',
                    'errors' => ['nik' => 'NIK sudah terdaftar.'],
                ], 422);
            }

            return Response::json([
                'success' => false,
                'message' => 'Gagal menambahkan anggota',
                'error' => $throwable->getMessage(),
            ], 500);
        }
    }

    public function update(Request $request, array $context): array
    {
        $identity = $this->requireAdmin($request, $context);
        if ($this->isErrorResponse($identity)) {
            return $identity;
        }

        $payload = $request->json();
        $id = (int) ($payload['id'] ?? 0);
        $validation = MemberValidation::validateMemberData($payload);

        if ($id <= 0) {
            return Response::json([
                'success' => false,
                'message' => 'ID anggota tidak valid',
            ], 422);
        }

        if (!$validation['valid']) {
            return Response::json([
                'success' => false,
                'message' => MemberValidation::firstError($validation['errors']),
                'errors' => $validation['errors'],
            ], 422);
        }

        try {
            $pdo = Database::connection($context['database']);
            $existing = $this->getMemberById($pdo, $id);
            if (!$existing) {
                return Response::json([
                    'success' => false,
                    'message' => 'Anggota tidak ditemukan',
                ], 404);
            }

            if ($validation['data']['nik'] !== null) {
                $nikStatement = $pdo->prepare('SELECT id FROM members WHERE nik = :nik AND id <> :id LIMIT 1');
                $nikStatement->execute([
                    'nik' => $validation['data']['nik'],
                    'id' => $id,
                ]);
                if ($nikStatement->fetch(PDO::FETCH_ASSOC)) {
                    return Response::json([
                        'success' => false,
                        'message' => 'NIK sudah terdaftar.',
                        'errors' => ['nik' => 'NIK sudah terdaftar.'],
                    ], 422);
                }
            }

            $statement = $pdo->prepare(
                'UPDATE members
                 SET full_name = :full_name,
                     nik = :nik,
                     birth_date = :birth_date,
                     gender = :gender,
                     address = :address,
                     city = :city,
                     phone = :phone,
                     email = :email,
                     status = :status,
                     joined_at = :joined_at,
                     updated_by = :updated_by,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = :id'
            );
            $statement->execute([
                'id' => $id,
                'full_name' => $validation['data']['full_name'],
                'nik' => $validation['data']['nik'],
                'birth_date' => $validation['data']['birth_date'],
                'gender' => $validation['data']['gender'],
                'address' => $validation['data']['address'],
                'city' => $validation['data']['city'],
                'phone' => $validation['data']['phone'],
                'email' => $validation['data']['email'],
                'status' => $validation['data']['status'],
                'joined_at' => $existing['joined_at'],
                'updated_by' => $identity['user_id'],
            ]);

            $updated = $this->getMemberById($pdo, $id);

            return Response::json([
                'success' => true,
                'message' => 'Anggota berhasil diperbarui',
                'data' => $updated ? $this->formatMember($updated) : null,
            ]);
        } catch (Throwable $throwable) {
            if ($this->isDuplicateMemberNikException($throwable)) {
                return Response::json([
                    'success' => false,
                    'message' => 'NIK sudah terdaftar.',
                    'errors' => ['nik' => 'NIK sudah terdaftar.'],
                ], 422);
            }

            return Response::json([
                'success' => false,
                'message' => 'Gagal memperbarui anggota',
                'error' => $throwable->getMessage(),
            ], 500);
        }
    }

    public function delete(Request $request, array $context): array
    {
        $identity = $this->requireAdmin($request, $context);
        if ($this->isErrorResponse($identity)) {
            return $identity;
        }

        $payload = $request->json();
        $id = (int) ($payload['id'] ?? 0);

        if ($id <= 0) {
            return Response::json([
                'success' => false,
                'message' => 'ID anggota tidak valid',
            ], 422);
        }

        try {
            $pdo = Database::connection($context['database']);
            $statement = $pdo->prepare(
                'DELETE FROM members
                 WHERE id = :id'
            );
            $statement->execute(['id' => $id]);

            if ($statement->rowCount() === 0) {
                return Response::json([
                    'success' => false,
                    'message' => 'Anggota tidak ditemukan',
                ], 404);
            }

            return Response::json([
                'success' => true,
                'message' => 'Anggota berhasil dihapus',
            ]);
        } catch (Throwable $throwable) {
            $sqlState = $throwable instanceof PDOException ? (string) $throwable->getCode() : '';
            if ($sqlState === '23000') {
                return Response::json([
                    'success' => false,
                    'message' => 'Anggota masih dipakai pada riwayat peminjaman, jadi tidak bisa dihapus.',
                    'error' => $throwable->getMessage(),
                ], 409);
            }

            return Response::json([
                'success' => false,
                'message' => 'Gagal menghapus anggota',
                'error' => $throwable->getMessage(),
            ], 500);
        }
    }

    public function formatMember(array $row): array
    {
        $gender = MemberValidation::normalizeGenderValue((string) ($row['gender'] ?? ''));
        $status = MemberValidation::normalizeStatusValue((string) ($row['status'] ?? ''));

        return [
            'id' => (int) $row['id'],
            'member_code' => (string) $row['member_code'],
            'full_name' => (string) $row['full_name'],
            'nik' => $row['nik'],
            'birth_date' => $row['birth_date'],
            'gender' => $gender !== '' ? $gender : (string) $row['gender'],
            'address' => $row['address'],
            'city' => $row['city'],
            'phone' => $row['phone'],
            'email' => $row['email'],
            'status' => $status !== '' ? $status : (string) $row['status'],
            'joined_at' => $row['joined_at'],
            'created_at' => $row['created_at'],
            'updated_at' => $row['updated_at'],
            'created_by' => $row['created_by'] !== null ? (int) $row['created_by'] : null,
            'updated_by' => $row['updated_by'] !== null ? (int) $row['updated_by'] : null,
        ];
    }

    public function getNextMemberCode(PDO $pdo): string
    {
        return MemberValidation::generateMemberCode($pdo);
    }

    public function getMemberById(PDO $pdo, int $id): ?array
    {
        $statement = $pdo->prepare('SELECT * FROM members WHERE id = :id LIMIT 1');
        $statement->execute(['id' => $id]);
        $row = $statement->fetch(PDO::FETCH_ASSOC);

        return is_array($row) ? $row : null;
    }

    public function isDuplicateMemberNikException(Throwable $throwable): bool
    {
        if (!$throwable instanceof PDOException) {
            return false;
        }

        if ((string) $throwable->getCode() !== '23000') {
            return false;
        }

        $message = strtolower($throwable->getMessage());

        return str_contains($message, 'uq_members_nik') || str_contains($message, 'members.nik');
    }
}
