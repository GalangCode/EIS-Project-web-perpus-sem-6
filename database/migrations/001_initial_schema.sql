-- EIS Balangan initial relational schema
-- Assumption: MySQL 8 / MariaDB with InnoDB and utf8mb4

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `loan_items`;
DROP TABLE IF EXISTS `loans`;
DROP TABLE IF EXISTS `audit_logs`;
DROP TABLE IF EXISTS `books`;
DROP TABLE IF EXISTS `members`;
DROP TABLE IF EXISTS `categories`;
DROP TABLE IF EXISTS `app_settings`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `roles`;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE `roles` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(32) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `description` VARCHAR(255) NULL,
  `status` ENUM('aktif', 'nonaktif') NOT NULL DEFAULT 'aktif',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_roles_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `users` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `role_id` BIGINT UNSIGNED NOT NULL,
  `username` VARCHAR(64) NOT NULL,
  `email` VARCHAR(150) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `full_name` VARCHAR(150) NOT NULL,
  `phone` VARCHAR(30) NULL,
  `unit` VARCHAR(150) NULL,
  `nip` VARCHAR(30) NULL,
  `avatar_path` VARCHAR(255) NULL,
  `status` ENUM('aktif', 'nonaktif') NOT NULL DEFAULT 'aktif',
  `last_login_at` DATETIME NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_username` (`username`),
  UNIQUE KEY `uq_users_email` (`email`),
  KEY `idx_users_role_id` (`role_id`),
  KEY `idx_users_status` (`status`),
  CONSTRAINT `fk_users_role_id`
    FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `categories` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(32) NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `description` TEXT NULL,
  `status` ENUM('aktif', 'nonaktif') NOT NULL DEFAULT 'aktif',
  `created_by` BIGINT UNSIGNED NULL,
  `updated_by` BIGINT UNSIGNED NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_categories_code` (`code`),
  KEY `idx_categories_status` (`status`),
  KEY `idx_categories_created_by` (`created_by`),
  KEY `idx_categories_updated_by` (`updated_by`),
  CONSTRAINT `fk_categories_created_by`
    FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
    ON UPDATE CASCADE
    ON DELETE SET NULL,
  CONSTRAINT `fk_categories_updated_by`
    FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
    ON UPDATE CASCADE
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `members` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `member_code` VARCHAR(32) NOT NULL,
  `full_name` VARCHAR(150) NOT NULL,
  `nik` VARCHAR(32) NULL,
  `birth_date` DATE NULL,
  `gender` ENUM('laki-laki', 'perempuan') NULL,
  `address` TEXT NULL,
  `city` VARCHAR(100) NULL,
  `phone` VARCHAR(30) NULL,
  `email` VARCHAR(150) NULL,
  `status` ENUM('aktif', 'nonaktif') NOT NULL DEFAULT 'aktif',
  `joined_at` DATE NULL,
  `created_by` BIGINT UNSIGNED NULL,
  `updated_by` BIGINT UNSIGNED NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_members_code` (`member_code`),
  UNIQUE KEY `uq_members_nik` (`nik`),
  KEY `idx_members_status` (`status`),
  KEY `idx_members_created_by` (`created_by`),
  KEY `idx_members_updated_by` (`updated_by`),
  CONSTRAINT `fk_members_created_by`
    FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
    ON UPDATE CASCADE
    ON DELETE SET NULL,
  CONSTRAINT `fk_members_updated_by`
    FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
    ON UPDATE CASCADE
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `books` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(32) NOT NULL,
  `category_id` BIGINT UNSIGNED NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `author` VARCHAR(150) NOT NULL,
  `publisher` VARCHAR(150) NOT NULL,
  `publication_year` SMALLINT UNSIGNED NULL,
  `isbn` VARCHAR(32) NULL,
  `edition` VARCHAR(50) NULL,
  `language` VARCHAR(50) NULL,
  `shelf_location` VARCHAR(100) NULL,
  `description` TEXT NULL,
  `stock_total` INT UNSIGNED NOT NULL DEFAULT 0,
  `stock_available` INT UNSIGNED NOT NULL DEFAULT 0,
  `status` ENUM('aktif', 'nonaktif') NOT NULL DEFAULT 'aktif',
  `created_by` BIGINT UNSIGNED NULL,
  `updated_by` BIGINT UNSIGNED NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_books_code` (`code`),
  UNIQUE KEY `uq_books_isbn` (`isbn`),
  KEY `idx_books_category_id` (`category_id`),
  KEY `idx_books_title` (`title`),
  KEY `idx_books_status` (`status`),
  KEY `idx_books_created_by` (`created_by`),
  KEY `idx_books_updated_by` (`updated_by`),
  CONSTRAINT `fk_books_category_id`
    FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT `fk_books_created_by`
    FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
    ON UPDATE CASCADE
    ON DELETE SET NULL,
  CONSTRAINT `fk_books_updated_by`
    FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
    ON UPDATE CASCADE
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `loans` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `loan_code` VARCHAR(32) NOT NULL,
  `member_id` BIGINT UNSIGNED NOT NULL,
  `processed_by` BIGINT UNSIGNED NOT NULL,
  `loan_date` DATE NOT NULL,
  `due_date` DATE NOT NULL,
  `return_date` DATE NULL,
  `status` ENUM('dipinjam', 'dikembalikan', 'terlambat', 'dibatalkan') NOT NULL DEFAULT 'dipinjam',
  `fine_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `notes` TEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_loans_code` (`loan_code`),
  KEY `idx_loans_member_id` (`member_id`),
  KEY `idx_loans_processed_by` (`processed_by`),
  KEY `idx_loans_loan_date` (`loan_date`),
  KEY `idx_loans_due_date` (`due_date`),
  KEY `idx_loans_status` (`status`),
  CONSTRAINT `fk_loans_member_id`
    FOREIGN KEY (`member_id`) REFERENCES `members` (`id`)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT `fk_loans_processed_by`
    FOREIGN KEY (`processed_by`) REFERENCES `users` (`id`)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `loan_items` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `loan_id` BIGINT UNSIGNED NOT NULL,
  `book_id` BIGINT UNSIGNED NOT NULL,
  `quantity` INT UNSIGNED NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_loan_items_loan_id` (`loan_id`),
  KEY `idx_loan_items_book_id` (`book_id`),
  CONSTRAINT `fk_loan_items_loan_id`
    FOREIGN KEY (`loan_id`) REFERENCES `loans` (`id`)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT `fk_loan_items_book_id`
    FOREIGN KEY (`book_id`) REFERENCES `books` (`id`)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `audit_logs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `actor_user_id` BIGINT UNSIGNED NOT NULL,
  `action` VARCHAR(80) NOT NULL,
  `entity_type` VARCHAR(80) NOT NULL,
  `entity_id` BIGINT UNSIGNED NULL,
  `before_data` JSON NULL,
  `after_data` JSON NULL,
  `ip_address` VARCHAR(45) NULL,
  `user_agent` VARCHAR(255) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_logs_actor_user_id` (`actor_user_id`),
  KEY `idx_audit_logs_entity_type` (`entity_type`),
  KEY `idx_audit_logs_entity_id` (`entity_id`),
  KEY `idx_audit_logs_created_at` (`created_at`),
  CONSTRAINT `fk_audit_logs_actor_user_id`
    FOREIGN KEY (`actor_user_id`) REFERENCES `users` (`id`)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `app_settings` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `setting_key` VARCHAR(100) NOT NULL,
  `setting_value` TEXT NULL,
  `setting_group` VARCHAR(80) NULL,
  `description` VARCHAR(255) NULL,
  `updated_by` BIGINT UNSIGNED NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_app_settings_key` (`setting_key`),
  KEY `idx_app_settings_group` (`setting_group`),
  KEY `idx_app_settings_updated_by` (`updated_by`),
  CONSTRAINT `fk_app_settings_updated_by`
    FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
    ON UPDATE CASCADE
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Optional starter data for roles.
INSERT INTO `roles` (`code`, `name`, `description`, `status`)
VALUES
  ('admin', 'Admin', 'Pengelola data operasional sistem', 'aktif'),
  ('kepala', 'Kepala Perpustakaan', 'Pemantau dashboard dan laporan eksekutif', 'aktif');

