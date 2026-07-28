UPDATE `members`
SET
  `gender` = CASE
    WHEN `gender` IS NULL THEN NULL
    WHEN LOWER(`gender`) IN ('laki-laki', 'laki laki', 'laki') THEN 'Laki-laki'
    ELSE 'Perempuan'
  END,
  `status` = CASE
    WHEN `status` IS NULL THEN 'Aktif'
    WHEN LOWER(`status`) = 'aktif' THEN 'Aktif'
    ELSE 'Nonaktif'
  END;

ALTER TABLE `members`
  MODIFY `full_name` VARCHAR(100) NOT NULL,
  MODIFY `nik` CHAR(16) NULL,
  MODIFY `birth_date` DATE NULL,
  MODIFY `gender` ENUM('Laki-laki', 'Perempuan') NULL,
  MODIFY `address` VARCHAR(255) NULL,
  MODIFY `phone` VARCHAR(15) NULL,
  MODIFY `status` ENUM('Aktif', 'Nonaktif') NOT NULL DEFAULT 'Aktif';
