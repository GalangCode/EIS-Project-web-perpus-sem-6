<?php

declare(strict_types=1);

namespace App\Support;

final class MemberValidation
{
    private const GENDER_VALUES = ['Laki-laki', 'Perempuan'];
    private const STATUS_VALUES = ['Aktif', 'Nonaktif'];

    public static function sanitizeInput(mixed $value): string
    {
        $text = trim((string) $value);

        return preg_replace('/\s+/u', ' ', $text) ?? $text;
    }

    public static function generateMemberCode(\PDO $pdo): string
    {
        $statement = $pdo->query("SELECT COALESCE(MAX(CAST(SUBSTRING(member_code, 5) AS UNSIGNED)), 0) AS max_number FROM members WHERE member_code LIKE 'ANG-%'");
        $row = $statement ? $statement->fetch(\PDO::FETCH_ASSOC) : null;
        $next = (int) ($row['max_number'] ?? 0) + 1;

        return sprintf('ANG-%03d', $next);
    }

    public static function calculateAge(string $birthDate, ?\DateTimeInterface $referenceDate = null): ?int
    {
        $date = self::parseBirthDateValue($birthDate);
        if (!$date) {
            return null;
        }

        $errors = \DateTimeImmutable::getLastErrors();
        if (is_array($errors) && (($errors['warning_count'] ?? 0) > 0 || ($errors['error_count'] ?? 0) > 0)) {
            return null;
        }

        $reference = $referenceDate ? \DateTimeImmutable::createFromInterface($referenceDate) : new \DateTimeImmutable('today');
        $age = (int) $reference->format('Y') - (int) $date->format('Y');
        if ($reference->format('md') < $date->format('md')) {
            $age--;
        }

        return $age;
    }

    private static function parseBirthDateValue(mixed $value): ?\DateTimeImmutable
    {
        $birthDateText = self::sanitizeInput($value);
        if ($birthDateText === '') {
            return null;
        }

        $date = null;
        if (preg_match('/^\d{2}-\d{2}-\d{4}$/', $birthDateText)) {
            $date = \DateTimeImmutable::createFromFormat('!d-m-Y', $birthDateText);
        } elseif (preg_match('/^\d{4}-\d{2}-\d{2}$/', $birthDateText)) {
            $date = \DateTimeImmutable::createFromFormat('!Y-m-d', $birthDateText);
        }

        if (!$date) {
            return null;
        }

        $errors = \DateTimeImmutable::getLastErrors();
        if (is_array($errors) && (($errors['warning_count'] ?? 0) > 0 || ($errors['error_count'] ?? 0) > 0)) {
            return null;
        }

        return $date;
    }

    public static function validateNIK(mixed $value): array
    {
        $nik = trim((string) $value);
        if ($nik === '') {
            return ['valid' => false, 'value' => $nik, 'error' => 'NIK wajib diisi.'];
        }

        if (!preg_match('/^\d+$/', $nik)) {
            return ['valid' => false, 'value' => $nik, 'error' => 'NIK hanya boleh berisi angka.'];
        }

        if (strlen($nik) !== 16) {
            return ['valid' => false, 'value' => $nik, 'error' => 'NIK harus terdiri dari tepat 16 digit.'];
        }

        return ['valid' => true, 'value' => $nik, 'error' => ''];
    }

    public static function validatePhone(mixed $value): array
    {
        $phone = trim((string) $value);
        if ($phone === '') {
            return ['valid' => false, 'value' => $phone, 'error' => 'Nomor telepon wajib diisi.'];
        }

        if (!preg_match('/^\d+$/', $phone)) {
            return ['valid' => false, 'value' => $phone, 'error' => 'Nomor telepon hanya boleh berisi angka.'];
        }

        if (!preg_match('/^(?:08\d{8,13}|628\d{7,12})$/', $phone)) {
            return ['valid' => false, 'value' => $phone, 'error' => 'Nomor telepon tidak valid.'];
        }

        return ['valid' => true, 'value' => $phone, 'error' => ''];
    }

    public static function normalizeGenderValue(mixed $value): string
    {
        $normalized = strtolower(self::sanitizeInput($value));

        return match ($normalized) {
            'laki-laki', 'laki laki', 'laki' => 'Laki-laki',
            'perempuan', 'wanita' => 'Perempuan',
            default => '',
        };
    }

    public static function normalizeStatusValue(mixed $value): string
    {
        $normalized = strtolower(self::sanitizeInput($value));

        return match ($normalized) {
            'aktif' => 'Aktif',
            'nonaktif', 'non aktif' => 'Nonaktif',
            default => '',
        };
    }

    public static function validateBirthDate(mixed $value): array
    {
        $birthDate = self::parseBirthDateValue($value);
        if (!$birthDate) {
            return ['valid' => false, 'value' => '', 'error' => 'Tanggal lahir wajib diisi.'];
        }

        $today = new \DateTimeImmutable('today');
        if ($birthDate > $today) {
            return ['valid' => false, 'value' => $birthDate->format('Y-m-d'), 'error' => 'Tanggal lahir tidak boleh di masa depan.'];
        }

        $age = self::calculateAge($birthDate->format('Y-m-d'), $today);
        if ($age === null) {
            return ['valid' => false, 'value' => '', 'error' => 'Tanggal lahir tidak valid.'];
        }

        if ($age < 5) {
            return ['valid' => false, 'value' => $birthDate->format('Y-m-d'), 'error' => 'Umur minimal 5 tahun.'];
        }

        if ($age > 120) {
            return ['valid' => false, 'value' => $birthDate->format('Y-m-d'), 'error' => 'Umur maksimal 120 tahun.'];
        }

        return ['valid' => true, 'value' => $birthDate->format('Y-m-d'), 'error' => '', 'age' => $age];
    }