-- Demo accounts for first bootstrap.
INSERT INTO `users` (
  `role_id`,
  `username`,
  `email`,
  `password_hash`,
  `full_name`,
  `phone`,
  `unit`,
  `nip`,
  `avatar_path`,
  `status`
)
VALUES
  (
    (SELECT `id` FROM `roles` WHERE `code` = 'admin' LIMIT 1),
    'admin',
    'admin@eis-balangan.local',
    '$2y$10$5VVmHSOYjutanYB7Aj1FhegaJt0vUjqrMtdtoVBxWYnj0VzQXKSPK',
    'Administrator',
    NULL,
    'Dinas Perpustakaan dan Kearsipan',
    NULL,
    NULL,
    'aktif'
  ),
  (
    (SELECT `id` FROM `roles` WHERE `code` = 'kepala' LIMIT 1),
    'kepala',
    'kepala@eis-balangan.local',
    '$2y$10$fiu3kmdBBCKRbkfuFyc2IeHZjdlhF8A/A2ao.El7EX7gnfESztWMm',
    'Kepala Perpustakaan',
    NULL,
    'Dinas Perpustakaan dan Kearsipan',
    NULL,
    NULL,
    'aktif'
  );

-- Starter master categories.
INSERT INTO `categories` (`code`, `name`, `description`, `status`, `created_by`, `updated_by`)
VALUES
  ('KAT-001', 'Teknologi & Komputer', 'Kategori untuk buku teknologi, komputer, dan sistem informasi.', 'aktif',
    (SELECT `id` FROM `users` WHERE `username` = 'admin' LIMIT 1),
    (SELECT `id` FROM `users` WHERE `username` = 'admin' LIMIT 1)),
  ('KAT-002', 'Sastra & Fiksi', 'Novel, cerita pendek, dan karya fiksi populer.', 'aktif',
    (SELECT `id` FROM `users` WHERE `username` = 'admin' LIMIT 1),
    (SELECT `id` FROM `users` WHERE `username` = 'admin' LIMIT 1)),
  ('KAT-003', 'Pendidikan', 'Buku ajar, referensi belajar, dan materi edukasi.', 'aktif',
    (SELECT `id` FROM `users` WHERE `username` = 'admin' LIMIT 1),
    (SELECT `id` FROM `users` WHERE `username` = 'admin' LIMIT 1)),
  ('KAT-004', 'Sejarah & Budaya', 'Buku sejarah daerah, nasional, dan kebudayaan.', 'aktif',
    (SELECT `id` FROM `users` WHERE `username` = 'admin' LIMIT 1),
    (SELECT `id` FROM `users` WHERE `username` = 'admin' LIMIT 1)),
  ('KAT-005', 'Sains & Pengetahuan', 'Referensi ilmiah, ensiklopedia, dan pengetahuan umum.', 'aktif',
    (SELECT `id` FROM `users` WHERE `username` = 'admin' LIMIT 1),
    (SELECT `id` FROM `users` WHERE `username` = 'admin' LIMIT 1)),
  ('KAT-006', 'Agama & Spiritualitas', 'Buku keagamaan dan pembinaan rohani.', 'aktif',
    (SELECT `id` FROM `users` WHERE `username` = 'admin' LIMIT 1),
    (SELECT `id` FROM `users` WHERE `username` = 'admin' LIMIT 1));

