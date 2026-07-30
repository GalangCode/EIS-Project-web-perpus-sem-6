<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Http\Request;
use App\Http\Response;
use App\Support\Database;
use PDO;
use Throwable;

final class LoanController extends BaseController
{
    public function list(Request $request, array $context): array
    {
        $identity = $this->requireAdmin($request, $context);
        if ($this->isErrorResponse($identity)) {
            return $identity;
        }

        $search = trim((string) ($request->query('q', $request->query('search', '')) ?? ''));
        $statusFilter = trim((string) ($request->query('status', 'all') ?? 'all'));

        try {
            $pdo = Database::connection($context['database']);
            $conditions = [];
            $params = [];

            if ($search !== '') {
                $conditions[] = '('
                    . 'l.loan_code LIKE :search_loan_code OR '
                    . 'm.member_code LIKE :search_member_code OR '
                    . 'm.full_name LIKE :search_member_name OR '
                    . 'l.status LIKE :search_status OR '
                    . 'EXISTS ('
                    . 'SELECT 1 FROM loan_items li2 '
                    . 'INNER JOIN books b2 ON b2.id = li2.book_id '
                    . 'WHERE li2.loan_id = l.id AND b2.title LIKE :search_book_title'
                    . ')'
                    . ')';
                $searchValue = '%' . $search . '%';
                $params['search_loan_code'] = $searchValue;
                $params['search_member_code'] = $searchValue;
                $params['search_member_name'] = $searchValue;
                $params['search_book_title'] = $searchValue;
                $params['search_status'] = $searchValue;
            }

            if (in_array($statusFilter, ['dipinjam', 'dikembalikan', 'terlambat', 'dibatalkan'], true)) {
                $conditions[] = 'l.status = :status';
                $params['status'] = $statusFilter;
            }

            $sql = '
                SELECT
                    l.id,
                    l.loan_code,
                    l.member_id,
                    l.processed_by,
                    l.loan_date,
                    l.due_date,
                    l.return_date,
                    l.status,
                    l.fine_amount,
                    l.notes,
                    l.created_at,
                    l.updated_at,
                    m.member_code,
                    m.full_name AS member_name,
                    u.full_name AS processed_by_name,
                    COUNT(DISTINCT li.id) AS books_count,
                    GROUP_CONCAT(DISTINCT b.title ORDER BY b.title SEPARATOR ", ") AS books_summary
                FROM loans l
                INNER JOIN members m ON m.id = l.member_id
                INNER JOIN users u ON u.id = l.processed_by
                LEFT JOIN loan_items li ON li.loan_id = l.id
                LEFT JOIN books b ON b.id = li.book_id
            ';
            if ($conditions) {
                $sql .= ' WHERE ' . implode(' AND ', $conditions);
            }
            $sql .= ' GROUP BY l.id ORDER BY l.created_at DESC, l.id DESC';

            $statement = $pdo->prepare($sql);
            $statement->execute($params);
            $rows = $statement ? $statement->fetchAll(PDO::FETCH_ASSOC) : [];
            $today = date('Y-m-d');
            $graceDays = SettingController::getLoanGraceDays($pdo);
            $finePerDay = SettingController::getLoanFinePerDay($pdo);
            $items = [];
            foreach ($rows as $row) {
                $synchronized = $this->syncLoanOverdueState($pdo, $row, $graceDays, $finePerDay, $today);
                $fullLoan = $this->getLoanById($pdo, (int) $synchronized['id']);
                if ($fullLoan) {
                    $fullLoan['status'] = $synchronized['status'];
                    $fullLoan['fine_amount'] = $synchronized['fine_amount'];
                    $items[] = $this->formatLoan($fullLoan);
                }
            }

            $summaryStatement = $pdo->query(
                'SELECT
                    COUNT(*) AS total,
                    SUM(status = "dipinjam") AS borrowed,
                    SUM(status = "dikembalikan") AS returned_count,
                    SUM(status = "terlambat") AS overdue_count,
                    SUM(status = "dibatalkan") AS cancelled_count
                 FROM loans'
            );
            $summary = $summaryStatement ? $summaryStatement->fetch(PDO::FETCH_ASSOC) : [];

            return Response::json([
                'success' => true,
                'message' => 'Daftar sirkulasi berhasil dimuat',
                'data' => [
                    'items' => $items,
                    'summary' => [
                        'total' => (int) ($summary['total'] ?? 0),
                        'borrowed' => (int) ($summary['borrowed'] ?? 0),
                        'returned_count' => (int) ($summary['returned_count'] ?? 0),
                        'overdue_count' => (int) ($summary['overdue_count'] ?? 0),
                        'cancelled_count' => (int) ($summary['cancelled_count'] ?? 0),
                    ],
                ],
            ]);
        } catch (Throwable $throwable) {
            return Response::json([
                'success' => false,
                'message' => 'Gagal memuat sirkulasi',
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
        $memberId = (int) ($payload['member_id'] ?? 0);
        $loanDateRaw = trim((string) ($payload['loan_date'] ?? ''));
        $dueDateRaw = trim((string) ($payload['due_date'] ?? ''));
        $notes = trim((string) ($payload['notes'] ?? ''));
        $status = trim((string) ($payload['status'] ?? 'dipinjam'));
        $bookItems = $payload['items'] ?? $payload['books'] ?? [];

        if (!is_array($bookItems)) {
            $bookItems = [];
        }

        if ($memberId <= 0 || !$bookItems) {
            return Response::json([
                'success' => false,
                'message' => 'Anggota dan minimal satu buku wajib dipilih',
            ], 422);
        }

        if (!in_array($status, ['dipinjam', 'dikembalikan', 'terlambat', 'dibatalkan'], true)) {
            $status = 'dipinjam';
        }

        $loanDate = $this->parseYmd($loanDateRaw) ?? date('Y-m-d');
        $dueDate = $this->parseYmd($dueDateRaw);
        if (!$dueDate) {
            $dueDate = date('Y-m-d', strtotime($loanDate . ' +7 days'));
        }

        if ($dueDate < $loanDate) {
            return Response::json([
                'success' => false,
                'message' => 'Tanggal kembali tidak boleh lebih kecil dari tanggal pinjam',
            ], 422);
        }

        $normalizedItems = [];
        foreach ($bookItems as $item) {
            $bookId = (int) (is_array($item) ? ($item['book_id'] ?? $item['id'] ?? 0) : $item);
            $quantity = (int) (is_array($item) ? ($item['quantity'] ?? 1) : 1);
            if ($bookId > 0 && $quantity > 0) {
                $normalizedItems[$bookId] = ($normalizedItems[$bookId] ?? 0) + $quantity;
            }
        }

        if (!$normalizedItems) {
            return Response::json([
                'success' => false,
                'message' => 'Minimal satu buku valid harus dipilih',
            ], 422);
        }

        try {
            $pdo = Database::connection($context['database']);
            $pdo->beginTransaction();

            $memberStatement = $pdo->prepare('SELECT id, status, full_name FROM members WHERE id = :id LIMIT 1');
            $memberStatement->execute(['id' => $memberId]);
            $member = $memberStatement->fetch(PDO::FETCH_ASSOC);
            if (!$member) {
                $pdo->rollBack();
                return Response::json([
                    'success' => false,
                    'message' => 'Anggota tidak ditemukan',
                ], 404);
            }
            if (($member['status'] ?? '') !== 'aktif') {
                $pdo->rollBack();
                return Response::json([
                    'success' => false,
                    'message' => 'Anggota nonaktif tidak bisa diproses',
                ], 422);
            }

            $bookRows = [];
            foreach ($normalizedItems as $bookId => $quantity) {
                $bookStatement = $pdo->prepare('SELECT id, title, stock_available, status FROM books WHERE id = :id LIMIT 1 FOR UPDATE');
                $bookStatement->execute(['id' => $bookId]);
                $book = $bookStatement->fetch(PDO::FETCH_ASSOC);
                if (!$book) {
                    $pdo->rollBack();
                    return Response::json([
                        'success' => false,
                        'message' => 'Salah satu buku tidak ditemukan',
                    ], 404);
                }
                if (($book['status'] ?? '') !== 'aktif') {
                    $pdo->rollBack();
                    return Response::json([
                        'success' => false,
                        'message' => 'Buku nonaktif tidak bisa dipinjam',
                    ], 422);
                }
                if ((int) ($book['stock_available'] ?? 0) < $quantity) {
                    $pdo->rollBack();
                    return Response::json([
                        'success' => false,
                        'message' => 'Stok buku tidak mencukupi untuk transaksi ini',
                    ], 422);
                }
                $bookRows[] = [
                    'id' => (int) $book['id'],
                    'title' => (string) $book['title'],
                    'quantity' => $quantity,
                ];
            }

            $loanCode = $this->getNextLoanCode($pdo);
            $statement = $pdo->prepare(
                'INSERT INTO loans (
                    loan_code, member_id, processed_by, loan_date, due_date, return_date, status, fine_amount, notes
                ) VALUES (
                    :loan_code, :member_id, :processed_by, :loan_date, :due_date, :return_date, :status, :fine_amount, :notes
                )'
            );
            $statement->execute([
                'loan_code' => $loanCode,
                'member_id' => $memberId,
                'processed_by' => $identity['user_id'],
                'loan_date' => $loanDate,
                'due_date' => $dueDate,
                'return_date' => $status === 'dikembalikan' ? $dueDate : null,
                'status' => $status,
                'fine_amount' => 0,
                'notes' => $notes !== '' ? $notes : null,
            ]);
            $loanId = (int) $pdo->lastInsertId();

            $itemStatement = $pdo->prepare('INSERT INTO loan_items (loan_id, book_id, quantity) VALUES (:loan_id, :book_id, :quantity)');
            $stockStatement = $pdo->prepare('UPDATE books SET stock_available = stock_available - :quantity, updated_by = :updated_by, updated_at = CURRENT_TIMESTAMP WHERE id = :id');
            foreach ($bookRows as $bookRow) {
                $itemStatement->execute([
                    'loan_id' => $loanId,
                    'book_id' => $bookRow['id'],
                    'quantity' => $bookRow['quantity'],
                ]);
                $stockStatement->execute([
                    'quantity' => $bookRow['quantity'],
                    'updated_by' => $identity['user_id'],
                    'id' => $bookRow['id'],
                ]);
            }

            $detailStatement = $pdo->prepare(
                'SELECT
                    l.id,
                    l.loan_code,
                    l.member_id,
                    l.processed_by,
                    l.loan_date,
                    l.due_date,
                    l.return_date,
                    l.status,
                    l.fine_amount,
                    l.notes,
                    l.created_at,
                    l.updated_at,
                    m.member_code,
                    m.full_name AS member_name,
                    u.full_name AS processed_by_name,
                    COUNT(DISTINCT li.id) AS books_count,
                    GROUP_CONCAT(DISTINCT b.title ORDER BY b.title SEPARATOR ", ") AS books_summary
                 FROM loans l
                 INNER JOIN members m ON m.id = l.member_id
                 INNER JOIN users u ON u.id = l.processed_by
                 LEFT JOIN loan_items li ON li.loan_id = l.id
                 LEFT JOIN books b ON b.id = li.book_id
                 WHERE l.id = :id
                 GROUP BY l.id
                 LIMIT 1'
            );
            $detailStatement->execute(['id' => $loanId]);
            $created = $detailStatement->fetch(PDO::FETCH_ASSOC);

            $pdo->commit();

            return Response::json([
                'success' => true,
                'message' => 'Peminjaman berhasil dibuat',
                'data' => $created ? $this->formatLoan($created) : null,
            ], 201);
        } catch (Throwable $throwable) {
            if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
                $pdo->rollBack();
            }
            return Response::json([
                'success' => false,
                'message' => 'Gagal membuat peminjaman',
                'error' => $throwable->getMessage(),
            ], 500);
        }
    }

    public function returnLoan(Request $request, array $context): array
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
                'message' => 'ID transaksi tidak valid',
            ], 422);
        }

        try {
            $pdo = Database::connection($context['database']);
            $pdo->beginTransaction();

            $loanStatement = $pdo->prepare(
                'SELECT id, status, due_date, return_date
                 FROM loans
                 WHERE id = :id
                 LIMIT 1
                 FOR UPDATE'
            );
            $loanStatement->execute(['id' => $id]);
            $loan = $loanStatement->fetch(PDO::FETCH_ASSOC);

            if (!$loan) {
                $pdo->rollBack();
                return Response::json([
                    'success' => false,
                    'message' => 'Transaksi tidak ditemukan',
                ], 404);
            }

            if (($loan['status'] ?? '') === 'dikembalikan') {
                $pdo->rollBack();
                return Response::json([
                    'success' => false,
                    'message' => 'Transaksi sudah dikembalikan',
                ], 422);
            }

            if (($loan['status'] ?? '') === 'dibatalkan') {
                $pdo->rollBack();
                return Response::json([
                    'success' => false,
                    'message' => 'Transaksi sudah dibatalkan',
                ], 422);
            }

            $itemsStatement = $pdo->prepare('SELECT book_id, quantity FROM loan_items WHERE loan_id = :loan_id');
            $itemsStatement->execute(['loan_id' => $id]);
            $items = $itemsStatement ? $itemsStatement->fetchAll(PDO::FETCH_ASSOC) : [];

            foreach ($items as $item) {
                $restoreStatement = $pdo->prepare(
                    'UPDATE books
                     SET stock_available = stock_available + :quantity,
                         updated_by = :updated_by,
                         updated_at = CURRENT_TIMESTAMP
                     WHERE id = :id'
                );
                $restoreStatement->execute([
                    'quantity' => (int) ($item['quantity'] ?? 1),
                    'updated_by' => $identity['user_id'],
                    'id' => (int) ($item['book_id'] ?? 0),
                ]);
            }

            $today = date('Y-m-d');
            $finePerDay = SettingController::getLoanFinePerDay($pdo);
            $graceDays = SettingController::getLoanGraceDays($pdo);
            $fineAmount = $this->calculateLoanFine((string) ($loan['due_date'] ?? $today), $today, $graceDays, $finePerDay);
            $update = $pdo->prepare(
                'UPDATE loans
                 SET return_date = :return_date,
                     status = :status,
                     fine_amount = :fine_amount,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = :id'
            );
            $update->execute([
                'return_date' => $today,
                'status' => 'dikembalikan',
                'fine_amount' => $fineAmount,
                'id' => $id,
            ]);

            $updated = $this->getLoanById($pdo, $id);

            $pdo->commit();

            return Response::json([
                'success' => true,
                'message' => 'Transaksi berhasil dikembalikan',
                'data' => $updated ? $this->formatLoan($updated) : null,
            ]);
        } catch (Throwable $throwable) {
            if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
                $pdo->rollBack();
            }
            return Response::json([
                'success' => false,
                'message' => 'Gagal memproses pengembalian',
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
        $memberId = (int) ($payload['member_id'] ?? 0);
        $loanDateRaw = trim((string) ($payload['loan_date'] ?? ''));
        $dueDateRaw = trim((string) ($payload['due_date'] ?? ''));
        $notes = trim((string) ($payload['notes'] ?? ''));
        $status = trim((string) ($payload['status'] ?? 'dipinjam'));
        $bookItems = $payload['items'] ?? $payload['books'] ?? [];

        if (!is_array($bookItems)) {
            $bookItems = [];
        }

        if ($id <= 0 || $memberId <= 0 || !$bookItems) {
            return Response::json([
                'success' => false,
                'message' => 'ID transaksi, anggota, dan buku wajib diisi',
            ], 422);
        }

        if (in_array($status, ['dikembalikan', 'dibatalkan'], true)) {
            return Response::json([
                'success' => false,
                'message' => 'Gunakan aksi pengembalian atau pembatalan khusus untuk status ini',
            ], 422);
        }

        if (!in_array($status, ['dipinjam', 'terlambat'], true)) {
            $status = 'dipinjam';
        }

        $loanDate = $this->parseYmd($loanDateRaw) ?? date('Y-m-d');
        $dueDate = $this->parseYmd($dueDateRaw);
        if (!$dueDate) {
            $dueDate = date('Y-m-d', strtotime($loanDate . ' +7 days'));
        }

        if ($dueDate < $loanDate) {
            return Response::json([
                'success' => false,
                'message' => 'Tanggal kembali tidak boleh lebih kecil dari tanggal pinjam',
            ], 422);
        }

        $normalizedItems = [];
        foreach ($bookItems as $item) {
            $bookId = (int) (is_array($item) ? ($item['book_id'] ?? $item['id'] ?? 0) : $item);
            $quantity = (int) (is_array($item) ? ($item['quantity'] ?? 1) : 1);
            if ($bookId > 0 && $quantity > 0) {
                $normalizedItems[$bookId] = ($normalizedItems[$bookId] ?? 0) + $quantity;
            }
        }

        if (!$normalizedItems) {
            return Response::json([
                'success' => false,
                'message' => 'Minimal satu buku valid harus dipilih',
            ], 422);
        }

        try {
            $pdo = Database::connection($context['database']);
            $pdo->beginTransaction();

            $existingStatement = $pdo->prepare(
                'SELECT id, status
                 FROM loans
                 WHERE id = :id
                 LIMIT 1
                 FOR UPDATE'
            );
            $existingStatement->execute(['id' => $id]);
            $existing = $existingStatement->fetch(PDO::FETCH_ASSOC);
            if (!$existing) {
                $pdo->rollBack();
                return Response::json([
                    'success' => false,
                    'message' => 'Transaksi tidak ditemukan',
                ], 404);
            }

            if (($existing['status'] ?? '') === 'dikembalikan') {
                $pdo->rollBack();
                return Response::json([
                    'success' => false,
                    'message' => 'Transaksi yang sudah dikembalikan tidak dapat diedit',
                ], 422);
            }

            if (($existing['status'] ?? '') === 'dibatalkan') {
                $pdo->rollBack();
                return Response::json([
                    'success' => false,
                    'message' => 'Transaksi yang sudah dibatalkan tidak dapat diedit',
                ], 422);
            }

            $memberStatement = $pdo->prepare('SELECT id, status FROM members WHERE id = :id LIMIT 1');
            $memberStatement->execute(['id' => $memberId]);
            $member = $memberStatement->fetch(PDO::FETCH_ASSOC);
            if (!$member || ($member['status'] ?? '') !== 'aktif') {
                $pdo->rollBack();
                return Response::json([
                    'success' => false,
                    'message' => 'Anggota tidak ditemukan atau nonaktif',
                ], 422);
            }

            $currentItemsStatement = $pdo->prepare('SELECT book_id, quantity FROM loan_items WHERE loan_id = :loan_id');
            $currentItemsStatement->execute(['loan_id' => $id]);
            $currentItems = $currentItemsStatement ? $currentItemsStatement->fetchAll(PDO::FETCH_ASSOC) : [];

            $restoreStatement = $pdo->prepare(
                'UPDATE books
                 SET stock_available = stock_available + :quantity,
                     updated_by = :updated_by,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = :id'
            );
            foreach ($currentItems as $currentItem) {
                $restoreStatement->execute([
                    'quantity' => (int) ($currentItem['quantity'] ?? 1),
                    'updated_by' => $identity['user_id'],
                    'id' => (int) ($currentItem['book_id'] ?? 0),
                ]);
            }

            $bookRows = [];
            foreach ($normalizedItems as $bookId => $quantity) {
                $bookStatement = $pdo->prepare('SELECT id, title, stock_available, status FROM books WHERE id = :id LIMIT 1 FOR UPDATE');
                $bookStatement->execute(['id' => $bookId]);
                $book = $bookStatement->fetch(PDO::FETCH_ASSOC);
                if (!$book) {
                    $pdo->rollBack();
                    return Response::json([
                        'success' => false,
                        'message' => 'Salah satu buku tidak ditemukan',
                    ], 404);
                }
                if (($book['status'] ?? '') !== 'aktif') {
                    $pdo->rollBack();
                    return Response::json([
                        'success' => false,
                        'message' => 'Buku nonaktif tidak bisa dipinjam',
                    ], 422);
                }
                if ((int) ($book['stock_available'] ?? 0) < $quantity) {
                    $pdo->rollBack();
                    return Response::json([
                        'success' => false,
                        'message' => 'Stok buku tidak mencukupi untuk transaksi ini',
                    ], 422);
                }
                $bookRows[] = [
                    'id' => (int) $book['id'],
                    'quantity' => $quantity,
                ];
            }

            $pdo->prepare('DELETE FROM loan_items WHERE loan_id = :loan_id')->execute(['loan_id' => $id]);

            $itemStatement = $pdo->prepare('INSERT INTO loan_items (loan_id, book_id, quantity) VALUES (:loan_id, :book_id, :quantity)');
            $stockStatement = $pdo->prepare('UPDATE books SET stock_available = stock_available - :quantity, updated_by = :updated_by, updated_at = CURRENT_TIMESTAMP WHERE id = :id');
            foreach ($bookRows as $bookRow) {
                $itemStatement->execute([
                    'loan_id' => $id,
                    'book_id' => $bookRow['id'],
                    'quantity' => $bookRow['quantity'],
                ]);
                $stockStatement->execute([
                    'quantity' => $bookRow['quantity'],
                    'updated_by' => $identity['user_id'],
                    'id' => $bookRow['id'],
                ]);
            }

            $update = $pdo->prepare(
                'UPDATE loans
                 SET member_id = :member_id,
                     loan_date = :loan_date,
                     due_date = :due_date,
                     status = :status,
                     return_date = NULL,
                     fine_amount = 0,
                     notes = :notes,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = :id'
            );
            $update->execute([
                'member_id' => $memberId,
                'loan_date' => $loanDate,
                'due_date' => $dueDate,
                'status' => $status,
                'notes' => $notes !== '' ? $notes : null,
                'id' => $id,
            ]);

            $updated = $this->getLoanById($pdo, $id);
            $pdo->commit();

            return Response::json([
                'success' => true,
                'message' => 'Transaksi berhasil diperbarui',
                'data' => $updated ? $this->formatLoan($updated) : null,
            ]);
        } catch (Throwable $throwable) {
            if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
                $pdo->rollBack();
            }
            return Response::json([
                'success' => false,
                'message' => 'Gagal memperbarui transaksi',
                'error' => $throwable->getMessage(),
            ], 500);
        }
    }

    public function cancel(Request $request, array $context): array
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
                'message' => 'ID transaksi tidak valid',
            ], 422);
        }

        try {
            $pdo = Database::connection($context['database']);
            $pdo->beginTransaction();

            $existingStatement = $pdo->prepare(
                'SELECT id, status
                 FROM loans
                 WHERE id = :id
                 LIMIT 1
                 FOR UPDATE'
            );
            $existingStatement->execute(['id' => $id]);
            $existing = $existingStatement->fetch(PDO::FETCH_ASSOC);

            if (!$existing) {
                $pdo->rollBack();
                return Response::json([
                    'success' => false,
                    'message' => 'Transaksi tidak ditemukan',
                ], 404);
            }

            if (($existing['status'] ?? '') === 'dikembalikan') {
                $pdo->rollBack();
                return Response::json([
                    'success' => false,
                    'message' => 'Transaksi yang sudah dikembalikan tidak dapat dibatalkan',
                ], 422);
            }

            if (($existing['status'] ?? '') === 'dibatalkan') {
                $pdo->rollBack();
                return Response::json([
                    'success' => false,
                    'message' => 'Transaksi sudah dibatalkan',
                ], 422);
            }

            $itemsStatement = $pdo->prepare('SELECT book_id, quantity FROM loan_items WHERE loan_id = :loan_id');
            $itemsStatement->execute(['loan_id' => $id]);
            $items = $itemsStatement ? $itemsStatement->fetchAll(PDO::FETCH_ASSOC) : [];

            $restoreStatement = $pdo->prepare(
                'UPDATE books
                 SET stock_available = stock_available + :quantity,
                     updated_by = :updated_by,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = :id'
            );
            foreach ($items as $item) {
                $restoreStatement->execute([
                    'quantity' => (int) ($item['quantity'] ?? 1),
                    'updated_by' => $identity['user_id'],
                    'id' => (int) ($item['book_id'] ?? 0),
                ]);
            }

            $update = $pdo->prepare(
                'UPDATE loans
                 SET status = :status,
                     return_date = NULL,
                     fine_amount = 0,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = :id'
            );
            $update->execute([
                'status' => 'dibatalkan',
                'id' => $id,
            ]);

            $updated = $this->getLoanById($pdo, $id);
            $pdo->commit();

            return Response::json([
                'success' => true,
                'message' => 'Transaksi berhasil dibatalkan',
                'data' => $updated ? $this->formatLoan($updated) : null,
            ]);
        } catch (Throwable $throwable) {
            if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
                $pdo->rollBack();
            }
            return Response::json([
                'success' => false,
                'message' => 'Gagal membatalkan transaksi',
                'error' => $throwable->getMessage(),
            ], 500);
        }
    }

    private function calculateLoanFine(string $dueDate, ?string $returnDate, int $graceDays, int $finePerDay): int
    {
        $baseDate = $returnDate ?: date('Y-m-d');
        $due = \DateTime::createFromFormat('Y-m-d', $dueDate);
        $effective = \DateTime::createFromFormat('Y-m-d', $baseDate);

        if (!$due || !$effective) {
            return 0;
        }

        if ($effective <= $due) {
            return 0;
        }

        $lateDays = (int) $due->diff($effective)->days;

        return max(0, $lateDays - $graceDays) * $finePerDay;
    }

    private function getLoanById(PDO $pdo, int $id): ?array
    {
        $statement = $pdo->prepare(
            'SELECT
                l.id,
                l.loan_code,
                l.member_id,
                l.processed_by,
                l.loan_date,
                l.due_date,
                l.return_date,
                l.status,
                l.fine_amount,
                l.notes,
                l.created_at,
                l.updated_at,
                m.member_code,
                m.full_name AS member_name,
                u.full_name AS processed_by_name
             FROM loans l
             INNER JOIN members m ON m.id = l.member_id
             INNER JOIN users u ON u.id = l.processed_by
             WHERE l.id = :id
             LIMIT 1'
        );
        $statement->execute(['id' => $id]);
        $row = $statement->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            return null;
        }

        $itemsStatement = $pdo->prepare(
            'SELECT
                li.book_id,
                li.quantity,
                b.code,
                b.title
             FROM loan_items li
             INNER JOIN books b ON b.id = li.book_id
             WHERE li.loan_id = :loan_id
             ORDER BY b.title'
        );
        $itemsStatement->execute(['loan_id' => $id]);
        $items = $itemsStatement ? $itemsStatement->fetchAll(PDO::FETCH_ASSOC) : [];

        $row['book_items'] = array_map(function (array $item): array {
            return [
                'book_id' => (int) $item['book_id'],
                'quantity' => (int) $item['quantity'],
                'code' => (string) ($item['code'] ?? ''),
                'title' => (string) ($item['title'] ?? ''),
            ];
        }, $items);
        $row['books_count'] = count($items);
        $row['books_summary'] = implode(', ', array_map(static fn (array $item): string => (string) ($item['title'] ?? ''), $items));

        return $row;
    }

    private function syncLoanOverdueState(PDO $pdo, array $loan, int $graceDays, int $finePerDay, string $today): array
    {
        $status = (string) ($loan['status'] ?? '');
        $returnDate = $loan['return_date'] !== null && $loan['return_date'] !== '' ? (string) $loan['return_date'] : null;
        $dueDate = (string) ($loan['due_date'] ?? '');
        $computedFine = $this->calculateLoanFine($dueDate, $returnDate, $graceDays, $finePerDay);
        $needsUpdate = false;
        $nextStatus = $status;
        $nextFine = (int) ($loan['fine_amount'] ?? 0);

        if ($returnDate !== null) {
            if ($nextFine !== $computedFine) {
                $nextFine = $computedFine;
                $needsUpdate = true;
            }
        } elseif (!in_array($status, ['dikembalikan', 'dibatalkan'], true)) {
            $due = \DateTime::createFromFormat('Y-m-d', $dueDate);
            $current = \DateTime::createFromFormat('Y-m-d', $today);
            if ($due && $current && $current > $due) {
                $lateFine = $this->calculateLoanFine($dueDate, $today, $graceDays, $finePerDay);
                if ($status !== 'terlambat') {
                    $nextStatus = 'terlambat';
                    $needsUpdate = true;
                }
                if ($nextFine !== $lateFine) {
                    $nextFine = $lateFine;
                    $needsUpdate = true;
                }
            } elseif ($status === 'terlambat' && $nextFine !== 0) {
                $nextFine = 0;
                $needsUpdate = true;
            }
        }

        if ($needsUpdate && isset($loan['id'])) {
            $update = $pdo->prepare(
                'UPDATE loans
                 SET status = :status,
                     fine_amount = :fine_amount,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = :id'
            );
            $update->execute([
                'status' => $nextStatus,
                'fine_amount' => $nextFine,
                'id' => (int) $loan['id'],
            ]);
            $loan['status'] = $nextStatus;
            $loan['fine_amount'] = $nextFine;
        }

        $loan['fine_amount'] = $nextFine;
        $loan['status'] = $nextStatus;

        return $loan;
    }

    private function getNextLoanCode(PDO $pdo): string
    {
        $statement = $pdo->query("SELECT COALESCE(MAX(CAST(SUBSTRING(loan_code, 5) AS UNSIGNED)), 0) AS max_number FROM loans WHERE loan_code LIKE 'TRX-%'");
        $row = $statement ? $statement->fetch(PDO::FETCH_ASSOC) : null;
        $next = (int) ($row['max_number'] ?? 0) + 1;

        return sprintf('TRX-%03d', $next);
    }

    private function formatLoan(array $row): array
    {
        return [
            'id' => (int) $row['id'],
            'loan_code' => (string) $row['loan_code'],
            'member_id' => (int) $row['member_id'],
            'member_code' => (string) ($row['member_code'] ?? ''),
            'member_name' => (string) ($row['member_name'] ?? ''),
            'processed_by' => (int) $row['processed_by'],
            'processed_by_name' => (string) ($row['processed_by_name'] ?? ''),
            'loan_date' => $row['loan_date'],
            'due_date' => $row['due_date'],
            'return_date' => $row['return_date'],
            'status' => (string) $row['status'],
            'fine_amount' => (float) $row['fine_amount'],
            'notes' => $row['notes'],
            'books_count' => (int) ($row['books_count'] ?? 0),
            'books_summary' => (string) ($row['books_summary'] ?? ''),
            'book_items' => array_values(is_array($row['book_items'] ?? null) ? $row['book_items'] : []),
            'created_at' => $row['created_at'],
            'updated_at' => $row['updated_at'],
        ];
    }

    private function parseYmd(string $value): ?string
    {
        $value = trim($value);
        if ($value === '') {
            return null;
        }

        $date = \DateTime::createFromFormat('Y-m-d', $value);
        if (!$date) {
            return null;
        }

        $errors = \DateTime::getLastErrors();
        if (is_array($errors) && (($errors['warning_count'] ?? 0) > 0 || ($errors['error_count'] ?? 0) > 0)) {
            return null;
        }

        return $date->format('Y-m-d');
    }
}
