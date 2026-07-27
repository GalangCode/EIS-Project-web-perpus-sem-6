# Handoff Notes — EIS Balangan Frontend

Tanggal catatan: 2026-07-27

Pembaruan terakhir: 2026-07-27 13:58:14

## Tujuan saat ini

Frontend dibangun ulang dengan struktur HTML + ES module yang lebih modular:

- `frontend/admin/`
- `frontend/kepala-perpustakaan/`
- `frontend/shared/`

Targetnya:

- komponen reusable dipisah
- halaman unik ditulis di file halaman masing-masing
- tidak ada lagi `pages.js` yang menumpuk semua isi halaman

## Kondisi terakhir

Struktur sekarang sudah dipisah per halaman.

Komponen shared yang dipakai lintas halaman:

- `frontend/shared/components.js`
- `frontend/shared/layout-admin.js`
- `frontend/shared/layout-kepala.js`
- `frontend/shared/sidebar-admin.js`

## Search Detail Tanpa Putus Fokus

Status:

- search pada `frontend/kepala-perpustakaan/semua-dashboard.html` sekarang dirender di luar region tabel
- tabel masih bisa rerender untuk pagination dan filter tanpa memutus fokus input

Perubahan:

- `frontend/kepala-perpustakaan/semua-dashboard.js` menghapus duplikasi render search di dalam `renderTable()`
- input search tetap dipertahankan di `all-search-static`, sedangkan pembaruan dinamis hanya menyentuh tabel dan statistik

Catatan:

- perbaikan ini langsung menarget masalah user harus klik ulang setelah mengetik huruf pertama seperti `s` lalu `sa`
- `frontend/shared/sidebar-kepala.js`
- `frontend/shared/topbar-admin.js`
- `frontend/shared/topbar-kepala.js`
- `frontend/shared/nav-admin.js`
- `frontend/shared/nav-kepala.js`

Loader utama:

- `frontend/shared/entry.js`

Isi halaman ada di file terpisah, misalnya:

- `frontend/admin/kategori.js`
- `frontend/admin/buku.js`
- `frontend/admin/tambah-anggota.js`
- `frontend/admin/tambah-peminjaman.js`
- `frontend/admin/pengaturan.js`
- `frontend/kepala-perpustakaan/dashboard.js`
- `frontend/kepala-perpustakaan/koleksi.js`
- `frontend/kepala-perpustakaan/analitik.js`
- `frontend/kepala-perpustakaan/pengguna.js`
- `frontend/kepala-perpustakaan/tambah-pengguna.js`

## Perubahan perilaku penting

- Modal kategori tidak lagi muncul otomatis saat halaman dibuka.
- Modal buku juga tidak lagi pindah halaman, tetapi muncul di halaman yang sama.
- Tombol tambah buku sekarang membuka modal on-demand.
- Field form sekarang memakai elemen input asli, bukan `div` dekoratif.
- Styling input sudah dikoreksi supaya tampil seperti form biasa dengan border dan placeholder.

## Penyesuaian filter koleksi kepala perpustakaan

- **Status**: selesai, filter koleksi sekarang tampil kecil dan mengikuti pola visual filter admin.
- **Perubahan**:
  - `frontend/kepala-perpustakaan/koleksi.js` diganti memakai `filter-popover` dan `filter-card`.
  - Struktur field filter disamakan dengan admin: label, input search, dan select berada di kartu yang sempit.
  - Tombol aksi filter dihapus agar filter berjalan langsung saat search atau kategori berubah.
  - Render koleksi dipisah menjadi update parsial agar input search tidak kehilangan fokus saat diketik.
  - `frontend/shared/styles.css` diubah supaya filter koleksi memakai lebar kartu kecil dan tidak lagi melebar penuh.
  - Handler filter koleksi ditambah tombol tutup khusus agar interaksinya tetap nyaman.
- **Catatan**:
  - Posisi popover masih mengikuti panel `section.panel` karena wrapper-nya `position: relative`.
  - Jika nanti filter tambahan ditambah, pakai pola `filter-card` yang sama agar konsisten dengan admin.

## Analitik Kepala Perpustakaan Terhubung Database

- **Status**: selesai, halaman analitik sekarang memuat data nyata dari endpoint laporan.
- **Perubahan**:
  - `frontend/kepala-perpustakaan/analitik.js` diubah untuk mengambil data dari `/api/reports/overview`.
  - Kartu metrik, chart bulanan, demografi, dan tabel rekomendasi dibangun dari respons API.
  - Kontrol tahun analitik ditambahkan agar halaman bisa meminta data sesuai `chart_year`.
  - Tampilan tetap memakai gaya `report-card` dan shell kepala perpustakaan yang sudah ada.
- **Catatan**:
  - Data yang dipakai berasal dari endpoint laporan yang sama dengan dashboard, jadi perubahan backend akan langsung tercermin di halaman ini.
  - Jika nanti ingin menambah filter rentang tanggal, pola request-nya sudah tersedia di backend `overview`.

## Manajemen Pengguna Terhubung Database

- **Status**: selesai, halaman pengguna sekarang memuat data nyata dari database.
- **Perubahan**:
  - Backend ditambah endpoint read-only `/api/users` yang join tabel `users` dan `roles`.
  - `frontend/kepala-perpustakaan/pengguna.js` diubah menjadi halaman dinamis berbasis fetch API.
  - Search, filter status, dan filter peran mengirim query langsung ke backend.
  - Tabel menampilkan nama lengkap, username, peran, email/unit, status, dan login terakhir.
- **Catatan**:
  - Endpoint ini memakai role executive, jadi hanya admin dan kepala perpustakaan yang bisa mengaksesnya.
- Kalau nanti dibutuhkan aksi edit/hapus pengguna, endpoint detail/update perlu ditambahkan terpisah.

## Tautan Detail Dashboard Kepala Perpustakaan

- **Status**: selesai, tombol `Lihat Semua Data` dari dashboard utama sekarang membuka halaman detail dashboard yang sudah disiapkan.
- **Perubahan**:
  - `frontend/kepala-perpustakaan/dashboard.js` mengubah tujuan tautan dari `koleksi.html` menjadi `semua-dashboard.html`.
  - Halaman `frontend/kepala-perpustakaan/semua-dashboard.html` dan `frontend/kepala-perpustakaan/semua-dashboard.js` tetap dipakai sebagai detail data resmi.
- **Catatan**:
  - Tidak ada perubahan layout besar karena halaman detail yang diminta sudah tersedia; yang dibutuhkan hanya penyambungan navigasi agar klik tombol mengarah ke halaman yang benar.

## Detail Dashboard Kepala Perpustakaan Terhubung Database

