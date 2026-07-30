<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Http\Request;
use App\Http\Response;
use App\Support\Database;
use App\Support\BookValidation;
use PDO;
use PDOException;
use Throwable;

final class BookController extends BaseController
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
                    b.*,
                    c.code AS category_code,
                    c.name AS category_name,
                    COALESCE(borrowed.borrowed_quantity, 0) AS borrowed_quantity,
                    latest.last_borrowed_at AS last_borrowed_at
                 FROM books b
                 INNER JOIN categories c ON c.id = b.category_id
                 LEFT JOIN (
                    SELECT li.book_id, SUM(li.quantity) AS borrowed_quantity
                    FROM loan_items li
                    INNER JOIN loans l ON l.id = li.loan_id
                    GROUP BY li.book_id
                 ) borrowed ON borrowed.book_id = b.id
                 LEFT JOIN (
                    SELECT li.book_id, MAX(l.loan_date) AS last_borrowed_at
                    FROM loan_items li
                    INNER JOIN loans l ON l.id = li.loan_id
                    GROUP BY li.book_id
                 ) latest ON latest.book_id = b.id
                 ORDER BY b.created_at DESC, b.id DESC'
            );
            $rows = $statement ? $statement->fetchAll(PDO::FETCH_ASSOC) : [];
            $items = array_map([$this, 'formatBook'], $rows);

            $activeCount = 0;
            $lowStockCount = 0;
            $emptyStockCount = 0;
            foreach ($items as $item) {
                if ($item['status'] === 'aktif') {
                    $activeCount++;
                }
                if ($item['stock_available'] === 0) {
                    $emptyStockCount++;
                } elseif ($item['stock_available'] <= 3) {
                    $lowStockCount++;
                }
            }

            return Response::json([
                'success' => true,
                'message' => 'Daftar buku berhasil dimuat',
                'data' => [
                    'items' => $items,
                    'summary' => [
                        'total' => count($items),
                        'active' => $activeCount,
                        'low_stock' => $lowStockCount,
                        'empty_stock' => $emptyStockCount,
                    ],
                ],
            ]);
        } catch (Throwable $throwable) {
            return Response::json([
                'success' => false,
                'message' => 'Gagal memuat buku',
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
        $validation = BookValidation::validateBookData($payload);
        if (!$validation['valid']) {
            return Response::json([
                'success' => false,
                'message' => BookValidation::firstError($validation['errors']),
                'errors' => $validation['errors'],
            ], 422);
        }

        $bookData = $validation['data'];

        try {
            $pdo = Database::connection($context['database']);
            $categoryStatement = $pdo->prepare('SELECT id, status FROM categories WHERE id = :id LIMIT 1');
            $categoryStatement->execute(['id' => $bookData['category_id']]);
            $category = $categoryStatement->fetch(PDO::FETCH_ASSOC);
            if (!$category) {
                return Response::json([
                    'success' => false,
                    'message' => 'Kategori tidak ditemukan',
                ], 404);
            }
            if (($category['status'] ?? '') !== 'aktif') {
                return Response::json([
                    'success' => false,
                    'message' => 'Kategori nonaktif tidak bisa dipakai untuk buku baru',
                ], 422);
            }

            if ($bookData['isbn'] !== null) {
                $isbnStatement = $pdo->prepare('SELECT id FROM books WHERE isbn = :isbn LIMIT 1');
                $isbnStatement->execute(['isbn' => $bookData['isbn']]);
                if ($isbnStatement->fetch(PDO::FETCH_ASSOC)) {
                    return Response::json([
                        'success' => false,
                        'message' => 'ISBN sudah digunakan oleh buku lain.',
                        'errors' => ['isbn' => 'ISBN sudah digunakan oleh buku lain.'],
                    ], 422);
                }
            }

            $code = $this->getNextBookCode($pdo);
            $statement = $pdo->prepare(
                'INSERT INTO books (
                    code, category_id, title, author, publisher, publication_year,
                    isbn, edition, language, shelf_location, description,
                    stock_total, stock_available, status, created_by, updated_by
                ) VALUES (
                    :code, :category_id, :title, :author, :publisher, :publication_year,
                    :isbn, :edition, :language, :shelf_location, :description,
                    :stock_total, :stock_available, :status, :created_by, :updated_by
                )'
            );
            $statement->execute([
                'code' => $code,
                'category_id' => $bookData['category_id'],
                'title' => $bookData['title'],
                'author' => $bookData['author'],
                'publisher' => $bookData['publisher'],
                'publication_year' => $bookData['publication_year'],
                'isbn' => $bookData['isbn'],
                'edition' => $bookData['edition'],
                'language' => $bookData['language'],
                'shelf_location' => $bookData['shelf_location'],
                'description' => $bookData['description'],
                'stock_total' => $bookData['stock_total'],
                'stock_available' => $bookData['stock_available'],
                'status' => $bookData['status'],
                'created_by' => $identity['user_id'],
                'updated_by' => $identity['user_id'],
            ]);

            $created = $this->getBookById($pdo, (int) $pdo->lastInsertId());

            return Response::json([
                'success' => true,
                'message' => 'Buku berhasil ditambahkan',
                'data' => $created ? $this->formatBook($created) : null,
            ], 201);
        } catch (Throwable $throwable) {
            if ($this->isDuplicateIsbnException($throwable)) {
                return Response::json([
                    'success' => false,
                    'message' => 'ISBN sudah digunakan oleh buku lain.',
                    'errors' => ['isbn' => 'ISBN sudah digunakan oleh buku lain.'],
                ], 422);
            }

            return Response::json([
                'success' => false,
                'message' => 'Gagal menambahkan buku',
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
        if ($id <= 0) {
            return Response::json([
                'success' => false,
                'message' => 'ID buku tidak valid',
            ], 422);
        }

        $validation = BookValidation::validateBookData($payload);
        if (!$validation['valid']) {
            return Response::json([
                'success' => false,
                'message' => BookValidation::firstError($validation['errors']),
                'errors' => $validation['errors'],
            ], 422);
        }

        $bookData = $validation['data'];

        try {
            $pdo = Database::connection($context['database']);
            $categoryStatement = $pdo->prepare('SELECT id, status FROM categories WHERE id = :id LIMIT 1');
            $categoryStatement->execute(['id' => $bookData['category_id']]);
            $category = $categoryStatement->fetch(PDO::FETCH_ASSOC);
            if (!$category) {
                return Response::json([
                    'success' => false,
                    'message' => 'Kategori tidak ditemukan',
                ], 404);
            }
            if (($category['status'] ?? '') !== 'aktif') {
                return Response::json([
                    'success' => false,
                    'message' => 'Kategori nonaktif tidak bisa dipakai untuk buku',
                ], 422);
            }

            if ($bookData['isbn'] !== null) {
                $isbnStatement = $pdo->prepare('SELECT id FROM books WHERE isbn = :isbn AND id <> :id LIMIT 1');
                $isbnStatement->execute([
                    'isbn' => $bookData['isbn'],
                    'id' => $id,
                ]);
                if ($isbnStatement->fetch(PDO::FETCH_ASSOC)) {
                    return Response::json([
                        'success' => false,
                        'message' => 'ISBN sudah digunakan oleh buku lain.',
                        'errors' => ['isbn' => 'ISBN sudah digunakan oleh buku lain.'],
                    ], 422);
                }
            }

            $statement = $pdo->prepare(
                'UPDATE books
                 SET category_id = :category_id,
                     title = :title,
                     author = :author,
                     publisher = :publisher,
                     publication_year = :publication_year,
                     isbn = :isbn,
                     edition = :edition,
                     language = :language,
                     shelf_location = :shelf_location,
                     description = :description,
                     stock_total = :stock_total,
                     stock_available = :stock_available,
                     status = :status,
                     updated_by = :updated_by,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = :id'
            );
            $statement->execute([
                'id' => $id,
                'category_id' => $bookData['category_id'],
                'title' => $bookData['title'],
                'author' => $bookData['author'],
                'publisher' => $bookData['publisher'],
                'publication_year' => $bookData['publication_year'],
                'isbn' => $bookData['isbn'],
                'edition' => $bookData['edition'],
                'language' => $bookData['language'],
                'shelf_location' => $bookData['shelf_location'],
                'description' => $bookData['description'],
                'stock_total' => $bookData['stock_total'],
                'stock_available' => $bookData['stock_available'],
                'status' => $bookData['status'],
                'updated_by' => $identity['user_id'],
            ]);

            $updated = $this->getBookById($pdo, $id);

            if (!$updated) {
                return Response::json([
                    'success' => false,
                    'message' => 'Buku tidak ditemukan',
                ], 404);
            }

            return Response::json([
                'success' => true,
                'message' => 'Buku berhasil diperbarui',
                'data' => $this->formatBook($updated),
            ]);
        } catch (Throwable $throwable) {
            if ($this->isDuplicateIsbnException($throwable)) {
                return Response::json([
                    'success' => false,
                    'message' => 'ISBN sudah digunakan oleh buku lain.',
                    'errors' => ['isbn' => 'ISBN sudah digunakan oleh buku lain.'],
                ], 422);
            }

            return Response::json([
                'success' => false,
                'message' => 'Gagal memperbarui buku',
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
                'message' => 'ID buku tidak valid',
            ], 422);
        }

        try {
            $pdo = Database::connection($context['database']);
            $statement = $pdo->prepare(
                'DELETE FROM books
                 WHERE id = :id'
            );
            $statement->execute(['id' => $id]);

            if ($statement->rowCount() === 0) {
                return Response::json([
                    'success' => false,
                    'message' => 'Buku tidak ditemukan',
                ], 404);
            }

            return Response::json([
                'success' => true,
                'message' => 'Buku berhasil dihapus',
            ]);
        } catch (Throwable $throwable) {
            $sqlState = $throwable instanceof PDOException ? (string) $throwable->getCode() : '';
            if ($sqlState === '23000') {
                return Response::json([
                    'success' => false,
                    'message' => 'Buku masih dipakai pada riwayat peminjaman, jadi tidak bisa dihapus.',
                    'error' => $throwable->getMessage(),
                ], 409);
            }

            return Response::json([
                'success' => false,
                'message' => 'Gagal menghapus buku',
                'error' => $throwable->getMessage(),
            ], 500);
        }
    }

    public function formatBook(array $row): array
    {
        return [
            'id' => (int) $row['id'],
            'code' => (string) $row['code'],
            'category_id' => (int) $row['category_id'],
            'category_code' => (string) ($row['category_code'] ?? ''),
            'category_name' => (string) ($row['category_name'] ?? ''),
            'title' => (string) $row['title'],
            'author' => (string) $row['author'],
            'publisher' => (string) $row['publisher'],
            'publication_year' => $row['publication_year'] !== null ? (int) $row['publication_year'] : null,
            'isbn' => $row['isbn'],
            'edition' => $row['edition'],
            'language' => $row['language'],
            'shelf_location' => $row['shelf_location'],
            'description' => $row['description'],
            'stock_total' => (int) $row['stock_total'],
            'stock_available' => (int) $row['stock_available'],
            'status' => (string) $row['status'],
            'created_at' => $row['created_at'],
            'updated_at' => $row['updated_at'],
            'created_by' => $row['created_by'] !== null ? (int) $row['created_by'] : null,
            'updated_by' => $row['updated_by'] !== null ? (int) $row['updated_by'] : null,
        ];
    }

    public function getNextBookCode(PDO $pdo): string
    {
        $statement = $pdo->query("SELECT COALESCE(MAX(CAST(SUBSTRING(code, 4) AS UNSIGNED)), 0) AS max_number FROM books WHERE code LIKE 'BK-%'");
        $row = $statement ? $statement->fetch(PDO::FETCH_ASSOC) : null;
        $next = (int) ($row['max_number'] ?? 0) + 1;

        return sprintf('BK-%03d', $next);
    }

    public function getBookById(PDO $pdo, int $id): ?array
    {
        $statement = $pdo->prepare(
            'SELECT
                b.*,
                c.code AS category_code,
                c.name AS category_name
             FROM books b
             INNER JOIN categories c ON c.id = b.category_id
             WHERE b.id = :id
             LIMIT 1'
        );
        $statement->execute(['id' => $id]);
        $row = $statement->fetch(PDO::FETCH_ASSOC);

        return is_array($row) ? $row : null;
    }

    public function isDuplicateIsbnException(Throwable $throwable): bool
    {
        if (!$throwable instanceof PDOException) {
            return false;
        }

        if ((string) $throwable->getCode() !== '23000') {
            return false;
        }

        $message = strtolower($throwable->getMessage());

        return str_contains($message, 'uq_books_isbn') || str_contains($message, 'books.isbn');
    }
}
