# EIS Balangan — Executive Information System & Perpustakaan

Sistem Informasi Eksekutif (EIS) dan Manajemen Perpustakaan Balangan. Sistem ini dibangun dengan fokus pada performa yang optimal, arsitektur modular yang rapi (*clean architecture*), serta tingkat keterbacaan kode (*navigability*) yang tinggi untuk kolaborasi tim maupun AI.

---

## 🛠️ Stack Teknologi

Sistem ini didesain tanpa menggunakan framework frontend yang berat untuk meminimalkan beban muatan (*payload*), serta menggunakan custom MVC framework yang sangat ringan pada backend.

### **Frontend**
* **Core:** HTML5 & JavaScript (ES Modules).
* **CSS & Spacing:** Vanilla CSS3 dengan struktur grid dan variabel kustom terpusat pada [styles.css](file:///C:/xampp/htdocs/eis-optimized/frontend/shared/styles.css).
* **Pemuatan Modul:** Dinamis menggunakan pemetaan rute SPA parsial pada [entry.js](file:///C:/xampp/htdocs/eis-optimized/frontend/shared/entry.js).

### **Backend**
* **Bahasa:** PHP 8.x (Strict Types).
* **Router:** Custom Route-to-Controller mapping pada [api.php](file:///C:/xampp/htdocs/eis-optimized/backend/routes/api.php).
* **Arsitektur:** Controller Pattern dengan pemisahan delegasi kelas pengendali (misal: [LoanController.php](file:///C:/xampp/htdocs/eis-optimized/backend/src/Controllers/LoanController.php)).

### **Database**
* **DBMS:** MySQL / MariaDB.
* **Skema:** Relasional terstruktur sesuai [DATABASE_SCHEMA.md](file:///C:/xampp/htdocs/eis-optimized/DATABASE_SCHEMA.md).

---

## 📂 Struktur Direktori Proyek

```bash
├── backend/                  # Kode backend PHP
│   ├── config/               # Berkas konfigurasi basis data dan aplikasi
│   ├── routes/               # Pemetaan URL endpoint (api.php)
│   ├── src/                  # Sumber kode logika bisnis
│   │   ├── Controllers/      # Kelas pengendali request & response per modul
│   │   ├── Http/             # Core Http module (Router, Request, Response)
│   │   ├── Middleware/       # Penanganan CORS dan autentikasi JWT/Token
│   │   └── Support/          # File helper (Database connection, Validation)
│   └── bootstrap.php         # Entrypoint inisialisasi autoloading backend
│
├── database/                 # Skema migrasi SQL
│
├── frontend/                 # Kode frontend HTML/JS/CSS
│   ├── admin/                # Halaman operasional admin (.html & .js)
│   ├── kepala-perpustakaan/  # Halaman dasbor & analisis kepala (.html & .js)
│   └── shared/               # Modul komponen bersama (API Fetch, UI, Shell Layout)
│
├── asset/                    # Aset gambar statis & ikon
├── archive/                  # Cadangan berkas PHP lama pra-migrasi (tidak aktif)
│
├── DATABASE_SCHEMA.md        # Deskripsi rinci skema database relasional
├── CONTEXT.md                # Glosarium domain & panduan istilah ubiquitous
├── GEMINI.md                 # Peraturan logging dan update handoff otomatis
├── CONVERSATION_LOG.md       # Log riwayat instruksi percakapan
└── HANDOFF_NOTES.md          # Catatan kondisi handoff proyek terperbarui
```

---

## 📐 Panduan Clean Architecture & Clean Code

Untuk mempertahankan kerapian proyek di masa mendatang, pengembang wajib mengikuti pedoman berikut:

1. **Gunakan Komponen Visual Bersama ([components.js](file:///C:/xampp/htdocs/eis-optimized/frontend/shared/components.js)):**
   * Pembuatan tabel dinamis wajib memakai fungsi `dataTable()`.
   * Komponen pagination wajib memakai fungsi `renderPagination()`.
   * Input form wajib menggunakan fungsi `field()` standar agar gaya visual seragam.
2. **Prinsip *Locality* & *Deep Modules*:**
   * Logika halaman (seperti pencarian, filter, dan penanganan event) diletakkan secara lokal di dalam file modul halaman terkait (misal: [pengguna.js](file:///C:/xampp/htdocs/eis-optimized/frontend/kepala-perpustakaan/pengguna.js)), bukan diekstrak ke wrapper luar yang tipis.
   * Hindari membuat berkas penghubung dangkal yang hanya mengimpor modul lain.
3. **Pemisahan Kendali Backend:**
   * Jangan menulis kueri SQL mentah (*raw queries*) atau logika bisnis di dalam rute `api.php`. Rute hanya mendefinisikan endpoint URL dan mendelegasikannya ke Controller terkait.
   * Format keluaran JSON harus distandarisasi di dalam Controller sebelum dikirim sebagai respon HTTP.

---

## 🚀 Cara Menjalankan Proyek Secara Lokal

1. **Persiapan Lingkungan:**
   * Instal XAMPP atau Apache + PHP 8.x + MySQL server.
   * Salin folder proyek `eis-optimized` ke direktori root web server (misal: `C:/xampp/htdocs/eis-optimized/`).
2. **Konfigurasi Database:**
   * Buat database baru bernama `eis_balangan` di phpMyAdmin atau MariaDB client Anda.
   * Jalankan migrasi SQL dari folder `database/migrations/` untuk membuat tabel-tabel relasional.
   * Buat file konfigurasi `.env` pada folder `backend/` jika diperlukan (atur variabel DB_HOST, DB_NAME, DB_USER, dan DB_PASS).
3. **Akses Aplikasi:**
   * Aktifkan modul Apache dan MySQL pada XAMPP Control Panel.
   * Buka browser dan arahkan ke alamat: `http://localhost/eis-optimized/frontend/login.html` (atau sesuaikan dengan port web server Anda).
   * Lakukan login dengan akun yang terdaftar pada tabel `users`.