- **Status**: selesai, halaman `frontend/kepala-perpustakaan/semua-dashboard.html` sekarang memuat data nyata dari endpoint laporan.
- **Perubahan**:
  - `frontend/kepala-perpustakaan/semua-dashboard.js` diubah dari mock statis menjadi halaman dinamis berbasis `apiFetch("/api/reports/overview")`.
  - KPI, tabel top buku, donut kategori, demografi, dan transaksi terbaru kini dirender dari respons database.
  - Ditambahkan filter kategori, pencarian buku, dan kontrol tahun agar data bisa disaring tanpa mengubah halaman lain.
  - `frontend/shared/styles.css` ditambah kelas `all-*` untuk menjaga layout detail tetap rapi di desktop dan mobile.
- **Catatan**:
  - Halaman ini memakai endpoint laporan yang sama dengan analitik, jadi jika backend laporan berubah, detail dashboard ini ikut berubah.
  - Pencarian buku saat ini masih filter sisi-klien dari data yang sudah diambil; jika nanti perlu pencarian global, backend perlu menambah parameter pencarian pada endpoint laporan.

## Detail Dashboard Disesuaikan Dengan Screenshot Referensi

- **Status**: selesai, tampilan halaman detail sekarang lebih dekat ke referensi yang hanya menampilkan tabel utama, statistik bawah, dan footer ringkas.
- **Perubahan**:
  - `frontend/kepala-perpustakaan/semua-dashboard.js` disederhanakan menjadi satu hero, satu kartu tabel utama, KPI bawah, dan footer.
  - `frontend/kepala-perpustakaan/semua-dashboard.js` sekarang mengambil data buku lengkap dari `/api/books` dan tetap mengambil ringkasan dari `/api/reports/overview`.
  - `backend/routes/api.php` menambahkan field `borrowed_quantity` dan `last_borrowed_at` pada respons `GET /api/books` agar kolom ranking dan last borrowed berasal dari database.
  - `frontend/shared/styles.css` menambah dan menyesuaikan kelas `all-*` untuk meniru struktur visual pada screenshot referensi.
  - Update area tabel dibuat parsial agar input search tetap nyaman dipakai tanpa kehilangan fokus.
- **Catatan**:
  - Ranking saat ini dihitung dari urutan hasil filter dan sort `borrowed_quantity`, jadi akan berubah mengikuti filter yang aktif.
  - Bila nanti dibutuhkan tombol aksi yang benar-benar membuka detail buku, endpoint detail buku perlu ditambahkan terpisah.

## Footer Dihapus Dan Filter Disamakan Dengan Admin

- **Status**: selesai, footer halaman detail sudah dihapus dan filter sekarang mengikuti pola popover seperti admin.
- **Perubahan**:
  - `frontend/kepala-perpustakaan/semua-dashboard.js` menghapus render footer dari halaman detail.
  - Tombol aksi tabel diganti menjadi ikon kecil bergaya tombol untuk lihat detail dan unduh.
  - Filter dipindah ke popover dengan struktur `modal-head`, `modal-body`, tombol `RESET`, dan `Terapkan` seperti admin.
  - Search tetap diletakkan di bar atas kartu supaya interaksi tetap cepat tanpa membuka popover.
- **Catatan**:
  - Popover filter saat ini mengikuti pola visual admin, tetapi dataset dan perilaku filternya tetap khusus untuk halaman detail dashboard.
  - Jika nanti ingin aksi detail dan unduh benar-benar bekerja, perlu handler tambahan di `frontend/kepala-perpustakaan/semua-dashboard.js`.

## Aksi Search Filter Export Diperbaiki

- **Status**: selesai, tombol export, search, filter, dan aksi baris pada halaman detail dashboard sudah memiliki perilaku nyata.
- **Perubahan**:
  - `frontend/kepala-perpustakaan/semua-dashboard.js` sekarang mengekspor CSV dari data yang sedang difilter.
  - Ikon mata membuka modal detail buku, sedangkan ikon unduh mengekspor satu baris buku.
  - Filter popover membaca kategori dan tahun dari form lalu memuat ulang data saat diperlukan.
  - Search tetap memfilter tabel secara live tanpa mengganggu state lain.
- **Catatan**:
  - Detail modal saat ini masih bersifat read-only, cukup untuk inspeksi cepat dan ekspor per baris.
  - Jika nanti diperlukan aksi lanjutan seperti edit, bisa ditambahkan endpoint dan modal terpisah.

## Catatan file yang dihapus

- `frontend/shared/pages.js` sudah dihapus.
- `frontend/admin/tambah-buku.js` sudah dihapus.
- `frontend/admin/tambah-buku.html` sudah dihapus.

## File penting yang terakhir berubah

- `frontend/kepala-perpustakaan/rekomendasi.js`
- `CONVERSATION_LOG.md`
- `HANDOFF_NOTES.md`

## Catatan perilaku aplikasi

- Halaman tetap harus dibuka lewat local server, bukan `file://`, karena masih memakai ES module import.
- Login admin dan login kepala tetap memakai aset lokal:
  - `logo.jpeg`
  - `gambar login.jpg`

Contoh menjalankan server:

```powershell
python -m http.server 8000
```

Lalu buka:

`http://localhost:8000/index.html`

## Status teknis

Semua file JS yang ada di `frontend/` sudah lolos `node --check` terakhir kali dicek.

## Modal Kategori Terkunci Ke Tombol X

Status:

- modal tambah/edit kategori di `frontend/admin/kategori.js` sekarang hanya bisa ditutup lewat tombol `×`

Perubahan:

- tombol `BATAL` dihapus dari form kategori
- penutupan lewat klik backdrop dimatikan
- penutupan lewat `Escape` dimatikan

Catatan:

- setelah simpan kategori, modal tetap ditutup oleh alur submit yang memang sukses menyelesaikan aksi
- perubahan ini menjaga agar pengguna tidak keluar form tanpa sengaja saat input sedang diisi

## Deskripsi Dan Status Kategori Diperluas

Status:

- modal kategori sekarang memakai textarea deskripsi yang lebih lebar dan opsi status radio seperti referensi

Perubahan:

- field `DESKRIPSI SINGKAT` dibuat `full` dan diberi tinggi baris lebih besar
- `STATUS KATEGORI` diubah dari select menjadi radio `Aktif` dan `Nonaktif`
- styling tambahan ditambahkan agar radio tampil sejajar dan konsisten dengan referensi

Catatan:

- nilai status tetap terbaca oleh `FormData` karena radio memakai `name="status"`
- layout baru ini masih mengikuti struktur modal yang sudah ada tanpa mengubah alur simpan

## Tinggi Textarea Diperbesar Lagi

Status:

- textarea `DESKRIPSI SINGKAT` dinaikkan lagi agar lebih panjang ke bawah

Perubahan:

- `rows` field deskripsi kategori dinaikkan
- `min-height` textarea umum dan kelas `.textarea` dinaikkan supaya area input terlihat lebih lapang

Catatan:

- perubahan ini khusus untuk memperjelas area isi deskripsi, tanpa mengubah perilaku submit atau validasi

## Warna Stok Katalog Buku Aktif

Status:

- kolom stok di `Katalog Buku Aktif` sekarang memakai warna berdasarkan rasio stok tersedia terhadap stok total

Perubahan:

- `frontend/admin/buku-view.js` menambahkan helper `stockPill()`
- stok penuh tampil hijau
- stok setengah atau di bawahnya sampai di atas seperempat tampil kuning
- stok seperempat ke bawah tampil merah

Catatan:

- format angka tetap `tersedia/total`, jadi informasi stok masih terbaca jelas
- perubahan ini hanya memengaruhi tampilan tabel buku aktif di `buku.html`

## Modal Buku Terkunci Ke Tombol X

Status:

- modal tambah dan edit buku di `frontend/admin/buku-view.js` sekarang hanya bisa ditutup lewat tombol `×`

Perubahan:

- tombol `BATAL` di form buku dihapus
- penutupan lewat klik backdrop dimatikan
- penutupan lewat tombol `Escape` dimatikan

Catatan:

- modal tetap bisa menutup setelah submit berhasil
- perubahan ini berlaku untuk tambah buku dan edit buku karena memakai modal yang sama

## Tanda Wajib Berwarna Merah

Status:

- semua label input wajib yang memakai tanda `*` sekarang menampilkan `*` berwarna merah

Perubahan:

- `frontend/shared/components.js` menambahkan formatter label untuk mengganti `*` menjadi span merah
- `frontend/shared/styles.css` menambahkan kelas `.required-star`
- label wajib yang ditulis manual di form buku, sirkulasi, anggota, dan tambah pengguna diseragamkan memakai formatter yang sama

Catatan:

- field yang dirender lewat helper `field()` ikut terdampak otomatis
- perubahan ini hanya visual, tidak mengubah validasi atau perilaku submit

## Cache-Buster Untuk Buku Aktif

Status:

- halaman `frontend/admin/buku.html` sudah diarahkan untuk memuat `components.js` versi terbaru agar export `renderLabelHtml` terbaca di browser

Perubahan:

- import di `frontend/admin/buku-view.js` diberi query cache-buster
- ini mencegah browser memakai modul lama yang belum mengenali export baru

Catatan:

- perbaikan ini khusus untuk memulihkan render halaman buku aktif setelah error module di browser

## Cache-Buster Untuk Kategori

Status:

- halaman kategori juga diarahkan untuk memuat `components.js` versi terbaru agar label wajib tampil merah di modal

Perubahan:

- import di `frontend/admin/kategori.js` diberi query cache-buster yang sama
- browser dipaksa memakai modul shared terbaru saat membuka `kategori.html`

Catatan:

- ini menarget kasus visual yang masih terlihat memakai bundle lama meski source sudah diperbarui

## Cache-Buster Diseragamkan

Status:

- semua halaman yang memakai label wajib sekarang mengarah ke `components.js?v=20260727`

Perubahan:

- `frontend/admin/anggota-view.js`
- `frontend/admin/buku-db.js`
- `frontend/admin/sirkulasi-view.js`
- `frontend/admin/tambah-anggota-view.js`
- `frontend/kepala-perpustakaan/tambah-pengguna.js`

Catatan:

- penyamaan ini dilakukan agar browser tidak mencampur modul lama dan modul baru saat membuka halaman yang sudah dimodifikasi

## Semua Form Terkunci Ke Tombol X

Status:

- semua modal form dan form halaman mandiri yang relevan sekarang memakai tombol `×` sebagai jalur keluar utama

Perubahan:

- modal form kategori, anggota, buku, dan sirkulasi dihapus jalur close lewat backdrop, `Escape`, dan tombol batal
- modal detail yang terkait di halaman sirkulasi, dashboard kepala, dan rekomendasi juga disamakan ke tombol `×`
- halaman form mandiri seperti tambah anggota, tambah pengguna, tambah peminjaman, dan pengaturan admin diberi tombol `×` di kanan atas dan tombol `Batal` bawah dihapus

Catatan:

- tujuan perubahan ini adalah supaya perilaku keluar form konsisten di seluruh UI, bukan hanya di satu halaman kategori

## Skala Bar Tren Laporan Disamakan

Status:

- chart `Tren Sirkulasi Buku Bulanan` di `frontend/admin/laporan.html` sekarang memakai skala tinggi yang sama untuk peminjaman dan pengadaan

Perubahan:

- tinggi bar dihitung dari satu nilai maksimum gabungan dari `loans` dan `books_added`
- basis tinggi terpisah yang sebelumnya membuat pengadaan terlihat lebih pendek sudah dihapus

Catatan:

- ini memastikan bar yang lebih tinggi benar-benar merepresentasikan angka yang lebih besar, bukan karena offset visual

## Link Rekomendasi Pengadaan

Status:

- kartu analitik sekarang punya link langsung ke halaman rekomendasi detail

Perubahan:

- teks `Lihat Seluruh Rekomendasi (24 Judul)` diubah menjadi anchor ke `frontend/kepala-perpustakaan/rekomendasi.html`
- footer kartu diberi ruang khusus supaya link tampil terpisah dari tabel

Catatan:

- halaman tujuan sudah ada, jadi alur pindah halaman tidak perlu route baru atau file tambahan

## Rekomendasi Terhubung Database

Status:

- halaman rekomendasi kepala perpustakaan sekarang menarik data buku dari API dan tidak lagi hardcoded

Perubahan:

- `frontend/kepala-perpustakaan/rekomendasi.js` memuat data dari `/api/books` dan `/api/reports/overview`
- search, filter kategori, filter status stok, pagination, ekspor CSV, dan modal detail aktif di sisi frontend
- kartu KPI, ringkasan anggaran, dan tabel rekomendasi dibangun dari data yang datang dari database

Catatan:

- search bar sengaja dipisah dari region tabel agar fokus input tidak hilang saat tabel direrender
- kalau nanti mau disamakan lebih dekat ke desain referensi, langkah berikutnya biasanya tinggal menyesuaikan CSS kecil di `frontend/shared/styles.css`

## Audit data awal

Tahap pertama sudah dimulai dengan inventarisasi data dari halaman aktif.

Entitas yang sudah terlihat dari UI saat ini:

- autentikasi login admin dan login kepala perpustakaan
- kategori buku
- data buku / katalog
- data anggota
- transaksi peminjaman / sirkulasi
- laporan dan analitik
- data pengguna / akun
- pengaturan profil dan sistem

Catatan awal:

