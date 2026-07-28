<?php

declare(strict_types=1);

namespace App\Support;

final class BookValidation
{
    private const STATUS_VALUES = ['aktif', 'nonaktif'];

    public static function normalizeISBN(string $isbn): string
    {
        $normalized = preg_replace('/[\s-]+/', '', trim($isbn));

        return strtoupper((string) $normalized);
    }

    public static function isValidISBN10(string $isbn): bool
    {
        if (!preg_match('/^\d{9}[\dX]$/', $isbn)) {
            return false;
        }

        $sum = 0;
        for ($index = 0; $index < 9; $index++) {
            $sum += ((int) $isbn[$index]) * (10 - $index);
        }

        $checkDigit = $isbn[9] === 'X' ? 10 : (int) $isbn[9];

        return (($sum + $checkDigit) % 11) === 0;
    }

    public static function isValidISBN13(string $isbn): bool
    {
        if (!preg_match('/^\d{13}$/', $isbn)) {
            return false;
        }

        $sum = 0;
        for ($index = 0; $index < 12; $index++) {
            $sum += ((int) $isbn[$index]) * ($index % 2 === 0 ? 1 : 3);
        }

        $checkDigit = (10 - ($sum % 10)) % 10;

        return $checkDigit === (int) $isbn[12];
    }

    public static function isValidISBN(string $isbn): bool
    {
        $normalized = self::normalizeISBN($isbn);

        return self::isValidISBN10($normalized) || self::isValidISBN13($normalized);
    }

    public static function validatePublicationYear(mixed $value): array
    {
        $currentYear = (int) date('Y');
        $publicationYear = self::parseIntegerField($value);

        if ($publicationYear === null) {
            return [
                'valid' => false,
                'value' => null,
                'error' => 'Tahun terbit harus berupa angka.',
            ];
        }

        if ($publicationYear < 1900) {
            return [
                'valid' => false,
                'value' => $publicationYear,
                'error' => 'Tahun terbit tidak boleh kurang dari 1900.',
            ];
        }

        if ($publicationYear > $currentYear) {
            return [
                'valid' => false,
                'value' => $publicationYear,
                'error' => 'Tahun terbit tidak boleh melebihi tahun saat ini.',
            ];
        }

        return [
            'valid' => true,
            'value' => $publicationYear,
            'error' => '',
        ];
    }

    public static function validateStock(mixed $stockTotalValue, mixed $stockAvailableValue): array
    {
        $stockTotal = self::parseIntegerField($stockTotalValue);
        $stockAvailable = self::parseIntegerField($stockAvailableValue);
        $errors = [];

        if ($stockTotal === null) {
            $errors['stock_total'] = 'Stok total harus berupa angka bulat.';
        } elseif ($stockTotal < 0) {
            $errors['stock_total'] = 'Stok total tidak boleh negatif.';
        }

        if ($stockAvailable === null) {
            $errors['stock_available'] = 'Stok tersedia harus berupa angka bulat.';
        } elseif ($stockAvailable < 0) {
            $errors['stock_available'] = 'Stok tersedia tidak boleh negatif.';
        }

        if (
            $stockTotal !== null &&
            $stockTotal >= 0 &&
            $stockAvailable !== null &&
            $stockAvailable >= 0 &&
            $stockAvailable > $stockTotal
        ) {
            $errors['stock_available'] = 'Stok tersedia tidak boleh melebihi stok total.';
        }

        return [
            'valid' => empty($errors),
            'stock_total' => $stockTotal,
            'stock_available' => $stockAvailable,
            'errors' => $errors,
        ];
    }

