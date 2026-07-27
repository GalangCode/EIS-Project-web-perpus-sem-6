<?php

declare(strict_types=1);

use App\Http\Response;
use App\Middleware\AuthMiddleware;
use App\Support\Token;
use App\Support\Database;

$requireAdmin = function (App\Http\Request $request, array $context) {
    $secret = (string) ($context['app']['auth_secret'] ?? 'change-this-secret');
    return AuthMiddleware::requireRole($request, $secret, ['admin']);
};

$requireExecutive = function (App\Http\Request $request, array $context) {
    $secret = (string) ($context['app']['auth_secret'] ?? 'change-this-secret');
    return AuthMiddleware::requireRole($request, $secret, ['admin', 'kepala']);
};

$formatCategory = function (array $row): array {
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
};

$formatBook = function (array $row): array {
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
};

$getNextCategoryCode = function (PDO $pdo): string {
    $statement = $pdo->query("SELECT COALESCE(MAX(CAST(SUBSTRING(code, 5) AS UNSIGNED)), 0) AS max_number FROM categories WHERE code LIKE 'KAT-%'");
    $row = $statement ? $statement->fetch(PDO::FETCH_ASSOC) : null;
    $next = (int) ($row['max_number'] ?? 0) + 1;

    return sprintf('KAT-%03d', $next);
};

$getNextBookCode = function (PDO $pdo): string {
    $statement = $pdo->query("SELECT COALESCE(MAX(CAST(SUBSTRING(code, 4) AS UNSIGNED)), 0) AS max_number FROM books WHERE code LIKE 'BK-%'");
    $row = $statement ? $statement->fetch(PDO::FETCH_ASSOC) : null;
    $next = (int) ($row['max_number'] ?? 0) + 1;

    return sprintf('BK-%03d', $next);
};

$getCategoryById = function (PDO $pdo, int $id): ?array {
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
};

$getBookById = function (PDO $pdo, int $id): ?array {
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
};

$formatMember = function (array $row): array {
    return [
        'id' => (int) $row['id'],
        'member_code' => (string) $row['member_code'],
        'full_name' => (string) $row['full_name'],
        'nik' => $row['nik'],
        'birth_date' => $row['birth_date'],
        'gender' => $row['gender'],
        'address' => $row['address'],
        'city' => $row['city'],
        'phone' => $row['phone'],
        'email' => $row['email'],
        'status' => (string) $row['status'],
        'joined_at' => $row['joined_at'],
        'created_at' => $row['created_at'],
        'updated_at' => $row['updated_at'],
        'created_by' => $row['created_by'] !== null ? (int) $row['created_by'] : null,
        'updated_by' => $row['updated_by'] !== null ? (int) $row['updated_by'] : null,
    ];
};

$formatUser = function (array $row): array {
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
};

$getNextMemberCode = function (PDO $pdo): string {
    $statement = $pdo->query("SELECT COALESCE(MAX(CAST(SUBSTRING(member_code, 5) AS UNSIGNED)), 0) AS max_number FROM members WHERE member_code LIKE 'ANG-%'");
    $row = $statement ? $statement->fetch(PDO::FETCH_ASSOC) : null;
    $next = (int) ($row['max_number'] ?? 0) + 1;

    return sprintf('ANG-%03d', $next);
};

$getMemberById = function (PDO $pdo, int $id): ?array {
    $statement = $pdo->prepare('SELECT * FROM members WHERE id = :id LIMIT 1');
    $statement->execute(['id' => $id]);
    $row = $statement->fetch(PDO::FETCH_ASSOC);

    return is_array($row) ? $row : null;
};

$getRoleByCode = function (PDO $pdo, string $code): ?array {
    $statement = $pdo->prepare('SELECT * FROM roles WHERE code = :code LIMIT 1');
    $statement->execute(['code' => $code]);
    $row = $statement->fetch(PDO::FETCH_ASSOC);

    return is_array($row) ? $row : null;
};

$appSettingsCatalog = [
    'app_name' => [
        'label' => 'Nama Aplikasi',
        'group' => 'profil',
        'description' => 'Nama aplikasi yang ditampilkan di antarmuka utama.',
        'default' => 'EIS Balangan',
    ],
    'institution_name' => [
        'label' => 'Nama Instansi',
        'group' => 'profil',
        'description' => 'Nama resmi instansi perpustakaan.',
        'default' => 'Perpustakaan Daerah Balangan',
    ],
    'head_name' => [
        'label' => 'Nama Kepala Perpustakaan',
        'group' => 'profil',
        'description' => 'Nama pejabat yang bertanggung jawab atas operasional perpustakaan.',
        'default' => 'Kepala Perpustakaan',
    ],
    'head_nip' => [
        'label' => 'NIP Kepala',
        'group' => 'profil',
        'description' => 'Nomor induk pegawai kepala perpustakaan.',
        'default' => '',
    ],
    'head_title' => [
        'label' => 'Jabatan',
        'group' => 'profil',
        'description' => 'Nama jabatan resmi yang digunakan pada identitas sistem.',
        'default' => 'Kepala Perpustakaan Daerah',
    ],
    'head_email' => [
        'label' => 'Email',
        'group' => 'kontak',
        'description' => 'Alamat email kontak utama eksekutif.',
        'default' => '',
    ],
    'head_phone' => [
        'label' => 'Telepon',
        'group' => 'kontak',
        'description' => 'Nomor telepon kontak utama eksekutif.',
        'default' => '',
    ],
    'loan_days' => [
        'label' => 'Lama Pinjam',
        'group' => 'operasional',
        'description' => 'Jumlah hari peminjaman standar sebelum jatuh tempo.',
        'default' => '7',
    ],
    'fine_per_day' => [
        'label' => 'Denda per Hari',
        'group' => 'operasional',
        'description' => 'Besaran denda harian untuk keterlambatan pengembalian.',
        'default' => '1000',
    ],
];

$getAppSettings = function (PDO $pdo, array $catalog): array {
    $keys = array_keys($catalog);
    if (!$keys) {
        return [];
    }

    $placeholders = implode(', ', array_fill(0, count($keys), '?'));
    $statement = $pdo->prepare(
        "SELECT setting_key, setting_value, setting_group, description, updated_by, updated_at
         FROM app_settings
         WHERE setting_key IN ($placeholders)"
    );
    $statement->execute($keys);
    $rows = $statement ? $statement->fetchAll(PDO::FETCH_ASSOC) : [];

    $items = [];
    foreach ($catalog as $key => $meta) {
        $items[$key] = [
            'key' => $key,
            'label' => (string) ($meta['label'] ?? $key),
            'group' => (string) ($meta['group'] ?? ''),
            'description' => (string) ($meta['description'] ?? ''),
            'default' => (string) ($meta['default'] ?? ''),
            'value' => (string) ($meta['default'] ?? ''),
            'updated_by' => null,
            'updated_at' => null,
        ];
    }

    foreach ($rows as $row) {
        $key = (string) ($row['setting_key'] ?? '');
        if ($key === '' || !array_key_exists($key, $items)) {
            continue;
        }

        $items[$key]['value'] = (string) ($row['setting_value'] ?? $items[$key]['default']);
        $items[$key]['group'] = (string) ($row['setting_group'] ?? $items[$key]['group']);
        $items[$key]['description'] = (string) ($row['description'] ?? $items[$key]['description']);
        $items[$key]['updated_by'] = $row['updated_by'] !== null ? (int) $row['updated_by'] : null;
        $items[$key]['updated_at'] = $row['updated_at'] ?? null;
    }

    return array_values($items);
};