- sebagian besar halaman masih memakai mock data hardcoded di file JS
- struktur visual sudah modular, jadi integrasi API bisa dilakukan tanpa mengubah tampilan
- halaman `admin` dan `kepala-perpustakaan` punya kebutuhan data yang berbeda, tetapi tetap berbagi komponen shell dan tabel

## Skill tambahan

Sudah dibuat skill Codex baru untuk menjaga pembaruan log proyek secara konsisten:

- `project-log-keeper`

Fungsi skill ini:

- mengingatkan Codex untuk memperbarui `HANDOFF_NOTES.md`
- mengingatkan Codex untuk memperbarui `CONVERSATION_LOG.md`
- berlaku saat ada output kerja yang substantif di repo yang memakai kedua log tersebut

Catatan:

- skill disimpan di folder skills global Codex agar bisa dipakai lintas sesi
- validator bawaan sempat gagal dijalankan karena environment ini belum punya modul `yaml`

## Draft database

Sudah dibuat draft skema database awal di:

- `DATABASE_SCHEMA.md`

Isi draft:

- `roles`
- `users`
- `categories`
- `books`
- `members`
- `loans`
- `loan_items`
- `audit_logs`
- `app_settings`

Prinsip desain:

- minimal tapi cukup untuk menggantikan mock data di frontend
- mendukung login berbasis role
- mendukung dashboard dan laporan dari query agregasi
- menjaga perubahan UI seminimal mungkin

## Icon setup

Icon aset dari folder `asset/` sudah mulai dipasang ke komponen shared.

Yang sudah diubah:

- sidebar admin
- sidebar kepala perpustakaan
- topbar admin
- topbar kepala perpustakaan
- form login admin dan login kepala

Pendekatan yang dipakai:

- icon dipanggil dari file gambar lokal di `asset/`
- layout dan ukuran komponen utama tetap dipertahankan
- perubahan difokuskan di komponen shared agar seluruh halaman ikut konsisten

File utama yang disentuh:

- `frontend/shared/components.js`
- `frontend/shared/nav-admin.js`
- `frontend/shared/nav-kepala.js`
- `frontend/shared/sidebar-admin.js`
- `frontend/shared/sidebar-kepala.js`
- `frontend/shared/topbar-admin.js`
- `frontend/shared/topbar-kepala.js`
- `frontend/shared/styles.css`

## Dashboard Kepala Perpustakaan

Status:

- halaman `frontend/kepala-perpustakaan/dashboard.html` sekarang sudah data-driven dan memakai respons API laporan
- dashboard bisa dibuka oleh role `kepala` karena endpoint ringkasan laporan sudah menerima `admin` dan `kepala`

Perubahan:

- `frontend/kepala-perpustakaan/dashboard.js` diganti dari mock statis menjadi render dinamis
- ditambahkan 4 kartu statistik, donut kategori, chart demografi usia, dan tabel top buku dengan pagination
- `frontend/shared/styles.css` diberi kelas khusus untuk meniru layout screenshot referensi
- `backend/routes/api.php` dibuka untuk role `kepala` pada endpoint `/api/reports/overview`

Catatan:

- data tetap mengikuti isi database, jadi angka di kartu bisa berubah sesuai seed dan transaksi aktual
- layout sudah dibangun untuk mendekati referensi visual, tetapi detail pixel-level masih bisa disempurnakan jika diperlukan

## Penyamaan Layout Dan Range Demografi

Status:

- layout area atas dashboard kepala sudah dirapikan lagi agar lebih dekat ke referensi awal
- card demografi sekarang memakai range yang sama dengan laporan admin: `15-24`, `25-34`, `35-44`, `45+`

Perubahan:

- donut kategori dibuat lebih kecil dan lebih proporsional
- jarak antar dua card atas dipadatkan supaya komposisinya lebih rapat
- chart usia di dashboard kepala sekarang mengikuti band demografi dari `frontend/admin/laporan.html`

Catatan:

- band `<12` dan `13-17` memang sengaja dihilangkan supaya konsisten dengan tampilan laporan admin
- kalau nanti perlu, penyesuaian visual lanjutan bisa difokuskan ke tinggi card dan ketebalan ring donut

## Penyamaan Card Kategori Dan Tabel Top Buku

Status:

- card `Kategori Buku Terpopuler` dan tabel `Top-up Buku Terpopuler` sudah disesuaikan lagi agar lebih dekat ke dua referensi gambar terbaru

Perubahan:

- legend donut kategori dibuat dua kolom
- donut kategori dirapikan agar proporsi ruangnya lebih mirip kartu referensi
- tabel top buku diberi ikon buku kecil di kolom judul
- badge peringkat dan tinggi baris tabel dirapikan

Catatan:

- komponen ini masih data-driven, jadi isi kategori dan urutan buku tetap mengikuti database
- jika perlu penyamaan lebih jauh, fokus berikutnya biasanya tinggal di jarak padding, ukuran font, dan seed data visual

## Perbaikan Susunan Donut Dan Tabel

Status:

- card kategori sudah kembali ke susunan yang benar: donut di atas dan keterangan di bawah
- tabel top buku sudah memakai kolom yang sejajar antara header dan isi

Perubahan:

- layout card kategori diganti dari dua kolom menjadi susunan vertikal
- tabel top buku diberi `colgroup` dan `table-layout: fixed`
- lebar tiap kolom tabel dikunci agar header tidak bergeser dari isi
- media query CSS diperbarui supaya layout baru tetap stabil di layar kecil

Catatan:

- ini memperbaiki masalah visual yang tadi sempat bergeser dari referensi
- kalau masih ada selisih kecil, tinggal haluskan padding atau lebar kolom, bukan struktur utamanya

## Pemadatan Kolom Judul Buku

Status:

- ikon kecil pada kolom judul buku sudah dihapus
- jarak antara judul buku dan kategori sudah dipadatkan

Perubahan:

- markup tabel top buku sekarang hanya menampilkan teks judul buku
- lebar kolom judul dan kategori dipangkas supaya celahnya lebih rapat
- padding antar sel judul dan kategori dikurangi tanpa merusak kesejajaran header

Catatan:

- perubahan ini hanya menyentuh tampilan tabel, bukan data atau urutan buku
- jika masih ingin lebih rapat, kita bisa lanjutkan dengan penyesuaian kecil pada lebar kolom judul

## Halaman Koleksi Kepala

Status:

- halaman `frontend/kepala-perpustakaan/koleksi.html` sekarang data-driven dan membaca data buku/kategori dari database

Perubahan:

- `backend/routes/api.php` membuka akses baca `GET /api/books` dan `GET /api/categories` untuk role `kepala`
- `frontend/kepala-perpustakaan/koleksi.js` diganti dari mock statis menjadi render dinamis
- halaman koleksi memuat kartu statistik, donut kategori, grafik pertumbuhan tahunan, filter, tabel inventaris, pagination, dan export CSV
- `frontend/shared/styles.css` diberi kelas baru khusus koleksi agar layout tetap rapi

