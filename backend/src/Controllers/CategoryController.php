<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Http\Request;
use App\Http\Response;
use App\Support\Database;
use PDO;
use PDOException;
use Throwable;

final class CategoryController extends BaseController
{
    public function list(Request $request, array $context): array
    {
        $identity = $this->requireExecutive($request, $context);
        if ($this->isErrorResponse($identity)) {
            return $identity;
        }

        try {
            $pdo = Database::connection($context['database']);
            $statement = $pdo->query(
                'SELECT
                    c.*,
                    COALESCE(bc.books_count, 0) AS books_count
                 FROM categories c
                 LEFT JOIN (
                    SELECT category_id, COUNT(*) AS books_count
                    FROM books
                    GROUP BY category_id
                 ) bc ON bc.category_id = c.id
                 ORDER BY c.created_at DESC, c.id DESC'
            );
            $rows = $statement ? $statement->fetchAll(PDO::FETCH_ASSOC) : [];
            $items = array_map([$this, 'formatCategory'], $rows);
            $activeCount = 0;
            foreach ($items as $item) {
                if ($item['status'] === 'aktif') {
                    $activeCount++;
                }
            }
            $inactiveCount = count($items) - $activeCount;
            usort($items, function (array $left, array $right): int {
                return ($right['books_count'] <=> $left['books_count']) ?: strcmp($left['name'], $right['name']);
            });
            $topCategory = $items[0] ?? null;

            return Response::json([
                'success' => true,
                'message' => 'Daftar kategori berhasil dimuat',
                'data' => [
                    'items' => $rows ? array_map([$this, 'formatCategory'], $rows) : [],
                    'summary' => [
                        'total' => count($rows),
                        'active' => $activeCount,
                        'inactive' => $inactiveCount,
                        'top_category' => $topCategory,
                    ],
                ],
            ]);
        } catch (Throwable $throwable) {
            return Response::json([
                'success' => false,
                'message' => 'Gagal memuat kategori',
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
        $name = trim((string) ($payload['name'] ?? ''));
        $description = trim((string) ($payload['description'] ?? ''));
        $status = trim((string) ($payload['status'] ?? 'aktif'));

        if ($name === '') {
            return Response::json([
                'success' => false,
                'message' => 'Nama kategori wajib diisi',
            ], 422);
        }

        if (!in_array($status, ['aktif', 'nonaktif'], true)) {
            $status = 'aktif';
        }

        try {
            $pdo = Database::connection($context['database']);
            $code = $this->getNextCategoryCode($pdo);
            $statement = $pdo->prepare(
                'INSERT INTO categories (code, name, description, status, created_by, updated_by)
                 VALUES (:code, :name, :description, :status, :created_by, :updated_by)'
            );
            $statement->execute([
                'code' => $code,
                'name' => $name,
                'description' => $description !== '' ? $description : null,
                'status' => $status,
                'created_by' => $identity['user_id'],
                'updated_by' => $identity['user_id'],
            ]);

            $created = $this->getCategoryById($pdo, (int) $pdo->lastInsertId());

            return Response::json([
                'success' => true,
                'message' => 'Kategori berhasil ditambahkan',
                'data' => $created ? $this->formatCategory($created) : null,
            ], 201);
        } catch (Throwable $throwable) {
            return Response::json([
                'success' => false,
                'message' => 'Gagal menambahkan kategori',
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
        $name = trim((string) ($payload['name'] ?? ''));
        $description = trim((string) ($payload['description'] ?? ''));
        $status = trim((string) ($payload['status'] ?? 'aktif'));

        if ($id <= 0) {
            return Response::json([
                'success' => false,
                'message' => 'ID kategori tidak valid',
            ], 422);
        }

        if ($name === '') {
            return Response::json([
                'success' => false,
                'message' => 'Nama kategori wajib diisi',
            ], 422);
        }

        if (!in_array($status, ['aktif', 'nonaktif'], true)) {
            $status = 'aktif';
        }

        try {
            $pdo = Database::connection($context['database']);
            $statement = $pdo->prepare(
                'UPDATE categories
                 SET name = :name,
                     description = :description,
                     status = :status,
                     updated_by = :updated_by,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = :id'
            );
            $statement->execute([
                'id' => $id,
                'name' => $name,
                'description' => $description !== '' ? $description : null,
                'status' => $status,
                'updated_by' => $identity['user_id'],
            ]);

            $updated = $this->getCategoryById($pdo, $id);

            if (!$updated) {
                return Response::json([
                    'success' => false,
                    'message' => 'Kategori tidak ditemukan',
                ], 404);
            }

            return Response::json([
                'success' => true,
                'message' => 'Kategori berhasil diperbarui',
                'data' => $this->formatCategory($updated),
            ]);
        } catch (Throwable $throwable) {
            return Response::json([
                'success' => false,
                'message' => 'Gagal memperbarui kategori',
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
                'message' => 'ID kategori tidak valid',
            ], 422);
        }

        try {
            $pdo = Database::connection($context['database']);
            $statement = $pdo->prepare(
                'DELETE FROM categories
                 WHERE id = :id'
            );
            $statement->execute(['id' => $id]);

            if ($statement->rowCount() === 0) {
                return Response::json([
                    'success' => false,
                    'message' => 'Kategori tidak ditemukan',
                ], 404);
            }

            return Response::json([
                'success' => true,
                'message' => 'Kategori berhasil dihapus',
            ]);
        } catch (Throwable $throwable) {
            $sqlState = $throwable instanceof PDOException ? (string) $throwable->getCode() : '';
            if ($sqlState === '23000') {
                return Response::json([
                    'success' => false,
                    'message' => 'Kategori masih dipakai pada buku, jadi tidak bisa dihapus.',
                    'error' => $throwable->getMessage(),
                ], 409);
            }

            return Response::json([
                'success' => false,
                'message' => 'Gagal menghapus kategori',
                'error' => $throwable->getMessage(),
            ], 500);
        }
    }

    public function formatCategory(array $row): array
    {
        return [
            'id' => (int) $row['id'],
            'code' => (string) $row['code'],
            'name' => (string) $row['name'],
            'description' => $row['description'],
            'status' => (string) $row['status'],
            'books_count' => (int) ($row['books_count'] ?? 0),
            'created_at' => $row['created_at'],
            'updated_at' => $row['updated_at'],
            'created_by' => $row['created_by'] !== null ? (int) $row['created_by'] : null,
            'updated_by' => $row['updated_by'] !== null ? (int) $row['updated_by'] : null,
        ];
    }

    public function getNextCategoryCode(PDO $pdo): string
    {
        $statement = $pdo->query("SELECT COALESCE(MAX(CAST(SUBSTRING(code, 5) AS UNSIGNED)), 0) AS max_number FROM categories WHERE code LIKE 'KAT-%'");
        $row = $statement ? $statement->fetch(PDO::FETCH_ASSOC) : null;
        $next = (int) ($row['max_number'] ?? 0) + 1;

        return sprintf('KAT-%03d', $next);
    }

    public function getCategoryById(PDO $pdo, int $id): ?array
    {
        $statement = $pdo->prepare(
            'SELECT
                c.*,
                COALESCE(bc.books_count, 0) AS books_count
             FROM categories c
             LEFT JOIN (
                SELECT category_id, COUNT(*) AS books_count
                FROM books
                GROUP BY category_id
             ) bc ON bc.category_id = c.id
             WHERE c.id = :id
             LIMIT 1'
        );
        $statement->execute(['id' => $id]);
        $row = $statement->fetch(PDO::FETCH_ASSOC);

        return is_array($row) ? $row : null;
    }
}
