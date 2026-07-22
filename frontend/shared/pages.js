import { appShell, dataTable, formPage, loginPage, mount, panel, stat } from "./components.js";

const categoryRows = [
  ["1", "KAT-001", "Teknologi", "Buku teknologi, komputer, dan informasi", "Aktif"],
  ["2", "KAT-002", "Sastra", "Novel, puisi, dan karya sastra", "Aktif"],
  ["3", "KAT-003", "Sejarah", "Buku sejarah lokal dan nasional", "Aktif"],
  ["4", "KAT-004", "Pendidikan", "Referensi belajar dan pengajaran", "Aktif"],
  ["5", "KAT-005", "Arsip Lama", "Kategori koleksi nonaktif", "Nonaktif"],
];

const booksRows = [
  ["BK-001", "Laskar Pelangi", "Andrea Hirata", "Bentang Pustaka", "2005", "Fiksi", "15", "Aktif"],
  ["BK-002", "Sejarah Nusantara", "M.C. Ricklefs", "Serambi Ilmu", "2008", "Sejarah", "1", "Aktif"],
  ["BK-003", "Arsitektur Cloud Computing", "Bambang S.", "Informatika", "2022", "Teknologi", "24", "Aktif"],
  ["BK-004", "Bumi Manusia", "Pramoedya A. Toer", "Lentera Dipantara", "1980", "Fiksi", "8", "Aktif"],
  ["BK-005", "Dasar-Dasar AI", "Dr. Heru S.", "Andi Offset", "2023", "Teknologi", "0", "Aktif"],
];

const memberRows = [
  ["1", "Aulia Rahmah", "12 Mei 2003", "21", "Perempuan", "Paringin", "Aktif"],
  ["2", "M. Reza Fahlevi", "08 Jan 2001", "23", "Laki-laki", "Batumandi", "Aktif"],
  ["3", "Dina Pratiwi", "17 Jul 2004", "20", "Perempuan", "Lampihong", "Aktif"],
  ["4", "Farhan Hidayat", "22 Mar 1999", "25", "Laki-laki", "Awayan", "Nonaktif"],
];

const circulationRows = [
  ["TRX-001", "Laskar Pelangi", "Aulia Rahmah", "12 Okt 2023", "19 Okt 2023", "Dipinjam"],
  ["TRX-002", "Bumi Manusia", "M. Reza", "09 Okt 2023", "16 Okt 2023", "Terlambat"],
  ["TRX-003", "Atomic Habits", "Dina Pratiwi", "04 Okt 2023", "11 Okt 2023", "Kembali"],
  ["TRX-004", "Sejarah Banjar", "Farhan Hidayat", "01 Okt 2023", "08 Okt 2023", "Kembali"],
];

const reportRows = [
  ["1", "Sejarah Nusantara: Edisi Balangan", "Sejarah", "1,240", "Tersedia", "14 Okt 2023"],
  ["2", "Inovasi Pertanian Banua", "Teknologi", "982", "Stok Menipis", "12 Okt 2023"],
  ["3", "Atlas Budaya Kalimantan Selatan", "Sastra", "855", "Kosong", "10 Okt 2023"],
  ["4", "Ensiklopedia Geografi Balangan", "Sains", "720", "Tersedia", "08 Okt 2023"],
  ["5", "Statistik Pembangunan Daerah", "Data", "612", "Tersedia", "05 Okt 2023"],
];

const analyticsRows = [
  ["#1", "Pengantar Data Science", "Teknologi", "124", "KRITIS (2)", "Tambah 20 Eks"],
  ["#2", "Kumpulan Novel Fiksi Remaja", "Fiksi", "98", "MENIPIS (8)", "Tambah 15 Eks"],
  ["#3", "Ensiklopedia Flora Balangan", "Sains Lokal", "86", "KRITIS (3)", "Tambah 10 Eks"],
  ["#4", "Manajemen Keuangan Publik", "Sosial", "72", "CUKUP", "Pertahankan"],
];

const userRows = [
  ["1", "Rahmat Setiawan", "Kepala Perpustakaan", "rahmat.balangan@gmail.com", "Aktif"],
  ["2", "Anisa Sucipto", "Admin Sistem", "anisa.it@balangankab.go.id", "Aktif"],
  ["3", "Budi Waluyo", "Pustakawan Madya", "budi_waluyo@yahoo.com", "Nonaktif"],
  ["4", "Dewi Lestari", "Admin Data", "dewi.balangan@outlook.com", "Aktif"],
];

function categoryModal() {
  return `<div class="modal-layer">
    <div class="modal">
      <div class="modal-head">
        <h3>Tambah Kategori Baru</h3>
        <button class="modal-close">×</button>
      </div>
      <div class="modal-body">
        <div class="info-box">
          <span>ⓘ</span>
          <div><strong>ID KATEGORI OTOMATIS</strong>Sistem akan secara otomatis membuat ID kategori (ex: KAT-025) setelah disimpan.</div>
        </div>
        <div class="field"><label>NAMA KATEGORI <span style="color:#ba1a1a">*</span></label><div class="input">Masukkan nama kategori (mis: Fiksi)</div></div>
        <div class="field"><label>DESKRIPSI SINGKAT</label><div class="input textarea">Tuliskan deskripsi singkat mengenai kategori ini...</div></div>
        <div class="field"><label>STATUS KATEGORI</label><div class="radio-row"><span><i class="radio on"></i>Aktif</span><span><i class="radio"></i>Nonaktif</span></div></div>
      </div>
      <div class="modal-foot"><button class="btn">BATAL</button><button class="btn primary">SIMPAN KATEGORI</button></div>
    </div>
  </div>`;
}