Catatan:

- data yang tampil tetap mengikuti isi database, jadi angka statistik dan urutan tabel bisa berubah sesuai seed dan transaksi nyata
- fitur search/filter di halaman koleksi masih frontend-driven, tetapi sumber datanya sudah dari API

## Tabel Koleksi Referensi Baru

Status:

- tabel inventaris koleksi sudah disamakan dengan referensi terbaru

Perubahan:

- kolom tabel diurutkan menjadi ranking, judul buku, kategori, tahun terbit, jumlah stok, status, dan aksi
- thumbnail buku ditampilkan di sisi kiri judul
- tombol `Detail` ditambahkan pada kolom aksi
- tombol filter dan unduh laporan dipindah ke kanan atas panel
- ekspor CSV diselaraskan kembali dengan kolom data yang ditampilkan

Catatan:

- struktur tabel sekarang mengikuti screenshot referensi terbaru dengan lebih dekat
- kalau nanti ingin disempurnakan lagi, fokus utamanya tinggal ukuran thumbnail dan jarak antar kolom

## Dashboard dekoratif

Dashboard kepala perpustakaan yang paling terlihat sudah disentuh kecil di area kartu statistik.

Perubahan:

- ikon statistik di dashboard utama sekarang menerima nama file aset gambar langsung
- simbol teks di kartu dashboard utama diganti ke aset lokal yang sudah ada
- tampilan visual tetap sama, hanya sumber ikon yang dipindah ke gambar

File yang diperbarui:

- `frontend/shared/components.js`
- `frontend/kepala-perpustakaan/dashboard.js`

## Skema database relasional

Skema database relasional sudah dirapikan menjadi draft final untuk dasar backend.

Yang sudah ditetapkan:

- tabel master: `roles`, `categories`, `books`, `members`, `app_settings`
- tabel user/role: `users`
- tabel transaksi: `loans`, `loan_items`
- tabel audit: `audit_logs`
- field wajib dan nullable sudah diberi penanda
- indeks unik, indeks biasa, dan constraint penting sudah dirangkum
- aturan status dan alur CRUD per entitas sudah dijelaskan

File yang diperbarui:

- `DATABASE_SCHEMA.md`

## SQL migration awal

Skema database sudah diturunkan ke migration SQL awal.

Yang dibuat:

- `database/migrations/001_initial_schema.sql`

Isi migration:

- drop tabel lama dengan urutan aman sebelum create
- create tabel `roles`, `users`, `categories`, `members`, `books`, `loans`, `loan_items`, `audit_logs`, dan `app_settings`
- foreign key, unique index, dan index biasa sudah disertakan
- ada seed awal untuk role `admin` dan `kepala`
- ada seed demo akun admin/kepala, kategori dasar, dan setting aplikasi awal

Asumsi teknis:

- MySQL 8 atau MariaDB
- engine `InnoDB`
- charset `utf8mb4`

## Struktur backend API

Kerangka backend awal sudah dibuat dengan front controller PHP dan koneksi PDO.

Yang ditambahkan:

- `backend/public/index.php`
- `backend/public/router.php`
- `backend/public/.htaccess`
- `backend/bootstrap.php`
- `backend/config/app.php`
- `backend/config/database.php`
- `backend/routes/api.php`
- helper di `backend/src/Http/`, `backend/src/Support/`, dan `backend/src/Middleware/`

Endpoint bootstrap yang sudah tersedia:

- `GET /api/health`
- `GET /api/db/ping`
- `POST /api/auth/login`
- `GET /api`

Catatan:

- konfigurasi database memakai env variable dari `backend/.env`
- ada file contoh `backend/.env.example`
- login demo aktif lewat seed awal:
  - `admin` / `admin123`
  - `kepala` / `kepala123`
- endpoint login mengembalikan token bearer bertanda tangan HMAC dan payload user/role
- frontend login sudah tersambung ke API, menyimpan session di `sessionStorage`, mengarahkan ke area role yang sesuai, dan membersihkan session saat logout
- syntax semua file PHP backend sudah lolos `php -l`

## Hal yang masih bisa dilanjutkan

1. Susun endpoint backend untuk dashboard, list data, detail, dan CRUD.
2. Hubungkan frontend modular yang sudah ada ke API bertahap.
3. Tambahkan validasi form dasar dan handling error/loading.
4. Uji end-to-end dan dokumentasikan cara menjalankan sistem.

## Pemindahan Lokasi Project

Project sudah dipindahkan ke:

- `C:\xampp\htdocs\EIS-Project web perpus sem-6`

Catatan:

- seluruh isi project ikut dipindahkan, termasuk `.git`
- jalur baru ini cocok untuk dijalankan di bawah XAMPP / Apache lokal

## Perbaikan Jalur Run XAMPP

Agar sistem bisa berjalan dari folder XAMPP:

- `frontend/shared/config.js` sekarang selalu memakai backend `http://localhost:8001` sebagai default API base
- `backend/.env` diubah menjadi `CORS_ORIGIN=*` supaya browser dari Apache/local host bisa memanggil API

Catatan:

- perubahan ini menghindari kasus frontend mengarah ke origin yang salah saat dibuka lewat Apache

## Perbaikan Login Live

Masalah login 500 sudah diselesaikan.

Perubahan:

- query login diperbaiki agar binding parameter PDO valid
- hash demo akun di database diubah ke hash bcrypt yang benar
- login admin sekarang berhasil dipakai dari frontend

Catatan:

- jika browser masih menyimpan session lama, lakukan logout atau hapus `sessionStorage`

## Perbaikan Redirect Frontend

Redirect login sempat membentuk URL dobel seperti `frontend/admin/admin/kategori.html`.

Perbaikan:

- helper login sekarang membangun URL absolut di bawah folder `frontend`
- redirect admin dan kepala tidak lagi bergantung pada path relatif halaman aktif
- file yang diubah lolos `node --check`

## Perbaikan API Base URL

Error `net::ERR_CONNECTION_REFUSED` ke `:8001/api/auth/login` muncul karena frontend masih mengarah ke backend di port `8001`, sementara backend belum tentu dijalankan di port itu.

Perubahan:

- `frontend/shared/config.js` sekarang memprioritaskan URL backend satu project di bawah Apache/XAMPP
- jika halaman dibuka lewat `http://localhost/.../frontend/...`, base API otomatis mengarah ke `.../backend/public`
- fallback `http://localhost:8001` tetap disimpan untuk mode dev manual

Catatan:

- override manual tetap bisa dipakai lewat `window.EIS_API_BASE_URL`
- file JS yang diubah sudah lolos `node --check`

## Login Satu Pintu

