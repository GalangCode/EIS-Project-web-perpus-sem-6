<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Http\Request;
use App\Http\Response;
use App\Support\Database;
use PDO;
use Throwable;

final class SettingController extends BaseController
{
    private array $appSettingsCatalog = [
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

    public function get(Request $request, array $context): array
    {
        $identity = $this->requireExecutive($request, $context);
        if ($this->isErrorResponse($identity)) {
            return $identity;
        }

        try {
            $pdo = Database::connection($context['database']);
            $items = $this->getAppSettings($pdo);

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
    }

    public function put(Request $request, array $context): array
    {
        $identity = $this->requireExecutive($request, $context);
        if ($this->isErrorResponse($identity)) {
            return $identity;
        }

        $payload = $request->json();
        $incoming = isset($payload['settings']) && is_array($payload['settings']) ? $payload['settings'] : $payload;

        $updates = [];
        foreach (array_keys($this->appSettingsCatalog) as $key) {
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
                $meta = $this->appSettingsCatalog[$key] ?? null;
                if ($meta === null) {
                    continue;
                }

                $this->upsertAppSetting($pdo, $key, $value, $meta, (int) ($identity['user_id'] ?? 0));
            }

            $pdo->commit();
            $items = $this->getAppSettings($pdo);

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
    }

    public function getAppSettings(PDO $pdo): array
    {
        $keys = array_keys($this->appSettingsCatalog);
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
        foreach ($this->appSettingsCatalog as $key => $meta) {
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
    }

    public function upsertAppSetting(PDO $pdo, string $key, string $value, array $meta, int $updatedBy): void
    {
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
    }

    public static function getSettingValue(PDO $pdo, string $key, string $default = ''): string
    {
        $statement = $pdo->prepare('SELECT setting_value FROM app_settings WHERE setting_key = :setting_key LIMIT 1');
        $statement->execute(['setting_key' => $key]);
        $row = $statement->fetch(PDO::FETCH_ASSOC);

        return $row && array_key_exists('setting_value', $row) ? (string) $row['setting_value'] : $default;
    }

    public static function getLoanFinePerDay(PDO $pdo): int
    {
        $value = (int) self::getSettingValue($pdo, 'fine_per_day', '1000');
        return max(0, $value);
    }

    public static function getLoanGraceDays(PDO $pdo): int
    {
        $value = (int) self::getSettingValue($pdo, 'loan_days', '7');
        return max(0, $value);
    }
}