function addBookModal() {
  return `<div class="modal-layer">
    <div class="modal" style="width:448px">
      <div class="modal-head">
        <h3>Form Tambah Buku Baru</h3>
        <button class="modal-close">×</button>
      </div>
      <div class="modal-body" style="gap:16px">
        <p style="margin:0;color:#6e7979;font-size:12px;line-height:16px">Masukkan informasi katalog lengkap sesuai buku fisik</p>
        <div class="field full"><label>Judul Buku</label><div class="input">Contoh: Belajar Pemrograman Web</div></div>
        <div class="split" style="gap:16px">
          <div class="field"><label>Penulis</label><div class="input">Nama penulis</div></div>
          <div class="field"><label>Penerbit</label><div class="input">Nama penerbit</div></div>
        </div>
        <div class="split" style="gap:16px">
          <div class="field"><label>Tahun Terbit</label><div class="input">2024</div></div>
          <div class="field"><label>Kategori</label><div class="input">Teknologi</div></div>
        </div>
        <div class="field"><label>Jumlah Stok</label><div class="input">1</div></div>
      </div>
      <div class="modal-foot"><button class="btn">Batal</button><button class="btn primary">Simpan Data</button></div>
    </div>
  </div>`;
}

function userFormImageCard() {
  return `<div class="panel" style="padding:16px;border-radius:8px">
    <div style="display:flex;flex-direction:column;gap:12px">
      <div style="font-size:12px;font-weight:700;color:#006565;letter-spacing:.6px">KEBIJAKAN KEAMANAN</div>
      <p style="margin:0;color:#6e7979;font-size:12px;line-height:18px">Pastikan kata sandi minimal memiliki 8 karakter dengan kombinasi angka dan simbol untuk keamanan maksimal sistem EIS Balangan.</p>
      <div style="height:305px;border-radius:6px;overflow:hidden;background:linear-gradient(180deg,#d9e4e6,#8db0b5);position:relative">
        <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.05),rgba(0,0,0,.25));"></div>
        <div style="position:absolute;left:12px;bottom:12px;color:#fff;font-size:12px">Mewujudkan Literasi Digital Unggul di Balangan</div>
      </div>
    </div>
  </div>`;
}