$upsertAppSetting = function (PDO $pdo, string $key, string $value, array $meta, int $updatedBy): void {
    $statement = $pdo->prepare(
        'INSERT INTO app_settings
            (setting_key, setting_value, setting_group, description, updated_by, created_at, updated_at)
         VALUES
            (:setting_key, :setting_value, :setting_group, :description, :updated_by, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON DUPLICATE KEY UPDATE
            setting_value = :setting_value_update,
            setting_group = :setting_group_update,
            description = :description_update,
            updated_by = :updated_by_update,
            updated_at = CURRENT_TIMESTAMP'
    );
    $statement->execute([
        'setting_key' => $key,
        'setting_value' => $value,
        'setting_group' => (string) ($meta['group'] ?? ''),
        'description' => (string) ($meta['description'] ?? ''),
        'updated_by' => $updatedBy > 0 ? $updatedBy : null,
        'setting_value_update' => $value,
        'setting_group_update' => (string) ($meta['group'] ?? ''),
        'description_update' => (string) ($meta['description'] ?? ''),
        'updated_by_update' => $updatedBy > 0 ? $updatedBy : null,
    ]);
};

$parseYmd = function (string $value): ?string {
    $value = trim($value);
    if ($value === '') {
        return null;
    }

    $date = DateTime::createFromFormat('Y-m-d', $value);
    if (!$date) {
        return null;
    }

    $errors = DateTime::getLastErrors();
    if (is_array($errors) && (($errors['warning_count'] ?? 0) > 0 || ($errors['error_count'] ?? 0) > 0)) {
        return null;
    }

    return $date->format('Y-m-d');
};

$getSettingValue = function (PDO $pdo, string $key, string $default = ''): string {
    $statement = $pdo->prepare('SELECT setting_value FROM app_settings WHERE setting_key = :setting_key LIMIT 1');
    $statement->execute(['setting_key' => $key]);
    $row = $statement->fetch(PDO::FETCH_ASSOC);

    return $row && array_key_exists('setting_value', $row) ? (string) $row['setting_value'] : $default;
};

$getLoanFinePerDay = function (PDO $pdo) use ($getSettingValue): int {
    $value = (int) $getSettingValue($pdo, 'fine_per_day', '1000');
    return max(0, $value);
};

$getLoanGraceDays = function (PDO $pdo) use ($getSettingValue): int {
    $value = (int) $getSettingValue($pdo, 'loan_days', '7');
    return max(0, $value);
};

$calculateLoanFine = function (string $dueDate, ?string $returnDate, int $graceDays, int $finePerDay): int {
    $baseDate = $returnDate ?: date('Y-m-d');
    $due = DateTime::createFromFormat('Y-m-d', $dueDate);
    $effective = DateTime::createFromFormat('Y-m-d', $baseDate);

    if (!$due || !$effective) {
        return 0;
    }

    if ($effective <= $due) {
        return 0;
    }

    $lateDays = (int) $due->diff($effective)->days;

    return max(0, $lateDays - $graceDays) * $finePerDay;
};

$getLoanById = function (PDO $pdo, int $id): ?array {
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
};

$syncLoanOverdueState = function (PDO $pdo, array $loan, int $graceDays, int $finePerDay, string $today) use ($calculateLoanFine): array {
    $status = (string) ($loan['status'] ?? '');
    $returnDate = $loan['return_date'] !== null && $loan['return_date'] !== '' ? (string) $loan['return_date'] : null;
    $dueDate = (string) ($loan['due_date'] ?? '');
    $computedFine = $calculateLoanFine($dueDate, $returnDate, $graceDays, $finePerDay);
    $needsUpdate = false;
    $nextStatus = $status;
    $nextFine = (int) ($loan['fine_amount'] ?? 0);

    if ($returnDate !== null) {
        if ($nextFine !== $computedFine) {
            $nextFine = $computedFine;
            $needsUpdate = true;
        }
    } elseif (!in_array($status, ['dikembalikan', 'dibatalkan'], true)) {
        $due = DateTime::createFromFormat('Y-m-d', $dueDate);
        $current = DateTime::createFromFormat('Y-m-d', $today);
        if ($due && $current && $current > $due) {
            $lateFine = $calculateLoanFine($dueDate, $today, $graceDays, $finePerDay);
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
};

$getNextLoanCode = function (PDO $pdo): string {
    $statement = $pdo->query("SELECT COALESCE(MAX(CAST(SUBSTRING(loan_code, 5) AS UNSIGNED)), 0) AS max_number FROM loans WHERE loan_code LIKE 'TRX-%'");
    $row = $statement ? $statement->fetch(PDO::FETCH_ASSOC) : null;
    $next = (int) ($row['max_number'] ?? 0) + 1;

    return sprintf('TRX-%03d', $next);
};

$formatLoan = function (array $row): array {
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
};

$router->get('/api/health', function (App\Http\Request $request, array $context) {
    return Response::json([
        'success' => true,
        'message' => 'API is running',
        'data' => [
            'app' => $context['app']['name'] ?? 'EIS Balangan',
            'env' => $context['app']['env'] ?? 'local',
            'timestamp' => date(DATE_ATOM),
        ],
    ]);
});

$router->get('/api/db/ping', function (App\Http\Request $request, array $context) {
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
});

$router->get('/api/settings', function (App\Http\Request $request, array $context) use ($requireExecutive, $appSettingsCatalog, $getAppSettings) {
    $identity = $requireExecutive($request, $context);
    if (is_array($identity) && array_key_exists('status', $identity)) {
        return $identity;
    }

    try {
        $pdo = Database::connection($context['database']);
        $items = $getAppSettings($pdo, $appSettingsCatalog);

        return Response::json([
            'success' => true,
            'message' => 'Pengaturan berhasil dimuat',
            'data' => [
                'settings' => $items,
            ],
        ]);
    } catch (Throwable $throwable) {
        return Response::json([
            'success' => false,
            'message' => 'Gagal memuat pengaturan',
            'error' => $throwable->getMessage(),
        ], 500);
    }
});

$router->put('/api/settings', function (App\Http\Request $request, array $context) use ($requireExecutive, $appSettingsCatalog, $getAppSettings, $upsertAppSetting) {
    $identity = $requireExecutive($request, $context);
    if (is_array($identity) && array_key_exists('status', $identity)) {
        return $identity;
    }

    $payload = $request->json();
    $incoming = isset($payload['settings']) && is_array($payload['settings']) ? $payload['settings'] : $payload;

    $updates = [];
    foreach (array_keys($appSettingsCatalog) as $key) {
        if (!array_key_exists($key, $incoming)) {
            continue;
        }

        $rawValue = $incoming[$key];
        if ($key === 'loan_days' || $key === 'fine_per_day') {
            $intValue = (int) $rawValue;
            if ($intValue < 0) {
                return Response::json([
                    'success' => false,
                    'message' => sprintf('Nilai %s tidak valid', $key),
                ], 422);
            }

            $updates[$key] = (string) $intValue;
            continue;
        }

        $updates[$key] = trim((string) $rawValue);
    }

    if (!$updates) {
        return Response::json([
            'success' => false,
            'message' => 'Tidak ada pengaturan yang dikirim',
        ], 422);
    }

    try {
        $pdo = Database::connection($context['database']);
        $pdo->beginTransaction();

        foreach ($updates as $key => $value) {
            $meta = $appSettingsCatalog[$key] ?? null;
            if ($meta === null) {
                continue;
            }

            $upsertAppSetting($pdo, $key, $value, $meta, (int) ($identity['user_id'] ?? 0));
        }

        $pdo->commit();
        $items = $getAppSettings($pdo, $appSettingsCatalog);

        return Response::json([
            'success' => true,
            'message' => 'Pengaturan berhasil disimpan',
            'data' => [
                'settings' => $items,
            ],
        ]);
    } catch (Throwable $throwable) {
        if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
            $pdo->rollBack();
        }

        return Response::json([
            'success' => false,
            'message' => 'Gagal menyimpan pengaturan',
            'error' => $throwable->getMessage(),
        ], 500);
    }
});

$router->get('/api/categories', function (App\Http\Request $request, array $context) use ($requireExecutive, $formatCategory) {
    $identity = $requireExecutive($request, $context);
    if (is_array($identity) && array_key_exists('status', $identity)) {
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
        $items = array_map($formatCategory, $rows);
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
                'items' => $rows ? array_map($formatCategory, $rows) : [],
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
});

$router->get('/api/books', function (App\Http\Request $request, array $context) use ($requireExecutive, $formatBook) {
    $identity = $requireExecutive($request, $context);
    if (is_array($identity) && array_key_exists('status', $identity)) {
        return $identity;
    }

    try {
        $pdo = Database::connection($context['database']);
        $statement = $pdo->query(
            'SELECT
                b.*,
                c.code AS category_code,
                c.name AS category_name
             FROM books b
             INNER JOIN categories c ON c.id = b.category_id
             ORDER BY b.created_at DESC, b.id DESC'
        );
        $rows = $statement ? $statement->fetchAll(PDO::FETCH_ASSOC) : [];
        $items = array_map($formatBook, $rows);

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
});

$router->get('/api/reports/overview', function (App\Http\Request $request, array $context) use ($requireExecutive) {
    $identity = $requireExecutive($request, $context);
    if (is_array($identity) && array_key_exists('status', $identity)) {
        return $identity;
    }

    try {
        $pdo = Database::connection($context['database']);

        $parseDate = static function (string $value): ?DateTimeImmutable {
            $value = trim($value);
            if ($value === '') {
                return null;
            }

            $date = DateTimeImmutable::createFromFormat('Y-m-d', $value);
            if (!$date instanceof DateTimeImmutable) {
                return null;
            }

            $errors = DateTimeImmutable::getLastErrors();
            if (is_array($errors) && (($errors['warning_count'] ?? 0) > 0 || ($errors['error_count'] ?? 0) > 0)) {
                return null;
            }

            return $date;
        };

        $formatDateLabel = static function (DateTimeImmutable $date): string {
            $months = [
                1 => 'Jan',
                2 => 'Feb',
                3 => 'Mar',
                4 => 'Apr',
                5 => 'Mei',
                6 => 'Jun',
                7 => 'Jul',
                8 => 'Agu',
                9 => 'Sep',
                10 => 'Okt',
                11 => 'Nov',
                12 => 'Des',
            ];

            $monthIndex = (int) $date->format('n');
            $monthLabel = $months[$monthIndex] ?? $date->format('M');
            return $date->format('j') . ' ' . $monthLabel . ' ' . $date->format('Y');
        };

        $defaultStart = new DateTimeImmutable('first day of this month');
        $defaultEnd = $defaultStart->modify('last day of this month');
        $reportStart = $parseDate((string) ($request->query('start_date', '') ?? '')) ?? $defaultStart;
        $reportEnd = $parseDate((string) ($request->query('end_date', '') ?? '')) ?? $defaultEnd;
        if ($reportStart > $reportEnd) {
            [$reportStart, $reportEnd] = [$reportEnd, $reportStart];
        }

        $requestedChartYear = (int) ($request->query('chart_year', (int) date('Y')) ?? (int) date('Y'));
        $chartYear = $requestedChartYear > 0 ? $requestedChartYear : (int) date('Y');
        $reportPeriodLabel = $formatDateLabel($reportStart) . ' - ' . $formatDateLabel($reportEnd);
        $reportStartSql = $reportStart->format('Y-m-d');
        $reportEndSql = $reportEnd->format('Y-m-d');
        $reportEndExclusiveSql = $reportEnd->modify('+1 day')->format('Y-m-d');

        $fetchOne = static function (PDO $pdo, string $sql, array $params = []): array {
            $statement = $pdo->prepare($sql);
            $statement->execute($params);
            $row = $statement->fetch(PDO::FETCH_ASSOC);
            return is_array($row) ? $row : [];
        };
        $fetchAll = static function (PDO $pdo, string $sql, array $params = []): array {
            $statement = $pdo->prepare($sql);
            $statement->execute($params);
            $rows = $statement->fetchAll(PDO::FETCH_ASSOC);
            return is_array($rows) ? $rows : [];
        };

        $memberSummary = $fetchOne(
            $pdo,
            'SELECT
                COUNT(*) AS total,
                SUM(status = "aktif") AS active,
                SUM(status = "nonaktif") AS inactive,
                SUM(CASE WHEN joined_at >= :member_start_date AND joined_at < :member_end_exclusive THEN 1 ELSE 0 END) AS new_this_month
             FROM members',
            [
                'member_start_date' => $reportStartSql,
                'member_end_exclusive' => $reportEndExclusiveSql,
            ]
        );

        $bookSummary = $fetchOne(
            $pdo,
            'SELECT
                COUNT(*) AS total,
                SUM(status = "aktif") AS active,
                SUM(CASE WHEN stock_available = 0 THEN 1 ELSE 0 END) AS empty_stock,
                SUM(CASE WHEN stock_available BETWEEN 1 AND 3 THEN 1 ELSE 0 END) AS low_stock
             FROM books'
        );

        $categorySummary = $fetchOne(
            $pdo,
            'SELECT
                COUNT(*) AS total,
                SUM(status = "aktif") AS active,
                SUM(status = "nonaktif") AS inactive
             FROM categories'
        );

        $loanSummary = $fetchOne(
            $pdo,
            'SELECT
                COUNT(*) AS total,
                SUM(status = "dipinjam") AS borrowed,
                SUM(status = "dikembalikan") AS returned_count,
                SUM(status = "terlambat") AS overdue_count,
                SUM(status = "dibatalkan") AS cancelled_count,
                SUM(CASE WHEN loan_date >= :loan_start_date_case AND loan_date < :loan_end_exclusive_case THEN 1 ELSE 0 END) AS this_month
             FROM loans
             WHERE loan_date >= :loan_start_date_where AND loan_date < :loan_end_exclusive_where',
            [
                'loan_start_date_case' => $reportStartSql,
                'loan_end_exclusive_case' => $reportEndExclusiveSql,
                'loan_start_date_where' => $reportStartSql,
                'loan_end_exclusive_where' => $reportEndExclusiveSql,
            ]
        );

        $loanStatusBreakdown = [];
        foreach ([
            'dipinjam' => 'Dipinjam',
            'dikembalikan' => 'Dikembalikan',
            'terlambat' => 'Terlambat',
            'dibatalkan' => 'Dibatalkan',
        ] as $statusKey => $label) {
            $loanStatusBreakdown[] = [
                'status' => $statusKey,
                'label' => $label,
                'count' => (int) ($loanSummary[$statusKey === 'dipinjam' ? 'borrowed' : ($statusKey === 'dikembalikan' ? 'returned_count' : ($statusKey === 'terlambat' ? 'overdue_count' : 'cancelled_count'))] ?? 0),
            ];
        }

        $topBooksRows = $fetchAll(
            $pdo,
            'SELECT
                b.id,
                b.code,
                b.title,
                b.status,
                b.stock_total,
                b.stock_available,
                c.code AS category_code,
                c.name AS category_name,
                COALESCE(SUM(CASE WHEN l.id IS NOT NULL THEN li.quantity ELSE 0 END), 0) AS borrowed_quantity
             FROM books b
             INNER JOIN categories c ON c.id = b.category_id
             LEFT JOIN loan_items li ON li.book_id = b.id
             LEFT JOIN loans l ON l.id = li.loan_id AND l.loan_date >= :topbook_start_date AND l.loan_date < :topbook_end_exclusive
             GROUP BY b.id
             ORDER BY borrowed_quantity DESC, b.stock_available ASC, b.title ASC
             LIMIT 8',
            [
                'topbook_start_date' => $reportStartSql,
                'topbook_end_exclusive' => $reportEndExclusiveSql,
            ]
        );
        $topBooks = [];
        foreach ($topBooksRows as $index => $row) {
            $stockAvailable = (int) ($row['stock_available'] ?? 0);
            $topBooks[] = [
                'rank' => $index + 1,
                'id' => (int) $row['id'],
                'code' => (string) $row['code'],
                'title' => (string) $row['title'],
                'category_code' => (string) ($row['category_code'] ?? ''),
                'category_name' => (string) ($row['category_name'] ?? ''),
                'borrowed_quantity' => (int) ($row['borrowed_quantity'] ?? 0),
                'stock_total' => (int) ($row['stock_total'] ?? 0),
                'stock_available' => $stockAvailable,
                'status' => (string) $row['status'],
            ];
        }

        $topCategoriesRows = $fetchAll(
            $pdo,
            'SELECT
                c.id,
                c.code,
                c.name,
                c.status,
                COUNT(DISTINCT b.id) AS books_count,
                COALESCE(SUM(CASE WHEN l.id IS NOT NULL THEN li.quantity ELSE 0 END), 0) AS borrowed_quantity
             FROM categories c
             LEFT JOIN books b ON b.category_id = c.id
             LEFT JOIN loan_items li ON li.book_id = b.id
             LEFT JOIN loans l ON l.id = li.loan_id AND l.loan_date >= :topcat_start_date AND l.loan_date < :topcat_end_exclusive
             GROUP BY c.id
             ORDER BY borrowed_quantity DESC, books_count DESC, c.name ASC
             LIMIT 6',
            [
                'topcat_start_date' => $reportStartSql,
                'topcat_end_exclusive' => $reportEndExclusiveSql,
            ]
        );
        $topCategories = [];
        foreach ($topCategoriesRows as $index => $row) {
            $borrowedQuantity = (int) ($row['borrowed_quantity'] ?? 0);
            $booksCount = (int) ($row['books_count'] ?? 0);
            $topCategories[] = [
                'rank' => $index + 1,
                'id' => (int) $row['id'],
                'code' => (string) $row['code'],
                'name' => (string) $row['name'],
                'status' => (string) $row['status'],
                'books_count' => $booksCount,
                'borrowed_quantity' => $borrowedQuantity,
            ];
        }

        $recentLoansRows = $fetchAll(
            $pdo,
            'SELECT
                l.id,
                l.loan_code,
                l.loan_date,
                l.due_date,
                l.status,
                m.full_name AS member_name,
                GROUP_CONCAT(DISTINCT b.title ORDER BY b.title SEPARATOR ", ") AS books_summary
             FROM loans l
             INNER JOIN members m ON m.id = l.member_id
             LEFT JOIN loan_items li ON li.loan_id = l.id
             LEFT JOIN books b ON b.id = li.book_id
             WHERE l.loan_date >= :recent_start_date AND l.loan_date < :recent_end_exclusive
             GROUP BY l.id
             ORDER BY l.created_at DESC, l.id DESC
             LIMIT 6',
            [
                'recent_start_date' => $reportStartSql,
                'recent_end_exclusive' => $reportEndExclusiveSql,
            ]
        );
        $recentLoans = [];
        foreach ($recentLoansRows as $row) {
            $recentLoans[] = [
                'id' => (int) $row['id'],
                'loan_code' => (string) $row['loan_code'],
                'member_name' => (string) $row['member_name'],
                'loan_date' => $row['loan_date'],
                'due_date' => $row['due_date'],
                'status' => (string) $row['status'],
                'books_summary' => (string) ($row['books_summary'] ?? ''),
            ];
        }

        $monthShortLabels = [
            1 => 'JAN',
            2 => 'FEB',
            3 => 'MAR',
            4 => 'APR',
            5 => 'MEI',
            6 => 'JUN',
            7 => 'JUL',
            8 => 'AGU',
            9 => 'SEP',
            10 => 'OKT',
            11 => 'NOV',
            12 => 'DES',
        ];
        $monthLongLabels = [
            1 => 'Jan',
            2 => 'Feb',
            3 => 'Mar',
            4 => 'Apr',
            5 => 'Mei',
            6 => 'Jun',
            7 => 'Jul',
            8 => 'Agu',
            9 => 'Sep',
            10 => 'Okt',
            11 => 'Nov',
            12 => 'Des',
        ];

        $monthBuckets = [];
        for ($monthIndex = 1; $monthIndex <= 12; $monthIndex++) {
            $key = sprintf('%04d-%02d', $chartYear, $monthIndex);
            $monthBuckets[$key] = [
                'key' => $key,
                'label' => $monthShortLabels[$monthIndex] ?? strtoupper(substr((string) $monthLongLabels[$monthIndex], 0, 3)),
                'month_label' => ($monthLongLabels[$monthIndex] ?? $monthShortLabels[$monthIndex]) . ' ' . $chartYear,
                'loans' => 0,
                'books_added' => 0,
            ];
        }

        $monthlyLoanRows = $fetchAll(
            $pdo,
            'SELECT loan_date
             FROM loans
             WHERE YEAR(loan_date) = :chart_year
             ORDER BY loan_date ASC, id ASC',
            [
                'chart_year' => $chartYear,
            ]
        );
        foreach ($monthlyLoanRows as $row) {
            $key = substr((string) ($row['loan_date'] ?? ''), 0, 7);
            if (isset($monthBuckets[$key])) {
                $monthBuckets[$key]['loans']++;
            }
        }

        $monthlyBookRows = $fetchAll(
            $pdo,
            'SELECT created_at
             FROM books
             WHERE YEAR(created_at) = :chart_year
             ORDER BY created_at ASC, id ASC',
            [
                'chart_year' => $chartYear,
            ]
        );
        foreach ($monthlyBookRows as $row) {
            $key = substr((string) ($row['created_at'] ?? ''), 0, 7);
            if (isset($monthBuckets[$key])) {
                $monthBuckets[$key]['books_added']++;
            }
        }

        $categoryAnalysisRows = $fetchAll(
            $pdo,
            'SELECT
                c.id,
                c.code,
                c.name,
                c.status,
                COUNT(DISTINCT b.id) AS books_count,
                COALESCE(SUM(CASE WHEN l.id IS NOT NULL THEN li.quantity ELSE 0 END), 0) AS total_borrowed,
                COALESCE(SUM(CASE WHEN l.loan_date >= DATE_SUB(:category_end_date_30, INTERVAL 30 DAY) AND l.loan_date <= :category_end_date_30b THEN li.quantity ELSE 0 END), 0) AS last_30_days,
                COALESCE(SUM(CASE WHEN l.loan_date >= DATE_SUB(:category_end_date_60, INTERVAL 60 DAY) AND l.loan_date < DATE_SUB(:category_end_date_60b, INTERVAL 30 DAY) THEN li.quantity ELSE 0 END), 0) AS previous_30_days,
                SUM(CASE WHEN b.stock_available = 0 THEN 1 ELSE 0 END) AS empty_stock_books,
                SUM(CASE WHEN b.stock_available BETWEEN 1 AND 3 THEN 1 ELSE 0 END) AS low_stock_books
             FROM categories c
             LEFT JOIN books b ON b.category_id = c.id
             LEFT JOIN loan_items li ON li.book_id = b.id
             LEFT JOIN loans l ON l.id = li.loan_id AND l.loan_date >= :category_start_date AND l.loan_date < :category_end_exclusive
             GROUP BY c.id
             ORDER BY total_borrowed DESC, books_count DESC, c.name ASC
             LIMIT 5',
            [
                'category_start_date' => $reportStartSql,
                'category_end_exclusive' => $reportEndExclusiveSql,
                'category_end_date_30' => $reportEndSql,
                'category_end_date_30b' => $reportEndSql,
                'category_end_date_60' => $reportEndSql,
                'category_end_date_60b' => $reportEndSql,
            ]
        );
        $categoryAnalysis = [];
        foreach ($categoryAnalysisRows as $row) {
            $last30 = (int) ($row['last_30_days'] ?? 0);
            $previous30 = (int) ($row['previous_30_days'] ?? 0);
            $trendPercent = $previous30 > 0 ? (int) round((($last30 - $previous30) / $previous30) * 100) : ($last30 > 0 ? 100 : 0);
            if ($trendPercent > 0) {
                $trendText = '+' . $trendPercent . '%';
            } elseif ($trendPercent < 0) {
                $trendText = $trendPercent . '%';
            } else {
                $trendText = '0%';
            }

            $emptyStockBooks = (int) ($row['empty_stock_books'] ?? 0);
            $lowStockBooks = (int) ($row['low_stock_books'] ?? 0);
            if ($emptyStockBooks > 0 || $lowStockBooks > 0) {
                $recommendation = 'PROTECT STOCK';
            } elseif ($trendPercent >= 15) {
                $recommendation = 'EXPAND';
            } elseif ($trendPercent <= -10) {
                $recommendation = 'REVIEW';
            } else {
                $recommendation = 'NORMAL';
            }

            $categoryAnalysis[] = [
                'id' => (int) $row['id'],
                'code' => (string) $row['code'],
                'name' => (string) $row['name'],
                'status' => (string) $row['status'],
                'books_count' => (int) ($row['books_count'] ?? 0),
                'total_borrowed' => (int) ($row['total_borrowed'] ?? 0),
                'last_30_days' => $last30,
                'trend_percent' => $trendPercent,
                'trend_text' => $trendText,
                'recommendation' => $recommendation,
            ];
        }

        $memberRows = $fetchAll($pdo, 'SELECT birth_date FROM members ORDER BY created_at ASC, id ASC');
        $demographicBands = [
            ['label' => '15-24 Tahun', 'count' => 0, 'percent' => 0],
            ['label' => '25-34 Tahun', 'count' => 0, 'percent' => 0],
            ['label' => '35-44 Tahun', 'count' => 0, 'percent' => 0],
            ['label' => '45+ Tahun', 'count' => 0, 'percent' => 0],
        ];

        foreach ($memberRows as $row) {
            $birthDate = DateTime::createFromFormat('Y-m-d', (string) ($row['birth_date'] ?? ''));
            if (!$birthDate instanceof DateTime) {
                continue;
            }

            $errors = DateTime::getLastErrors();
            if (is_array($errors) && (($errors['warning_count'] ?? 0) > 0 || ($errors['error_count'] ?? 0) > 0)) {
                continue;
            }

            $age = (int) $birthDate->diff(new DateTimeImmutable('today'))->y;
            if ($age < 15) {
                continue;
            }

            if ($age <= 24) {
                $demographicBands[0]['count']++;
            } elseif ($age <= 34) {
                $demographicBands[1]['count']++;
            } elseif ($age <= 44) {
                $demographicBands[2]['count']++;
            } else {
                $demographicBands[3]['count']++;
            }
        }

        $demographicTotal = array_sum(array_column($demographicBands, 'count'));
        foreach ($demographicBands as &$band) {
            $band['percent'] = $demographicTotal > 0 ? (int) round(($band['count'] / $demographicTotal) * 100) : 0;
        }
        unset($band);

        $executiveAgeBands = [
            ['label' => '<12', 'count' => 0, 'percent' => 0],
            ['label' => '13-17', 'count' => 0, 'percent' => 0],
            ['label' => '18-25', 'count' => 0, 'percent' => 0],
            ['label' => '26-40', 'count' => 0, 'percent' => 0],
            ['label' => '>40', 'count' => 0, 'percent' => 0],
        ];

        foreach ($memberRows as $row) {
            $birthDate = DateTimeImmutable::createFromFormat('Y-m-d', (string) ($row['birth_date'] ?? ''));
            if (!$birthDate instanceof DateTimeImmutable) {
                continue;
            }

            $errors = DateTimeImmutable::getLastErrors();
            if (is_array($errors) && (($errors['warning_count'] ?? 0) > 0 || ($errors['error_count'] ?? 0) > 0)) {
                continue;
            }

            $age = (int) $birthDate->diff(new DateTimeImmutable('today'))->y;
            if ($age <= 12) {
                $executiveAgeBands[0]['count']++;
            } elseif ($age <= 17) {
                $executiveAgeBands[1]['count']++;
            } elseif ($age <= 25) {
                $executiveAgeBands[2]['count']++;
            } elseif ($age <= 40) {
                $executiveAgeBands[3]['count']++;
            } else {
                $executiveAgeBands[4]['count']++;
            }
        }

        $executiveAgeTotal = array_sum(array_column($executiveAgeBands, 'count'));
        foreach ($executiveAgeBands as &$band) {
            $band['percent'] = $executiveAgeTotal > 0 ? (int) round(($band['count'] / $executiveAgeTotal) * 100) : 0;
        }
        unset($band);

        return Response::json([
            'success' => true,
            'message' => 'Ringkasan laporan berhasil dimuat',
            'data' => [
                'period_label' => $reportPeriodLabel,
                'chart_year' => $chartYear,
                'summary' => [
                    'members' => [
                        'total' => (int) ($memberSummary['total'] ?? 0),
                        'active' => (int) ($memberSummary['active'] ?? 0),
                        'inactive' => (int) ($memberSummary['inactive'] ?? 0),
                        'new_this_month' => (int) ($memberSummary['new_this_month'] ?? 0),
                    ],
                    'books' => [
                        'total' => (int) ($bookSummary['total'] ?? 0),
                        'active' => (int) ($bookSummary['active'] ?? 0),
                        'low_stock' => (int) ($bookSummary['low_stock'] ?? 0),
                        'empty_stock' => (int) ($bookSummary['empty_stock'] ?? 0),
                    ],
                    'categories' => [
                        'total' => (int) ($categorySummary['total'] ?? 0),
                        'active' => (int) ($categorySummary['active'] ?? 0),
                        'inactive' => (int) ($categorySummary['inactive'] ?? 0),
                    ],
                    'loans' => [
                        'total' => (int) ($loanSummary['total'] ?? 0),
                        'borrowed' => (int) ($loanSummary['borrowed'] ?? 0),
                        'returned_count' => (int) ($loanSummary['returned_count'] ?? 0),
                        'overdue_count' => (int) ($loanSummary['overdue_count'] ?? 0),
                        'cancelled_count' => (int) ($loanSummary['cancelled_count'] ?? 0),
                        'this_month' => (int) ($loanSummary['this_month'] ?? 0),
                    ],
                ],
                'monthly_loans' => [],
                'monthly_activity' => array_values($monthBuckets),
                'loan_status_breakdown' => $loanStatusBreakdown,
                'top_books' => $topBooks,
                'top_categories' => $topCategories,
                'category_analysis' => $categoryAnalysis,
                'demographics' => $demographicBands,
                'executive_demographics' => $executiveAgeBands,
                'recent_loans' => $recentLoans,
                'generated_at' => date(DATE_ATOM),
            ],
        ]);
    } catch (Throwable $throwable) {
        return Response::json([
            'success' => false,
            'message' => 'Gagal memuat laporan',
            'error' => $throwable->getMessage(),
        ], 500);
    }
});

$router->get('/api/loans', function (App\Http\Request $request, array $context) use ($requireAdmin, $formatLoan, $getLoanById, $getLoanGraceDays, $getLoanFinePerDay, $syncLoanOverdueState) {
    $identity = $requireAdmin($request, $context);
    if (is_array($identity) && array_key_exists('status', $identity)) {
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
        $graceDays = $getLoanGraceDays($pdo);
        $finePerDay = $getLoanFinePerDay($pdo);
        $items = [];
        foreach ($rows as $row) {
            $synchronized = $syncLoanOverdueState($pdo, $row, $graceDays, $finePerDay, $today);
            $fullLoan = $getLoanById($pdo, (int) $synchronized['id']);
            if ($fullLoan) {
                $fullLoan['status'] = $synchronized['status'];
                $fullLoan['fine_amount'] = $synchronized['fine_amount'];
                $items[] = $formatLoan($fullLoan);
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
});

$router->post('/api/loans', function (App\Http\Request $request, array $context) use ($requireAdmin, $getNextLoanCode, $parseYmd, $formatLoan) {
    $identity = $requireAdmin($request, $context);
    if (is_array($identity) && array_key_exists('status', $identity)) {
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

    $loanDate = $parseYmd($loanDateRaw) ?? date('Y-m-d');
    $dueDate = $parseYmd($dueDateRaw);
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

        $loanCode = $getNextLoanCode($pdo);
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
            'data' => $created ? $formatLoan($created) : null,
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
});

$router->post('/api/loans/return', function (App\Http\Request $request, array $context) use ($requireAdmin, $getLoanGraceDays, $getLoanFinePerDay, $calculateLoanFine, $getLoanById, $formatLoan) {
    $identity = $requireAdmin($request, $context);
    if (is_array($identity) && array_key_exists('status', $identity)) {
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
            'SELECT id, status, return_date
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
        $finePerDay = $getLoanFinePerDay($pdo);
        $graceDays = $getLoanGraceDays($pdo);
        $fineAmount = $calculateLoanFine((string) ($loan['due_date'] ?? $today), $today, $graceDays, $finePerDay);
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

        $updated = $getLoanById($pdo, $id);

        $pdo->commit();

        return Response::json([
            'success' => true,
            'message' => 'Transaksi berhasil dikembalikan',
            'data' => $updated ? $formatLoan($updated) : null,
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
});

$router->put('/api/loans', function (App\Http\Request $request, array $context) use ($requireAdmin, $getLoanById, $formatLoan, $parseYmd) {
    $identity = $requireAdmin($request, $context);
    if (is_array($identity) && array_key_exists('status', $identity)) {
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

    $loanDate = $parseYmd($loanDateRaw) ?? date('Y-m-d');
    $dueDate = $parseYmd($dueDateRaw);
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

        $updated = $getLoanById($pdo, $id);
        $pdo->commit();

        return Response::json([
            'success' => true,
            'message' => 'Transaksi berhasil diperbarui',
            'data' => $updated ? $formatLoan($updated) : null,
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
});

$router->post('/api/loans/cancel', function (App\Http\Request $request, array $context) use ($requireAdmin, $getLoanById, $formatLoan) {
    $identity = $requireAdmin($request, $context);
    if (is_array($identity) && array_key_exists('status', $identity)) {
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

        $updated = $getLoanById($pdo, $id);
        $pdo->commit();

        return Response::json([
            'success' => true,
            'message' => 'Transaksi berhasil dibatalkan',
            'data' => $updated ? $formatLoan($updated) : null,
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
});

$router->get('/api/members', function (App\Http\Request $request, array $context) use ($requireAdmin, $formatMember) {
    $identity = $requireAdmin($request, $context);
    if (is_array($identity) && array_key_exists('status', $identity)) {
        return $identity;
    }

    $search = trim((string) ($request->query('q', $request->query('search', '')) ?? ''));
    $statusFilter = trim((string) ($request->query('status', 'all') ?? 'all'));
    $genderFilter = trim((string) ($request->query('gender', 'all') ?? 'all'));

    try {
        $pdo = Database::connection($context['database']);
        $conditions = [];
        $params = [];

        if ($search !== '') {
            $conditions[] = '('
                . 'member_code LIKE :search_member_code OR '
                . 'full_name LIKE :search_full_name OR '
                . 'nik LIKE :search_nik OR '
                . 'city LIKE :search_city OR '
                . 'phone LIKE :search_phone OR '
                . 'email LIKE :search_email OR '
                . 'address LIKE :search_address'
                . ')';
            $searchValue = '%' . $search . '%';
            $params['search_member_code'] = $searchValue;
            $params['search_full_name'] = $searchValue;
            $params['search_nik'] = $searchValue;
            $params['search_city'] = $searchValue;
            $params['search_phone'] = $searchValue;
            $params['search_email'] = $searchValue;
            $params['search_address'] = $searchValue;
        }

        if (in_array($statusFilter, ['aktif', 'nonaktif'], true)) {
            $conditions[] = 'status = :status';
            $params['status'] = $statusFilter;
        }

        if (in_array($genderFilter, ['laki-laki', 'perempuan'], true)) {
            $conditions[] = 'gender = :gender';
            $params['gender'] = $genderFilter;
        }

        $sql = 'SELECT * FROM members';
        if ($conditions) {
            $sql .= ' WHERE ' . implode(' AND ', $conditions);
        }
        $sql .= ' ORDER BY created_at DESC, id DESC';

        $statement = $pdo->prepare($sql);
        $statement->execute($params);
        $rows = $statement ? $statement->fetchAll(PDO::FETCH_ASSOC) : [];
        $items = array_map($formatMember, $rows);

        $activeCount = 0;
        $inactiveCount = 0;
        $newThisMonth = 0;
        $currentMonth = date('Y-m');

        $summaryStatement = $pdo->query('SELECT status, joined_at FROM members');
        $summaryRows = $summaryStatement ? $summaryStatement->fetchAll(PDO::FETCH_ASSOC) : [];

        foreach ($summaryRows as $summaryRow) {
            if (($summaryRow['status'] ?? '') === 'aktif') {
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
});

$router->get('/api/users', function (App\Http\Request $request, array $context) use ($requireExecutive, $formatUser) {
    $identity = $requireExecutive($request, $context);
    if (is_array($identity) && array_key_exists('status', $identity)) {
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

        $items = array_map($formatUser, $rows ?: []);
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
});

$router->post('/api/users', function (App\Http\Request $request, array $context) use ($requireExecutive, $formatUser, $getRoleByCode) {
    $identity = $requireExecutive($request, $context);
    if (is_array($identity) && array_key_exists('status', $identity)) {
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
        $role = $getRoleByCode($pdo, $roleCode);
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
        $created = is_array($row) ? $formatUser($row) : null;

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
});

$router->post('/api/members', function (App\Http\Request $request, array $context) use ($requireAdmin, $getNextMemberCode, $getMemberById, $formatMember) {
    $identity = $requireAdmin($request, $context);
    if (is_array($identity) && array_key_exists('status', $identity)) {
        return $identity;
    }

    $payload = $request->json();
    $fullName = trim((string) ($payload['full_name'] ?? ''));
    $nik = trim((string) ($payload['nik'] ?? ''));
    $birthDateRaw = trim((string) ($payload['birth_date'] ?? ''));
    $gender = trim((string) ($payload['gender'] ?? ''));
    $address = trim((string) ($payload['address'] ?? ''));
    $city = trim((string) ($payload['city'] ?? ''));
    $phone = trim((string) ($payload['phone'] ?? ''));
    $email = trim((string) ($payload['email'] ?? ''));
    $status = trim((string) ($payload['status'] ?? 'aktif'));
    $joinedAtRaw = trim((string) ($payload['joined_at'] ?? ''));

    if ($fullName === '') {
        return Response::json([
            'success' => false,
            'message' => 'Nama lengkap wajib diisi',
        ], 422);
    }

    if (!in_array($gender, ['laki-laki', 'perempuan'], true)) {
        return Response::json([
            'success' => false,
            'message' => 'Jenis kelamin wajib dipilih',
        ], 422);
    }

    if (!in_array($status, ['aktif', 'nonaktif'], true)) {
        $status = 'aktif';
    }

    $birthDate = null;
    if ($birthDateRaw !== '') {
        $birthDateObject = DateTime::createFromFormat('Y-m-d', $birthDateRaw);
        $birthDateErrors = DateTime::getLastErrors();
        if (!$birthDateObject || ($birthDateErrors['warning_count'] ?? 0) > 0 || ($birthDateErrors['error_count'] ?? 0) > 0) {
            return Response::json([
                'success' => false,
                'message' => 'Tanggal lahir tidak valid',
            ], 422);
        }
        $birthDate = $birthDateObject->format('Y-m-d');
    }

    $joinedAt = date('Y-m-d');
    if ($joinedAtRaw !== '') {
        $joinedAtObject = DateTime::createFromFormat('Y-m-d', $joinedAtRaw);
        $joinedAtErrors = DateTime::getLastErrors();
        if ($joinedAtObject && ($joinedAtErrors['warning_count'] ?? 0) === 0 && ($joinedAtErrors['error_count'] ?? 0) === 0) {
            $joinedAt = $joinedAtObject->format('Y-m-d');
        }
    }

    if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        return Response::json([
            'success' => false,
            'message' => 'Email tidak valid',
        ], 422);
    }

    try {
        $pdo = Database::connection($context['database']);

        if ($nik !== '') {
            $nikStatement = $pdo->prepare('SELECT id FROM members WHERE nik = :nik LIMIT 1');
            $nikStatement->execute(['nik' => $nik]);
            if ($nikStatement->fetch(PDO::FETCH_ASSOC)) {
                return Response::json([
                    'success' => false,
                    'message' => 'NIK sudah digunakan anggota lain',
                ], 422);
            }
        }

        $code = $getNextMemberCode($pdo);
        $statement = $pdo->prepare(
            'INSERT INTO members (
                member_code, full_name, nik, birth_date, gender, address, city, phone, email, status, joined_at, created_by, updated_by
            ) VALUES (
                :member_code, :full_name, :nik, :birth_date, :gender, :address, :city, :phone, :email, :status, :joined_at, :created_by, :updated_by
            )'
        );
        $statement->execute([
            'member_code' => $code,
            'full_name' => $fullName,
            'nik' => $nik !== '' ? $nik : null,
            'birth_date' => $birthDate,
            'gender' => $gender,
            'address' => $address !== '' ? $address : null,
            'city' => $city !== '' ? $city : null,
            'phone' => $phone !== '' ? $phone : null,
            'email' => $email !== '' ? $email : null,
            'status' => $status,
            'joined_at' => $joinedAt,
            'created_by' => $identity['user_id'],
            'updated_by' => $identity['user_id'],
        ]);

        $created = $getMemberById($pdo, (int) $pdo->lastInsertId());

        return Response::json([
            'success' => true,
            'message' => 'Anggota berhasil ditambahkan',
            'data' => $created ? $formatMember($created) : null,
        ], 201);
    } catch (Throwable $throwable) {
        return Response::json([
            'success' => false,
            'message' => 'Gagal menambahkan anggota',
            'error' => $throwable->getMessage(),
        ], 500);
    }
});

$router->put('/api/members', function (App\Http\Request $request, array $context) use ($requireAdmin, $getMemberById, $formatMember) {
    $identity = $requireAdmin($request, $context);
    if (is_array($identity) && array_key_exists('status', $identity)) {
        return $identity;
    }

    $payload = $request->json();
    $id = (int) ($payload['id'] ?? 0);
    $fullName = trim((string) ($payload['full_name'] ?? ''));
    $nik = trim((string) ($payload['nik'] ?? ''));
    $birthDateRaw = trim((string) ($payload['birth_date'] ?? ''));
    $gender = trim((string) ($payload['gender'] ?? ''));
    $address = trim((string) ($payload['address'] ?? ''));
    $city = trim((string) ($payload['city'] ?? ''));
    $phone = trim((string) ($payload['phone'] ?? ''));
    $email = trim((string) ($payload['email'] ?? ''));
    $status = trim((string) ($payload['status'] ?? 'aktif'));
    $joinedAtRaw = trim((string) ($payload['joined_at'] ?? ''));

    if ($id <= 0 || $fullName === '') {
        return Response::json([
            'success' => false,
            'message' => 'ID dan nama lengkap anggota wajib diisi',
        ], 422);
    }

    if (!in_array($gender, ['laki-laki', 'perempuan'], true)) {
        return Response::json([
            'success' => false,
            'message' => 'Jenis kelamin wajib dipilih',
        ], 422);
    }

    if (!in_array($status, ['aktif', 'nonaktif'], true)) {
        $status = 'aktif';
    }

    $birthDate = null;
    if ($birthDateRaw !== '') {
        $birthDateObject = DateTime::createFromFormat('Y-m-d', $birthDateRaw);
        $birthDateErrors = DateTime::getLastErrors();
        if (!$birthDateObject || ($birthDateErrors['warning_count'] ?? 0) > 0 || ($birthDateErrors['error_count'] ?? 0) > 0) {
            return Response::json([
                'success' => false,
                'message' => 'Tanggal lahir tidak valid',
            ], 422);
        }
        $birthDate = $birthDateObject->format('Y-m-d');
    }

    $joinedAt = null;
    if ($joinedAtRaw !== '') {
        $joinedAtObject = DateTime::createFromFormat('Y-m-d', $joinedAtRaw);
        $joinedAtErrors = DateTime::getLastErrors();
        if ($joinedAtObject && ($joinedAtErrors['warning_count'] ?? 0) === 0 && ($joinedAtErrors['error_count'] ?? 0) === 0) {
            $joinedAt = $joinedAtObject->format('Y-m-d');
        }
    }

    if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        return Response::json([
            'success' => false,
            'message' => 'Email tidak valid',
        ], 422);
    }

    try {
        $pdo = Database::connection($context['database']);
        $existing = $getMemberById($pdo, $id);
        if (!$existing) {
            return Response::json([
                'success' => false,
                'message' => 'Anggota tidak ditemukan',
            ], 404);
        }

        if ($nik !== '') {
            $nikStatement = $pdo->prepare('SELECT id FROM members WHERE nik = :nik AND id <> :id LIMIT 1');
            $nikStatement->execute([
                'nik' => $nik,
                'id' => $id,
            ]);
            if ($nikStatement->fetch(PDO::FETCH_ASSOC)) {
                return Response::json([
                    'success' => false,
                    'message' => 'NIK sudah digunakan anggota lain',
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
            'full_name' => $fullName,
            'nik' => $nik !== '' ? $nik : null,
            'birth_date' => $birthDate,
            'gender' => $gender,
            'address' => $address !== '' ? $address : null,
            'city' => $city !== '' ? $city : null,
            'phone' => $phone !== '' ? $phone : null,
            'email' => $email !== '' ? $email : null,
            'status' => $status,
            'joined_at' => $joinedAt ?? $existing['joined_at'],
            'updated_by' => $identity['user_id'],
        ]);

        $updated = $getMemberById($pdo, $id);

        return Response::json([
            'success' => true,
            'message' => 'Anggota berhasil diperbarui',
            'data' => $updated ? $formatMember($updated) : null,
        ]);
    } catch (Throwable $throwable) {
        return Response::json([
            'success' => false,
            'message' => 'Gagal memperbarui anggota',
            'error' => $throwable->getMessage(),
        ], 500);
    }
});

$router->delete('/api/members', function (App\Http\Request $request, array $context) use ($requireAdmin) {
    $identity = $requireAdmin($request, $context);
    if (is_array($identity) && array_key_exists('status', $identity)) {
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
            'UPDATE members
             SET status = :status,
                 updated_by = :updated_by,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = :id'
        );
        $statement->execute([
            'id' => $id,
            'status' => 'nonaktif',
            'updated_by' => $identity['user_id'],
        ]);

        if ($statement->rowCount() === 0) {
            return Response::json([
                'success' => false,
                'message' => 'Anggota tidak ditemukan',
            ], 404);
        }

        return Response::json([
            'success' => true,
            'message' => 'Anggota berhasil dinonaktifkan',
        ]);
    } catch (Throwable $throwable) {
        return Response::json([
            'success' => false,
            'message' => 'Gagal menonaktifkan anggota',
            'error' => $throwable->getMessage(),
        ], 500);
    }
});

$router->post('/api/books', function (App\Http\Request $request, array $context) use ($requireAdmin, $getNextBookCode, $getBookById, $formatBook) {
    $identity = $requireAdmin($request, $context);
    if (is_array($identity) && array_key_exists('status', $identity)) {
        return $identity;
    }

    $payload = $request->json();
    $categoryId = (int) ($payload['category_id'] ?? 0);
    $title = trim((string) ($payload['title'] ?? ''));
    $author = trim((string) ($payload['author'] ?? ''));
    $publisher = trim((string) ($payload['publisher'] ?? ''));
    $publicationYearRaw = trim((string) ($payload['publication_year'] ?? ''));
    $isbn = trim((string) ($payload['isbn'] ?? ''));
    $edition = trim((string) ($payload['edition'] ?? ''));
    $language = trim((string) ($payload['language'] ?? ''));
    $shelfLocation = trim((string) ($payload['shelf_location'] ?? ''));
    $description = trim((string) ($payload['description'] ?? ''));
    $stockTotal = (int) ($payload['stock_total'] ?? 0);
    $stockAvailable = $payload['stock_available'] === null || $payload['stock_available'] === ''
        ? $stockTotal
        : (int) $payload['stock_available'];
    $status = trim((string) ($payload['status'] ?? 'aktif'));

    if ($categoryId <= 0 || $title === '' || $author === '' || $publisher === '') {
        return Response::json([
            'success' => false,
            'message' => 'Kategori, judul, penulis, dan penerbit wajib diisi',
        ], 422);
    }

    if ($stockTotal < 0) {
        return Response::json([
            'success' => false,
            'message' => 'Stok total tidak valid',
        ], 422);
    }

    if ($stockAvailable < 0) {
        $stockAvailable = 0;
    }

    if ($stockAvailable > $stockTotal) {
        $stockAvailable = $stockTotal;
    }

    if (!in_array($status, ['aktif', 'nonaktif'], true)) {
        $status = 'aktif';
    }

    $publicationYear = $publicationYearRaw !== '' ? (int) $publicationYearRaw : null;

    try {
        $pdo = Database::connection($context['database']);
        $categoryStatement = $pdo->prepare('SELECT id, status FROM categories WHERE id = :id LIMIT 1');
        $categoryStatement->execute(['id' => $categoryId]);
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

        $code = $getNextBookCode($pdo);
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
            'category_id' => $categoryId,
            'title' => $title,
            'author' => $author,
            'publisher' => $publisher,
            'publication_year' => $publicationYear,
            'isbn' => $isbn !== '' ? $isbn : null,
            'edition' => $edition !== '' ? $edition : null,
            'language' => $language !== '' ? $language : null,
            'shelf_location' => $shelfLocation !== '' ? $shelfLocation : null,
            'description' => $description !== '' ? $description : null,
            'stock_total' => $stockTotal,
            'stock_available' => $stockAvailable,
            'status' => $status,
            'created_by' => $identity['user_id'],
            'updated_by' => $identity['user_id'],
        ]);

        $created = $getBookById($pdo, (int) $pdo->lastInsertId());

        return Response::json([
            'success' => true,
            'message' => 'Buku berhasil ditambahkan',
            'data' => $created ? $formatBook($created) : null,
        ], 201);
    } catch (Throwable $throwable) {
        return Response::json([
            'success' => false,
            'message' => 'Gagal menambahkan buku',
            'error' => $throwable->getMessage(),
        ], 500);
    }
});

$router->put('/api/books', function (App\Http\Request $request, array $context) use ($requireAdmin, $getBookById, $formatBook) {
    $identity = $requireAdmin($request, $context);
    if (is_array($identity) && array_key_exists('status', $identity)) {
        return $identity;
    }

    $payload = $request->json();
    $id = (int) ($payload['id'] ?? 0);
    $categoryId = (int) ($payload['category_id'] ?? 0);
    $title = trim((string) ($payload['title'] ?? ''));
    $author = trim((string) ($payload['author'] ?? ''));
    $publisher = trim((string) ($payload['publisher'] ?? ''));
    $publicationYearRaw = trim((string) ($payload['publication_year'] ?? ''));
    $isbn = trim((string) ($payload['isbn'] ?? ''));
    $edition = trim((string) ($payload['edition'] ?? ''));
    $language = trim((string) ($payload['language'] ?? ''));
    $shelfLocation = trim((string) ($payload['shelf_location'] ?? ''));
    $description = trim((string) ($payload['description'] ?? ''));
    $stockTotal = (int) ($payload['stock_total'] ?? 0);
    $stockAvailable = $payload['stock_available'] === null || $payload['stock_available'] === ''
        ? $stockTotal
        : (int) $payload['stock_available'];
    $status = trim((string) ($payload['status'] ?? 'aktif'));

    if ($id <= 0 || $categoryId <= 0 || $title === '' || $author === '' || $publisher === '') {
        return Response::json([
            'success' => false,
            'message' => 'ID, kategori, judul, penulis, dan penerbit wajib diisi',
        ], 422);
    }

    if ($stockTotal < 0) {
        return Response::json([
            'success' => false,
            'message' => 'Stok total tidak valid',
        ], 422);
    }

    if ($stockAvailable < 0) {
        $stockAvailable = 0;
    }

    if ($stockAvailable > $stockTotal) {
        $stockAvailable = $stockTotal;
    }

    if (!in_array($status, ['aktif', 'nonaktif'], true)) {
        $status = 'aktif';
    }

    $publicationYear = $publicationYearRaw !== '' ? (int) $publicationYearRaw : null;

    try {
        $pdo = Database::connection($context['database']);
        $categoryStatement = $pdo->prepare('SELECT id, status FROM categories WHERE id = :id LIMIT 1');
        $categoryStatement->execute(['id' => $categoryId]);
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
            'category_id' => $categoryId,
            'title' => $title,
            'author' => $author,
            'publisher' => $publisher,
            'publication_year' => $publicationYear,
            'isbn' => $isbn !== '' ? $isbn : null,
            'edition' => $edition !== '' ? $edition : null,
            'language' => $language !== '' ? $language : null,
            'shelf_location' => $shelfLocation !== '' ? $shelfLocation : null,
            'description' => $description !== '' ? $description : null,
            'stock_total' => $stockTotal,
            'stock_available' => $stockAvailable,
            'status' => $status,
            'updated_by' => $identity['user_id'],
        ]);

        $updated = $getBookById($pdo, $id);

        if (!$updated) {
            return Response::json([
                'success' => false,
                'message' => 'Buku tidak ditemukan',
            ], 404);
        }

        return Response::json([
            'success' => true,
            'message' => 'Buku berhasil diperbarui',
            'data' => $formatBook($updated),
        ]);
    } catch (Throwable $throwable) {
        return Response::json([
            'success' => false,
            'message' => 'Gagal memperbarui buku',
            'error' => $throwable->getMessage(),
        ], 500);
    }
});

$router->delete('/api/books', function (App\Http\Request $request, array $context) use ($requireAdmin) {
    $identity = $requireAdmin($request, $context);
    if (is_array($identity) && array_key_exists('status', $identity)) {
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
            'UPDATE books
             SET status = :status,
                 updated_by = :updated_by,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = :id'
        );
        $statement->execute([
            'id' => $id,
            'status' => 'nonaktif',
            'updated_by' => $identity['user_id'],
        ]);

        if ($statement->rowCount() === 0) {
            return Response::json([
                'success' => false,
                'message' => 'Buku tidak ditemukan',
            ], 404);
        }

        return Response::json([
            'success' => true,
            'message' => 'Buku berhasil dinonaktifkan',
        ]);
    } catch (Throwable $throwable) {
        return Response::json([
            'success' => false,
            'message' => 'Gagal menghapus buku',
            'error' => $throwable->getMessage(),
        ], 500);
    }
});

$router->post('/api/categories', function (App\Http\Request $request, array $context) use ($requireAdmin, $getNextCategoryCode, $getCategoryById, $formatCategory) {
    $identity = $requireAdmin($request, $context);
    if (is_array($identity) && array_key_exists('status', $identity)) {
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
        $code = $getNextCategoryCode($pdo);
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

        $created = $getCategoryById($pdo, (int) $pdo->lastInsertId());

        return Response::json([
            'success' => true,
            'message' => 'Kategori berhasil ditambahkan',
            'data' => $created ? $formatCategory($created) : null,
        ], 201);
    } catch (Throwable $throwable) {
        return Response::json([
            'success' => false,
            'message' => 'Gagal menambahkan kategori',
            'error' => $throwable->getMessage(),
        ], 500);
    }
});

$router->put('/api/categories', function (App\Http\Request $request, array $context) use ($requireAdmin, $getCategoryById, $formatCategory) {
    $identity = $requireAdmin($request, $context);
    if (is_array($identity) && array_key_exists('status', $identity)) {
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

        $updated = $getCategoryById($pdo, $id);

        if (!$updated) {
            return Response::json([
                'success' => false,
                'message' => 'Kategori tidak ditemukan',
            ], 404);
        }

        return Response::json([
            'success' => true,
            'message' => 'Kategori berhasil diperbarui',
            'data' => $formatCategory($updated),
        ]);
    } catch (Throwable $throwable) {
        return Response::json([
            'success' => false,
            'message' => 'Gagal memperbarui kategori',
            'error' => $throwable->getMessage(),
        ], 500);
    }
});

$router->delete('/api/categories', function (App\Http\Request $request, array $context) use ($requireAdmin) {
    $identity = $requireAdmin($request, $context);
    if (is_array($identity) && array_key_exists('status', $identity)) {
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
            'UPDATE categories
             SET status = :status,
                 updated_by = :updated_by,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = :id'
        );
        $statement->execute([
            'id' => $id,
            'status' => 'nonaktif',
            'updated_by' => $identity['user_id'],
        ]);

        if ($statement->rowCount() === 0) {
            return Response::json([
                'success' => false,
                'message' => 'Kategori tidak ditemukan',
            ], 404);
        }

        return Response::json([
            'success' => true,
            'message' => 'Kategori berhasil dinonaktifkan',
        ]);
    } catch (Throwable $throwable) {
        return Response::json([
            'success' => false,
            'message' => 'Gagal menghapus kategori',
            'error' => $throwable->getMessage(),
        ], 500);
    }
});

$router->post('/api/auth/login', function (App\Http\Request $request, array $context) {
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
});

$router->get('/api', function (App\Http\Request $request, array $context) {
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
});