Alur masuk sekarang disatukan ke satu halaman login pusat:

- root `index.html` mengarah ke `frontend/login.html`
- `frontend/login.html` memakai form login generik untuk admin dan kepala
- `frontend/admin/login.html` dan `frontend/kepala-perpustakaan/login.html` diarahkan ke halaman login pusat
- hasil login tetap ditentukan oleh role akun dari backend
- path aset login pusat sudah disesuaikan supaya logo dan gambar latar tampil benar dari root `frontend/`

Catatan:

- redirect setelah login tetap mengikuti role `admin` atau `kepala`
- `getLoginPath()` sekarang mengembalikan login pusat yang sama untuk semua role

## Perbaikan Route API XAMPP

Masalah `POST /backend/public/api/auth/login 404` muncul karena backend membaca path request mentah dari subfolder XAMPP.

Perubahan:

- `backend/src/Http/Request.php` sekarang men-strip base path project dari `REQUEST_URI`
- route `/api/auth/login` kembali cocok saat project dibuka dari `/EIS-Project web perpus sem-6/`
- favicon halaman login dan root juga diberi link icon agar browser tidak terus meminta `/favicon.ico`

Catatan tambahan:

- path request di-decode dulu agar string `%20` pada nama folder XAMPP tidak memutus prefix matching

## CRUD Kategori Terhubung Database

Halaman admin kategori sekarang sudah terhubung ke tabel `categories`.

Perubahan:

- `backend/routes/api.php` menambahkan endpoint:
  - `GET /api/categories`
  - `POST /api/categories`
  - `PUT /api/categories`
  - `DELETE /api/categories`
- `frontend/admin/kategori.js` diubah dari mock statis menjadi halaman data-driven
- `frontend/shared/api.js` sekarang otomatis mengirim bearer token sesi
- `frontend/shared/styles.css` mendapat styling kecil untuk search field dan empty state

Catatan:

- data kategori ditarik dari database lalu dirender ulang saat tambah/edit/hapus
- hapus kategori saat ini dibuat sebagai nonaktif agar data historis tetap aman

## Perbaikan Search Dan Filter Kategori

Masalah pada input search kategori sudah diperbaiki.

Perubahan:

- search kategori sekarang hanya memperbarui area tabel, bukan me-render ulang seluruh halaman
- fokus input tidak hilang setiap kali mengetik huruf baru
- tombol filter sekarang membuka layer filter yang aktif
- filter mendukung:
  - kategori
  - status aktif / nonaktif

Catatan:

- filter apply dan reset sama-sama memicu render ulang data tabel tanpa mengganggu input search

## Filter Kategori Dropdown

Filter kategori sekarang tampil sebagai dropdown kecil di toolbar, bukan modal penuh layar.

Perubahan:

- tombol filter membuka popover kecil di panel kategori
- popover memuat filter kategori dan status
- popover lebih ringan dan tidak menutupi halaman

Catatan:

- search tetap memakai alur update tabel tanpa kehilangan fokus

## Filter Status Saja

Filter kategori dipersempit menjadi status saja untuk menjaga UI tetap sederhana.

Perubahan:

- filter kategori dihapus dari popover
- popover sekarang hanya memuat filter status `aktif` / `nonaktif`
- panel kategori diubah agar popover tidak terpotong saat dibuka ulang

Catatan:

- popover tetap berada di dalam panel, tetapi panel sekarang tidak memotong overflow

## Kartu Statistik Lebih Rapi

Posisi 3 kartu statistik di halaman kategori sudah dirapikan agar lebih mirip layout referensi.

Perubahan:

- grid statistik dibuat lebih stabil dengan lebar kartu konsisten
- jarak antar kartu diperkecil agar proporsinya lebih seimbang
- tinggi kartu dan jarak isi kartu dirapikan supaya alignment lebih enak dilihat

Catatan:

- perubahan ini hanya di CSS, tidak memengaruhi data atau interaksi halaman

## Kartu Statistik Full Width

Grid 3 kartu statistik sekarang mengisi lebar konten penuh agar tidak menyisakan ruang kosong di sisi kanan.

Perubahan:

- grid statistik diubah dari lebar tetap menjadi 3 kolom fleksibel
- setiap kartu memakai lebar proporsional yang sama
- ruang kosong kanan pada area statistik dihilangkan

Catatan:

- layout tetap 3 kartu sejajar kiri, tengah, kanan seperti referensi

## Halaman Buku Terhubung Database

Halaman `buku` sekarang sudah dibuat data-driven dan terhubung ke tabel `books`.

Perubahan:

- daftar buku di-load dari endpoint `/api/books`
- tambah, edit, dan nonaktifkan buku memakai data database
- form buku memuat pilihan kategori aktif dari database
- search dan filter status tetap bekerja tanpa me-render ulang seluruh halaman

Catatan:

- loader frontend diarahkan ke modul baru `frontend/admin/buku-view.js`
- endpoint backend buku sudah ditambah dan lolos `php -l`

## Kartu Buku 4 Kolom dan Filter Kategori

Layout kartu statistik halaman buku sudah disesuaikan menjadi 4 kolom seperti referensi, dan filter kategori ditambahkan.

Perubahan:

- kartu statistik buku sekarang memakai grid 4 kolom
- filter buku memuat kategori dan status
- kategori di filter diambil dari data kategori yang tersedia di database

Catatan:

- perubahan ini hanya menyentuh UI buku, tidak mengubah endpoint CRUD buku yang sudah berjalan

## Form Responsif

Ukuran form tambah/edit buku dan kategori sudah dirapikan agar lebih pas di berbagai ukuran layar.

Perubahan:

- modal base dibuat responsif dengan batas lebar berbasis viewport
- form buku memakai ukuran `modal-xl` yang tetap mengecil di layar kecil
- form kategori memakai ukuran `modal-md`
- modal body diberi batas tinggi dan scroll internal agar tidak terpotong

Catatan:

- perubahan ini berlaku untuk form utama agar tampilan lebih nyaman di laptop maupun device yang lebih kecil

## Halaman Anggota Query Database

Halaman `anggota` sekarang mengirim search dan filter ke backend, sehingga daftar yang tampil benar-benar berasal dari query database.

Perubahan:

- `backend/src/Http/Request.php` sekarang membaca query string URL
- `GET /api/members` menerima parameter `q`, `status`, dan `gender`
- `frontend/admin/anggota-view.js` mengirim search/filter ke API sebelum merender hasil

Catatan:

- verifikasi sintaks lolos untuk request backend, route members, dan modul frontend anggota

## Modal Tambah Anggota

Tombol `＋ Tambah Anggota` sekarang membuka modal form langsung dari halaman daftar anggota.

Perubahan:

- tombol tambah anggota di toolbar diganti menjadi pemicu modal
- form tambah dibuat lebih ringkas agar mirip referensi UI
- mode tambah tidak lagi mengarahkan user ke `frontend/admin/tambah-anggota.html`

Catatan:

- mode edit dari ikon pensil tetap memakai modal yang sama

## Perbaikan Scope Modal Anggota

Error runtime pada modal anggota sudah diperbaiki.

Perubahan:

- scope `isEdit` dikembalikan ke fungsi `openMemberModal`
- submit modal kembali menentukan method `POST` / `PUT` dengan benar

Catatan:

- `favicon.ico` 404 masih terpisah dan tidak memengaruhi fungsi anggota

## Perbaikan Search Anggota

Search anggota yang sebelumnya memicu `500` saat tidak ada hasil sudah diperbaiki.

Perubahan:

- query pencarian di `GET /api/members` memakai placeholder unik per kolom
- pencarian dengan input yang tidak cocok sekarang kembali menghasilkan respons normal

Catatan:

- error `favicon.ico` tetap hanya warning browser, bukan error fitur anggota

## Search Tanpa Hilang Fokus

Perilaku search anggota sudah dirapikan agar input tetap bisa dilanjutkan tanpa klik ulang.

Perubahan:

- refresh hasil search tidak lagi me-render ulang shell penuh saat sukses
- fokus input search tetap terjaga saat daftar anggota diperbarui
- kartu statistik tetap menampilkan total seluruh anggota, bukan hasil yang sedang terfilter

Catatan:

- tabel tetap mengikuti query search, tetapi ringkasan kartu tetap global

## Render Awal Anggota

Panel anggota yang sempat tidak menampilkan tabel, search, dan filter sudah dipulihkan.

Perubahan:

- load awal sekarang memastikan panel tabel dirender setelah data sukses dimuat
- search/filter tetap memperbarui isi panel tanpa menghilangkan fokus input

Catatan:

- regresi ini muncul karena render sukses hanya memperbarui state tanpa membuat panel tabel baru saat halaman pertama kali dibuka

## Load Awal Anggota

Render awal anggota sekarang memastikan panel tabel benar-benar muncul setelah data berhasil dimuat.

Perubahan:

- load awal memakai `renderShell()` saat panel tabel belum ada
- reload berikutnya tetap memakai update parsial agar search tidak kehilangan fokus

Catatan:

- masalah sebelumnya terjadi karena update sukses menyasar panel loading yang belum punya elemen tabel

## Sirkulasi Baru

Status:

- halaman sirkulasi sekarang memakai modul baru `frontend/admin/sirkulasi-view.js`
- tombol `BUAT PEMINJAMAN BARU` membuka modal form inline, bukan pindah halaman
- daftar transaksi memakai endpoint `/api/loans` dengan search dan filter status
- submit peminjaman sudah menulis ke tabel `loans` dan `loan_items`, lalu mengurangi stok buku
- search sirkulasi sekarang local update supaya fokus input tidak hilang saat mengetik
- kolom aksi sudah kembali dengan tombol detail dan proses pengembalian transaksi
- tombol export/cetak sirkulasi sudah kembali di toolbar
- aksi edit dan batalkan transaksi sudah tersedia dan tersambung ke backend
- status `terlambat` sekarang disinkronkan otomatis saat lewat due date
- denda dihitung dari keterlambatan lebih dari 7 hari dengan acuan `fine_per_day`

Catatan:

- routing modul lama di `frontend/shared/entry.js` sudah diarahkan ke modul baru
- syntax check `backend/routes/api.php` dan `frontend/admin/sirkulasi-view.js` lolos

## Penanganan Error Peminjaman

Status:

- `frontend/shared/api.js` sekarang membaca respons non-JSON dengan fallback aman supaya error HTML dari server tidak memicu `Unexpected token '<'`
- submit peminjaman di `frontend/admin/sirkulasi-view.js` diberi guard agar tidak mudah terkirim dua kali saat request masih berjalan
- verifikasi manual ke endpoint `POST /api/loans` menunjukkan respons JSON `422` saat stok buku tidak mencukupi pada data saat ini

Catatan:

- perubahan ini ditujukan untuk membuat pesan error lebih jelas dan mengurangi risiko user mengulang submit karena bingung melihat respons server

## Sinkronisasi Stok Modal

Status:

- `POST /api/loans` sudah diperbaiki agar tidak lagi melempar `500` dari closure `formatLoan` yang belum masuk `use()`
- `backend/src/Middleware/AuthMiddleware.php` sekarang menangani hasil unauthorized/forbidden tanpa warning PHP yang mencemari respons JSON
- `backend/src/Http/Request.php` punya fallback header `Authorization` untuk skenario Apache/XAMPP yang tidak selalu mengisi `getallheaders()`
- modal sirkulasi sekarang refresh daftar anggota dan buku sebelum dibuka supaya stok yang tampil tidak stale
- saat simpan berhasil, modal menampilkan pesan sukses singkat lalu tabel dimuat ulang otomatis

Catatan:

- data stok buku di database saat ini memang `0` untuk buku yang dipilih, jadi save yang benar akan ditolak `422` sampai stok ditambah atau buku lain dipakai

## Halaman Laporan Terhubung Database

Status:

- `frontend/admin/laporan.js` sekarang memuat ringkasan laporan dari endpoint database, bukan lagi data hardcoded
- backend menambah endpoint `GET /api/reports/overview` untuk ringkasan anggota, buku, kategori, sirkulasi, tren bulanan, buku terpopuler, kategori dominan, dan aktivitas terbaru
- tombol unduh laporan di halaman laporan sekarang menghasilkan CSV dari data report yang diambil dari database
- verifikasi manual menunjukkan endpoint report mengembalikan respons JSON `200` dengan data agregat yang valid

Catatan:

- halaman laporan tetap memakai shell admin yang sama, hanya isi kontennya yang sekarang ditarik dari database

## Penyelarasan Layout Laporan

Status:

- layout laporan sudah disusun ulang agar mengikuti screenshot referensi dengan struktur: hero, 4 KPI, chart bulanan, kartu koleksi, 5 buku terpopuler, analisis pengadaan, dan profil demografi
- backend `GET /api/reports/overview` sekarang juga mengirim data `monthly_activity`, `category_analysis`, dan `demographics` agar semua kartu laporan bisa dirender dari database
- chart peminjaman/pengadaan dibuat tetap terisi secara visual walau data bulanan terkonsentrasi pada satu periode

Catatan:

- perubahan ini menjaga halaman tetap data-driven, tetapi secara visual mendekati komposisi yang diminta pada screenshot

## Verifikasi Visual Laporan

Status:

- halaman laporan sudah dicek ulang di browser lokal dengan session admin yang valid
- struktur dan proporsi utama sudah sesuai referensi yang diberikan

Perubahan:

- render laporan dibuka langsung dari `frontend/admin/laporan.html` agar bisa dibandingkan dengan screenshot referensi
- hasil render memperlihatkan semua bagian inti yang diminta: hero, KPI, chart, koleksi, top books, analisis, dan demografi

Catatan:

- data tetap mengikuti database, jadi angka isi kartu bisa berbeda dari screenshot referensi jika isi database berubah
- kalau nanti perlu penyamaan pixel-level, fokus berikutnya ada di detail spacing, ukuran font, dan data seed yang dipakai untuk demo visual

## Penyempurnaan Card Demografi

Status:

- card `Profil Demografi Pengguna` sekarang menampilkan band demografi kosong `0%` bila database tidak punya field usia eksplisit
- CTA `DETAIL KATEGORI` pada card analisis sudah diarahkan ke `frontend/admin/kategori.html`

Perubahan:

- backend laporan tidak lagi menginfer umur dari `birth_date`
- teks naratif statis di card demografi dihapus
- link analisis kategori diganti menjadi navigasi langsung ke halaman kategori

Catatan:

- perubahan ini membuat card demografi tetap data-driven tanpa mengarang data usia dari field yang bukan usia

## Filter Laporan Dinamis

Status:

- halaman laporan sekarang menerima filter periode custom yang memengaruhi ringkasan, daftar buku terpopuler, analisis kategori, dan recent loans
- kartu `Tren Sirkulasi Buku Bulanan` memakai filter tahun khusus yang terpisah dari filter global halaman
- teks `Data agregat report internal institusi untuk ...` sekarang mengikuti rentang tanggal yang dipilih di filter

Perubahan:

- endpoint `GET /api/reports/overview` menerima parameter `start_date`, `end_date`, dan `chart_year`
- frontend menambahkan popover filter periode pada tombol kalender di hero laporan
- kartu tren bulanan mendapat select tahun dan tombol terapkan sendiri, tanpa ikut terpengaruh filter periode global
- chart bulanan kini selalu menampilkan 12 bulan dari Jan sampai Des untuk tahun yang dipilih

Catatan:

- pemisahan filter ini sengaja dibuat supaya perubahan periode laporan tidak mengubah sumbu tahun chart
- syntax check backend dan frontend sudah dijalankan dan lolos

## Perbaikan Respons Laporan

Status:

- endpoint laporan yang sempat memunculkan `500` saat dipanggil dengan filter kini sudah kembali `200 OK`
- laporan dapat dimuat memakai token sesi admin yang valid dari browser

Perubahan:

- placeholder SQL yang sebelumnya dipakai berulang di prepared statement diganti menjadi placeholder unik per query
- verifikasi ulang ke endpoint `/api/reports/overview` dengan `start_date`, `end_date`, dan `chart_year` berhasil mengembalikan JSON sukses

Catatan:

- bila halaman masih menampilkan error lama, cukup refresh browser karena state error berasal dari render sebelumnya

## Auto Refresh Tren

Status:

- card `Tren Sirkulasi Buku Bulanan` sekarang langsung memuat ulang laporan saat tahun diubah
- batang grafik untuk bulan tanpa data tidak lagi dipaksa muncul, sehingga slot kosong tetap bersih

Perubahan:

- tombol `Tampilkan` pada card tren dihapus
- kontrol tahun diganti menjadi input angka agar bisa diketik langsung
- event `input`, `change`, dan `wheel` pada input tahun memanggil reload report otomatis
- rendering batang chart hanya menampilkan bar jika nilai bulan tersebut lebih besar dari nol

Catatan:

- label bulan tetap tampil penuh supaya struktur Jan sampai Des tidak berubah walau beberapa bulan kosong

## Donut Kategori Dan Bar Kosong

Status:

- card `Koleksi Buku berdasarkan Kategori` sekarang menampilkan donut chart berwarna sesuai kategori
- card `5 Buku Paling Banyak Dipinjam` tidak lagi memaksa bar untuk nilai `0`

Perubahan:

- donut kategori dirender dengan `conic-gradient` berdasarkan jumlah buku per kategori
- inner ring dipakai untuk merapikan angka total di tengah donut
- bar top books untuk nilai nol dibiarkan kosong tanpa lebar minimum

Catatan:

- tampilan legenda tetap mengikuti tiga kategori teratas supaya tetap ringkas
- data bernilai nol memang sengaja tidak divisualkan sebagai batang agar chart lebih jujur dan lebih mudah dibaca

## Logout Sidebar Dan Avatar

Status:

- klik `Keluar` di sidebar admin sekarang selalu memutus session lalu berpindah ke halaman login
- menu `Settings` di sidebar admin sudah dihapus
- avatar profil admin di sidebar memakai huruf awal nama, tanpa titik

Perubahan:

- `frontend/shared/auth.js` mengarahkan logout dengan `preventDefault()` dan `window.location.replace()`
- `frontend/shared/sidebar-admin.js` menghapus item settings dan mengganti avatar bullet menjadi inisial nama

Catatan:

- perubahan ini fokus ke sidebar admin; kalau nanti sidebar kepala juga perlu diseragamkan, pola yang sama bisa dipakai di `frontend/shared/sidebar-kepala.js`

## Logout Yang Lebih Pasti

Status:

- handler logout sekarang memakai delegation di `document` supaya klik pada teks, ikon, atau area kecil tetap dikenali
- target logout memakai path login absolut untuk admin dan kepala
- avatar sidebar admin dan kepala memakai inisial nama profil

Perubahan:

- `frontend/shared/auth.js` membaca target logout dari `data-logout-target` atau `href` dan langsung melakukan redirect setelah session dihapus
- `frontend/shared/sidebar-admin.js` dan `frontend/shared/sidebar-kepala.js` memakai `getLoginPath(...)` untuk target logout

Catatan:

- pendekatan ini mengurangi risiko gagal logout karena path relatif atau event klik yang tidak mengenai elemen anchor secara langsung

## Pengaturan Kepala Perpustakaan Ke Database

Status:

- halaman `frontend/kepala-perpustakaan/pengaturan.html` sekarang terhubung ke database lewat `frontend/kepala-perpustakaan/pengaturan.js`
- konfigurasi disimpan ke tabel `app_settings` dan bisa dibaca kembali saat halaman dibuka

Perubahan:

- backend menambah endpoint `GET /api/settings` dan `PUT /api/settings` untuk role `admin` dan `kepala`
- form pengaturan memuat nilai aplikasi, instansi, identitas kepala, kontak, lama pinjam, dan denda harian
- tombol simpan mengirim data ke API, lalu render diperbarui dari respons database terbaru

Catatan:

- file `backend/routes/api.php` dan `frontend/kepala-perpustakaan/pengaturan.js` lolos pengecekan sintaks setelah perubahan