export const pages = {
  adminLogin: () => loginPage("admin"),
  kepalaLogin: () => loginPage("kepala"),

  category: () =>
    appShell(
      "admin",
      "category",
      "Manajemen Kategori Buku",
      `<div class="analytics-grid">
        ${stat("TOTAL KATEGORI", "24", "Kategori buku terdaftar", "▤", "teal", "+3 bulan ini")}
        ${stat("KATEGORI TERPOPULER", "Teknologi & Komputer", "1,245 buku terdaftar", "★", "blue", "POPULER")}
        ${stat("KATEGORI NONAKTIF", "2", "8.3% dari total kategori", "⊘", "red", "NONAKTIF")}
      </div>
      ${panel(
        "Daftar Kategori",
        "24 TOTAL",
        `<button class="btn primary">＋ TAMBAH KATEGORI</button><div class="search">⌕ <span>Cari...</span></div><button class="btn">☰</button>`,
        dataTable(["NO", "ID", "NAMA KATEGORI", "DESKRIPSI", "STATUS"], categoryRows, {
          widths: ["67.6px", "128px", "170px", "344px", "128px"],
          actions: false,
        }),
      )}`,
      categoryModal(),
    ),

  books: () =>
    appShell(
      "admin",
      "books",
      "Daftar Katalog Buku",
      `<div class="hero-row">
        <div>
          <p class="eyebrow">LIBRARY EIS BALANGAN</p>
          <h1 class="page-title">Daftar Katalog Buku</h1>
          <p class="page-copy">Kelola data koleksi buku, penerbit, kategori, dan status ketersediaan.</p>
        </div>
      </div>
      <div class="stats-4">
        ${stat("TOTAL KOLEKSI", "12,482", "", "▥")}
        ${stat("BUKU DIPINJAM", "431", "", "▥", "blue")}
        ${stat("STOK MENIPIS", "12", "", "△", "amber")}
        ${stat("INPUT BARU\nBULAN INI", "156", "", "↺", "teal")}
      </div>
      ${panel(
        "Katalog Buku Aktif",
        "",
        `<div class="search" style="width:31px;justify-content:center;padding:0">☰</div><div class="search"><span>⌕</span><span>Cari buku...</span></div><a class="btn primary" href="tambah-buku.html">＋ Tambah Buku</a>`,
        dataTable(["ID BUKU", "JUDUL BUKU", "PENULIS", "PENERBIT", "TAHUN", "KATEGORI", "STOK"], booksRows, {
          widths: ["60px", "185px", "160px", "135px", "74px", "120px", "56px"],
        }),
      )}`,
    ),

  addBook: () =>
    appShell(
      "admin",
      "books",
      "Daftar Katalog Buku",
      `<div class="hero-row">
        <div>
          <p class="eyebrow">LIBRARY EIS BALANGAN</p>
          <h1 class="page-title">Daftar Katalog Buku</h1>
          <p class="page-copy">Kelola data koleksi buku, penerbit, kategori, dan status ketersediaan.</p>
        </div>
      </div>
      <div class="stats-4">
        ${stat("TOTAL KOLEKSI", "12,482", "", "▥")}
        ${stat("BUKU DIPINJAM", "431", "", "▥", "blue")}
        ${stat("STOK MENIPIS", "12", "", "△", "amber")}
        ${stat("INPUT BARU\nBULAN INI", "156", "", "↺", "teal")}
      </div>
      ${panel(
        "Katalog Buku Aktif",
        "",
        `<div class="search" style="width:31px;justify-content:center;padding:0">☰</div><div class="search"><span>⌕</span><span>Cari buku...</span></div><a class="btn primary" href="tambah-buku.html">＋ Tambah Buku</a>`,
        dataTable(["ID BUKU", "JUDUL BUKU", "PENULIS", "PENERBIT", "TAHUN", "KATEGORI", "STOK"], booksRows, {
          widths: ["60px", "185px", "160px", "135px", "74px", "120px", "56px"],
        }),
      )}`,
      addBookModal(),
    ),

  members: () =>
    appShell(
      "admin",
      "members",
      "Data Anggota",
      `<div class="hero-row">
        <div>
          <p class="eyebrow">LIBRARY EIS BALANGAN</p>
          <h1 class="page-title">Data Anggota</h1>
          <p class="page-copy">Kelola dan pantau informasi keanggotaan perpustakaan untuk memastikan sirkulasi buku yang efisien dan akurat.</p>
        </div>
      </div>
      <div class="stats-4">
        ${stat("TOTAL ANGGOTA", "42", "", "◎")}
        ${stat("AKTIF", "8", "", "↺", "blue")}
        ${stat("ONLINE SAAT INI", "12", "", "◌", "green")}
        ${stat("NONAKTIF", "4", "", "⊘", "red")}
      </div>
      ${panel(
        "Daftar Anggota",
        "",
        `<a class="btn primary" href="tambah-anggota.html">＋ Tambah Anggota</a><div class="search"><span>⌕</span><span>Cari nama atau ID...</span></div><button class="btn">Filter</button>`,
        dataTable(["NO", "NAMA LENGKAP", "TANGGAL LAHIR", "USIA", "JENIS KELAMIN", "ALAMAT SINGKAT", "STATUS"], memberRows, {
          widths: ["56px", "168px", "132px", "62px", "118px", "148px", "86px"],
        }),
      )}`,
    ),

  addMember: () =>
    appShell(
      "admin",
      "members",
      "Tambah Anggota Baru",
      `<div class="hero-row">
        <div>
          <h1 class="page-title">Tambah Anggota Baru</h1>
          <p class="page-copy">Lengkapi data anggota baru untuk pendaftaran ke sistem perpustakaan.</p>
        </div>
      </div>
      <div class="split">
        <section class="panel">
          <div class="panel-toolbar" style="min-height:auto;padding-bottom:0">
            <div>
              <h2 class="panel-title">Informasi Anggota</h2>
              <p class="page-copy" style="margin-top:6px;font-size:14px">Masukkan data diri anggota secara lengkap.</p>
            </div>
          </div>
          <div class="form-shell slim" style="border:0;box-shadow:none;padding:20px 0 0">
            <div class="form-grid">
              <div class="field"><label>NAMA LENGKAP</label><div class="input">Masukkan nama sesuai KTP</div></div>
              <div class="field"><label>NIK (NOMOR INDUK KEPENDUDUKAN)</label><div class="input">Masukkan 16 digit NIK</div></div>
              <div class="field"><label>TANGGAL LAHIR</label><div class="input">mm / dd / yyyy</div></div>
              <div class="field"><label>JENIS KELAMIN</label><div class="input">Pilih jenis kelamin</div></div>
              <div class="field full"><label>ALAMAT</label><div class="input textarea">Alamat lengkap</div></div>
            </div>
            <div class="form-actions"><button class="btn">Batal</button><button class="btn primary">Simpan</button></div>
          </div>
        </section>
        ${userFormImageCard()}
      </div>`,
      "",
      { compact: true },
    ),

  circulation: () =>
    appShell(
      "admin",
      "circulation",
      "Riwayat & Transaksi Peminjaman",
      `<div class="hero-row">
        <div>
          <h1 class="page-title">Riwayat & Transaksi Peminjaman</h1>
          <p class="page-copy">Pantau dan kelola seluruh arus sirkulasi buku perpustakaan Balangan.</p>
        </div>
        <div><button class="btn">EXPORT</button> <a href="tambah-peminjaman.html" class="btn primary">＋ BUAT PEMINJAMAN BARU</a></div>
      </div>
      <div class="stats-4">
        ${stat("Total Buku Terpinjam", "1,284", "", "▥")}
        ${stat("Sedang Dipinjam", "342", "", "↔")}
        ${stat("Dikembalikan (Bln Ini)", "156", "", "✓")}
        ${stat("Terlambat", "18", "", "!", "red")}
      </div>
      ${panel(
        "Data Transaksi",
        "",
        `<div class="search"><span>⌕</span><span>Cari transaksi...</span></div>`,
        dataTable(["ID", "BUKU", "ANGGOTA", "PINJAM", "KEMBALI", "STATUS"], circulationRows, {
          widths: ["90px", "170px", "160px", "118px", "118px", "106px"],
        }),
      )}`,
    ),

  addBorrow: () =>
    appShell(
      "admin",
      "circulation",
      "Buat Peminjaman Baru",
      `<div class="hero-row">
        <div>
          <h1 class="page-title">Buat Peminjaman Baru</h1>
          <p class="page-copy">Masukkan informasi transaksi peminjaman buku.</p>
        </div>
      </div>
      <section class="form-shell">
        <div class="form-grid">
          <div class="field"><label>ID TRANSAKSI</label><div class="input">TRX-005</div></div>
          <div class="field"><label>NAMA ANGGOTA</label><div class="input">Pilih anggota</div></div>
          <div class="field"><label>JUDUL BUKU</label><div class="input">Pilih buku</div></div>
          <div class="field"><label>TANGGAL PINJAM</label><div class="input">21/07/2026</div></div>
          <div class="field"><label>TANGGAL KEMBALI</label><div class="input">28/07/2026</div></div>
          <div class="field"><label>STATUS</label><div class="input">Dipinjam</div></div>
        </div>
        <div class="form-actions"><button class="btn">Batal</button><button class="btn primary">Simpan</button></div>
      </section>`,
      "",
      { compact: true },
    ),

  editTransaction: () =>
    appShell(
      "admin",
      "circulation",
      "Edit Transaksi",
      `<div class="hero-row">
        <div>
          <h1 class="page-title">Edit Transaksi</h1>
          <p class="page-copy">Perbarui informasi transaksi peminjaman buku.</p>
        </div>
      </div>
      <section class="form-shell">
        <div class="form-grid">
          <div class="field"><label>ID TRANSAKSI</label><div class="input">TRX-001</div></div>
          <div class="field"><label>NAMA ANGGOTA</label><div class="input">Aulia Rahmah</div></div>
          <div class="field"><label>JUDUL BUKU</label><div class="input">Laskar Pelangi</div></div>
          <div class="field"><label>TANGGAL PINJAM</label><div class="input">12/10/2023</div></div>
          <div class="field"><label>TANGGAL KEMBALI</label><div class="input">19/10/2023</div></div>
          <div class="field"><label>STATUS</label><div class="input">Dipinjam</div></div>
        </div>
        <div class="form-actions"><button class="btn">Batal</button><button class="btn primary">Simpan</button></div>
      </section>`,
      "",
      { compact: true },
    ),

  report: () =>
    appShell(
      "admin",
      "report",
      "Laporan & Analitik Sistem",
      `<div class="hero-row">
        <div>
          <p class="eyebrow">Sistem Informasi Eksekutif Perpustakaan</p>
          <h1 class="page-title">Laporan & Analitik Sistem</h1>
          <p class="page-copy">Data agregat performa institusi untuk Q3 2023.</p>
        </div>
        <button class="btn primary">Unduh Laporan Lengkap</button>
      </div>
      <div class="stats-4">
        ${stat("TOTAL ANGGOTA\nAKTIF", "12,482", "+4.2%", "◉", "green")}
        ${stat("PEMINJAMAN\nBULANAN", "3,120", "+12.8%", "↔", "teal")}
        ${stat("TINGKAT\nKETERLAMBATAN", "4.8%", "-1.2%", "!", "red")}
        ${stat("KOLEKSI\nTERDATA", "3,500", "judul buku", "▤")}
      </div>
      <div class="split">
        <section class="panel">
          <div class="panel-toolbar"><h2 class="panel-title">Tren Peminjaman</h2></div>
          <div class="chart">${[60, 130, 90, 180, 220, 155, 260, 210].map((h) => `<div class="bar" style="height:${h}px"></div>`).join("")}</div>
        </section>
        <section class="panel">
          <div class="panel-toolbar"><h2 class="panel-title">Kategori Dominan</h2></div>
          <div class="content" style="padding-top:0">${["Teknologi", "Sastra", "Sejarah", "Pendidikan", "Agama"]
            .map((x, i) => `<p style="margin:0 0 18px"><strong>${x}</strong><span style="float:right">${38 - i * 5}%</span></p>`)
            .join("")}</div>
        </section>
      </div>`,
      "",
      { compact: true },
    ),

  adminSettings: () =>
    formPage(
      "admin",
      "report",
      "Pengaturan Admin",
      "Kelola preferensi akun administrator dan pengaturan operasional sistem.",
      [
        { label: "Nama Lengkap", value: "Admin Perpus" },
        { label: "Peran", value: "Administrator" },
        { label: "Email", value: "admin@balangan.go.id" },
        { label: "Unit", value: "Layanan Perpustakaan" },
        { label: "Status", value: "Aktif" },
        { label: "Akses", value: "Manajemen Data Operasional", full: true },
      ],
      { slim: true },
    ),

  headDashboard: () =>
    appShell(
      "kepala",
      "headDashboard",
      "Executive Dashboard - Analisis Peminjaman Buku",
      `<div class="hero-row" style="margin-bottom:18px">
        <div>
          <h1 class="page-title">Executive Dashboard - Analisis Peminjaman Buku</h1>
        </div>
      </div>
      <div class="stats-4" style="margin-top:28px">
        ${stat("TOTAL PEMINJAMAN", "1,245", "Transaksi bulan ini", "↔", "green", "+12%")}
        ${stat("BUKU SEDANG DIPINJAM", "180", "Buku dalam sirkulasi", "▤", "amber", "AKTIF")}
        ${stat("TOTAL KOLEKSI BUKU", "3,500", "Judul buku terdaftar", "▥")}
        ${stat("TOTAL ANGGOTA AKTIF", "850", "Anggota tervalidasi", "◎", "green", "+5.4%")}
      </div>
      <div class="split">
        <section class="panel">
          <div class="panel-toolbar"><h2 class="panel-title">Kategori Buku Terpopuler</h2><span style="color:#006565">...</span></div>
          <div class="content"><div style="height:270px;border-radius:999px;border:18px solid #006565;border-top-color:#b06b33;border-right-color:#0b66e8;border-bottom-color:#c3c9c9;display:grid;place-items:center;font-size:28px;font-weight:700;color:#6e7979">1.2k</div></div>
        </section>
        <section class="panel">
          <div class="panel-toolbar"><h2 class="panel-title">Demografi Usia Pengunjung</h2><span style="color:#006565">●</span></div>
          <div class="content">
            ${["< 12 Tahun", "13 - 17 Tahun", "18 - 25 Tahun", "26 - 40 Tahun", "> 40 Tahun"]
              .map(
                (label, i) => `<div style="margin-bottom:14px">
                  <div style="display:flex;justify-content:space-between;font-size:12px;color:#3e4949;margin-bottom:6px"><span>${label}</span><span>${[15, 28, 42, 10, 5][i]}%</span></div>
                  <div style="height:6px;background:#e6e7e8;border-radius:999px;overflow:hidden"><div style="width:${[15, 28, 42, 10, 5][i]}%;height:100%;background:#0b66e8"></div></div>
                </div>`,
              )
              .join("")}
          </div>
        </section>
      </div>
      <section class="panel" style="margin-top:24px">
        <div class="panel-toolbar">
          <div><h2 class="panel-title">Rekomendasi Pengadaan Judul Baru</h2><div class="page-copy" style="font-size:12px">Berdasarkan rasio keterbacaan stok vs minat baca.</div></div>
          <button class="btn">Filter Kategori</button>
        </div>
        ${dataTable(["PERINGKAT", "KATEGORI/JUDUL", "TOTAL PEMINJAMAN", "STATUS STOK SAAT INI", "REKOMENDASI"], analyticsRows, {
          widths: ["96px", "auto", "170px", "170px", "160px"],
          actions: false,
        })}
        <div class="pagination"><span>Lihat Seluruh Rekomendasi (24 Judul)</span><div></div></div>
      </section>`,
      "",
      { compact: true },
    ),

  collection: () =>
    appShell(
      "kepala",
      "collection",
      "Sistem Informasi Eksekutif",
      `<div class="hero-row" style="margin-bottom:18px">
        <div>
          <p class="page-copy" style="margin:0 0 4px;color:#006565;font-size:14px;font-weight:700">Dashboard Eksekutif › Koleksi</p>
          <h1 class="page-title" style="color:#006565">Analisis Koleksi Perpustakaan</h1>
        </div>
        <div class="search">⌕ <span>Cari data koleksi...</span></div>
      </div>
      <div class="stats-4">
        ${stat("Total Koleksi Buku", "12.845", "", "▤", "green", "+2.4%")}
        ${stat("Kategori Buku", "24", "", "▧")}
        ${stat("Buku Baru", "156", "Bulan Ini", "＋", "blue")}
        ${stat("Koleksi Digital", "3.200", "", "◱")}
      </div>
      <div class="split">
        <section class="panel">
          <div class="panel-toolbar"><h2 class="panel-title">Pertumbuhan Koleksi Tahunan</h2><button class="btn">Export</button></div>
          <div style="height:260px;border-top:1px solid #eef2f3;border-bottom:1px solid #eef2f3;background:#fff"></div>
        </section>
        <section class="panel">
          <div class="panel-toolbar"><h2 class="panel-title">Distribusi Kategori</h2></div>
          <div class="content" style="display:grid;grid-template-columns:220px 1fr;gap:24px;align-items:center">
            <div style="width:180px;height:180px;border-radius:50%;border:20px solid #0b66e8;border-top-color:#8a4d22;border-right-color:#006565;border-bottom-color:#d9d9d9;margin:0 auto;display:grid;place-items:center;font-size:24px;font-weight:700">100%</div>
            <div>
              ${[
                ["Non-Fiksi", "64%", "#006565"],
                ["Fiksi", "24%", "#0b66e8"],
                ["Referensi", "12%", "#8a4d22"],
              ]
                .map(
                  ([label, value, color]) => `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
                    <span style="display:flex;align-items:center;gap:8px"><i style="width:8px;height:8px;border-radius:50%;background:${color};display:inline-block"></i>${label}</span><strong>${value}</strong>
                  </div>`,
                )
                .join("")}
            </div>
          </div>
        </section>
      </div>
      <section class="panel" style="margin-top:24px">
        <div class="panel-toolbar">
          <div><h2 class="panel-title">Daftar Inventaris Koleksi Strategis</h2><div class="page-copy" style="font-size:12px">Data buku dengan tingkat peminjaman tertinggi</div></div>
          <div class="toolbar-actions"><button class="btn">Filter</button><button class="btn primary">Unduh Laporan</button></div>
        </div>
        ${dataTable(["Ranking", "Judul Buku", "Kategori", "Tahun Terbit", "Jumlah Stok", "Status"], [
          ["01", "Manajemen Perpustakaan Modern", "Referensi", "2023", "12 Eks", "Tersedia"],
          ["02", "Laskar Pelangi", "Fiksi", "2020", "45 Eks", "Dipinjam"],
          ["03", "Sejarah Nusantara", "Non-Fiksi", "2021", "8 Eks", "Tersedia"],
          ["04", "Inovasi Digital Balangan", "Referensi", "2024", "20 Eks", "Tersedia"],
        ], { widths: ["76px", "260px", "120px", "120px", "120px", "120px"], actions: false })}
        <div class="pagination"><span>Menampilkan 1-4 dari 24 kategori</span><div class="pages"><button class="page-btn">‹</button><button class="page-btn active">1</button><button class="page-btn">2</button><button class="page-btn">3</button><button class="page-btn">›</button></div></div>
      </section>`,
      "",
      { compact: true },
    ),

  analytics: () =>
    appShell(
      "kepala",
      "analytics",
      "Sistem Informasi Eksekutif",
      `<div class="hero-row" style="margin-bottom:18px">
        <div>
          <p class="page-copy" style="margin:0 0 4px;color:#006565;font-size:14px;font-weight:700">Analitik › Rekomendasi Pengadaan</p>
          <h1 class="page-title" style="color:#006565">Analisis Strategis Peminjaman & Pengunjung</h1>
        </div>
      </div>
      <div class="stats-4">
        ${stat("TOTAL PEMINJAMAN\n(BULAN INI)", "1,482", "v.s. 1,318 bulan lalu", "↔", "green", "+12.4%")}
        ${stat("KATEGORI TERPOPULER", "Sastra Fiksi", "Mendominasi 38% sirkulasi", "★")}
        ${stat("RATA-RATA USIA\nPENGUNJUNG", "19.5 Tahun", "Kelompok Gen Z mendominasi", "◎")}
        ${stat("PROYEKSI KEBUTUHAN BARU", "450", "Estimasi budget: Rp 45.5jt", "♜", "teal")}
      </div>
      <div class="split">
        <section class="panel">
          <div class="panel-toolbar"><h2 class="panel-title">Tren Peminjaman per Kategori</h2><span>...</span></div>
          <div class="content" style="height:210px"></div>
        </section>
        <section class="panel">
          <div class="panel-toolbar"><h2 class="panel-title">Demografi Usia Pengunjung</h2><div class="page-copy" style="font-size:12px">Pria • Wanita</div></div>
          <div class="content">${["< 12 Tahun", "13 - 17 Tahun", "18 - 25 Tahun", "26 - 40 Tahun", "> 40 Tahun"]
            .map((label, i) => `<div style="margin-bottom:14px">
              <div style="display:flex;justify-content:space-between;font-size:12px;color:#3e4949;margin-bottom:6px"><span>${label}</span><span>${[15, 28, 42, 10, 5][i]}%</span></div>
              <div style="height:6px;background:#e6e7e8;border-radius:999px;overflow:hidden"><div style="width:${[15, 28, 42, 10, 5][i]}%;height:100%;background:#0b66e8"></div></div>
            </div>`)
            .join("")}</div>
        </section>
      </div>
      <section class="panel" style="margin-top:24px">
        <div class="panel-toolbar">
          <div><h2 class="panel-title">Rekomendasi Pengadaan Judul Baru</h2><div class="page-copy" style="font-size:12px">Berdasarkan rasio keterbacaan stok vs minat baca.</div></div>
          <button class="btn">Filter Kategori</button>
        </div>
        ${dataTable(["PERINGKAT", "KATEGORI/JUDUL", "TOTAL PEMINJAMAN", "STATUS STOK SAAT INI", "REKOMENDASI"], analyticsRows, {
          widths: ["96px", "auto", "170px", "170px", "160px"],
          actions: false,
        })}
        <div class="pagination"><span>Lihat Seluruh Rekomendasi (24 Judul)</span><div></div></div>
      </section>`,
      "",
      { compact: true },
    ),

  users: () =>
    appShell(
      "kepala",
      "users",
      "Manajemen Pengguna",
      `<div class="hero-row">
        <div>
          <h1 class="page-title" style="color:#006565">Manajemen Pengguna</h1>
          <p class="page-copy">Kelola hak akses dan akun pengguna sistem informasi eksekutif perpustakaan daerah.</p>
        </div>
        <a href="tambah-pengguna.html" class="btn primary">＋ Tambah Pengguna</a>
      </div>
      <div class="stats-4">
        ${stat("TOTAL PENGGUNA", "42", "", "👥")}
        ${stat("ADMIN AKTIF", "8", "", "◌", "blue")}
        ${stat("ONLINE SAAT INI", "12", "", "◒", "green")}
        ${stat("NONAKTIF", "4", "", "⊘", "red")}
      </div>
      ${panel(
        "Daftar Akun Pengguna",
        "",
        `<div class="search"><span>⌕</span><span>Cari pengguna...</span></div><button class="btn">☰</button><button class="btn">⤓</button>`,
        dataTable(["NO", "NAMA LENGKAP", "JABATAN/PERAN", "EMAIL", "STATUS"], userRows, {
          widths: ["56px", "190px", "168px", "250px", "90px"],
        }),
      )}
      <div class="split" style="margin-top:24px">
        <section class="panel" style="padding:18px">
          <h2 class="panel-title" style="margin-bottom:8px">Panduan Hak Akses</h2>
          <div class="page-copy" style="font-size:13px">Pastikan setiap pengguna memiliki peran yang sesuai. Akun nonaktif secara otomatis akan kehilangan akses login ke seluruh dashboard eksekutif hingga diaktifkan kembali oleh Admin.</div>
        </section>
        <section class="panel" style="padding:18px">
          <h2 class="panel-title" style="margin-bottom:8px">Log Keamanan</h2>
          <div class="page-copy" style="font-size:13px">Seluruh aktivitas penambahan, pengubahan, dan penghapusan akun dicatat dalam sistem log audit untuk menjaga integritas data institusi.</div>
        </section>
      </div>`,
      "",
      { compact: true },
    ),

  addUser: () =>
    appShell(
      "kepala",
      "users",
      "Tambah Pengguna Baru",
      `<div class="hero-row" style="margin-bottom:18px">
        <div>
          <h1 class="page-title" style="color:#006565">Tambah Pengguna Baru</h1>
          <p class="page-copy">Manajemen Pengguna › Tambah Pengguna</p>
        </div>
      </div>
      <div class="split" style="grid-template-columns:1.2fr .8fr;align-items:start">
        <section class="panel" style="padding:24px">
          <h2 class="panel-title">Informasi Akun Pengguna</h2>
          <p class="page-copy" style="margin-top:6px;font-size:13px">Lengkapi data di bawah ini untuk mendaftarkan administrator atau kepala perpustakaan baru ke dalam sistem.</p>
          <div class="form-grid" style="margin-top:20px">
            <div class="field"><label>Nama Lengkap</label><div class="input">Contoh: Budi Santoso</div></div>
            <div class="field"><label>Jabatan / Peran</label><div class="input">Pilih Peran</div></div>
            <div class="field full"><label>Email</label><div class="input">alamat@email.com</div></div>
            <div class="field"><label>Kata Sandi</label><div class="input">••••••••</div></div>
            <div class="field"><label>Konfirmasi Kata Sandi</label><div class="input">••••••••</div></div>
            <div class="field full"><label>Status</label><div class="input">Aktif / Nonaktif</div></div>
          </div>
          <div class="form-actions"><button class="btn primary">Simpan Pengguna</button><button class="btn">Batal</button></div>
        </section>
        ${userFormImageCard()}
      </div>`,
      "",
      { compact: true },
    ),

  recommendations: () =>
    appShell(
      "kepala",
      "analytics",
      "Sistem Informasi Eksekutif",
      `<div class="hero-row" style="margin-bottom:18px">
        <div>
          <p class="page-copy" style="margin:0 0 4px;color:#006565;font-size:14px;font-weight:700">Analitik › Rekomendasi Pengadaan</p>
          <h1 class="page-title" style="color:#006565">Rekomendasi Pengadaan</h1>
        </div>
      </div>
      <div class="stats-4">
        ${stat("TOTAL USULAN\nJUDUL", "124", "Usulan baru bulan ini", "▤", "green", "+12%")}
        ${stat("ANGGARAN\nTERSEDIA", "Rp 45.2M", "Sisa pagu tahun berjalan", "₽")}
        ${stat("BUKU STATUS\nKRITIS", "18", "Segera", "!", "red")}
        ${stat("SKOR\nKEPUASAN", "4.8/5.0", "", "★", "blue")}
      </div>
      <div class="panel" style="padding:0">
        <div class="panel-toolbar">
          <div><h2 class="panel-title">Daftar Rekomendasi</h2></div>
          <div class="toolbar-actions"><div class="search" style="width:360px"><span>⌕</span><span>Cari judul buku atau kategori...</span></div><div class="search" style="width:auto">Filter: <strong style="margin-left:8px">Semua Kategori</strong></div><button class="btn">☰</button></div>
        </div>
        ${dataTable(["PERINGKAT", "JUDUL BUKU", "KATEGORI", "PEMINJAMAN", "STATUS STOk", "REKOMENDASI"], [
          ["#1", "The Psychology of Money", "Finansial", "452", "KRITIS", "Tambah 20 Eks"],
          ["#2", "Atomic Habits", "Self-Help", "398", "KRITIS", "Tambah 15 Eks"],
          ["#3", "Laskar Pelangi (Edisi Khusus)", "Sastra Indonesia", "315", "MENIPIS", "Tambah 15 Eks"],
          ["#4", "Clean Code", "Teknologi", "284", "MENIPIS", "Tambah 15 Eks"],
          ["#5", "Sapiens: Riwayat Singkat Umat Manusia", "Sejarah", "210", "CUKUP", "Pertahankan"],
          ["#6", "Negeri 5 Menara", "Novel", "195", "MENIPIS", "Tambah 15 Eks"],
          ["#7", "Bumi Manusia", "Sastra Indonesia", "188", "CUKUP", "Pertahankan"],
          ["#8", "Dilan 1990", "Remaja", "172", "KRITIS", "Tambah 20 Eks"],
          ["#9", "Introduction to Algorithms", "Teknologi", "155", "MENIPIS", "Tambah 15 Eks"],
          ["#10", "Filosofi Teras", "Self-Help", "148", "CUKUP", "Pertahankan"],
          ["#11", "Rich Dad Poor Dad", "Finansial", "139", "MENIPIS", "Tambah 15 Eks"],
          ["#12", "The Lean Startup", "Bisnis", "124", "CUKUP", "Pertahankan"],
        ], {
          widths: ["92px", "320px", "140px", "120px", "120px", "140px"],
          actions: false,
        })}
        <div class="pagination"><span>Menampilkan 12 dari 124 buku yang dianalisis</span><div class="pages"><button class="page-btn">‹</button><button class="page-btn active">1</button><button class="page-btn">2</button><button class="page-btn">3</button><button class="page-btn">...</button><button class="page-btn">11</button><button class="page-btn">›</button></div></div>
      </div>
      <div class="split" style="margin-top:24px">
        <section class="panel" style="padding:18px">
          <h2 class="panel-title">Kriteria Analisis</h2>
          <div class="page-copy" style="font-size:13px;line-height:22px;margin-top:12px">• Peringkat: Urutan berdasarkan frekuensi peminjaman dalam 90 hari terakhir.<br>• Kritis: Rasio peminjaman per eksisting buku &gt; 5:1 atau stok tersedia = 0.<br>• Menipis: Rasio peminjaman per eksisting buku antara 3:1 hingga 5:1.</div>
        </section>
        <section class="panel" style="padding:18px">
          <h2 class="panel-title">Proyeksi Anggaran</h2>
          <div class="page-copy" style="font-size:13px;margin-top:12px">Berdasarkan rekomendasi di atas, estimasi investasi pengadaan koleksi baru adalah:</div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:20px">
            <div><div class="page-copy" style="font-size:12px">TOTAL ESTIMASI</div><div style="font-size:28px;font-weight:700;color:#191c1d">Rp 842.500.000,-</div></div>
            <button class="btn primary">Ajukan Rencana</button>
          </div>
        </section>
      </div>`,
      "",
      { compact: true },
    ),

  allDashboard: () =>
    appShell(
      "kepala",
      "headDashboard",
      "Sistem Informasi Eksekutif",
      `<div class="hero-row">
        <div>
          <p class="page-copy" style="margin:0 0 4px;color:#006565;font-size:14px;font-weight:700">Dashboard Eksekutif › Detail Data</p>
          <h1 class="page-title" style="color:#006565">Data Lengkap Analisis Peminjaman</h1>
          <p class="page-copy">Laporan komprehensif inventaris dan sirkulasi koleksi perpustakaan.</p>
        </div>
        <button class="btn primary">Export Report</button>
      </div>
      ${panel(
        "Detail Data",
        "",
        `<button class="btn">Semua Kategori</button><button class="btn">Tahun Ini</button><div class="search"><span>⌕</span><span>Cari judul buku atau penulis...</span></div>`,
        dataTable(["RANKING", "BOOK TITLE", "CATEGORY", "TOTAL BORROWED", "STOCK STATUS", "LAST BORROWED"], [
          ["01", "Sejarah Nusantara: Edisi Balangan", "Sejarah", "1,240", "Tersedia", "14 Okt 2023"],
          ["02", "Inovasi Pertanian Banua", "Teknologi", "982", "Stok Menipis", "12 Okt 2023"],
          ["03", "Atlas Budaya Kalimantan Selatan", "Sastra", "855", "Kosong", "10 Okt 2023"],
          ["04", "Ensiklopedia Geografi Balangan", "Sains", "720", "Tersedia", "08 Okt 2023"],
          ["05", "Statistik Pembangunan Daerah", "Data", "612", "Tersedia", "05 Okt 2023"],
        ], {
          widths: ["70px", "260px", "110px", "130px", "120px", "120px"],
          actions: false,
        }),
      )}
      <div class="stats-4" style="margin-top:24px">
        ${stat("TOTAL KOLEKSI", "12,845", "", "▤")}
        ${stat("ANGGOTA BARU", "+124", "bin", "◎", "blue")}
        ${stat("RETENSI PINJAMAN", "88.4%", "", "↺", "teal")}
        ${stat("TERLAMBAT KEMBALI", "12 Buku", "", "△", "red")}
      </div>
      <div class="pagination" style="padding-top:0"><span>EIS Balangan • © 2023 Dinas Perpustakaan dan Kearsipan Kabupaten Balangan. Dashboard Eksekutif v2.4.0</span><span>Privacy Policy &nbsp; Terms of Service &nbsp; Contact Support</span></div>`,
      "",
      { compact: true },
    ),

  settings: () =>
    formPage(
      "kepala",
      "settings",
      "Pengaturan Sistem",
      "Kelola profil, preferensi, dan keamanan akun eksekutif Anda.",
      [
        { label: "Nama Lengkap", value: "Kepala Perpustakaan" },
        { label: "Nomor Induk Pegawai (NIP)", value: "19840512 201001 2 015" },
        { label: "Jabatan", value: "Kepala Perpustakaan Daerah" },
        { label: "Email", value: "kepala@balangan.go.id" },
        { label: "Telepon", value: "0812-3456-7890" },
        { label: "Instansi", value: "Perpustakaan Daerah Balangan", full: true },
      ],
      { slim: true },
    ),
};

export function renderPage(pageKey, title) {
  mount(pages[pageKey](), title);
}
