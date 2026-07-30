# Domain Context & Glossary — EIS Balangan

Dokumen ini mendefinisikan bahasa domain (*ubiquitous language*) yang digunakan di seluruh codebase EIS Balangan, baik pada frontend (modul ES) maupun backend (PHP framework). Semua pengembang dan AI harus mematuhi terminologi ini secara konsisten.

---

## Glosarium Domain

### 1. Entitas & Master Data

* **Buku (Book / `books`)**
  * **Definisi:** Objek katalog fisik yang dicatat, disimpan, dan dipinjamkan dalam perpustakaan.
  * **Identifikasi:** Setiap buku memiliki kode katalog unik (format `BK-XXX`) dan nomor ISBN.
  * **Properti Utama:** Judul, Penulis, Penerbit, Tahun Terbit, Kategori, Total Stok, Stok Tersedia, dan Status (aktif/nonaktif).

* **Kategori (Category / `categories`)**
  * **Definisi:** Pengelompokan taksonomi buku berdasarkan bidang subjeknya (misalnya *Teknologi*, *Fiksi*, *Sejarah*).
  * **Identifikasi:** Memiliki kode kategori unik (format `KAT-XXX`) dan nama kategori.

* **Anggota (Member / `members`)**
  * **Definisi:** Pengguna eksternal perpustakaan (seperti siswa, guru, atau pegawai) yang terdaftar untuk meminjam buku.
  * **Identifikasi:** Diidentifikasi dengan nomor anggota unik, nama lengkap, NIP (jika ada), unit kerja, dan status aktif.

* **Pengguna (User / `users`)**
  * **Definisi:** Staf internal yang mengoperasikan sistem EIS Balangan. Pengguna terbagi menjadi dua peranan (*roles*):
    * **Admin (Administrator):** Staf operasional yang mengelola sirkulasi transaksi, kategori, dan entitas buku/anggota.
    * **Kepala Perpustakaan (Executive / Kepala):** Pimpinan yang memantau dasbor eksekutif, statistik analitik, rekomendasi buku, dan manajemen akun pengguna.

---

### 2. Transaksi & Operasional

* **Sirkulasi / Peminjaman (Circulation / Loan / `loans`)**
  * **Definisi:** Transaksi peminjaman satu atau beberapa buku oleh seorang Anggota untuk jangka waktu tertentu.
  * **Alur Hidup Transaksi:**
    1. **Dipinjam (Active):** Buku berada di tangan anggota sebelum melewati tanggal tenggat kembali (*due date*).
    2. **Kembali (Returned):** Buku telah dikembalikan dengan aman ke perpustakaan.
    3. **Terlambat (Overdue):** Buku belum dikembalikan dan telah melewati tanggal tenggat kembali.

* **Laporan (Report / `reports`) & Analitik (Analytics)**
  * **Definisi:** Agregasi data statistik sirkulasi dan katalog yang disajikan untuk Kepala Perpustakaan dalam bentuk grafik dan ringkasan metrik (tren bulanan, demografi pembaca, dan daftar buku terpopuler).

---

## Prinsip Penulisan Kode Sesuai Desain Arsitektur

1. **Modul Harus Dalam (*Deep Modules*):** Hindari membungkus fungsionalitas kecil dalam berkas-berkas perantara (*shallow wrappers*). Biarkan modul mengonsolidasikan logikanya secara mandiri.
2. **Gunakan Batas Sambungan Bersama (*Shared Seams*):** Semua komponen UI tabel dan navigasi halaman harus memakai helper visual terpusat di [components.js](file:///C:/xampp/htdocs/eis-optimized/frontend/shared/components.js) untuk menghindari kebocoran styling CSS atau duplikasi kode.
3. **Kepatuhan Penamaan Berkas:** Nama modul JavaScript di frontend harus langsung mencerminkan fungsi halaman (misalnya `buku.js`, `anggota.js`, `sirkulasi.js`), bukan menggunakan sufiks perantara seperti `-view.js` or `-db.js`.