    public static function validateBookData(array $payload): array
    {
        $errors = [];

        $categoryId = self::parseIntegerField($payload['category_id'] ?? null);
        if ($categoryId === null || $categoryId <= 0) {
            $errors['category_id'] = 'Kategori wajib dipilih.';
        }

        $title = trim((string) ($payload['title'] ?? ''));
        if ($title === '') {
            $errors['title'] = 'Judul buku wajib diisi.';
        } elseif (self::length($title) < 3) {
            $errors['title'] = 'Judul minimal 3 karakter.';
        } elseif (self::length($title) > 255) {
            $errors['title'] = 'Judul maksimal 255 karakter.';
        }

        $author = trim((string) ($payload['author'] ?? ''));
        if ($author === '') {
            $errors['author'] = 'Penulis wajib diisi.';
        } elseif (self::length($author) > 150) {
            $errors['author'] = 'Penulis maksimal 150 karakter.';
        }

        $publisher = trim((string) ($payload['publisher'] ?? ''));
        if ($publisher === '') {
            $errors['publisher'] = 'Penerbit wajib diisi.';
        } elseif (self::length($publisher) > 150) {
            $errors['publisher'] = 'Penerbit maksimal 150 karakter.';
        }

        $publicationYearState = self::validatePublicationYear($payload['publication_year'] ?? null);
        if (!$publicationYearState['valid']) {
            $errors['publication_year'] = (string) $publicationYearState['error'];
        }

        $isbn = self::normalizeISBN((string) ($payload['isbn'] ?? ''));
        if ($isbn === '') {
            $errors['isbn'] = 'ISBN wajib diisi.';
        } elseif (!self::isValidISBN($isbn)) {
            $errors['isbn'] = 'ISBN harus berupa ISBN-10 atau ISBN-13 yang valid.';
        }

        $edition = trim((string) ($payload['edition'] ?? ''));
        if ($edition !== '' && self::length($edition) > 30) {
            $errors['edition'] = 'Edisi maksimal 30 karakter.';
        }

        $language = trim((string) ($payload['language'] ?? ''));
        if ($language === '') {
            $errors['language'] = 'Bahasa wajib diisi.';
        } elseif (self::length($language) > 50) {
            $errors['language'] = 'Bahasa maksimal 50 karakter.';
        }

        $shelfLocation = trim((string) ($payload['shelf_location'] ?? ''));
        if ($shelfLocation === '') {
            $errors['shelf_location'] = 'Lokasi rak wajib diisi.';
        } elseif (self::length($shelfLocation) > 20) {
            $errors['shelf_location'] = 'Lokasi rak maksimal 20 karakter.';
        }

        $status = trim((string) ($payload['status'] ?? ''));
        if (!in_array($status, self::STATUS_VALUES, true)) {
            $errors['status'] = 'Status buku tidak valid.';
        }

        $stockState = self::validateStock($payload['stock_total'] ?? null, $payload['stock_available'] ?? null);
        $errors = array_merge($errors, $stockState['errors']);

        $description = trim((string) ($payload['description'] ?? ''));
        if ($description !== '' && self::length($description) > 1000) {
            $errors['description'] = 'Deskripsi maksimal 1000 karakter.';
        }

        return [
            'valid' => empty($errors),
            'errors' => $errors,
            'data' => [
                'category_id' => $categoryId ?? 0,
                'title' => $title,
                'author' => $author,
                'publisher' => $publisher,
                'publication_year' => $publicationYearState['value'],
                'isbn' => $isbn !== '' ? $isbn : null,
                'edition' => $edition !== '' ? $edition : null,
                'language' => $language,
                'shelf_location' => $shelfLocation,
                'description' => $description !== '' ? $description : null,
                'stock_total' => $stockState['stock_total'] ?? 0,
                'stock_available' => $stockState['stock_available'] ?? 0,
                'status' => $status,
            ],
        ];
    }

    public static function firstError(array $errors): string
    {
        foreach ($errors as $error) {
            if (is_string($error) && $error !== '') {
                return $error;
            }
        }

        return 'Data buku tidak valid.';
    }

    private static function parseIntegerField(mixed $value): ?int
    {
        if (is_int($value)) {
            return $value;
        }

        if (is_float($value)) {
            return floor($value) === $value ? (int) $value : null;
        }

        if (!is_string($value)) {
            return null;
        }

        $trimmed = trim($value);
        if ($trimmed === '' || !preg_match('/^-?\d+$/', $trimmed)) {
            return null;
        }

        return (int) $trimmed;
    }

    private static function length(string $value): int
    {
        return function_exists('mb_strlen') ? (int) mb_strlen($value) : strlen($value);
    }
}