-- Starter app settings.
INSERT INTO `app_settings` (`setting_key`, `setting_value`, `setting_group`, `description`, `updated_by`)
VALUES
  ('app_name', 'EIS Balangan', 'general', 'Nama aplikasi yang tampil di UI.',
    (SELECT `id` FROM `users` WHERE `username` = 'admin' LIMIT 1)),
  ('institution_name', 'Dinas Perpustakaan dan Kearsipan Kabupaten Balangan', 'general', 'Nama instansi utama.',
    (SELECT `id` FROM `users` WHERE `username` = 'admin' LIMIT 1)),
  ('loan_days', '7', 'circulation', 'Lama peminjaman standar dalam hari.',
    (SELECT `id` FROM `users` WHERE `username` = 'admin' LIMIT 1)),
  ('max_loan_items', '3', 'circulation', 'Batas maksimum buku per transaksi.',
    (SELECT `id` FROM `users` WHERE `username` = 'admin' LIMIT 1)),
  ('fine_per_day', '1000', 'circulation', 'Denda per hari keterlambatan.',
    (SELECT `id` FROM `users` WHERE `username` = 'admin' LIMIT 1)),
  ('support_email', 'support@eis-balangan.local', 'contact', 'Alamat email dukungan.',
    (SELECT `id` FROM `users` WHERE `username` = 'admin' LIMIT 1));