    private static function validateName(mixed $value): array
    {
        $fullName = self::sanitizeInput($value);
        if ($fullName === '') {
            return ['valid' => false, 'value' => $fullName, 'error' => 'Nama lengkap wajib diisi.'];
        }

        if (!preg_match("/^(?=.*\\p{L})[\\p{L}\\s.'-]+$/u", $fullName)) {
            return ['valid' => false, 'value' => $fullName, 'error' => 'Nama hanya boleh berisi huruf.'];
        }

        $length = self::length($fullName);
        if ($length < 3) {
            return ['valid' => false, 'value' => $fullName, 'error' => 'Nama minimal 3 karakter.'];
        }

        if ($length > 100) {
            return ['valid' => false, 'value' => $fullName, 'error' => 'Nama maksimal 100 karakter.'];
        }

        if (preg_match('/^\d+$/', $fullName)) {
            return ['valid' => false, 'value' => $fullName, 'error' => 'Nama hanya boleh berisi huruf.'];
        }

        return ['valid' => true, 'value' => $fullName, 'error' => ''];
    }

    private static function validateAddress(mixed $value): array
    {
        $address = self::sanitizeInput($value);
        if ($address === '') {
            return ['valid' => false, 'value' => $address, 'error' => 'Alamat wajib diisi.'];
        }

        $length = self::length($address);
        if ($length < 10) {
            return ['valid' => false, 'value' => $address, 'error' => 'Alamat minimal 10 karakter.'];
        }

        if ($length > 255) {
            return ['valid' => false, 'value' => $address, 'error' => 'Alamat maksimal 255 karakter.'];
        }

        return ['valid' => true, 'value' => $address, 'error' => ''];
    }

    private static function validateCity(mixed $value): array
    {
        $city = self::sanitizeInput($value);
        if ($city !== '' && self::length($city) > 100) {
            return ['valid' => false, 'value' => $city, 'error' => 'Kota maksimal 100 karakter.'];
        }

        return ['valid' => true, 'value' => $city, 'error' => ''];
    }

    private static function validateEmail(mixed $value): array
    {
        $email = self::sanitizeInput($value);
        if ($email === '') {
            return ['valid' => true, 'value' => '', 'error' => ''];
        }

        if (self::length($email) > 150) {
            return ['valid' => false, 'value' => $email, 'error' => 'Email maksimal 150 karakter.'];
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return ['valid' => false, 'value' => $email, 'error' => 'Email tidak valid.'];
        }

        return ['valid' => true, 'value' => $email, 'error' => ''];
    }

    private static function validateStatus(mixed $value): array
    {
        $status = self::normalizeStatusValue($value);
        if ($status === '' || !in_array($status, self::STATUS_VALUES, true)) {
            return ['valid' => false, 'value' => $status, 'error' => 'Status wajib dipilih.'];
        }

        return ['valid' => true, 'value' => $status, 'error' => ''];
    }

    private static function validateGender(mixed $value): array
    {
        $gender = self::normalizeGenderValue($value);
        if ($gender === '' || !in_array($gender, self::GENDER_VALUES, true)) {
            return ['valid' => false, 'value' => '', 'error' => 'Jenis kelamin wajib dipilih.'];
        }

        return ['valid' => true, 'value' => $gender, 'error' => ''];
    }

    public static function validateMemberData(array $payload): array
    {
        $errors = [];

        $fullNameState = self::validateName($payload['full_name'] ?? null);
        if (!$fullNameState['valid']) {
            $errors['full_name'] = (string) $fullNameState['error'];
        }

        $nikState = self::validateNIK($payload['nik'] ?? null);
        if (!$nikState['valid']) {
            $errors['nik'] = (string) $nikState['error'];
        }

        $birthDateState = self::validateBirthDate($payload['birth_date'] ?? null);
        if (!$birthDateState['valid']) {
            $errors['birth_date'] = (string) $birthDateState['error'];
        }

        $genderState = self::validateGender($payload['gender'] ?? null);
        if (!$genderState['valid']) {
            $errors['gender'] = (string) $genderState['error'];
        }

        $phoneState = self::validatePhone($payload['phone'] ?? null);
        if (!$phoneState['valid']) {
            $errors['phone'] = (string) $phoneState['error'];
        }

        $addressState = self::validateAddress($payload['address'] ?? null);
        if (!$addressState['valid']) {
            $errors['address'] = (string) $addressState['error'];
        }

        $statusState = self::validateStatus($payload['status'] ?? null);
        if (!$statusState['valid']) {
            $errors['status'] = (string) $statusState['error'];
        }

        $cityState = self::validateCity($payload['city'] ?? null);
        if (!$cityState['valid']) {
            $errors['city'] = (string) $cityState['error'];
        }

        $emailState = self::validateEmail($payload['email'] ?? null);
        if (!$emailState['valid']) {
            $errors['email'] = (string) $emailState['error'];
        }

        return [
            'valid' => empty($errors),
            'errors' => $errors,
            'data' => [
                'full_name' => $fullNameState['value'],
                'nik' => $nikState['value'] !== '' ? $nikState['value'] : null,
                'birth_date' => $birthDateState['value'] !== '' ? $birthDateState['value'] : null,
                'gender' => $genderState['value'],
                'address' => $addressState['value'] !== '' ? $addressState['value'] : null,
                'city' => $cityState['value'] !== '' ? $cityState['value'] : null,
                'phone' => $phoneState['value'] !== '' ? $phoneState['value'] : null,
                'email' => $emailState['value'] !== '' ? $emailState['value'] : null,
                'status' => $statusState['value'],
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

        return 'Data anggota tidak valid.';
    }

    private static function length(string $value): int
    {
        return function_exists('mb_strlen') ? (int) mb_strlen($value) : strlen($value);
    }
}
