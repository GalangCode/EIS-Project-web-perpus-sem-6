# Database Schema Relasional - EIS Balangan

Status: draft relasional final
Tanggal: 2026-07-22

Tujuan:

- menyimpan seluruh data yang saat ini masih hardcoded di frontend
- mendukung login berbasis role
- mendukung master data, transaksi, relasi, audit, dan konfigurasi aplikasi
- menjaga struktur UI tetap sama saat sumber data berpindah ke backend

## Prinsip Desain

- Gunakan tabel master untuk data referensi yang jarang berubah.
- Gunakan tabel transaksi untuk data operasional yang selalu bertambah.
- Simpan relasi many-to-many di tabel penghubung.
- Simpan jejak perubahan di tabel audit.
- Simpan akun dan otorisasi di tabel user/role.
- Semua tabel utama memakai `id` bigint unsigned auto increment sebagai primary key.
- Semua tabel penting memakai `created_at` dan `updated_at`.
- Gunakan `status` konsisten dengan UI agar filtering lebih sederhana.

## Ringkasan Entitas

### Tabel master

- `roles`
- `categories`
- `books`
- `members`
- `app_settings`

### Tabel transaksi

- `loans`
- `loan_items`

### Tabel user / role

- `users`

### Tabel audit

- `audit_logs`

## Skema Tabel

### `roles`

Fungsi: menyimpan jenis akses sistem.

Kolom:

- `id` bigint unsigned PK
- `code` varchar(32) unique, wajib
- `name` varchar(100), wajib
- `description` varchar(255) nullable
- `status` enum(`aktif`, `nonaktif`) default `aktif`, wajib
- `created_at` timestamp, wajib
- `updated_at` timestamp, wajib

Aturan:

- `code` minimal unik untuk `admin`, `kepala`, dan role lain jika nanti diperlukan.

### `users`

Fungsi: menyimpan akun login admin dan kepala perpustakaan.

Kolom:

- `id` bigint unsigned PK
- `role_id` bigint unsigned FK -> `roles.id`, wajib
- `username` varchar(64) unique, wajib
- `email` varchar(150) unique, wajib
- `password_hash` varchar(255), wajib
- `full_name` varchar(150), wajib
- `phone` varchar(30) nullable
- `unit` varchar(150) nullable
- `nip` varchar(30) nullable
- `avatar_path` varchar(255) nullable
- `status` enum(`aktif`, `nonaktif`) default `aktif`, wajib
- `last_login_at` datetime nullable
- `created_at` timestamp, wajib
- `updated_at` timestamp, wajib

Aturan:

- password hanya disimpan dalam bentuk hash.
- akun nonaktif tidak boleh login.
- `nip` boleh kosong untuk akun yang tidak memilikinya.

### `categories`

Fungsi: menyimpan kategori buku.

Kolom:

- `id` bigint unsigned PK
- `code` varchar(32) unique, wajib
- `name` varchar(120), wajib
- `description` text nullable
- `status` enum(`aktif`, `nonaktif`) default `aktif`, wajib
- `created_by` bigint unsigned FK -> `users.id` nullable
- `updated_by` bigint unsigned FK -> `users.id` nullable
- `created_at` timestamp, wajib
- `updated_at` timestamp, wajib

Aturan:

- kategori nonaktif tidak boleh dipakai untuk buku baru.

### `books`

Fungsi: menyimpan master katalog buku.

Kolom:

- `id` bigint unsigned PK
- `code` varchar(32) unique, wajib
- `category_id` bigint unsigned FK -> `categories.id`, wajib
- `title` varchar(200), wajib
- `author` varchar(150), wajib
- `publisher` varchar(150), wajib
- `publication_year` smallint nullable
- `isbn` varchar(32) unique nullable
- `edition` varchar(50) nullable
- `language` varchar(50) nullable
- `shelf_location` varchar(100) nullable
- `description` text nullable
- `stock_total` int unsigned default 0, wajib
- `stock_available` int unsigned default 0, wajib
- `status` enum(`aktif`, `nonaktif`) default `aktif`, wajib
- `created_by` bigint unsigned FK -> `users.id` nullable
- `updated_by` bigint unsigned FK -> `users.id` nullable
- `created_at` timestamp, wajib
- `updated_at` timestamp, wajib

Aturan:

- `stock_available` tidak boleh lebih besar dari `stock_total`.
- `stock_available` akan berkurang saat dipinjam dan bertambah saat dikembalikan.
- buku nonaktif tetap disimpan untuk histori.

### `members`

Fungsi: menyimpan data anggota perpustakaan.

Kolom:

- `id` bigint unsigned PK
- `member_code` varchar(32) unique, wajib
- `full_name` varchar(150), wajib
- `nik` varchar(32) unique nullable
- `birth_date` date nullable
- `gender` enum(`laki-laki`, `perempuan`) nullable
- `address` text nullable
- `city` varchar(100) nullable
- `phone` varchar(30) nullable
- `email` varchar(150) nullable
- `status` enum(`aktif`, `nonaktif`) default `aktif`, wajib
- `joined_at` date nullable
- `created_by` bigint unsigned FK -> `users.id` nullable
- `updated_by` bigint unsigned FK -> `users.id` nullable
- `created_at` timestamp, wajib
- `updated_at` timestamp, wajib

Aturan:

- `member_code` dipakai sebagai kode anggota utama di UI.
- `nik` unik jika diisi.

### `loans`

Fungsi: menyimpan header transaksi peminjaman.

Kolom:

- `id` bigint unsigned PK
- `loan_code` varchar(32) unique, wajib
- `member_id` bigint unsigned FK -> `members.id`, wajib
- `processed_by` bigint unsigned FK -> `users.id`, wajib
- `loan_date` date, wajib
- `due_date` date, wajib
- `return_date` date nullable
- `status` enum(`dipinjam`, `dikembalikan`, `terlambat`, `dibatalkan`) default `dipinjam`, wajib
- `fine_amount` decimal(12,2) default 0, wajib
- `notes` text nullable
- `created_at` timestamp, wajib
- `updated_at` timestamp, wajib

Aturan:

- `due_date` harus sama atau lebih besar dari `loan_date`.
- transaksi yang sudah selesai sebaiknya tidak dihapus.
- status transaksi harus mengikuti siklus peminjaman yang jelas.

### `loan_items`

Fungsi: menyimpan detail buku di setiap transaksi peminjaman.

Kolom:

- `id` bigint unsigned PK
- `loan_id` bigint unsigned FK -> `loans.id`, wajib
- `book_id` bigint unsigned FK -> `books.id`, wajib
- `quantity` int unsigned default 1, wajib
- `created_at` timestamp, wajib
- `updated_at` timestamp, wajib

Aturan:

- satu transaksi bisa berisi banyak buku.
- satu buku bisa muncul di banyak transaksi.
- untuk kebutuhan sekarang, `quantity` default 1 sudah cukup.

### `audit_logs`

Fungsi: menyimpan jejak aktivitas penting.

Kolom:

- `id` bigint unsigned PK
- `actor_user_id` bigint unsigned FK -> `users.id`, wajib
- `action` varchar(80), wajib
- `entity_type` varchar(80), wajib
- `entity_id` bigint unsigned nullable
- `before_data` json nullable
- `after_data` json nullable
- `ip_address` varchar(45) nullable
- `user_agent` varchar(255) nullable
- `created_at` timestamp, wajib

Aturan:

- dipakai untuk mencatat create, update, delete, login, logout, dan aksi penting lain.
- data JSON dipakai untuk memudahkan audit perubahan tanpa menambah banyak tabel.

### `app_settings`

Fungsi: menyimpan pengaturan umum sistem.

Kolom:

- `id` bigint unsigned PK
- `setting_key` varchar(100) unique, wajib
- `setting_value` text nullable
- `setting_group` varchar(80) nullable
- `description` varchar(255) nullable
- `updated_by` bigint unsigned FK -> `users.id` nullable
- `created_at` timestamp, wajib
- `updated_at` timestamp, wajib

Aturan:

- tabel ini cocok untuk konfigurasi logo, nama instansi, batas peminjaman, lama pinjam, dan parameter sistem lain.

## Relasi Utama

- `roles` 1..n `users`
- `users` 1..n `categories`
- `users` 1..n `books`
- `users` 1..n `members`
- `users` 1..n `loans`
- `users` 1..n `audit_logs`
- `categories` 1..n `books`
- `members` 1..n `loans`
- `loans` 1..n `loan_items`
- `books` 1..n `loan_items`

## Indeks dan Constraint

### Unique index

- `roles.code`
- `users.username`
- `users.email`
- `categories.code`
- `books.code`
- `books.isbn` jika terisi
- `members.member_code`
- `members.nik` jika terisi
- `loans.loan_code`
- `app_settings.setting_key`

### Index biasa

- `users.role_id`
- `users.status`
- `categories.status`
- `books.category_id`
- `books.title`
- `books.status`
- `members.status`
- `loans.member_id`
- `loans.processed_by`
- `loans.loan_date`
- `loans.due_date`
- `loans.status`
- `loan_items.loan_id`
- `loan_items.book_id`
- `audit_logs.actor_user_id`
- `audit_logs.entity_type`
- `audit_logs.entity_id`
- `audit_logs.created_at`

### Constraint penting

- `stock_available <= stock_total`
- `quantity >= 1`
- `fine_amount >= 0`
- `due_date >= loan_date`
- `status` harus sesuai enum tiap tabel

## Status Data

- Master data menggunakan `aktif` / `nonaktif`.
- Transaksi menggunakan `dipinjam` / `dikembalikan` / `terlambat` / `dibatalkan`.
- Audit log bersifat append-only.
- Pengaturan disimpan per `setting_key`.

## Alur CRUD yang Dibutuhkan

### Master data

- role: read, create, update
- kategori: read, create, update, nonaktifkan
- buku: read, create, update, nonaktifkan
- anggota: read, create, update, nonaktifkan
- pengaturan: read, update

### Transaksi

- peminjaman: create, read, update status, batalkan
- detail peminjaman: create bersama header transaksi
- pengembalian: update `return_date`, `status`, dan stok buku

### Audit

- tulis otomatis saat aksi penting terjadi
- tidak perlu CRUD manual dari UI utama

### User / role

- login
- logout
- lihat daftar akun
- tambah akun
- ubah akun
- nonaktifkan akun

## Catatan Implementasi Backend

Urutan paling aman untuk backend:

1. `roles` dan `users`
2. `categories`
3. `books`
4. `members`
5. `loans` dan `loan_items`
6. `audit_logs`
7. `app_settings`

## Catatan Keamanan

- password disimpan hash, bukan plain text
- akun nonaktif tidak boleh login
- seluruh perubahan data penting dicatat ke `audit_logs`
- endpoint mutasi harus divalidasi di backend, bukan hanya di frontend
- role user harus memfilter akses endpoint dan menu

